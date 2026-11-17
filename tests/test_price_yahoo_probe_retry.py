"""Yahoo TEST source retries transient upstream errors, never rate limits."""
import io
import json
import unittest
import urllib.error
from unittest.mock import patch

from scripts import yahoo_price_probe_test as probe


def valid_response():
    payload = {"chart": {"error": None, "result": [{
        "meta": {"symbol": "TSLA", "currency": "USD"},
        "timestamp": [1762732800],
        "indicators": {"quote": [{"close": [400.0]}]},
    }]}}
    response = io.BytesIO(json.dumps(payload).encode())
    response.status = 200
    return response


def http_error(status):
    return urllib.error.HTTPError("https://query1.finance.yahoo.com/", status, "failed", {}, None)


class YahooProbeRetryTests(unittest.TestCase):
    def test_transient_503_retried_once(self):
        with patch.object(probe.urllib.request, "urlopen", side_effect=[http_error(503), valid_response()]) as fetch, \
             patch.object(probe.time, "sleep") as sleep:
            result = probe.fetch_chart("TSLA")
        self.assertEqual(result["status"], "ok")
        self.assertEqual(fetch.call_count, 2)
        sleep.assert_called_once_with(2)

    def test_429_rate_limit_not_retried(self):
        with patch.object(probe.urllib.request, "urlopen", side_effect=http_error(429)) as fetch, \
             patch.object(probe.time, "sleep") as sleep:
            with self.assertRaises(urllib.error.HTTPError):
                probe.fetch_chart("TSLA")
        self.assertEqual(fetch.call_count, 1)
        sleep.assert_not_called()

    def test_second_transient_failure_is_not_retried_again(self):
        with patch.object(probe.urllib.request, "urlopen", side_effect=http_error(503)) as fetch, \
             patch.object(probe.time, "sleep") as sleep:
            with self.assertRaises(urllib.error.HTTPError):
                probe.fetch_chart("TSLA")
        self.assertEqual(fetch.call_count, 2)
        sleep.assert_called_once_with(2)


if __name__ == "__main__":
    unittest.main()
