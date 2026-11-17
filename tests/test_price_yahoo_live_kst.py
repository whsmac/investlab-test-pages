"""Contract: online Yahoo freshness uses KST, independent of CI runner timezone."""
import unittest
from pathlib import Path

SOURCE = Path(__file__).resolve().parents[1] / "scripts/verify_yahoo_test_pages_live.py"


class YahooLiveKstTests(unittest.TestCase):
    def test_korean_calendar_day_used_for_freshness(self):
        source = SOURCE.read_text(encoding="utf-8")
        self.assertIn("datetime.now(timezone(timedelta(hours=9))).date()", source)
        self.assertNotIn("datetime.now().astimezone().date()", source)

    def test_live_check_remains_exact_url_read_only(self):
        source = SOURCE.read_text(encoding="utf-8")
        self.assertIn("if url != TARGET:", source)
        self.assertIn('"database_writes": 0, "deployment_performed": False', source)
        self.assertIn('"NOT_PUBLISHED"', source)


if __name__ == "__main__":
    unittest.main()
