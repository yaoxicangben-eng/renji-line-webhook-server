"""Googleスプレッドシートで使用するシート名と列名を定義する。"""

from __future__ import annotations


# 既存の集計・分析用シート
LINE_EVENTS_SHEET = "line_events"
LINE_USERS_SHEET = "line_users"
DAILY_FUNNEL_SHEET = "daily_funnel"
YOUTUBE_POSTS_SHEET = "youtube_posts"
SEMINAR_APPLICATIONS_SHEET = "seminar_applications"
SALES_SHEET = "sales"
WEEKLY_SUMMARY_SHEET = "weekly_summary"

# 縁結び覚醒プログラムの顧客運用シート
CUSTOMERS_SHEET = "顧客一覧"
PRE_INTERVIEW_SHEET = "事前ヒアリング"
LINE_CONSULTATIONS_SHEET = "LINE相談履歴"
CALL_NOTES_SHEET = "通話メモ"
WORK_RESPONSES_SHEET = "ワーク回答履歴"
DELIVERY_MANAGEMENT_SHEET = "送信管理"
TEMPLATES_SHEET = "テンプレ一覧"
KNOWLEDGE_SHEET = "ナレッジ"

# 蓮司_AI秘書の追加シート
DISCORD_NOTIFICATIONS_SHEET = "Discord通知ログ"
TASKS_SHEET = "タスク管理"
RISKS_SHEET = "リスクログ"
BOT_SETTINGS_SHEET = "Bot設定"
ERROR_LOG_SHEET = "エラーログ"


ANALYTICS_SHEET_SCHEMAS: dict[str, list[str]] = {
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


SECRETARY_SHEET_SCHEMAS: dict[str, list[str]] = {
    CUSTOMERS_SHEET: [
        "顧客ID",
        "LINEユーザーID",
        "名前",
        "本名",
        "Discord通知名",
        "申込日",
        "LINE登録日",
        "開始日",
        "フォーム回答日",
        "現在地レベル",
        "不安タイプ",
        "現在の週",
        "リスクスコア",
        "最終対応日",
        "事前鑑定Doc URL",
        "事前鑑定PDF URL",
        "最終設計書Doc URL",
        "最終設計書PDF URL",
        "ステータス",
        "注意書きPDF送信済み",
        "備考",
    ],
    PRE_INTERVIEW_SHEET: [
        "タイムスタンプ",
        "顧客ID",
        "名前",
        "本人情報",
        "相手情報",
        "関係性",
        "悩み",
        "理想状態",
        "不安",
        "後悔行動",
        "AI生成ステータス",
        "AI生成結果",
    ],
    LINE_CONSULTATIONS_SHEET: [
        "日時",
        "顧客ID",
        "LINEユーザーID",
        "message_id",
        "line_event_id",
        "相談内容",
        "分類",
        "相談分類",
        "緊急度",
        "AI返信案",
        "NG表現チェック結果",
        "実送信文",
        "対応ステータス",
        "リスクフラグ",
        "リスク判定",
        "Discord通知URL",
    ],
    CALL_NOTES_SHEET: [
        "顧客ID",
        "第何回",
        "通話日",
        "録画URL",
        "録画貼付内容",
        "文字起こし",
        "AI要約",
        "決定行動",
        "宿題",
        "次回テーマ",
        "最終レポート素材",
        "Discord投稿URL",
        "月守りサポート提案候補",
        "リスク判定",
    ],
    WORK_RESPONSES_SHEET: [
        "日時",
        "顧客ID",
        "出来事",
        "感情",
        "怖いこと",
        "彼にわかってほしいこと",
        "やりそうな行動",
        "望む未来",
        "AI整理結果",
        "推奨行動",
        "LINE文面案",
        "確認済み",
    ],
    DELIVERY_MANAGEMENT_SHEET: [
        "送信ID",
        "顧客ID",
        "LINEユーザーID",
        "送信種別",
        "送信内容",
        "PDF URL",
        "送信予定時刻",
        "送信済み",
        "送信日時",
        "エラー",
        "再送回数",
    ],
    TEMPLATES_SHEET: [
        "テンプレ名",
        "用途",
        "プロンプト",
        "PDF見出し",
        "LINE文面",
        "有効",
    ],
    KNOWLEDGE_SHEET: [
        "登録日",
        "カテゴリ",
        "内容",
        "効果",
        "注意点",
        "顧客タイプ",
        "個人情報除去済み",
        "元顧客",
        "タグ",
        "月守り転用可否",
        "Discord登録URL",
    ],
    DISCORD_NOTIFICATIONS_SHEET: [
        "日時",
        "顧客ID",
        "本名",
        "チャンネル",
        "メッセージURL",
        "通知種別",
        "処理結果",
    ],
    TASKS_SHEET: [
        "タスクID",
        "顧客ID",
        "内容",
        "期限",
        "優先度",
        "完了ステータス",
        "作成元",
    ],
    RISKS_SHEET: [
        "日時",
        "顧客ID",
        "発言",
        "リスク種別",
        "スコア",
        "推奨対応",
        "対応済み",
    ],
    BOT_SETTINGS_SHEET: [
        "キー",
        "値",
        "説明",
        "有効",
    ],
    ERROR_LOG_SHEET: [
        "発生日時",
        "機能",
        "エラー内容",
        "再実行可否",
        "対応状況",
    ],
}


SHEET_SCHEMAS: dict[str, list[str]] = {
    **ANALYTICS_SHEET_SCHEMAS,
    **SECRETARY_SHEET_SCHEMAS,
}


def schema_by_sheet() -> dict[str, list[str]]:
    """自動作成・更新対象となる全シートのスキーマを返す。"""
    return {sheet_name: headers.copy() for sheet_name, headers in SHEET_SCHEMAS.items()}


def secretary_schema_by_sheet() -> dict[str, list[str]]:
    """縁結び覚醒プログラムとDiscord秘書用のスキーマを返す。"""
    return {
        sheet_name: headers.copy()
        for sheet_name, headers in SECRETARY_SHEET_SCHEMAS.items()
    }
