import test from 'node:test';
import assert from 'node:assert/strict';
import {cardanoMetadataUrl,configuredHttpBase,parseCorsOrigins,parseListenPort,requiredConfig} from '../../packages/shared/src/runtime-config.ts';

test('environment values reject missing and unfilled secrets',()=>{
 assert.equal(requiredConfig('HELLO',{HELLO:'value'}),'value');
 for(const v of ['',undefined,'CHANGE_ME','REPLACE_SECRET','YOUR_KEY','postgresql://host/db?password=CHANGE_PASSWORD'])
   assert.throws(()=>requiredConfig('API_KEY',{API_KEY:v}));
});
test('service ports are operator-configured and strictly numeric',()=>{
 assert.equal(parseListenPort('4101'),4101);
 for(const p of [undefined,'','0','65536','1.5','-1',' 3000','1e3'])
   assert.throws(()=>parseListenPort(p));
});
test('CORS requires explicit allowlist and excludes wildcard or URL path',()=>{
 assert.deepEqual(parseCorsOrigins('http://localhost:5173,https://portal.example.org'),['http://localhost:5173','https://portal.example.org']);
 for(const c of [undefined,'','*','http://localhost:5173, *','https://example.org/path','https://u:p@example.org','https://x.org,https://x.org'])
   assert.throws(()=>parseCorsOrigins(c));
 assert.throws(()=>parseCorsOrigins('http://localhost:5173',true));
 assert.deepEqual(parseCorsOrigins('https://portal.example.org',true),['https://portal.example.org']);
});
test('Cardano provider is not hard coded and handles hash safely',()=>{
 const tx='Ab'.repeat(32);
 assert.equal(cardanoMetadataUrl('https://api.blockfrost.example/v0/',tx).href,
   `https://api.blockfrost.example/v0/txs/${tx.toLowerCase()}/metadata`);
 for(const url of ['http://169.254.169.254/latest','ftp://remote.example','https://user:pass@api.example','https://api.example/v0?apiKey=secrets'])
   assert.throws(()=>cardanoMetadataUrl(url,tx));
 assert.throws(()=>cardanoMetadataUrl('https://api.example/v0','../bad'));
 assert.throws(()=>configuredHttpBase('http://localhost:8080','KEYCLOAK',true));
});
