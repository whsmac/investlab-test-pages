#!/usr/bin/env python3
"""Read-only SEC Company Facts connectivity preflight for INVESTLAB Mac mini.

No database/file writes, no automatic retries, no secret/response-body logging.
Uses the same Company Facts endpoint and contact-header format as the existing
TEST financial collector. This probe never changes GitHub PRs.
"""
import argparse
import getpass
import json
import socket
import ssl
import time
import urllib.error
import urllib.request
from http.client import HTTPException

if __package__:
    from .sec_quarterly_financials_test import ISSUERS, valid_sec_user_agent
else:
    from sec_quarterly_financials_test import ISSUERS, valid_sec_user_agent

MAX_BYTES = 16_000_000


def probe(ticker, user_agent, opener=urllib.request.urlopen):
    """Return only public ticker and sanitized request status (no response data)."""
    if ticker not in ISSUERS:
        raise ValueError('Unknown INVESTLAB issuer')
    if not valid_sec_user_agent(user_agent):
        raise ValueError('Valid contact identification required')
    cik, _ = ISSUERS[ticker]
    req = urllib.request.Request(
        f'https://data.sec.gov/api/xbrl/companyfacts/CIK{cik}.json',
        headers={'User-Agent': user_agent, 'Accept': 'application/json'},
        method='GET',
    )
    try:
        with opener(req, timeout=22) as resp:
            if resp.status != 200:
                return {'ticker': ticker, 'status': f'HTTP_{resp.status}'}
            raw = resp.read(MAX_BYTES + 1)
            if len(raw) > MAX_BYTES:
                return {'ticker': ticker, 'status': 'BODY_TOO_LARGE'}
        data = json.loads(raw)
        if not isinstance(data, dict) or str(data.get('cik', '')).zfill(10) != cik:
            return {'ticker': ticker, 'status': 'CIK_MISMATCH'}
        if not isinstance(data.get('facts'), dict) or not data['facts']:
            return {'ticker': ticker, 'status': 'NO_XBRL_FACTS'}
        return {'ticker': ticker, 'status': 'HTTP_200_CIK_FACTS_OK'}
    except urllib.error.HTTPError as exc:
        return {'ticker': ticker, 'status': f'HTTP_{exc.code}'}
    except (TimeoutError, socket.timeout):
        return {'ticker': ticker, 'status': 'TIMEOUT'}
    except ssl.SSLError:
        return {'ticker': ticker, 'status': 'TLS_ERROR'}
    except urllib.error.URLError as exc:
        reason = exc.reason
        if isinstance(reason, (TimeoutError, socket.timeout)):
            status = 'TIMEOUT'
        elif isinstance(reason, ssl.SSLError):
            status = 'TLS_ERROR'
        elif isinstance(reason, socket.gaierror):
            status = 'DNS_ERROR'
        else:
            status = 'NETWORK_ERROR'
        return {'ticker': ticker, 'status': status}
    except (ValueError, UnicodeError, json.JSONDecodeError):
        return {'ticker': ticker, 'status': 'INVALID_JSON'}
    except (OSError, HTTPException):
        return {'ticker': ticker, 'status': 'NETWORK_ERROR'}


def main(argv=None):
    parser = argparse.ArgumentParser(description='Read-only SEC diagnostic; contact identity never logged')
    group = parser.add_mutually_exclusive_group()
    group.add_argument('--all', action='store_true', help='Check all six issuers sequentially')
    group.add_argument('--ticker', choices=sorted(ISSUERS), default='TSLA', help='Single-company check (default TSLA)')
    args = parser.parse_args(argv)
    # Keep contact details out of terminal echo, Git arguments and shell history.
    import os
    user_agent = os.environ.get('INVESTLAB_SEC_USER_AGENT', '').strip()
    if not user_agent:
        user_agent = getpass.getpass('SEC identification (app name + contact email; hidden): ').strip()
    if not valid_sec_user_agent(user_agent):
        print('CONTACT_INVALID: provide an identifying name and real contact email; no request sent.')
        return 2
    selected = list(ISSUERS) if args.all else [args.ticker]
    statuses = []
    for idx, ticker in enumerate(selected):
        if idx:
            time.sleep(1.0)  # Safely below SEC's 10 requests/sec ceiling.
        record = probe(ticker, user_agent)
        statuses.append(record['status'])
        print(f"{record['ticker']}: {record['status']}")
    if all(status == 'HTTP_200_CIK_FACTS_OK' for status in statuses):
        print('RESULT: SEC_CODE_ACCESS_OK — network accessible; filing-level checks still required.')
        return 0
    if 'HTTP_403' in statuses or 'HTTP_429' in statuses:
        print('RESULT: SEC_RESTRICTED — avoid rapid retries or access-control bypass.')
    else:
        print('RESULT: SEC_UNAVAILABLE_OR_INVALID — no financial data published.')
    return 1


if __name__ == '__main__':
    raise SystemExit(main())
