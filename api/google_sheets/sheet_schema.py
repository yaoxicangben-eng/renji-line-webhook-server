"""Googleスプレッドシートで使用するシート名と列名を定義する。"""

from __future__ import annotations


LINE_EVENTS_SHEET = "line_events"
LINE_USERS_SHEET = "line_users"
DAILY_FUNNEL_SHEET = "daily_funnel"
YOUTUBE_POSTS_SHEET = "youtube_posts"
SEMINAR_APPLICATIONS_SHEET = "seminar_applications"
SALES_SHEET = "sales"
WEEKLY_SUMMARY_SHEET = "weekly_summary"


SHEET_SCHEMAS: dict[str, list[str]] = {
    LINE_EVENTS_SHEET: [
        "timestamp",
        "event_type",
        "user_id",
        "reply_token",
        "message_type",
        "message_text",
        "postback_data",
        "raw_event_json",
    ],
    LINE_USERS_SHEET: [
        "user_id",
        "first_seen_at",
        "last_seen_at",
        "display_name",
        "status",
        "source_type",
        "memo",
    ],
    DAILY_FUNNEL_SHEET: [
        "date",
        "line_follow_count",
        "message_count",
        "free_reading_count",
        "seminar_application_count",
        "seminar_attendance_count",
        "consultation_application_count",
        "sales_count",
        "block_count",
        "memo",
    ],
    YOUTUBE_POSTS_SHEET: [
        "published_at",
        "video_title",
        "video_url",
        "theme",
        "worry_category",
        "planning_type",
        "thumbnail_text",
        "views",
        "impressions",
        "ctr",
        "avg_view_duration",
        "avg_retention",
        "subscriber_gain",
        "memo",
    ],
    SEMINAR_APPLICATIONS_SHEET: [
        "timestamp",
        "user_id",
        "name",
        "seminar_date",
        "application_source",
        "status",
        "memo",
    ],
    SALES_SHEET: [
        "timestamp",
        "user_id",
        "name",
        "product_name",
        "amount",
        "payment_status",
        "sales_status",
        "memo",
    ],
    WEEKLY_SUMMARY_SHEET: [
        "week_start",
        "week_end",
        "youtube_posts_count",
        "main_theme",
        "total_views",
        "line_follow_count",
        "free_reading_count",
        "seminar_application_count",
        "seminar_attendance_count",
        "sales_count",
        "memo",
    ],
}


def schema_by_sheet() -> dict[str, list[str]]:
    """自動作成対象となる7シートのスキーマを返す。"""
    return SHEET_SCHEMAS
