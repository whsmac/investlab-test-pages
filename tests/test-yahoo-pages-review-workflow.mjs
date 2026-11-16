import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const workflow=readFileSync(new URL("../.github/workflows/test-yahoo-pages-manual.yml",import.meta.url),"utf8");
test("manual TEST Pages review never deploys or requests write permissions",()=>{
 assert.match(workflow,/workflow_dispatch:/);
 assert.match(workflow,/contents: read/);
 assert.match(workflow,/actions: read/);
 assert.doesNotMatch(workflow,/pages: write|id-token: write|actions\/deploy-pages@|actions\/upload-pages-artifact@|actions\/configure-pages@/);
});
test("review bundle preserves existing TEST site and adds JSON",()=>{
 assert.match(workflow,/scripts\.assemble_yahoo_test_site_preview/);
 assert.match(workflow,/scripts\.validate_yahoo_test_site_preview/);
 assert.doesNotMatch(workflow,/tar --exclude|cp yahoo-staged/);
 assert.match(workflow,/actions\/upload-artifact@v4/);
});
