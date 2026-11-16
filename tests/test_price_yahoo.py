import unittest
from scripts.yahoo_price_probe_test import parse_chart


class YahooPriceProbeTests(unittest.TestCase):
    def sample(self):
        return {"chart": {"error": None, "result": [{
            "meta": {"symbol": "TSLA", "currency": "USD"},
            "timestamp": [1794528000, 1794614400],
            "indicators": {"quote": [{"close": [250.25, 251.5]}]}
        }]}}

    def test_valid_chart(self):
        result = parse_chart(self.sample(), "TSLA")
        self.assertEqual(result["count"], 2)
        self.assertEqual(result["currency"], "USD")
        self.assertEqual(result["price_basis"], "unadjusted_close")

    def test_mismatched_ticker(self):
        with self.assertRaises(ValueError):
            parse_chart(self.sample(), "MSFT")

    def test_non_usd_currency(self):
        payload = self.sample()
        payload["chart"]["result"][0]["meta"]["currency"] = "KRW"
        with self.assertRaises(ValueError):
            parse_chart(payload, "TSLA")

    def test_invalid_price(self):
        payload = self.sample()
        payload["chart"]["result"][0]["indicators"]["quote"][0]["close"][0] = -1
        with self.assertRaises(ValueError):
            parse_chart(payload, "TSLA")


if __name__ == "__main__":
    unittest.main()
