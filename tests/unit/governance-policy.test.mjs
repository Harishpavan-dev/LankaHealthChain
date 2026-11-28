import test from 'node:test';
import assert from 'node:assert/strict';
import {isActiveHospitalOperator,hasActiveResearchGrant,suppressSmallCells,RESEARCH_MIN_CELL,maskAuditEvent} from '../../backend/packages/shared/src/governance.ts';
const subject='demo-subject',hospital='venus-uuid';
test('hospital operator scope fails closed for another hospital, another subject and revoked assignment',()=>{
 const op={authSubject:subject,hospitalId:hospital,active:true};
 assert.equal(isActiveHospitalOperator(op,subject,hospital),true);
 assert.equal(isActiveHospitalOperator(op,subject,'northern'),false);
 assert.equal(isActiveHospitalOperator(op,'other',hospital),false);
 assert.equal(isActiveHospitalOperator({...op,active:false},subject,hospital),false);
 assert.equal(isActiveHospitalOperator(null,subject,hospital),false);
});
test('research access requires correct subject, active approval and future expiry',()=>{
 const now=new Date('2026-11-22T00:00:00.000Z');
 const grant={authSubject:subject,active:true,expiresAt:new Date('2026-11-23T00:00:00.000Z')};
 assert.equal(hasActiveResearchGrant(grant,subject,now),true);
 for(const bad of [null,{...grant,active:false},{...grant,authSubject:'other'},
  {...grant,expiresAt:new Date('2026-11-21T00:00:00Z')},
  {...grant,expiresAt:'invalid'}]){
   assert.equal(hasActiveResearchGrant(bad,subject,now),false);
 }
});
test('aggregate suppression never reveals a cell containing fewer than 10 records',()=>{
 const rows=[{resourceType:'Observation',count:11},{resourceType:'Condition',count:9},
  {resourceType:'DocumentReference',count:0},{resourceType:'DiagnosticReport',count:10}];
 assert.deepEqual(suppressSmallCells(rows).map(x=>x.resourceType),['Observation','DiagnosticReport']);
 assert.equal(RESEARCH_MIN_CELL,10);
 assert.throws(()=>suppressSmallCells(rows,2));
});
test('security-auditor event projection drops all patient, doctor, actor and clinical details',()=>{
 const input={id:'event-id',action:'RECORD_ACCESS',outcome:'DENIED',createdAt:'2026-11-22T00:00:00.000Z',
  patientId:'private-patient',actorSub:'private-doctor',recordIndexId:'private-record',metadata:{diagnosis:'sensitive'}};
 const redacted=maskAuditEvent(input);
 assert.deepEqual(Object.keys(redacted).sort(),['action','createdAt','id','outcome']);
 assert.doesNotMatch(JSON.stringify(redacted),/private-patient|private-doctor|private-record|sensitive/);
});
