"""LINE Messaging API Webhookの署名を検証する。"""

from __future__ import annotations

import base64
import hashlib
import hmac
import os
from pathlib import Path

from dotenv import load_dotenv


PROJECT_ROOT = Path(__file__).resolve().parents[2]
load_dotenv(PROJECT_ROOT / "config" / ".env")


def line_signature_diagnostics(body: bytes, signature: str) -> dict[str, object]:
    """秘密値を含まない署名検証用の診断情報を返す。"""
    channel_secret = os.getenv("LINE_CHANNEL_SECRET", "").strip()
    computed_signature_length = 0
    if channel_secret:
        digest = hmac.new(
            channel_secret.encode("utf-8"),
            body,
            hashlib.sha256,
        ).digest()
        computed_signature_length = len(base64.b64encode(digest).decode("utf-8"))

    return {
        "signature_header_exists": bool(signature),
        "line_channel_secret_exists": bool(channel_secret),
        "body_length": len(body),
        "computed_signature_length": computed_signature_length,
        "received_signature_length": len(signature),
    }


def verify_line_signature(body: bytes, signature: str) -> bool:
    """Webhook本文とX-Line-Signatureが正しいか検証する。"""
    channel_secret = os.getenv("LINE_CHANNEL_SECRET", "").strip()
    if not signature or not channel_secret:
        return False

    digest = hmac.new(
        channel_secret.encode("utf-8"),
        body,
        hashlib.sha256,
    ).digest()
    expected = base64.b64encode(digest).decode("utf-8")
    return hmac.compare_digest(expected, signature)
