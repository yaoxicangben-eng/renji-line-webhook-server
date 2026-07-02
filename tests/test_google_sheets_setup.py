from __future__ import annotations

import re
import unittest

from api.google_sheets.sheet_schema import (
    ANALYTICS_SHEET_SCHEMAS,
    BOT_SETTINGS_SHEET,
    CUSTOMERS_SHEET,
    DISCORD_NOTIFICATIONS_SHEET,
    ERROR_LOG_SHEET,
    LINE_CONSULTATIONS_SHEET,
    SECRETARY_SHEET_SCHEMAS,
    schema_by_sheet,
)
from api.google_sheets.sheets_client import (
    _column_label,
    _missing_headers,
    setup_sheets,
)


class _FakeRequest:
    def __init__(self, callback):
        self._callback = callback

    def execute(self):
        return self._callback()


class _FakeSheetsService:
    def __init__(self, headers_by_sheet: dict[str, list[str]]):
        self.headers_by_sheet = {
            sheet_name: headers.copy()
            for sheet_name, headers in headers_by_sheet.items()
        }

    def spreadsheets(self):
        return self

    def values(self):
        return self

    def get(self, **kwargs):
        if "fields" in kwargs:
            return _FakeRequest(
                lambda: {
                    "sheets": [
                        {"properties": {"title": sheet_name}}
                        for sheet_name in self.headers_by_sheet
                    ]
                }
            )

        sheet_name = self._sheet_name_from_range(kwargs["range"])
        return _FakeRequest(
            lambda: (
                {"values": [self.headers_by_sheet[sheet_name].copy()]}
                if self.headers_by_sheet[sheet_name]
                else {}
            )
        )

    def batchUpdate(self, **kwargs):
        def apply_requests():
            for request in kwargs["body"]["requests"]:
                sheet_name = request["addSheet"]["properties"]["title"]
                self.headers_by_sheet[sheet_name] = []
            return {"replies": []}

        return _FakeRequest(apply_requests)

    def update(self, **kwargs):
        def apply_update():
            sheet_name = self._sheet_name_from_range(kwargs["range"])
            self.headers_by_sheet[sheet_name].extend(kwargs["body"]["values"][0])
            return {"updatedRange": kwargs["range"]}

        return _FakeRequest(apply_update)

    @staticmethod
    def _sheet_name_from_range(range_name: str) -> str:
        match = re.match(r"^'(.+)'!", range_name)
        if not match:
            raise AssertionError(f"Unexpected range: {range_name}")
        return match.group(1).replace("''", "'")


class SheetSchemaTests(unittest.TestCase):
    def test_all_schemas_include_existing_and_secretary_sheets(self):
        schemas = schema_by_sheet()

        self.assertEqual(len(schemas), 20)
        self.assertEqual(len(ANALYTICS_SHEET_SCHEMAS), 7)
        self.assertEqual(len(SECRETARY_SHEET_SCHEMAS), 13)
        self.assertIn(CUSTOMERS_SHEET, schemas)
        self.assertIn(DISCORD_NOTIFICATIONS_SHEET, schemas)
        self.assertIn(BOT_SETTINGS_SHEET, schemas)
        self.assertIn(ERROR_LOG_SHEET, schemas)
        self.assertIn("line_event_id", schemas[LINE_CONSULTATIONS_SHEET])

    def test_headers_are_unique_within_each_sheet(self):
        for sheet_name, headers in schema_by_sheet().items():
            with self.subTest(sheet_name=sheet_name):
                self.assertEqual(len(headers), len(set(headers)))

    def test_schema_returns_copies(self):
        schemas = schema_by_sheet()
        schemas[CUSTOMERS_SHEET].append("temporary")

        self.assertNotIn("temporary", schema_by_sheet()[CUSTOMERS_SHEET])


class SetupSheetsTests(unittest.TestCase):
    def test_column_label(self):
        self.assertEqual(_column_label(1), "A")
        self.assertEqual(_column_label(26), "Z")
        self.assertEqual(_column_label(27), "AA")
        self.assertEqual(_column_label(52), "AZ")

    def test_missing_headers_keeps_expected_order(self):
        self.assertEqual(
            _missing_headers(["顧客ID", "名前"], ["顧客ID", "本名", "名前", "状態"]),
            ["本名", "状態"],
        )

    def test_setup_creates_and_extends_without_overwriting(self):
        service = _FakeSheetsService({CUSTOMERS_SHEET: ["顧客ID", "LINEユーザーID"]})
        schemas = {
            CUSTOMERS_SHEET: ["顧客ID", "LINEユーザーID", "本名"],
            DISCORD_NOTIFICATIONS_SHEET: ["日時", "顧客ID"],
        }

        first = setup_sheets(
            service=service,
            spreadsheet_id="test-spreadsheet",
            schemas=schemas,
        )

        self.assertEqual(first["created_sheets"], [DISCORD_NOTIFICATIONS_SHEET])
        self.assertEqual(first["extended_headers"], [CUSTOMERS_SHEET])
        self.assertEqual(
            first["initialized_headers"],
            [DISCORD_NOTIFICATIONS_SHEET],
        )
        self.assertEqual(
            service.headers_by_sheet[CUSTOMERS_SHEET],
            ["顧客ID", "LINEユーザーID", "本名"],
        )
        self.assertEqual(
            service.headers_by_sheet[DISCORD_NOTIFICATIONS_SHEET],
            ["日時", "顧客ID"],
        )

        second = setup_sheets(
            service=service,
            spreadsheet_id="test-spreadsheet",
            schemas=schemas,
        )

        self.assertEqual(second["created_sheets"], [])
        self.assertEqual(second["extended_headers"], [])
        self.assertEqual(second["initialized_headers"], [])
        self.assertEqual(
            second["unchanged_sheets"],
            [CUSTOMERS_SHEET, DISCORD_NOTIFICATIONS_SHEET],
        )


if __name__ == "__main__":
    unittest.main()
