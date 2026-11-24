import test from 'node:test';
import assert from 'node:assert/strict';
import {permittedHospitalUrl} from '../../packages/shared/src/hospital-endpoints.ts';
const env={NODE_ENV:'development',HOSPITAL_NORTHERN_URL:'http://hospital-northern:4101'};
test('operator-pinned hospital endpoint permits exact enrolled service URL',()=>{
 assert.equal(permittedHospitalUrl('northern','http://hospital-northern:4101', '/internal/v1/records/abc',env).href,
   'http://hospital-northern:4101/internal/v1/records/abc');
});
test('registry URL or hostname mutation is rejected before outbound fetch',()=>{
 for(const bad of ['http://metadata.google.internal','http://hospital-northern:4102',
   'http://hospital-northern:4101@localhost:1234','http://hospital-northern:4101/other',
   'http://hospital-northern:4101/?x=1'])
  assert.throws(()=>permittedHospitalUrl('northern',bad,'/internal/v1/records/abc',env));
});
test('rejects scheme-less and protocol-relative internal paths',()=>{
 assert.throws(()=>permittedHospitalUrl('northern','http://hospital-northern:4101','//evil.example/path',env));
 assert.throws(()=>permittedHospitalUrl('northern','http://hospital-northern:4101','relative',env));
});
test('production endpoints must use HTTPS',()=>{
 assert.throws(()=>permittedHospitalUrl('northern','http://hospital-northern:4101','/records',{...env,NODE_ENV:'production'}));
 const secure={NODE_ENV:'production',HOSPITAL_NORTHERN_URL:'https://hospital.example.org'};
 assert.equal(permittedHospitalUrl('northern','https://hospital.example.org','/records',secure).protocol,'https:');
});
