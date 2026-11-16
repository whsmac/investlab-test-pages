import json
import tempfile
import unittest
from datetime import date
from pathlib import Path
from scripts.market_price_refresh_test import main, parse_csv

class OfflinePipelineTests(unittest.TestCase):
    def test_five_symbol_fixture_end_to_end_no_db_writes(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            for ticker in ("MSFT", "GOOGL", "AMZN", "META", "TSLA"):
                (root / f"{ticker}.csv").write_text(
                    "Date,Close\n2026-11-12,100.00\n2026-11-13,101.25\n", encoding="utf-8")
            output = root / "report.json"
            status = main(["--csv-dir", str(root), "--as-of", "2026-11-16",
                           "--output", str(output)])
            self.assertEqual(status, 0)
            result = json.loads(output.read_text(encoding="utf-8"))
            self.assertEqual(result["input_mode"], "OFFLINE_FIXTURE")
            self.assertEqual(result["writes_performed"], 0)
            self.assertFalse(result["quality_audit"]["database_insert_authorized"])
            self.assertTrue(result["quality_audit"]["checks_passed"])
            self.assertEqual(result["symbols"]["MSFT"]["count"], 2)
            self.assertEqual(result["symbols"]["SPCX"]["status"], "skipped")

    def test_equivalent_decimal_duplicate_is_not_conflict(self):
        from datetime import date
        rows = parse_csv("Date,Close\\n2026-11-13,101.2\\n2026-11-13,101.20\\n",
                         date(2026, 11, 1), date(2026, 11, 16))
        self.assertEqual(len(rows), 1)

    def test_future_dated_row_rejected(self):
        from datetime import date
        with self.assertRaisesRegex(ValueError, "Future-dated"):
            parse_csv("Date,Close\\n2026-11-17,101.2\\n",
                      date(2026, 11, 1), date(2026, 11, 16))

    def test_missing_fixture_produces_error_report(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            output = root / "report.json"
            status = main(["--csv-dir", str(root), "--as-of", "2026-11-16",
                           "--output", str(output)])
            self.assertEqual(status, 1)
            result = json.loads(output.read_text(encoding="utf-8"))
            self.assertEqual(result["symbols"]["TSLA"]["status"], "error")
            self.assertFalse(result["quality_audit"]["checks_passed"])
            self.assertEqual(result["writes_performed"], 0)

if __name__ == "__main__":
    unittest.main()
