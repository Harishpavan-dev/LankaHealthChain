#!/usr/bin/env node
/** Zero-dependency contract consistency checker. Not a live HTTP conformance test. */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
const root=new URL('../../',import.meta.url);
const base=new URL('.',root);
const get=(path)=>readFileSync(new URL(path,base),'utf8');
const doc=JSON.parse(get('docs/api/openapi.json'));
function fail(s){throw new Error(s);}
if(doc.openapi!=='3.1.0')fail('Expected OpenAPI 3.1');
const routeMap=new Map();
for(const name of readdirSync(new URL('apps/api/src/modules/',base)).filter(x=>x.endsWith('.controller.ts')).concat(['health.controller.ts'])){
 const file=name==='health.controller.ts'?'apps/api/src/health.controller.ts':`apps/api/src/modules/${name}`;
 const code=get(file);
 const ctrl=code.match(/@Controller\(([^)]*)\)/);
 if(!ctrl) fail(`Missing controller annotation in ${file}`);
 const path=ctrl[1].match(/path\s*:\s*['"]([^'"]+)['"]/)?.[1] || (ctrl[1].trim().startsWith("'") ? ctrl[1].trim().slice(1).split("'")[0] : '');
 for(const hit of code.matchAll(/@(Get|Post)\(([^)]*)\)/g)){
  const method=hit[1].toLowerCase();
  const inner=hit[2].trim();
  const suffix=inner.match(/['"]([^'"]+)['"]/)?.[1] || '';
  const normalized=('/'+[path,suffix].filter(Boolean).join('/')).replace(/:([\w]+)/g,'{$1}');
  const key=`${method.toUpperCase()} ${normalized}`;
  if(routeMap.has(key)) fail(`Duplicate backend route ${key}`);
  routeMap.set(key,file);
 }
}
let count=0;
const securityNames=new Set(Object.keys(doc.components.securitySchemes));
for(const [path,methods] of Object.entries(doc.paths)){
 for(const [verb,endpoint] of Object.entries(methods)){
  const key=`${verb.toUpperCase()} ${path}`;
  if(!routeMap.has(key))fail(`Documented operation absent in NestJS controller: ${key}`);
  routeMap.delete(key); count++;
  if(!endpoint.operationId||!endpoint.summary||!endpoint['x-required-role'])fail(`Missing operation documentation: ${key}`);
  if(endpoint['x-required-role']!=='public' && !(endpoint.security||[]).some(x=>Object.keys(x).some(name=>securityNames.has(name))))fail(`Unauthenticated protected endpoint in spec: ${key}`);
  if(endpoint['x-required-role']==='public' && (endpoint.security||[]).length)fail(`Public health endpoint claims auth: ${key}`);
  const responseKeys=Object.keys(endpoint.responses);
  if(!responseKeys.some(x=>/^2\d\d$/.test(x)))fail(`Missing success response ${key}`);
  for(const response of Object.values(endpoint.responses)){
   if(!response.description)fail(`Missing response description ${key}`);
  }
 }
}
if(routeMap.size)fail(`Undocumented backend routes: ${[...routeMap.keys()].join(', ')}`);
function refs(o,loc='root'){
 if(o===null||typeof o!=='object')return;
 if(typeof o.$ref==='string'){
  const name=o.$ref.match(/^#\/components\/schemas\/([A-Za-z0-9]+)$/)?.[1];
  if(!name || !Object.hasOwn(doc.components.schemas,name))fail(`Dangling JSON schema ref ${o.$ref} in ${loc}`);
 }
 for(const [k,v] of Object.entries(o))refs(v,loc+'.'+k);
}
refs(doc);
console.log(`PASS: ${count} OpenAPI operations match all implemented NestJS controllers; $refs and security requirements valid`);
