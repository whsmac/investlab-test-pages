// Local review-only CLI. A separate new file is required; never overwrites previous data.
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve,basename} from 'node:path';
import {planSecRefresh} from '../src/market/sec-refresh-review.mjs';
const [previous,candidate,reportPath,snapshotPath]=process.argv.slice(2);
if(!previous||!candidate||!reportPath||!snapshotPath)throw Error('Usage: node scripts/sec-refresh-review.mjs previous.json candidate.json report.json staged.json');
const paths=[previous,candidate,reportPath,snapshotPath].map(resolvePath=>resolve(resolvePath));
if(paths[0]===paths[2]||paths[0]===paths[3]||paths[1]===paths[2]||paths[1]===paths[3]||paths[2]===paths[3])throw Error('Output paths must be distinct from inputs and one another');
for(const p of paths.slice(2))if(basename(p)==='sec-quarterly-financials.json'||p.includes('/data/'))throw Error('Do not write to published assets');
function load(p){const raw=readFileSync(p);if(raw.length>1024*1024)throw Error('Input exceeds 1 MiB');return JSON.parse(raw.toString('utf8'));}
const {report,snapshot}=planSecRefresh(load(previous),load(candidate));
writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
if(snapshot)writeFileSync(snapshotPath,JSON.stringify(snapshot,null,2)+'\n',{flag:'wx'});
console.log(report.status+'; existing source unchanged; publication_allowed=false');
process.exitCode=report.conflicts.length?2:0;
