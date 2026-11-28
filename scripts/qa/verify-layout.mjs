#!/usr/bin/env node
/** Verify the source layout and monorepo links without installing dependencies. */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
const root = resolve('.');
const failures=[];
const ensure=(condition,message)=>{if(!condition) failures.push(message)};
const back=['api','hospital-simulator','worker'];
const sharedBackend=['database','hospital-database','shared'];
const manifests=['frontend',...back.map(n=>`backend/apps/${n}`),...sharedBackend.map(n=>`backend/packages/${n}`)];
ensure(!existsSync('apps')&&!existsSync('packages'),'Legacy root apps or packages still exist');
ensure(!existsSync('frontend/apps')&&!existsSync('frontend/packages'),'Six Vite workspaces must be consolidated into Next.js');
const workspace=readFileSync('pnpm-workspace.yaml','utf8');
for(const glob of ['frontend','backend/apps/*','backend/packages/*']) ensure(workspace.includes(`'${glob}'`),`pnpm workspace missing ${glob}`);
for(const rel of manifests){
 const filename=`${rel}/package.json`;
 ensure(existsSync(filename),`Workspace manifest missing: ${filename}`);
 if(!existsSync(filename))continue;
 const data=JSON.parse(readFileSync(filename,'utf8'));
 ensure(data.private===true,`${filename} must be private`);
 const ts=join(rel,'tsconfig.json');
 if(existsSync(ts)){
  const doc=JSON.parse(readFileSync(ts,'utf8'));
  ensure(existsSync(resolve(dirname(ts),doc.extends||'')),`Broken tsconfig reference: ${ts}`);
 }
}
for(const slug of ['patient','doctor','admin','hospital-admin','auditor','researcher']){
 ensure(existsSync(`frontend/src/app/${slug}/page.tsx`),`Missing Next.js route /${slug}`);
 ensure(existsSync(`frontend/src/portal-pages/${slug}.tsx`),`Missing migrated ${slug} dashboard`);
}
ensure(existsSync('frontend/src/app/layout.tsx'),'Next.js root layout missing');
ensure(existsSync('frontend/src/lib/auth.ts'),'Keycloak frontend authorization missing');
// Runtime resources must still resolve from their moved source directories.
for(const [source,resource] of [
 ['backend/apps/api/src/main.ts','../../../../docs/api/openapi.json'],
 ['backend/packages/database/prisma/seed.ts','../../../../demo/fixtures/records.json'],
 ['backend/packages/database/prisma/seed.ts','../../../../demo/fixtures/population.json'],
 ['backend/packages/hospital-database/prisma/seed.ts','../../../../demo/fixtures/records.json'],
 ['backend/packages/hospital-database/prisma/seed.ts','../../../../demo/fixtures/population.json']
]){
 ensure(existsSync(resolve(dirname(source),resource)),`Broken runtime data reference: ${source} -> ${resource}`);
 ensure(readFileSync(source,'utf8').includes(resource),`Runtime resource path is not present in ${source}: ${resource}`);
}
// No relative source imports should point to a pre-refactor directory.
for(const rel of ['backend/apps/worker/src/anchor-worker.ts','backend/apps/worker/src/anchor-engine.ts','backend/apps/worker/src/prepare-anchors.ts']){
 const code=readFileSync(rel,'utf8');
 for(const match of code.matchAll(/from\s+['"](\.\.[^'"]+)['"]/g)){
  const spec=match[1];
  const target=resolve(dirname(rel),spec).replace(/\.js$/,'.ts');
  ensure(existsSync(target),`Broken backend relative source import: ${rel} -> ${spec}`);
 }
}
for(const rel of ['README.md','frontend/README.md','backend/README.md','docs/installation-guide.md','docs/project-structure.md']){
 ensure(existsSync(rel),`Missing English-only entry documentation: ${rel}`);
}
let docsChecked=0;
function walk(dir){for(const entry of readdirSync(dir,{withFileTypes:true})){
 const p=join(dir,entry.name);
 if(entry.isDirectory())walk(p);
 else if(entry.name.endsWith('.md')){
  docsChecked++;
  const content=readFileSync(p,'utf8');
  ensure(!/[\u0B80-\u0BFF]/u.test(content),`Non-English Tamil script in documentation: ${p}`);
 }
}}
walk('docs');
if(failures.length){for(const problem of failures)console.error('FAIL:',problem);process.exitCode=1;}
else console.log(`PASS: ${manifests.length} pnpm workspaces, TypeScript paths, worker imports and ${docsChecked} English documentation files`);
