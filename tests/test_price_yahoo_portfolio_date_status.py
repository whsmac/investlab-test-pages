"""The TEST portfolio must disclose the actual Yahoo observation date."""
import unittest
from pathlib import Path


class YahooPortfolioDateStatusTests(unittest.TestCase):
    def test_price_fill_displays_observation_date_not_live_quote(self):
        html = (Path(__file__).resolve().parents[1] / "test-my-portfolio-ledger.html").read_text(encoding="utf-8")
        self.assertIn("snapshot.observations.reduce((latest,row)=>row.trading_date>latest?row.trading_date:latest,'')", html)
        self.assertIn("'데이터 최근 거래일 '+latestTradingDate", html)
        self.assertIn("실시간 시세 아님", html)
        self.assertIn("previewYahooPortfolioPriceFill(snapshot,view.holdings,prices)", html)


if __name__ == "__main__":
    unittest.main()
