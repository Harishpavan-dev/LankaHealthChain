import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../../'+p,import.meta.url),'utf8');
test('admin portal uses the recognized network_admin role and never skips the gate',()=>{
 const admin=read('apps/admin-portal/src/App.tsx');
 const gate=read('packages/web/src/components.tsx');
 assert.match(admin,/<Gate ready=\{ready\} role="Network Admin">/);
 assert.match(gate,/'Network Admin':'network_admin'/);
 assert.match(admin,/api<DependencyHealth>\('\/admin\/dependencies'\)/);
});
test('Cardano recovery batch queries have a dedicated durable database index',()=>{
 const sql=read('packages/database/prisma/migrations/202611220013_anchor_batch_lookup/migration.sql');
 const schema=read('packages/database/prisma/schema.prisma');
 assert.match(sql,/RecordAnchor_batchId_status_idx/);
 assert.match(schema,/@@index\(\[batchId, status\]\)/);
});
