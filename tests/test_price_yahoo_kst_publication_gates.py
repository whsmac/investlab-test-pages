"""TEST publication gates use Korea's calendar day, not the CI runner's UTC day."""
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


class KoreaPublicationGateTests(unittest.TestCase):
    def test_preflight_defaults_to_kst_date(self):
        source = (ROOT / "scripts/check_yahoo_publication_preflight.py").read_text(encoding="utf-8")
        self.assertIn("datetime.now(timezone(timedelta(hours=9))).date()", source)
        self.assertNotIn("today or date.today()", source)

    def test_handoff_defaults_to_kst_date(self):
        source = (ROOT / "scripts/check_yahoo_test_pages_handoff.py").read_text(encoding="utf-8")
        self.assertIn("datetime.now(timezone(timedelta(hours=9))).date()", source)
        self.assertNotIn("today or date.today()", source)


if __name__ == "__main__":
    unittest.main()
