import json
import tempfile
import unittest
from pathlib import Path
from scripts.validate_yahoo_test_site_preview import validate_preview


class TestYahooPreviewValidation(unittest.TestCase):
    def prepare(self, root):
        for path in (
            "index.html", "test-yahoo-price-review.html", "test-my-portfolio-ledger.html",
            "src/market/yahoo-latest-prices.mjs",
            "src/ledger/yahoo-portfolio-price-fill.mjs",
            "src/market/load-published-yahoo-review.mjs",
            "src/market/yahoo-review-chart-series.mjs",
            "src/market/yahoo-chart-freshness.mjs",
            "src/market/read-yahoo-test-company-map.mjs",
            "src/market/read-test-price-snapshot.mjs",
            "src/market/review-yahoo-test-browser.mjs",
        ):
            file = root / path
            file.parent.mkdir(parents=True, exist_ok=True)
            file.write_text("test", encoding="utf-8")
        # The Pilot homepage links to the independent Market Trends page.
        # The offline fixture must include it to reach the intended price and
        # nested-import failure paths, rather than fail the unrelated nav gate.
        (root / "index.html").write_text(
            '<a href="./market-trends.html">시장 동향</a>', encoding="utf-8")
        (root / "market-trends.html").write_text(
            'import {read} from "./src/market/load-published-yahoo-review.mjs";',
            encoding="utf-8")
        (root / "test-yahoo-price-review.html").write_text(
            'import {a} from "./src/market/load-published-yahoo-review.mjs"; '
            'loadPublishedYahooReview({origin:location.href}); '
            'reviewYahooCandidate(candidate,snapshot,companyMap); '
            'id="preview" id="freshness" void autoLoadYahooReview() '
            'renderReviewCharts(source); assessYahooChartFreshness(snapshot);', encoding="utf-8")
        (root / "test-my-portfolio-ledger.html").write_text(
            'import {a} from "./src/market/load-published-yahoo-review.mjs"; '
            'import {b} from "./src/ledger/yahoo-portfolio-price-fill.mjs"; '
            'id="yahoo-price-fill" loadPublishedYahooReview({origin:location.href}) '
            'previewYahooPortfolioPriceFill(snapshot,view.holdings,prices) '
            "el('portfolio-price-calc').click()", encoding="utf-8")
        (root / "src/market/load-published-yahoo-review.mjs").write_text(
            'const path="./data/yahoo-public-review.json";', encoding="utf-8")
        asset = root / "data/yahoo-public-review.json"
        asset.parent.mkdir()
        asset.write_text(json.dumps({
            "mode": "REVIEW_ONLY", "source": "Yahoo Finance",
            "database_insert_authorized": False, "writes_performed": 0,
            "row_count": 5, "observations": [
                {"ticker": t, "trading_date": "2026-11-13", "close_price": "100", "currency": "USD", "price_basis": "unadjusted_close"} for t in ("MSFT", "GOOGL", "AMZN", "META", "TSLA")]}))
        return asset

    def test_optional_complete_etf_quote_asset_is_validated(self):
        from scripts.portfolio_etf_quotes_test import build_snapshot
        from datetime import date
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.prepare(root)
            sources = {ticker: {
                "status": "ok", "currency": "USD", "price_basis": "unadjusted_close",
                "observations": [{"trading_date": "2026-11-23", "close_price": "50.25"}]
            } for ticker in ("BITU", "TQQQ", "USD")}
            asset=root / "data/portfolio-etf-quotes.json"
            asset.write_text(json.dumps(build_snapshot(sources,today=date(2026,11,24))))
            from unittest.mock import patch
            with patch("scripts.portfolio_etf_quotes_test.date") as mock_date:
                mock_date.today.return_value=date(2026,11,24)
                self.assertTrue(validate_preview(root)["checks_passed"])

    def test_optional_etf_with_private_holdings_is_rejected(self):
        from scripts.portfolio_etf_quotes_test import build_snapshot
        from datetime import date
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.prepare(root)
            sources={ticker:{"status":"ok","currency":"USD","price_basis":"unadjusted_close",
                              "observations":[{"trading_date":"2026-11-23","close_price":"50"}]}
                     for ticker in ("BITU","TQQQ","USD")}
            payload=build_snapshot(sources,today=date(2026,11,24))
            payload["quotes"][0]["owner_id"]="private-account-id"
            (root / "data/portfolio-etf-quotes.json").write_text(json.dumps(payload))
            with self.assertRaisesRegex(ValueError, "Invalid TEST ETF"):
                validate_preview(root)

    def test_complete_preview_passes(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.prepare(root)
            self.assertTrue(validate_preview(root)["checks_passed"])

    def test_unsorted_tickers_are_accepted_without_changing_data(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            asset = self.prepare(root)
            before = asset.read_bytes()
            result = validate_preview(root)
            self.assertTrue(result["checks_passed"])
            self.assertEqual(asset.read_bytes(), before)
            self.assertEqual(len(result["json_sha256"]), 64)

    def test_private_observation_field_is_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            asset = self.prepare(root)
            data = json.loads(asset.read_text())
            data["observations"][0]["user_email"] = "private@example.invalid"
            asset.write_text(json.dumps(data))
            with self.assertRaisesRegex(ValueError, "unexpected or unsanitized"):
                validate_preview(root)

    def test_missing_pilot_market_trends_is_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.prepare(root)
            (root / "market-trends.html").unlink()
            with self.assertRaisesRegex(ValueError, "market-trends.html missing"):
                validate_preview(root)

    def test_market_trends_missing_transitive_import_is_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.prepare(root)
            (root / "market-trends.html").write_text(
                'import {x} from "./src/market/unknown-trends.mjs";',
                encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "Broken transitive module import"):
                validate_preview(root)

    def test_missing_module_is_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.prepare(root)
            (root / "src/market/load-published-yahoo-review.mjs").unlink()
            with self.assertRaisesRegex(ValueError, "Missing"):
                validate_preview(root)

    def test_missing_ticker_is_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            asset = self.prepare(root)
            data = json.loads(asset.read_text())
            data["observations"].pop()
            data["row_count"] = 4
            asset.write_text(json.dumps(data))
            with self.assertRaisesRegex(ValueError, "ticker coverage"):
                validate_preview(root)

    def test_missing_chart_module_is_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.prepare(root)
            (root / "src/market/yahoo-review-chart-series.mjs").unlink()
            with self.assertRaisesRegex(ValueError, "Missing"):
                validate_preview(root)

    def test_broken_import_is_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.prepare(root)
            page = root / "test-yahoo-price-review.html"
            page.write_text(page.read_text() + ' import {x} from "./src/market/missing.mjs";')
            with self.assertRaisesRegex(ValueError, "Broken local module"):
                validate_preview(root)

    def test_missing_portfolio_price_fill_module_is_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.prepare(root)
            (root / "src/ledger/yahoo-portfolio-price-fill.mjs").unlink()
            with self.assertRaisesRegex(ValueError, "Missing"):
                validate_preview(root)

    def test_broken_portfolio_import_is_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.prepare(root)
            page = root / "test-my-portfolio-ledger.html"
            page.write_text(page.read_text() + ' import {x} from "./src/ledger/missing.mjs";')
            with self.assertRaisesRegex(ValueError, "Broken TEST portfolio module"):
                validate_preview(root)

    def test_missing_nested_portfolio_import_is_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.prepare(root)
            module = root / "src/ledger/yahoo-portfolio-price-fill.mjs"
            module.write_text('import {x} from "../market/missing-nested.mjs";', encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "Broken transitive module import"):
                validate_preview(root)

    def test_nested_portfolio_import_inside_bundle_passes(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.prepare(root)
            module = root / "src/ledger/yahoo-portfolio-price-fill.mjs"
            module.write_text('import {x} from "../market/yahoo-latest-prices.mjs";', encoding="utf-8")
            self.assertTrue(validate_preview(root)["checks_passed"])

    def test_private_files_in_preview_are_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.prepare(root)
            (root / ".env").write_text("PRIVATE=1")
            with self.assertRaisesRegex(ValueError, "non-public"):
                validate_preview(root)

    def test_backend_script_in_preview_is_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.prepare(root)
            (root / "scripts").mkdir()
            (root / "scripts/internal.py").write_text("secret")
            with self.assertRaisesRegex(ValueError, "non-public"):
                validate_preview(root)


if __name__ == "__main__":
    unittest.main()
