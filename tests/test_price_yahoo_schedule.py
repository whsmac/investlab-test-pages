"""Regression checks for the inert TEST Yahoo daily review schedule."""
import re
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path

WORKFLOW = Path(__file__).resolve().parents[1] / ".github/workflows/test-yahoo-daily-review.yml"


class YahooReviewScheduleTests(unittest.TestCase):
    def test_us_weekdays_reviewed_next_korean_morning(self):
        source = WORKFLOW.read_text(encoding="utf-8")
        match = re.search(r"cron:\s*'([^']+)'", source)
        self.assertIsNotNone(match)
        self.assertEqual(match.group(1), "35 23 * * 1-5")
        utc = timezone.utc
        kst = timezone(timedelta(hours=9))
        for day in range(16, 21):  # Nov 16-20, 2026: Mon-Fri UTC
            scheduled = datetime(2026, 11, day, 23, 35, tzinfo=utc)
            self.assertLess(scheduled.weekday(), 5)
            local = scheduled.astimezone(kst)
            self.assertEqual(local.hour, 8)
            self.assertEqual(local.minute, 35)
            self.assertEqual(local.date(), (scheduled + timedelta(days=1)).date())
            self.assertIn(local.weekday(), range(1, 6))

    def test_workflow_stays_review_only(self):
        source = WORKFLOW.read_text(encoding="utf-8")
        self.assertIn("contents: read", source)
        self.assertIn("persist-credentials: false", source)
        self.assertIn("NO DEPLOY", source)
        self.assertNotIn("contents: write", source)
        self.assertNotIn("actions/deploy-pages", source)
        self.assertNotIn("git push", source)


if __name__ == "__main__":
    unittest.main()
