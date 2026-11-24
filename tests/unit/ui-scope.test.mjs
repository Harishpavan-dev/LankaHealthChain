import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const root=new URL('../../',import.meta.url);
const read=f=>readFileSync(new URL(f,root),'utf8');
test('portals use restrained light theme without third party font requests',()=>{
 const css=read('packages/web/src/styles.css');
 assert.match(css,/color-scheme:\s*light/);
 assert.doesNotMatch(css,/fonts\.googleapis|@import url\(/);
 assert.match(css,/prefers-reduced-motion/);
 assert.match(css,/:focus-visible/);
});
test('navigation is a functional anchor and demo status remains prominent',()=>{
 const comp=read('packages/web/src/components.tsx');
 assert.match(comp,/href="#overview"/);
 assert.match(comp,/id="overview"/);
 assert.match(comp,/not Midnight ZK/);
});
