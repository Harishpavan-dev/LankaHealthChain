/** Zero-dependency diagnostics for local developer environments. No secrets printed. */
import {existsSync,readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const checks=[];
function check(name,ok,detail){checks.push({name,ok,detail});console.log(`${ok?'PASS':'BLOCK'}  ${name}: ${detail}`);}
const [major,minor,patch]=process.versions.node.split('.').map(Number);
check('Node.js >= 22.22.3',major>22||(major===22&&(minor>22||(minor===22&&patch>=3))),process.version);
for(const command of ['pnpm','docker','compact']){
 const r=spawnSync(command,['--version'],{encoding:'utf8',timeout:4000});
 check(command,r.status===0, r.status===0?(r.stdout||r.stderr||'installed').trim().slice(0,90):'not available');
}
const envPath=new URL('../../.env',import.meta.url);
if(!existsSync(envPath))check('Private .env',false,'missing (run: node scripts/setup-local.mjs)');
else {
 const text=readFileSync(envPath,'utf8');
 check('Private .env',!text.includes('CHANGE_'),'exists; placeholder detection only');
}
const passed=checks.filter(c=>c.ok).length;
console.log(`Preflight: ${passed}/${checks.length} checks satisfied.`);
// Toolchain checks can legitimately be missing in offline code-authoring environments.
if(passed!==checks.length)process.exitCode=1;
