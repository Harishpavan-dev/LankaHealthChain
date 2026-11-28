import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import {consumeServiceToken} from '../../backend/packages/shared/src/consume-token.ts';
function ledger(){
 const accepted = new Set();
 return {usedServiceToken:{async create({data}){
   // In Postgres a unique primary key implements this atomic check.
   if(accepted.has(data.jti))throw {code:'P2002'};
   accepted.add(data.jti);
 }}};
}
test('durable service-token ledger accepts a token exactly once', async()=>{
 const db=ledger();const claims={jti:randomUUID(),exp:1045};
 assert.equal(await consumeServiceToken(db,claims,1000),true);
 assert.equal(await consumeServiceToken(db,claims,1000),false);
});
test('multiple replicas race for same token, only one may win',async()=>{
 const db=ledger(),claim={jti:randomUUID(),exp:1045};
 assert.deepEqual((await Promise.all(Array.from({length:20},()=>consumeServiceToken(db,claim,1000)))).filter(Boolean),[true]);
});
test('invalid, expired or excessively long tokens never touch DB',async()=>{
 const db={usedServiceToken:{async create(){throw Error('DB should not be used')}}};
 for(const c of [{jti:'wrong',exp:1045},{jti:randomUUID(),exp:1000},{jti:randomUUID(),exp:1046}])
  assert.equal(await consumeServiceToken(db,c,1000),false);
});
test('database failure rejects service token; never falls back to memory',async()=>{
 const db={usedServiceToken:{async create(){throw Error('database down')}}};
 await assert.rejects(consumeServiceToken(db,{jti:randomUUID(),exp:1045},1000),/database down/);
});
