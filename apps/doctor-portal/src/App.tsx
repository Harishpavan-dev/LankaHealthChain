import { useEffect,useState } from 'react';
import { api,authenticate } from '@lhc/web/auth';
import { Shell,Gate,Metric } from '@lhc/web/components';
type Request={id:string;status:string;purpose:string;requestedTypes:string[];createdAt:string;decisionDeadlineAt:string};
const DEMO_PATIENT_ID='b1111111-1111-4111-8111-111111111111';
export function App(){
 const [ready,setReady]=useState(false),[requests,setRequests]=useState<Request[]>([]),[patientId,setPatientId]=useState(DEMO_PATIENT_ID),[types,setTypes]=useState(['Observation','DiagnosticReport']),[purpose,setPurpose]=useState('treatment'),[duration,setDuration]=useState(60),[records,setRecords]=useState<unknown[]>([]),[nextCursor,setNextCursor]=useState<string|null>(null),[activeRequest,setActiveRequest]=useState<string|null>(null),[systolic,setSystolic]=useState(120),[created,setCreated]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{authenticate().then(setReady).catch(e=>setError(String(e)));},[]);
 async function refresh(){try{setRequests(await api<Request[]>('/access-requests/mine'));setError('');}catch(e){setError(String(e));}}
 useEffect(()=>{if(ready)void refresh();},[ready]);
 async function create(){setBusy(true);try{await api('/access-requests',{method:'POST',body:JSON.stringify({patientId,purpose,requestedTypes:types,requestedDurationMinutes:duration})});await refresh();}catch(e){setError(String(e));}finally{setBusy(false);}}
 async function createObservation(){setBusy(true);setCreated('');try{
  const record={resourceType:'Observation',status:'final',
   category:[{coding:[{system:'http://terminology.hl7.org/CodeSystem/observation-category',code:'vital-signs'}]}],
   code:{coding:[{system:'http://loinc.org',code:'8480-6',display:'Systolic blood pressure'}]},
   valueQuantity:{value:systolic,unit:'mmHg',system:'http://unitsofmeasure.org',code:'mm[Hg]'}};
  if(!Number.isFinite(systolic)||systolic<1||systolic>300)throw new Error('Enter a synthetic value between 1 and 300');
  const result=await api<{id:string;anchorStatus:string}>('/records',{method:'POST',body:JSON.stringify({patientId,resource:record})});
  setCreated(`Record ${result.id} created in your hospital. Cardano anchor: ${result.anchorStatus}.`);
 }catch(e){setError(String(e));}finally{setBusy(false);}}
 async function getRecords(id:string,cursor?:string){setBusy(true);if(!cursor){setRecords([]);setNextCursor(null);}try{
   const path=`/access-requests/${id}/records/page?limit=25${cursor?`&cursor=${encodeURIComponent(cursor)}`:''}`;
   const page=await api<{items:unknown[];nextCursor:string|null}>(path);
   setRecords(prev=>cursor?[...prev,...page.items]:page.items);
   setNextCursor(page.nextCursor);setActiveRequest(id);setError('');
 }catch(e){setError(String(e));}finally{setBusy(false);}}
 return <Gate ready={ready} role="Doctor"><Shell title="Clinical workspace" kicker="Doctor overview" subtitle="Request patient-approved, cross-hospital synthetic records" role="Doctor">
 {error&&<div className="notice error" role="alert">{error}</div>}
 <div className="grid"><Metric icon="▤" label="Access requests" value={requests.length}/><Metric icon="✓" label="Approved" value={requests.filter(r=>r.status==='APPROVED').length}/><Metric icon="♧" label="Hospital network" value="3"/></div>
 <div className="section-head"><h2>New record access request</h2></div><div className="card">
 <div className="field"><label>Patient ID (synthetic demo)</label><input className="input" value={patientId} onChange={e=>setPatientId(e.target.value)}/></div>
 <div className="form-grid"><div className="field"><label>Purpose</label><select className="input" value={purpose} onChange={e=>setPurpose(e.target.value)}><option value="treatment">Treatment</option><option value="follow-up">Follow-up</option></select></div>
 <div className="field"><label>Expiry (minutes)</label><input className="input" type="number" min="1" max="1440" value={duration} onChange={e=>setDuration(Number(e.target.value))}/></div></div>
 <div className="field"><label>Requested FHIR resource types</label>{['Observation','DiagnosticReport','MedicationRequest','AllergyIntolerance','Condition'].map(type=><label key={type} style={{display:'inline-block',marginRight:15,fontWeight:500}}><input type="checkbox" checked={types.includes(type)} onChange={e=>setTypes(e.target.checked?[...types,type]:types.filter(t=>t!==type))}/> {type}</label>)}</div>
 <button className="btn" disabled={busy||types.length===0} onClick={create}>Submit approval request</button></div>
 <div className="section-head"><h2>Create a synthetic medical record</h2></div>
 <div className="card"><p className="muted">Stores a FHIR Observation in your own hospital database. For demonstration only; this is not medical advice.</p>
 <div className="field"><label>Synthetic systolic blood pressure (mmHg)</label><input className="input" type="number" min="1" max="300" value={systolic} onChange={e=>setSystolic(Number(e.target.value))}/></div>
 <button className="btn" disabled={busy} onClick={createObservation}>Save synthetic Observation</button>
 {created&&<p className="notice">{created}</p>}</div>
 <div className="section-head"><h2>Previous requests</h2><button className="btn secondary" onClick={refresh}>Refresh</button></div><div className="card">{requests.length===0?<div className="empty">No requests submitted yet.</div>:requests.map(r=><div className="record" key={r.id}><div><div className="record-title">{r.purpose} · {r.requestedTypes.join(', ')}</div><div className="record-meta">{r.status==='PENDING' && new Date(r.decisionDeadlineAt).getTime()<=Date.now()?'EXPIRED':r.status} · Requested {new Date(r.createdAt).toLocaleString()} · Approval deadline {new Date(r.decisionDeadlineAt).toLocaleString()}</div></div>{r.status==='APPROVED'&&<button className="btn" disabled={busy} onClick={()=>getRecords(r.id)}>View records</button>}</div>)}</div>
 {records.length>0&&<><div className="section-head"><h2>Fetched synthetic FHIR records</h2></div><pre className="json">{JSON.stringify(records,null,2)}</pre>
 {nextCursor&&activeRequest&&<button className="btn secondary" disabled={busy} onClick={()=>getRecords(activeRequest,nextCursor)}>Load more records</button>}</>}
 </Shell></Gate>;
}
