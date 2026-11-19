import unittest
from datetime import date
from scripts.audit_price_source_test import audit_source_report

TODAY = date(2026, 11, 16)
def report():
    return {"mode": "DRY_RUN_ONLY", "writes_performed": 0,
            "source": "Stooq public CSV trial (unverified availability)",
            "generated_on": "2026-11-16", "date_from": "2026-11-02", "date_to": "2026-11-16",
            "symbols": {**{ticker: {"status": "ok", "count": 1, "observations": [
                {"trading_date": "2026-11-13", "close_price": "100.25"}]}
                for ticker in ("MSFT", "GOOGL", "AMZN", "META", "TSLA")},
                "SPCX": {"status": "skipped"}}}

class AuditTests(unittest.TestCase):
    def test_valid_probe_is_still_not_write_authorized(self):
        result = audit_source_report(report(), today=TODAY)
        self.assertTrue(result["checks_passed"])
        self.assertFalse(result["database_insert_authorized"])
        self.assertFalse(result["symbols"]["MSFT"]["source_price_basis_verified"])

    def test_stale_close_is_rejected(self):
        data = report()
        data["symbols"]["MSFT"]["observations"][0]["trading_date"] = "2026-10-01"
        self.assertFalse(audit_source_report(data, today=TODAY)["checks_passed"])

    def test_duplicate_dates_are_rejected(self):
        data = report()
        data["symbols"]["MSFT"]["observations"] *= 2
        data["symbols"]["MSFT"]["count"] = 2
        self.assertFalse(audit_source_report(data, today=TODAY)["checks_passed"])

    def test_missing_ticker_is_rejected(self):
        data = report()
        del data["symbols"]["TSLA"]
        self.assertFalse(audit_source_report(data, today=TODAY)["checks_passed"])

    def test_future_date_and_invalid_close_are_rejected(self):
        data = report()
        data["symbols"]["MSFT"]["observations"][0] = {
            "trading_date": "2026-11-17", "close_price": "-1"}
        self.assertFalse(audit_source_report(data, today=TODAY)["checks_passed"])

    def test_unexpected_ticker_rejected(self):
        data = report()
        data["symbols"]["UNEXPECTED"] = {"status": "ok", "count": 1}
        self.assertFalse(audit_source_report(data, today=TODAY)["checks_passed"])

    def test_out_of_window_observation_rejected(self):
        data = report()
        data["symbols"]["MSFT"]["observations"][0]["trading_date"] = "2026-11-01"
        self.assertFalse(audit_source_report(data, today=TODAY)["checks_passed"])

    def test_invalid_source_window_rejected(self):
        data = report()
        data["date_from"] = "2026-11-18"
        self.assertFalse(audit_source_report(data, today=TODAY)["checks_passed"])

    def test_malformed_ticker_report_rejected_without_crash(self):
        data = report()
        data["symbols"]["TSLA"] = None
        result = audit_source_report(data, today=TODAY)
        self.assertFalse(result["checks_passed"])

    def test_malformed_observation_rejected_without_crash(self):
        data = report()
        data["symbols"]["TSLA"]["observations"] = [None]
        result = audit_source_report(data, today=TODAY)
        self.assertFalse(result["checks_passed"])

    def test_malformed_spcx_report_rejected_without_crash(self):
        data = report()
        data["symbols"]["SPCX"] = None
        result = audit_source_report(data, today=TODAY)
        self.assertFalse(result["checks_passed"])

    def test_spcx_cannot_be_silently_enabled(self):
        data = report()
        data["symbols"]["SPCX"]["status"] = "ok"
        self.assertFalse(audit_source_report(data, today=TODAY)["checks_passed"])

if __name__ == "__main__":
    unittest.main()
