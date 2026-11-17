"""Exercise the actual TEST Pages live-check CLI classification without network calls."""
import io
import json
import tempfile
import unittest
import urllib.error
from contextlib import redirect_stdout
from pathlib import Path
from unittest.mock import patch

from scripts import verify_yahoo_test_pages_live as live


class YahooLiveStatusTests(unittest.TestCase):
    def run_cli(self, side_effect):
        with tempfile.TemporaryDirectory() as tmp:
            output = Path(tmp) / "live.json"
            with patch("sys.argv", ["verify_yahoo_test_pages_live", "--output", str(output)]), \
                 patch.object(live, "fetch_public_json", side_effect=side_effect), \
                 redirect_stdout(io.StringIO()):
                with self.assertRaises(SystemExit) as exit_result:
                    live.main()
            self.assertEqual(exit_result.exception.code, 1)
            return json.loads(output.read_text(encoding="utf-8"))

    def test_missing_file_is_not_published(self):
        error = urllib.error.HTTPError(live.TARGET, 404, "Not Found", {}, None)
        result = self.run_cli(error)
        self.assertEqual(result["error_kind"], "NOT_PUBLISHED")
        self.assertFalse(result["reachable"])
        self.assertEqual(result["database_writes"], 0)

    def test_server_failure_is_not_a_missing_file(self):
        error = urllib.error.HTTPError(live.TARGET, 503, "Unavailable", {}, None)
        result = self.run_cli(error)
        self.assertEqual(result["error_kind"], "HTTP_ERROR")

    def test_network_failure_is_separate(self):
        result = self.run_cli(urllib.error.URLError("DNS lookup failed"))
        self.assertEqual(result["error_kind"], "NETWORK_ERROR")

    def test_invalid_json_is_separate(self):
        result = self.run_cli(b"<html>not json</html>")
        self.assertEqual(result["error_kind"], "INVALID_CONTENT")


if __name__ == "__main__":
    unittest.main()
