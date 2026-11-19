"""Static safety contract for explicitly approved TEST-only Pages deployment."""
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class ActionsDeployContract(unittest.TestCase):
    def test_only_test_repo_default_branch_can_deploy(self):
        workflow = (ROOT / ".github/workflows/test-yahoo-pages-deploy.yml").read_text(encoding="utf-8")
        self.assertIn("github.repository == 'whsmac/investlab-test-pages'", workflow)
        self.assertIn("github.ref == 'refs/heads/main'", workflow)
        self.assertIn("ref: feature/test-navigation-20261112", workflow)
        self.assertIn("persist-credentials: false", workflow)
        self.assertIn("pages: write", workflow)
        self.assertIn("id-token: write", workflow)
        self.assertNotIn("supabase", workflow.lower().replace("no supabase access", "").replace("no supabase", ""))

    def test_gate_before_deployment(self):
        workflow = (ROOT / ".github/workflows/test-yahoo-pages-deploy.yml").read_text(encoding="utf-8")
        steps = ["scripts.yahoo_price_probe_test", "scripts.check_yahoo_publication_preflight",
                 "scripts.build_gated_yahoo_public_review", "scripts.stage_yahoo_test_pages_asset",
                 "scripts.assemble_yahoo_test_site_preview", "scripts.validate_yahoo_test_site_preview",
                 "actions/upload-pages-artifact@v3", "actions/deploy-pages@v4"]
        workflow = workflow.replace("scripts/yahoo_price_probe_test.py", "scripts.yahoo_price_probe_test")
        indices = [workflow.index(step) for step in steps]
        self.assertEqual(indices, sorted(indices))
        self.assertIn("cancel-in-progress: false", workflow)


if __name__ == "__main__":
    unittest.main()
