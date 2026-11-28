import {useEffect,useState} from 'react';
import {api,authenticate} from '@lhc/web/auth';
import {Shell,Gate,Metric} from '@lhc/web/components';
type Event={id:string;action:string;outcome:string;createdAt:string;targetKind?:string};
type Page<T>={items:T[];nextCursor:string|null};
type Summary={access:{action:string;outcome:string;count:number}[];administrative:{action:string;outcome:string;count:number}[];clinicalDataExposed:false};
export function App(){
 const [ready,setReady]=useState(false),[summary,setSummary]=useState<Summary|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const [events,setEvents]=useState<Event[]>([]),[next,setNext]=useState<string|null>(null);
 const [adminEvents,setAdminEvents]=useState<Event[]>([]),[adminNext,setAdminNext]=useState<string|null>(null);
 useEffect(()=>{authenticate().then(setReady).catch(e=>setError(String(e)));},[]);
 async function refresh(){setBusy(true);try{const [s,e,a]=await Promise.all([
 api<Summary>('/security-audit/summary'),api<Page<Event>>('/security-audit/events/page?limit=25'),api<Page<Event>>('/security-audit/admin-events/page?limit=25')]);
 setSummary(s);setEvents(e.items);setNext(e.nextCursor);setAdminEvents(a.items);setAdminNext(a.nextCursor);setError('');
 }catch(e){setError(String(e));}finally{setBusy(false);}}
 useEffect(()=>{if(ready)void refresh();},[ready]);
 async function loadMore(isAdmin:boolean){const cursor=isAdmin?adminNext:next;if(!cursor)return;setBusy(true);
 try{const path=isAdmin?'admin-events':'events';const page=await api<Page<Event>>(`/security-audit/${path}/page?limit=25&cursor=${encodeURIComponent(cursor)}`);
 if(isAdmin){setAdminEvents(prev=>[...prev,...page.items]);setAdminNext(page.nextCursor);}else{setEvents(prev=>[...prev,...page.items]);setNext(page.nextCursor);}
 }catch(e){setError(String(e));}finally{setBusy(false);}}
 return <Gate ready={ready} role="Security Auditor"><Shell role="Security Auditor" title="Security & audit" kicker="Independent oversight" subtitle="Read-only, de-identified access and administrative audit trails">
 {error&&<div className="notice error" role="alert">{error}</div>}
 <div className="grid"><Metric icon="▤" label="Access event categories" value={summary?.access.length??'—'}/><Metric icon="◇" label="Administrative categories" value={summary?.administrative.length??'—'}/><Metric icon="✓" label="Clinical records exposed" value="0"/></div>
 <div className="section-head"><h2>Security outcomes</h2><button className="btn secondary" disabled={busy} onClick={refresh}>Refresh</button></div>
 <section className="card">{!summary?<p className="empty">Loading verified audit summary…</p>:summary.access.map((a,i)=><div key={i} className="record"><div><div className="record-title">{a.action}</div><div className="record-meta">{a.outcome}</div></div><span className="pill">{a.count} events</span></div>)}</section>
 <div className="section-head"><h2>Access audit events</h2></div>
 <section className="card">{events.length===0?<p className="empty">No access events available.</p>:events.map(e=><div key={e.id} className="record"><div><div className="record-title">{e.action}</div><div className="record-meta">{new Date(e.createdAt).toLocaleString()}</div></div><span className="pill">{e.outcome}</span></div>)}
 {next&&<button className="btn secondary" disabled={busy} onClick={()=>loadMore(false)}>Load more</button>}</section>
 <div className="section-head"><h2>Administrative events</h2></div>
 <section className="card">{adminEvents.length===0?<p className="empty">No administrative events available.</p>:adminEvents.map(e=><div key={e.id} className="record"><div><div className="record-title">{e.action}</div><div className="record-meta">{e.targetKind} · {new Date(e.createdAt).toLocaleString()}</div></div><span className="pill">{e.outcome}</span></div>)}
 {adminNext&&<button className="btn secondary" disabled={busy} onClick={()=>loadMore(true)}>Load more</button>}</section>
 <div className="notice warning">Patient IDs, clinical FHIR data, actor subjects, and free-text metadata are deliberately excluded from audit responses.</div>
 </Shell></Gate>;
}
