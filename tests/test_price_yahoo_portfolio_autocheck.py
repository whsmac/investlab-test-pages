"""Portfolio startup checks public feed availability without modifying assumed prices."""
import unittest
from pathlib import Path


class PortfolioAutoCheckTests(unittest.TestCase):
    def test_startup_check_is_read_only_and_test_host_only(self):
        html = (Path(__file__).resolve().parents[1] / "test-my-portfolio-ledger.html").read_text(encoding="utf-8")
        start = html.index("async function checkYahooPublishedFeedOnLoad(){")
        end = html.index("void checkYahooPublishedFeedOnLoad();", start)
        block = html[start:end]
        self.assertIn("location.hostname!=='whsmac.github.io'", block)
        self.assertIn("loadPublishedYahooReview({origin:location.href})", block)
        self.assertIn("수동 적용 대기", block)
        self.assertIn("buildYahooLatestPrices(snapshot)", block)
        self.assertIn("최신 종가 사용 불가", block)
        self.assertIn("최신성 미확인", block)
        self.assertNotIn("setAssumedPrice(", block)
        self.assertNotIn("portfolio-price-calc').click()", block)
        self.assertNotIn("supabase", block.lower())
        self.assertIn("el('yahoo-price-fill').addEventListener('click',async()=>", html)


if __name__ == "__main__":
    unittest.main()
