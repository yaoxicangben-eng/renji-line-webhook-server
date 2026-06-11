"""LINE Webhookイベントを受信し、Googleスプレッドシートへ追記する。"""

from __future__ import annotations

import json
import logging
import os
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from api.google_sheets.sheet_schema import LINE_EVENTS_SHEET, LINE_USERS_SHEET
from api.google_sheets.sheets_client import append_row
from api.line.line_signature import verify_line_signature


PROJECT_ROOT = Path(__file__).resolve().parents[2]
load_dotenv(PROJECT_ROOT / "config" / ".env")

logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO"),
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(title="Renji LINE Webhook", version="1.0.0")


def iso_datetime_from_millis(timestamp: object) -> str:
    """LINEのミリ秒タイムスタンプをISO 8601形式へ変換する。"""
    try:
        return datetime.fromtimestamp(
            float(timestamp) / 1000,
            tz=timezone.utc,
        ).isoformat()
    except (TypeError, ValueError, OSError):
        return datetime.now(timezone.utc).isoformat()


def extract_line_event(event: dict[str, object]) -> list[object]:
    """line_eventsシートの列順にWebhookイベントを整形する。"""
    source = event.get("source") if isinstance(event.get("source"), dict) else {}
    message = event.get("message") if isinstance(event.get("message"), dict) else {}
    postback = event.get("postback") if isinstance(event.get("postback"), dict) else {}

    return [
        iso_datetime_from_millis(event.get("timestamp")),
        str(event.get("type", "")),
        str(source.get("userId", "")),
        str(event.get("replyToken", "")),
        str(message.get("type", "")),
        str(message.get("text", "")),
        str(postback.get("data", "")),
        json.dumps(event, ensure_ascii=False),
    ]


def extract_line_user(event: dict[str, object]) -> list[object]:
    """followイベントをline_usersシートの列順に整形する。"""
    source = event.get("source") if isinstance(event.get("source"), dict) else {}
    timestamp = iso_datetime_from_millis(event.get("timestamp"))

    return [
        str(source.get("userId", "")),
        timestamp,
        timestamp,
        "",
        "active",
        str(source.get("type", "")),
        "followイベントから自動登録",
    ]


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/line/webhook")
async def line_webhook(request: Request) -> JSONResponse:
    body = await request.body()
    signature = request.headers.get("X-Line-Signature", "")

    if not verify_line_signature(body, signature):
        logger.warning("LINE Webhookの署名検証に失敗しました。")
        return JSONResponse(status_code=403, content={"error": "invalid signature"})

    try:
        payload = json.loads(body.decode("utf-8"))
        events = payload.get("events", [])
        if not isinstance(events, list):
            raise ValueError("Webhook本文の events が配列ではありません。")

        saved_events = 0
        saved_users = 0
        for event in events:
            if not isinstance(event, dict):
                logger.warning("辞書形式ではないWebhookイベントをスキップしました。")
                continue

            event_type = str(event.get("type", ""))
            append_row(LINE_EVENTS_SHEET, extract_line_event(event))
            saved_events += 1

            if event_type == "follow":
                append_row(LINE_USERS_SHEET, extract_line_user(event))
                saved_users += 1

        logger.info(
            "LINE Webhookを保存しました。line_events=%d, line_users=%d",
            saved_events,
            saved_users,
        )
        return JSONResponse(
            status_code=200,
            content={
                "status": "ok",
                "saved_events": saved_events,
                "saved_users": saved_users,
            },
        )
    except Exception:
        logger.exception("LINE Webhookイベントの処理中にエラーが発生しました。")
        return JSONResponse(
            status_code=200,
            content={"status": "accepted", "saved": False},
        )
