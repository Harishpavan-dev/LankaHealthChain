import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../../'+p,import.meta.url),'utf8');
test('admin portal uses the recognized network_admin role and never skips the gate',()=>{
 const admin=read('frontend/src/portal-pages/admin.tsx');
 const roles=read('frontend/src/lib/workspaces.ts');
 assert.match(admin,/<Gate role="Network Admin"><Dashboard \/><\/Gate>/);
 assert.match(roles,/name: 'Network Admin', href: '\/admin', role: 'network_admin'/);
 assert.match(admin,/api<DependencyHealth>\('\/admin\/dependencies'\)/);
});
test('Cardano recovery batch queries have a dedicated durable database index',()=>{
 const sql=read('backend/packages/database/prisma/migrations/202611220013_anchor_batch_lookup/migration.sql');
 const schema=read('backend/packages/database/prisma/schema.prisma');
 assert.match(sql,/RecordAnchor_batchId_status_idx/);
 assert.match(schema,/@@index\(\[batchId, status\]\)/);
});
