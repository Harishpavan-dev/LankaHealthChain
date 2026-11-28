import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const root=new URL('../../',import.meta.url);
const read=f=>readFileSync(new URL(f,root),'utf8');
test('portals use restrained light theme without third party font requests',()=>{
 const css=read('frontend/src/app/globals.css');
 assert.match(css,/color-scheme:\s*light/);
 assert.doesNotMatch(css,/fonts\.googleapis|@import url\(/);
 assert.match(css,/prefers-reduced-motion/);
 assert.match(css,/:focus-visible/);
});
test('navigation is a functional anchor and demo status remains prominent',()=>{
 const comp=read('frontend/src/components/portal.tsx');
 assert.match(comp,/aria-label="Workspace navigation"/);
 assert.match(comp,/id="overview"/);
 assert.match(comp,/synthetic records and demo consent/);
 assert.doesNotMatch(read('frontend/src/app/globals.css'),/\.sidebar nav[^{}]*\{[^{}]*display\s*:\s*none/);
});
