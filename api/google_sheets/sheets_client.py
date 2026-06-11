"""サービスアカウント認証でGoogleスプレッドシートへ行を追記する。"""

from __future__ import annotations

import json
import logging
import os
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv
from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

from api.google_sheets.sheet_schema import schema_by_sheet


PROJECT_ROOT = Path(__file__).resolve().parents[2]
load_dotenv(PROJECT_ROOT / "config" / ".env")

logger = logging.getLogger(__name__)

SCOPES = ["https://www.googleapis.com/auth/spreadsheets"]


def _safe_error_summary(error: Exception) -> str:
    """秘密情報を含まないGoogle Sheets処理のエラー要約を返す。"""
    error_type = type(error).__name__
    safe_messages = {
        "FileNotFoundError": "credential file or required file was not found",
        "JSONDecodeError": "service account JSON could not be decoded",
        "ValueError": "Google Sheets configuration is invalid",
        "PermissionError": "permission was denied",
        "HttpError": "Google Sheets API request failed",
        "TransportError": "Google API connection failed",
    }
    return safe_messages.get(error_type, "unexpected Google Sheets error")


def _required_env(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise ValueError(f"環境変数 {name} が設定されていません。")
    return value


def _spreadsheet_id() -> str:
    return _required_env("GOOGLE_SPREADSHEET_ID")


def _escaped_sheet_name(sheet_name: str) -> str:
    return sheet_name.replace("'", "''")


def _get_service_account_credentials() -> Credentials:
    """RenderのJSON文字列を優先し、なければローカルJSONファイルを使う。"""
    credentials_json = os.getenv("GOOGLE_SERVICE_ACCOUNT_JSON", "").strip()
    if credentials_json:
        try:
            credentials_info = json.loads(credentials_json)
        except json.JSONDecodeError as error:
            raise ValueError(
                "GOOGLE_SERVICE_ACCOUNT_JSON が正しいJSON形式ではありません。"
            ) from error
        if not isinstance(credentials_info, dict):
            raise ValueError("GOOGLE_SERVICE_ACCOUNT_JSON はJSONオブジェクトで指定してください。")
        return Credentials.from_service_account_info(
            credentials_info,
            scopes=SCOPES,
        )

    credentials_file = _required_env("GOOGLE_APPLICATION_CREDENTIALS")
    credentials_path = Path(credentials_file).expanduser()
    if not credentials_path.is_absolute():
        credentials_path = PROJECT_ROOT / credentials_path
    credentials_path = credentials_path.resolve()
    if not credentials_path.is_file():
        raise FileNotFoundError(
            f"GoogleサービスアカウントJSONが見つかりません: {credentials_path}"
        )
    return Credentials.from_service_account_file(
        str(credentials_path),
        scopes=SCOPES,
    )


@lru_cache(maxsize=1)
def get_sheets_service():
    """環境変数のサービスアカウント認証情報からSheets APIサービスを作る。"""
    try:
        credentials = _get_service_account_credentials()
        return build("sheets", "v4", credentials=credentials, cache_discovery=False)
    except Exception as error:
        logger.error(
            "Google Sheets service creation failure: exception_type=%s summary=%s",
            type(error).__name__,
            _safe_error_summary(error),
        )
        raise


def _ensure_sheet_exists(service, spreadsheet_id: str, sheet_name: str) -> None:
    if not sheet_name.strip():
        raise ValueError("sheet_name が空です。")

    try:
        metadata = service.spreadsheets().get(
            spreadsheetId=spreadsheet_id,
            fields="sheets.properties.title",
        ).execute()
    except Exception as error:
        logger.error(
            "Google Sheets metadata failure: exception_type=%s summary=%s",
            type(error).__name__,
            _safe_error_summary(error),
        )
        raise

    sheet_names = {
        sheet.get("properties", {}).get("title", "")
        for sheet in metadata.get("sheets", [])
    }
    if sheet_name not in sheet_names:
        available = ", ".join(sorted(name for name in sheet_names if name)) or "なし"
        raise ValueError(
            f"シート `{sheet_name}` が存在しません。"
            f"Googleスプレッドシートでシートを作成してください。"
            f"現在のシート: {available}"
        )


def append_row(sheet_name: str, values: list) -> dict:
    """指定したシートの末尾へ1行追記する。"""
    if not isinstance(values, list):
        error = TypeError("values は list で指定してください。")
        logger.error("%s", error)
        raise error
    return append_rows(sheet_name, [values])


def append_rows(sheet_name: str, rows: list[list]) -> dict:
    """指定したシートの末尾へ複数行追記する。"""
    if not isinstance(rows, list) or any(not isinstance(row, list) for row in rows):
        error = TypeError("rows は list[list] で指定してください。")
        logger.error("%s", error)
        raise error
    if not rows:
        error = ValueError("追記する行がありません。")
        logger.error("%s", error)
        raise error

    try:
        spreadsheet_id = _spreadsheet_id()
        service = get_sheets_service()
        _ensure_sheet_exists(service, spreadsheet_id, sheet_name)
        escaped_name = _escaped_sheet_name(sheet_name)
        result = service.spreadsheets().values().append(
            spreadsheetId=spreadsheet_id,
            range=f"'{escaped_name}'!A:A",
            valueInputOption="RAW",
            insertDataOption="INSERT_ROWS",
            body={"values": rows},
        ).execute()
        logger.info("シート `%s` に%d行追記しました。", sheet_name, len(rows))
        return result
    except Exception as error:
        logger.error(
            "Google Sheets append failure: sheet=%s exception_type=%s summary=%s",
            sheet_name,
            type(error).__name__,
            _safe_error_summary(error),
        )
        raise


class SheetsClient:
    """既存Webhookサーバーから利用するための互換クライアント。"""

    @classmethod
    def from_env(cls) -> "SheetsClient":
        _spreadsheet_id()
        get_sheets_service()
        return cls()

    def ensure_sheet(self, sheet_name: str, headers: list[str]) -> None:
        del headers
        _ensure_sheet_exists(get_sheets_service(), _spreadsheet_id(), sheet_name)

    def append_row(
        self,
        sheet_name: str,
        headers: list[str],
        row: dict[str, object],
    ) -> dict:
        return append_row(sheet_name, [row.get(header, "") for header in headers])

    def append_rows(
        self,
        sheet_name: str,
        headers: list[str],
        rows: list[dict[str, object]],
    ) -> dict:
        values = [[row.get(header, "") for header in headers] for row in rows]
        return append_rows(sheet_name, values)

    def initialize_schema(self) -> None:
        for sheet_name, headers in schema_by_sheet().items():
            self.ensure_sheet(sheet_name, headers)


def describe_google_api_error(error: HttpError) -> str:
    return f"Google Sheets APIエラー: {error}"
