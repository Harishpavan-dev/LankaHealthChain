/** Zero-dependency diagnostics for local developer environments. No secrets printed. */
import {existsSync,readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const checks=[];
function check(name,ok,detail){checks.push({name,ok,detail});console.log(`${ok?'PASS':'BLOCK'}  ${name}: ${detail}`);}
const [major,minor,patch]=process.versions.node.split('.').map(Number);
check('Node.js >= 22.22.3',major>22||(major===22&&(minor>22||(minor===22&&patch>=3))),process.version);
const commandOptions={encoding:'utf8',timeout:12000};
const pnpm=process.platform==='win32'
 ? spawnSync(process.env.ComSpec||'cmd.exe',['/d','/c','pnpm.cmd --version'],commandOptions)
 : spawnSync('pnpm',['--version'],commandOptions);
check('pnpm',pnpm.status===0,pnpm.status===0?pnpm.stdout.trim():'not available');

const docker=spawnSync('docker',['info','--format','{{.ServerVersion}}'],commandOptions);
check('Docker Engine',docker.status===0,docker.status===0?docker.stdout.trim():'not reachable');

const compact=spawnSync('compact',['compile','--version'],commandOptions);
const compactVersion=(compact.stdout||'').trim();
if(compact.status===0&&/\b0\.36\.1\b/.test(compactVersion))console.log(`PASS  Midnight Compact: ${compactVersion}`);
else console.log('SKIP  Midnight Compact: compiler 0.36.1 is only required to build the contract');
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
