"""Offline-only tests: no SEC requests, Supabase writes, secrets or deploys."""
import contextlib
import io
import json
import os
import socket
import unittest
import urllib.error
from unittest.mock import patch

from scripts.sec_mac_connection_probe import probe, main, MAX_BYTES

CONTACT = 'INVESTLAB Research contact@my-valid-domain.org'


class FakeResponse:
    status = 200

    def __init__(self, body):
        self.body = body

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False

    def read(self, count):
        return self.body[:count]


class TestSecMacProbe(unittest.TestCase):
    def test_success_and_same_official_url(self):
        calls = []

        def opener(req, timeout):
            calls.append((req.full_url, req.get_header('User-agent'), timeout))
            return FakeResponse(json.dumps({'cik': 1318605, 'facts': {'us-gaap': {}}}).encode())

        result = probe('TSLA', CONTACT, opener)
        self.assertEqual(result, {'ticker': 'TSLA', 'status': 'HTTP_200_CIK_FACTS_OK'})
        self.assertEqual(calls, [
            ('https://data.sec.gov/api/xbrl/companyfacts/CIK0001318605.json', CONTACT, 22)
        ])

    def test_403_and_429_sanitized(self):
        for status in (403, 429):
            def opener(req, timeout):
                raise urllib.error.HTTPError(req.full_url, status, f'secret {CONTACT}', {}, None)

            result = probe('TSLA', CONTACT, opener)
            self.assertEqual(result['status'], f'HTTP_{status}')
            self.assertNotIn(CONTACT, str(result))

    def test_dns_error_and_invalid_cik(self):
        def dns(req, timeout):
            raise urllib.error.URLError(socket.gaierror('secret-host'))

        self.assertEqual(probe('TSLA', CONTACT, dns)['status'], 'DNS_ERROR')
        self.assertEqual(
            probe('TSLA', CONTACT, lambda req, timeout: FakeResponse(b'{"cik":2,"facts":{"x":{}}}'))['status'],
            'CIK_MISMATCH',
        )

    def test_limit_and_malformed_body(self):
        self.assertEqual(
            probe('TSLA', CONTACT, lambda req, timeout: FakeResponse(b'x' * (MAX_BYTES + 1)))['status'],
            'BODY_TOO_LARGE',
        )
        self.assertEqual(
            probe('TSLA', CONTACT, lambda req, timeout: FakeResponse(b'no JSON'))['status'],
            'INVALID_JSON',
        )

    def test_invalid_contact_cannot_request(self):
        with self.assertRaisesRegex(ValueError, 'contact'):
            probe('TSLA', 'not-an-agent', lambda req, timeout: self.fail('network called'))

    def test_default_single_issuer_avoids_contact_log(self):
        stdout = io.StringIO()

        def simulated(ticker, agent):
            self.assertEqual(ticker, 'TSLA')
            self.assertEqual(agent, CONTACT)
            return {'ticker': 'TSLA', 'status': 'HTTP_403'}

        with patch.dict(os.environ, {'INVESTLAB_SEC_USER_AGENT': CONTACT}), \
                patch('scripts.sec_mac_connection_probe.probe', side_effect=simulated), \
                contextlib.redirect_stdout(stdout):
            self.assertEqual(main([]), 1)
        out = stdout.getvalue()
        self.assertIn('SEC_RESTRICTED', out)
        self.assertNotIn(CONTACT, out)


if __name__ == '__main__':
    unittest.main()
