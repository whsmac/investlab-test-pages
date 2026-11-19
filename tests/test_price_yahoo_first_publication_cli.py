"""End-to-end offline CLI test for first-publication review evidence."""
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TARGET = "https://whsmac.github.io/investlab-test-pages/"


def source(confirmed=True):
    return {"mode": "TEST_PAGES_SOURCE_READ_ONLY_AUDIT", "source_confirmed": confirmed,
            "status": "SOURCE_CONFIRMED" if confirmed else "SOURCE_UNCONFIRMED",
            "build_type": "legacy", "branch": "gh-pages", "path": "/",
            "deployment_performed": False, "database_writes": 0}


def handoff():
    return {"mode": "TEST_PAGES_HANDOFF_ONLY", "handoff_ready": True,
            "reviewed_commit_sha": "a" * 40, "json_sha256": "b" * 64,
            "publication_target": TARGET, "deployment_authorized": False,
            "deployment_performed": False, "database_writes": 0}


def branch():
    return {"mode": "TEST_PAGES_BRANCH_READ_ONLY_AUDIT",
            "branches": {name: {"exists": True, "asset_present": False}
                         for name in ("main", "gh-pages", "feature/test-navigation-20261112")},
            "pages_source_confirmed": False, "deployment_performed": False, "database_writes": 0}


def live():
    return {"mode": "TEST_PAGES_LIVE_READ_ONLY_CHECK", "reachable": False,
            "fresh": False, "error_kind": "NOT_PUBLISHED",
            "deployment_performed": False, "database_writes": 0}


class FirstPublicationCLITests(unittest.TestCase):
    def run_review(self, confirmed):
        with tempfile.TemporaryDirectory() as tmp:
            directory = Path(tmp)
            for name, data in (("source", source(confirmed)), ("handoff", handoff()),
                               ("branch", branch()), ("live", live())):
                (directory / (name + ".json")).write_text(json.dumps(data), encoding="utf-8")
            online = directory / "online.json"
            result = directory / "gate.json"
            subprocess.run([sys.executable, "-m", "scripts.report_yahoo_online_readiness",
                            "--branch-audit", str(directory / "branch.json"),
                            "--pages-source", str(directory / "source.json"),
                            "--live-check", str(directory / "live.json"),
                            "--output", str(online)], cwd=ROOT, check=True, capture_output=True)
            subprocess.run([sys.executable, "-m", "scripts.report_yahoo_first_publication_gate",
                            "--pages-source", str(directory / "source.json"),
                            "--handoff", str(directory / "handoff.json"),
                            "--online-readiness", str(online),
                            "--output", str(result)], cwd=ROOT, check=True, capture_output=True)
            return json.loads(result.read_text(encoding="utf-8"))

    def test_confirmed_source_review_ready_but_never_published(self):
        result = self.run_review(True)
        self.assertTrue(result["review_ready"])
        self.assertFalse(result["deployment_authorized"])
        self.assertFalse(result["deployment_performed"])
        self.assertEqual(result["database_writes"], 0)

    def test_unconfirmed_source_blocks_review(self):
        result = self.run_review(False)
        self.assertFalse(result["review_ready"])
        self.assertIn("PAGES_SOURCE_NOT_CONFIRMED_AS_GH_PAGES_ROOT", result["issues"])


if __name__ == "__main__":
    unittest.main()
