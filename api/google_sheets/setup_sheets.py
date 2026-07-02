"""Googleスプレッドシートの不足シートとヘッダーを初期化する。"""

from __future__ import annotations

from api.google_sheets.sheets_client import setup_sheets


def main() -> int:
    try:
        summary = setup_sheets()
    except Exception as error:
        print(f"Google Sheets setup failed: {type(error).__name__}: {error}")
        return 1

    print("Google Sheets setup succeeded")
    for key, sheet_names in summary.items():
        print(f"- {key}: {len(sheet_names)}")
        for sheet_name in sheet_names:
            print(f"  - {sheet_name}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
