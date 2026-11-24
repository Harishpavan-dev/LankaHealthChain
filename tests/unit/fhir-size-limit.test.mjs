import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
for(const f of ['apps/api/src/main.ts','apps/hospital-simulator/src/main.ts']){
 test(`${f} sets an explicit bounded JSON parser above the validated FHIR payload size`,()=>{
  const source=readFileSync(new URL('../../'+f,import.meta.url),'utf8');
  assert.match(source,/NestExpressApplication/);
  assert.match(source,/useBodyParser\('json',\s*\{\s*limit:\s*'300kb'\s*\}\)/);
 });
}
