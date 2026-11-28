import {useEffect,useState} from 'react';
import {api,authenticate} from '@lhc/web/auth';
import {Shell,Gate,Metric} from '@lhc/web/components';
type HospitalEntry={hospital:{code:string;id:string;name:string}};
type Doctor={id:string;displayName:string;verified:boolean;active:boolean};
type Page<T>={items:T[];nextCursor:string|null};
type Overview={hospital:{code:string;name:string};doctors:number;verifiedDoctors:number;localRecordReferences:number;pendingRequests:number};
type Audit={id:string;action:string;outcome:string;targetKind:string;createdAt:string};
export function App(){
 const [ready,setReady]=useState(false),[error,setError]=useState(''),[busy,setBusy]=useState(false),
 [newDoctorSubject,setNewDoctorSubject]=useState(''),[newDoctorName,setNewDoctorName]=useState('');
 const [hospitals,setHospitals]=useState<HospitalEntry[]>([]),[code,setCode]=useState(''),[overview,setOverview]=useState<Overview|null>(null);
 const [doctors,setDoctors]=useState<Doctor[]>([]),[doctorNext,setDoctorNext]=useState<string|null>(null),
 [audits,setAudits]=useState<Audit[]>([]),[auditNext,setAuditNext]=useState<string|null>(null);
 useEffect(()=>{authenticate().then(setReady).catch(e=>setError(String(e)));},[]);
 useEffect(()=>{if(ready)void api<HospitalEntry[]>('/hospital-admin/hospitals').then(h=>{setHospitals(h);setCode(h[0]?.hospital.code??'');}).catch(e=>setError(String(e)));},[ready]);
 async function refresh(active:string){
  if(!active)return;
  setBusy(true);
  try {const prefix=`/hospital-admin/hospitals/${encodeURIComponent(active)}`;
   const [overview,people,audit]=await Promise.all([api<Overview>(prefix+'/overview'),api<Page<Doctor>>(prefix+'/doctors/page?limit=25'),api<Page<Audit>>(prefix+'/audit/page?limit=25')]);
   setOverview(overview);setDoctors(people.items);setDoctorNext(people.nextCursor);setAudits(audit.items);setAuditNext(audit.nextCursor);setError('');
  }catch(e){setError(String(e));}finally{setBusy(false);}
 }
 useEffect(()=>{if(ready&&code)void refresh(code);},[ready,code]);
 async function loadMore(kind:'doctors'|'audit'){
  const cursor=kind==='doctors'?doctorNext:auditNext;if(!cursor)return;setBusy(true);
  try{
   const path=`/hospital-admin/hospitals/${encodeURIComponent(code)}/${kind}/page?limit=25&cursor=${encodeURIComponent(cursor)}`;
   if(kind==='doctors'){
    const page=await api<Page<Doctor>>(path);
    setDoctors(prev=>[...prev,...page.items]);setDoctorNext(page.nextCursor);
   }else{
    const page=await api<Page<Audit>>(path);
    setAudits(prev=>[...prev,...page.items]);setAuditNext(page.nextCursor);
   }
  }catch(e){setError(String(e));}finally{setBusy(false);}
 }
 async function enroll(){
  if(newDoctorSubject.length<5||newDoctorName.length<3)return;
  setBusy(true);try{
   await api(`/hospital-admin/hospitals/${encodeURIComponent(code)}/doctors`,{
    method:'POST',body:JSON.stringify({authSubject:newDoctorSubject,displayName:newDoctorName})});
   setNewDoctorSubject('');setNewDoctorName('');await refresh(code);
  }catch(e){setError(String(e));}finally{setBusy(false);}
 }
 async function changeDoctor(doctor:Doctor,key:'verified'|'active'){
  if(doctor[key]&&!window.confirm(`Disable ${key} for ${doctor.displayName}?`))return;
  setBusy(true);try {await api(`/hospital-admin/hospitals/${encodeURIComponent(code)}/doctors/${doctor.id}`,{
   method:'PATCH',body:JSON.stringify({[key]:!doctor[key]})});await refresh(code);
  }catch(e){setError(String(e));}finally{setBusy(false);}
 }
 return <Gate ready={ready} role="Hospital Admin"><Shell title="Hospital administration" kicker="Institution workspace" subtitle="Doctor verification and hospital-specific operational oversight" role="Hospital Admin">
 {error&&<div className="notice error" role="alert">{error}</div>}
 <section className="card" aria-label="Hospital selector"><div className="field"><label htmlFor="hospital-select">Assigned hospital</label>
 <select id="hospital-select" className="input" value={code} onChange={e=>setCode(e.target.value)} disabled={busy}>{hospitals.map(h=><option value={h.hospital.code} key={h.hospital.id}>{h.hospital.name}</option>)}</select></div>
 {hospitals.length===0&&<div className="empty">No active hospital assignment. Contact the Network Administrator.</div>}</section>
 {overview&&<><div className="grid"><Metric icon="▤" label="Doctors" value={overview.doctors}/><Metric icon="✓" label="Active verified doctors" value={overview.verifiedDoctors}/><Metric icon="◷" label="Pending requests" value={overview.pendingRequests}/></div>
 <div className="section-head" id="clinicians"><h2>Doctor access governance</h2><button className="btn secondary" disabled={busy} onClick={()=>refresh(code)}>Refresh</button></div>
 <details className="card"><summary className="record-title">Enroll a new synthetic doctor identity</summary>
 <p className="muted">New clinicians start inactive and unverified. A Keycloak doctor role must be provisioned separately.</p>
 <div className="form-grid"><div className="field"><label htmlFor="clinician-name">Display name</label><input id="clinician-name" className="input" value={newDoctorName} onChange={e=>setNewDoctorName(e.target.value)}/></div>
 <div className="field"><label htmlFor="clinician-subject">Keycloak subject</label><input id="clinician-subject" className="input" value={newDoctorSubject} onChange={e=>setNewDoctorSubject(e.target.value)}/></div></div>
 <button className="btn" disabled={busy||newDoctorName.length<3||newDoctorSubject.length<5} onClick={enroll}>Enroll inactive doctor</button></details>
 <section className="card">{doctors.length===0?<p className="empty">No doctors enrolled.</p>:doctors.map(d=><div className="record" key={d.id}>
 <div><div className="record-title">{d.displayName}</div><div className="record-meta">{d.active?'Active':'Inactive'} · {d.verified?'Verified':'Not verified'}</div></div>
 <div className="actions"><button className="btn outline" disabled={busy} onClick={()=>changeDoctor(d,'verified')}>{d.verified?'Remove verification':'Verify'}</button>
 <button className="btn secondary" disabled={busy} onClick={()=>changeDoctor(d,'active')}>{d.active?'Deactivate':'Activate'}</button></div></div>)}
 {doctorNext&&<button className="btn secondary" disabled={busy} onClick={()=>loadMore('doctors')}>Load more doctors</button>}</section>
 <div className="section-head" id="audit"><h2>Hospital administration audit</h2></div><section className="card">
 {audits.length===0?<p className="empty">No administrative changes yet.</p>:audits.map(e=><div className="record" key={e.id}><div><div className="record-title">{e.action}</div><div className="record-meta">{e.targetKind} · {new Date(e.createdAt).toLocaleString()}</div></div><span className="pill">{e.outcome}</span></div>)}
 {auditNext&&<button className="btn secondary" disabled={busy} onClick={()=>loadMore('audit')}>Load more audit events</button>}</section></>}
 <div className="notice warning">This portal does not grant access to clinical records. Staff identity provisioning remains external to the application.</div>
 </Shell></Gate>;
}
