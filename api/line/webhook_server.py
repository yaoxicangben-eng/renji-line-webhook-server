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


def safe_error_summary(error: Exception) -> str:
    """秘密情報を含まない短いエラー要約を返す。"""
    error_type = type(error).__name__
    safe_messages = {
        "FileNotFoundError": "credential file or required file was not found",
        "JSONDecodeError": "received JSON could not be decoded",
        "ValueError": "configuration or request data is invalid",
        "PermissionError": "permission was denied",
        "HttpError": "Google Sheets API request failed",
        "TransportError": "external API connection failed",
    }
    return safe_messages.get(error_type, "unexpected processing error")


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
    channel_secret_exists = bool(os.getenv("LINE_CHANNEL_SECRET", "").strip())

    logger.info("webhook received")
    logger.info("request body length: %d", len(body))
    logger.info("signature header exists: %s", str(bool(signature)).lower())
    logger.info("LINE_CHANNEL_SECRET exists: %s", str(channel_secret_exists).lower())

    if not verify_line_signature(body, signature):
        logger.warning("signature verification failed")
        return JSONResponse(status_code=403, content={"error": "invalid signature"})

    try:
        payload = json.loads(body.decode("utf-8"))
        events = payload.get("events", [])
        if not isinstance(events, list):
            raise ValueError("Webhook本文の events が配列ではありません。")

        event_types = [
            str(event.get("type", ""))
            for event in events
            if isinstance(event, dict)
        ]
        logger.info("event count: %d", len(events))
        logger.info("event types: %s", ",".join(event_types) if event_types else "none")

        saved_events = 0
        saved_users = 0
        failed_events = 0
        failed_users = 0
        for event in events:
            if not isinstance(event, dict):
                logger.warning("invalid event skipped")
                continue

            event_type = str(event.get("type", ""))
            source = event.get("source") if isinstance(event.get("source"), dict) else {}
            logger.info("user_id exists: %s", str(bool(source.get("userId"))).lower())

            logger.info("append line_events start")
            try:
                append_row(LINE_EVENTS_SHEET, extract_line_event(event))
                saved_events += 1
                logger.info("append line_events success")
            except Exception as error:
                failed_events += 1
                logger.error(
                    "append line_events failure: exception_type=%s summary=%s",
                    type(error).__name__,
                    safe_error_summary(error),
                )

            if event_type == "follow":
                logger.info("append line_users start")
                try:
                    append_row(LINE_USERS_SHEET, extract_line_user(event))
                    saved_users += 1
                    logger.info("append line_users success")
                except Exception as error:
                    failed_users += 1
                    logger.error(
                        "append line_users failure: exception_type=%s summary=%s",
                        type(error).__name__,
                        safe_error_summary(error),
                    )

        return JSONResponse(
            status_code=200,
            content={
                "status": "ok",
                "saved_events": saved_events,
                "saved_users": saved_users,
                "failed_events": failed_events,
                "failed_users": failed_users,
            },
        )
    except Exception as error:
        logger.error(
            "webhook processing failure: exception_type=%s summary=%s",
            type(error).__name__,
            safe_error_summary(error),
        )
        return JSONResponse(
            status_code=200,
            content={"status": "accepted", "saved": False},
        )
