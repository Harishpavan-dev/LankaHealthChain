import { useEffect,useState } from 'react';
import { api,authenticate } from '@lhc/web/auth';
import { Shell,Gate,Metric } from '@lhc/web/components';
type Request={id:string;status:string;purpose:string;requestedTypes:string[];createdAt:string};
const DEMO_PATIENT_ID='b1111111-1111-4111-8111-111111111111';
export function App(){
 const [ready,setReady]=useState(false),[requests,setRequests]=useState<Request[]>([]),[patientId,setPatientId]=useState(DEMO_PATIENT_ID),[types,setTypes]=useState(['Observation','DiagnosticReport']),[purpose,setPurpose]=useState('treatment'),[duration,setDuration]=useState(60),[records,setRecords]=useState<unknown[]>([]),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{authenticate().then(setReady).catch(e=>setError(String(e)));},[]);
 async function refresh(){try{setRequests(await api<Request[]>('/access-requests/mine'));setError('');}catch(e){setError(String(e));}}
 useEffect(()=>{if(ready)void refresh();},[ready]);
 async function create(){setBusy(true);try{await api('/access-requests',{method:'POST',body:JSON.stringify({patientId,purpose,requestedTypes:types,requestedDurationMinutes:duration})});await refresh();}catch(e){setError(String(e));}finally{setBusy(false);}}
 async function getRecords(id:string){setBusy(true);try{setRecords(await api<unknown[]>(`/access-requests/${id}/records`));setError('');}catch(e){setError(String(e));}finally{setBusy(false);}}
 return <Gate ready={ready} role="Doctor"><Shell title="Clinical workspace" kicker="Doctor overview" subtitle="Request patient-approved, cross-hospital synthetic records" role="Doctor">
 {error&&<div className="notice error">{error}</div>}
 <div className="grid"><Metric icon="▤" label="Access requests" value={requests.length}/><Metric icon="✓" label="Approved" value={requests.filter(r=>r.status==='APPROVED').length}/><Metric icon="♧" label="Hospital network" value="3"/></div>
 <div className="section-head"><h2>New record access request</h2></div><div className="card">
 <div className="field"><label>Patient ID (synthetic demo)</label><input className="input" value={patientId} onChange={e=>setPatientId(e.target.value)}/></div>
 <div className="form-grid"><div className="field"><label>Purpose</label><select className="input" value={purpose} onChange={e=>setPurpose(e.target.value)}><option value="treatment">Treatment</option><option value="follow-up">Follow-up</option></select></div>
 <div className="field"><label>Expiry (minutes)</label><input className="input" type="number" min="1" max="1440" value={duration} onChange={e=>setDuration(Number(e.target.value))}/></div></div>
 <div className="field"><label>Requested FHIR resource types</label>{['Observation','DiagnosticReport','MedicationRequest','AllergyIntolerance','Condition'].map(type=><label key={type} style={{display:'inline-block',marginRight:15,fontWeight:500}}><input type="checkbox" checked={types.includes(type)} onChange={e=>setTypes(e.target.checked?[...types,type]:types.filter(t=>t!==type))}/> {type}</label>)}</div>
 <button className="btn" disabled={busy||types.length===0} onClick={create}>Submit approval request</button></div>
 <div className="section-head"><h2>Previous requests</h2><button className="btn secondary" onClick={refresh}>Refresh</button></div><div className="card">{requests.length===0?<div className="empty">No requests submitted yet.</div>:requests.map(r=><div className="record" key={r.id}><div><div className="record-title">{r.purpose} · {r.requestedTypes.join(', ')}</div><div className="record-meta">{r.status} · {new Date(r.createdAt).toLocaleString()}</div></div>{r.status==='APPROVED'&&<button className="btn" disabled={busy} onClick={()=>getRecords(r.id)}>View records</button>}</div>)}</div>
 {records.length>0&&<><div className="section-head"><h2>Verified synthetic FHIR data</h2></div><pre className="json">{JSON.stringify(records,null,2)}</pre></>}
 </Shell></Gate>;
}
