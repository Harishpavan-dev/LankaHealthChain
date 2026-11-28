import test from 'node:test';
import assert from 'node:assert/strict';
import {isDoctorOperational} from '../../packages/shared/src/doctor-policy.ts';
const doctor={id:'d1',hospitalId:'h1',active:true,verified:true};
const hospital={id:'h1',active:true};
test('only currently verified active doctors at their active hospital may receive records',()=>{
 assert.equal(isDoctorOperational(doctor,hospital),true);
 for(const invalid of [null,{...doctor,active:false},{...doctor,verified:false},{...doctor,hospitalId:'h2'}])
   assert.equal(isDoctorOperational(invalid,hospital),false);
 for(const invalid of [null,{...hospital,active:false},{...hospital,id:'h2'}])
   assert.equal(isDoctorOperational(doctor,invalid),false);
});
