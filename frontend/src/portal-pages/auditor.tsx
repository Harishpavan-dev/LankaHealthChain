'use client';
import {useEffect,useState} from 'react';
import { api } from '@/lib/auth';
import {Shell,Gate,Metric} from '@/components/portal';
type Event={id:string;action:string;outcome:string;createdAt:string;targetKind?:string};
type Page<T>={items:T[];nextCursor:string|null};
type Summary={access:{action:string;outcome:string;count:number}[];administrative:{action:string;outcome:string;count:number}[];clinicalDataExposed:false};
export function App(){
 return <Gate role="Security Auditor"><Dashboard /></Gate>;
}

function Dashboard(){
 const [summary,setSummary]=useState<Summary|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(true);
 const [events,setEvents]=useState<Event[]>([]),[next,setNext]=useState<string|null>(null);
 const [adminEvents,setAdminEvents]=useState<Event[]>([]),[adminNext,setAdminNext]=useState<string|null>(null);
 async function refresh(){setBusy(true);try{const [s,e,a]=await Promise.all([
 api<Summary>('/security-audit/summary'),api<Page<Event>>('/security-audit/events/page?limit=25'),api<Page<Event>>('/security-audit/admin-events/page?limit=25')]);
 setSummary(s);setEvents(e.items);setNext(e.nextCursor);setAdminEvents(a.items);setAdminNext(a.nextCursor);setError('');
 }catch(e){setError(String(e));}finally{setBusy(false);}}
 useEffect(()=>{void refresh();},[]);
 async function loadMore(isAdmin:boolean){const cursor=isAdmin?adminNext:next;if(!cursor)return;setBusy(true);
 try{const path=isAdmin?'admin-events':'events';const page=await api<Page<Event>>(`/security-audit/${path}/page?limit=25&cursor=${encodeURIComponent(cursor)}`);
 if(isAdmin){setAdminEvents(prev=>[...prev,...page.items]);setAdminNext(page.nextCursor);}else{setEvents(prev=>[...prev,...page.items]);setNext(page.nextCursor);}
 }catch(e){setError(String(e));}finally{setBusy(false);}}
 return <Shell role="Security Auditor" title="Security & audit" subtitle="Review de-identified access and administrative events."
  sections={[[ 'security-outcomes','Security outcomes'],['access-events','Access events'],['administrative-events','Administrative events']]}>
 {error&&<div className="notice error" role="alert">{error}</div>}
 <div className="metric-grid"><Metric label="Access event categories" value={summary?.access.length??'—'}/><Metric label="Administrative categories" value={summary?.administrative.length??'—'}/><Metric label="Clinical records exposed" value="0"/></div>
 <div className="section-head"><h2 id="security-outcomes">Security outcomes</h2><button className="btn secondary" disabled={busy} onClick={refresh}>Refresh</button></div>
 <section className="card" aria-busy={busy}>{summary?summary.access.map(a=><div key={`${a.action}:${a.outcome}`} className="record"><div><div className="record-title">{a.action}</div><div className="record-meta">{a.outcome}</div></div><span className="pill">{a.count} events</span></div>):<p className="empty" role="status">{busy?'Loading audit summary…':'Audit summary is unavailable.'}</p>}</section>
 <div className="section-head"><h2 id="access-events">Access audit events</h2></div>
 <section className="card">{events.length===0&&summary?<p className="empty">No access events available.</p>:events.map(e=><div key={e.id} className="record"><div><div className="record-title">{e.action}</div><div className="record-meta">{new Date(e.createdAt).toLocaleString()}</div></div><span className="pill">{e.outcome}</span></div>)}
 {next&&<button className="btn secondary" disabled={busy} onClick={()=>loadMore(false)}>Load more</button>}</section>
 <div className="section-head"><h2 id="administrative-events">Administrative events</h2></div>
 <section className="card">{adminEvents.length===0&&summary?<p className="empty">No administrative events available.</p>:adminEvents.map(e=><div key={e.id} className="record"><div><div className="record-title">{e.action}</div><div className="record-meta">{e.targetKind} · {new Date(e.createdAt).toLocaleString()}</div></div><span className="pill">{e.outcome}</span></div>)}
 {adminNext&&<button className="btn secondary" disabled={busy} onClick={()=>loadMore(true)}>Load more</button>}</section>
 <div className="notice warning">Patient IDs, clinical FHIR data, actor subjects, and free-text metadata are deliberately excluded from audit responses.</div>
 </Shell>;
}
