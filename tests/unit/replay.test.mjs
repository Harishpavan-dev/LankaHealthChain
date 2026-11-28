import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {ReplayGuard} from '../../backend/packages/shared/src/replay.ts';
test('first scoped internal token use accepted, subsequent replay denied',()=>{const g=new ReplayGuard();const id=randomUUID();assert.equal(g.accept(id,1100,1000),true);assert.equal(g.accept(id,1100,1000),false);});
test('expired token denied and stale entries are pruned',()=>{const g=new ReplayGuard();const id=randomUUID();assert.equal(g.accept(id,1000,1000),false);assert.equal(g.accept(id,1001,1000),true);assert.equal(g.accept(id,1002,1001),true);const later=randomUUID();assert.equal(g.accept(later,1200,1100),true);assert.equal(g.seen.size,1);});
test('invalid token identifiers are rejected',()=>{const g=new ReplayGuard();assert.equal(g.accept('not uuid',100,1),false);});
