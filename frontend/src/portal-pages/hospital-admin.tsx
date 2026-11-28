'use client';
import { useEffect, useState, type FormEvent } from 'react';
import { api } from '@/lib/auth';
import { Gate, Metric, Shell } from '@/components/portal';

type Hospital = { id: string; code: string; name: string };
type Doctor = { id: string; displayName: string; verified: boolean; active: boolean };
type Page<T> = { items: T[]; nextCursor: string | null };
type Overview = { doctors: number; verifiedDoctors: number; unverifiedDoctors: number; pendingRequests: number };
type Audit = { id: string; action: string; outcome: string; targetKind: string; createdAt: string };
type Filters = { query: string; status: '' | 'active' | 'inactive' | 'unverified' };
const allDoctors: Filters = { query: '', status: '' };

export function App() {
  return <Gate role="Hospital Admin"><Dashboard /></Gate>;
}

function Dashboard() {
  const [hospitals, setHospitals] = useState<Hospital[] | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  async function loadAssignments(signal?: AbortSignal) {
    setError('');
    try {
      const assignments = await api<{ hospital: Hospital }[]>('/hospital-admin/hospitals', { signal });
      setHospitals(assignments.map(entry => entry.hospital));
      setCode(assignments[0]?.hospital.code ?? '');
    } catch (error) { if (!signal?.aborted) setError(String(error)); }
  }
  useEffect(() => {
    const controller = new AbortController();
    void loadAssignments(controller.signal);
    return () => controller.abort();
  }, []);

  return <Shell title="Hospital administration" subtitle="Manage your hospital’s clinicians and review administrative activity." role="Hospital Admin"
    sections={code ? [['doctor-directory', 'Doctor directory'], ['hospital-audit', 'Administration audit']] : []}>
    {!hospitals && <section className="card">
      {error ? <><p className="notice error" role="alert">{error}</p><button className="btn secondary" onClick={() => loadAssignments()}>Retry assignments</button></> : <p role="status">Loading hospital assignments…</p>}
    </section>}
    {hospitals?.length === 0 && <p className="notice warning">No active hospital assignment. Contact your network administrator.</p>}
    {!!hospitals?.length && <section className="card hospital-picker" aria-label="Hospital selector">
      <div className="field"><label htmlFor="hospital-select">Assigned hospital</label>
        <select id="hospital-select" className="input" value={code} onChange={event => setCode(event.target.value)}>
          {hospitals.map(hospital => <option value={hospital.code} key={hospital.id}>{hospital.name}</option>)}
        </select>
      </div>
    </section>}
    {code && <HospitalWorkspace key={code} code={code} />}
  </Shell>;
}

function HospitalWorkspace({ code }: { code: string }) {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [directory, setDirectory] = useState<Page<Doctor> & { filters: Filters } | null>(null);
  const [audit, setAudit] = useState<Page<Audit> | null>(null);
  const [draft, setDraft] = useState<Filters>(allDoctors);
  const [newSubject, setNewSubject] = useState('');
  const [newName, setNewName] = useState('');
  const [edit, setEdit] = useState<{ id: string; name: string } | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const prefix = `/hospital-admin/hospitals/${encodeURIComponent(code)}`;

  function listDoctors(filters: Filters, cursor?: string, signal?: AbortSignal) {
    const query = new URLSearchParams({ limit: '25' });
    if (filters.query) query.set('q', filters.query);
    if (filters.status) query.set('status', filters.status);
    if (cursor) query.set('cursor', cursor);
    return api<Page<Doctor>>(`${prefix}/doctors/page?${query}`, { signal });
  }

  async function refresh(filters: Filters, signal?: AbortSignal) {
    const [summary, doctors, events] = await Promise.all([
      api<Overview>(`${prefix}/overview`, { signal }),
      listDoctors(filters, undefined, signal),
      api<Page<Audit>>(`${prefix}/audit/page?limit=25`, { signal }),
    ]);
    if (signal?.aborted) return;
    setOverview(summary);
    setDirectory({ ...doctors, filters });
    setAudit(events);
  }

  async function run(task: () => Promise<void>, signal?: AbortSignal) {
    setBusy(true);
    setError('');
    setSuccess('');
    try { await task(); }
    catch (error) { if (!signal?.aborted) setError(error instanceof Error ? error.message : String(error)); }
    finally { if (!signal?.aborted) setBusy(false); }
  }

  useEffect(() => {
    const controller = new AbortController();
    void run(() => refresh(allDoctors, controller.signal), controller.signal);
    return () => controller.abort();
  }, []);

  function search(filters: Filters) {
    const normalized = { ...filters, query: filters.query.trim() };
    void run(async () => {
      const page = await listDoctors(normalized);
      setDirectory({ ...page, filters: normalized });
      setEdit(null);
    });
  }

  function enroll(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void run(async () => {
      const doctor = await api<Doctor>(`${prefix}/doctors`, {
        method: 'POST', body: JSON.stringify({ displayName: newName.trim(), authSubject: newSubject.trim() }),
      });
      setNewName('');
      setNewSubject('');
      const filters: Filters = { query: doctor.displayName.length <= 80 ? doctor.displayName : '', status: 'unverified' };
      setDraft(filters);
      setSuccess(`${doctor.displayName} added. Review verification before granting access.`);
      await refresh(filters);
    });
  }

  function updateDoctor(doctor: Doctor, change: Partial<Pick<Doctor, 'active' | 'verified' | 'displayName'>>, message: string) {
    void run(async () => {
      await api<Doctor>(`${prefix}/doctors/${doctor.id}`, { method: 'PATCH', body: JSON.stringify(change) });
      setEdit(null);
      setSuccess(message);
      await refresh(directory?.filters ?? allDoctors);
    });
  }

  function openQueue() {
    const filters: Filters = { query: '', status: 'unverified' };
    setDraft(filters);
    search(filters);
  }

  return <>
    {error && <p className="notice error" role="alert">{error}</p>}
    {success && <p className="notice" role="status">{success}</p>}
    {!overview && (busy ? <p className="card" role="status">Loading hospital workspace…</p> : <button className="btn secondary" onClick={() => run(() => refresh(allDoctors))}>Retry hospital data</button>)}
    {overview && <>
      <div className="metric-grid">
        <Metric label="Enrolled doctors" value={overview.doctors} />
        <Metric label="Active verified doctors" value={overview.verifiedDoctors} />
        <Metric label="Needs verification" value={overview.unverifiedDoctors} />
        <Metric label="Pending requests" value={overview.pendingRequests} />
      </div>
      <details className="card">
        <summary className="record-title">Add doctor</summary>
        <p className="muted">Ask the doctor for the Keycloak account ID shown in their Doctor workspace. New profiles start inactive and unverified.</p>
        <form aria-label="Add doctor" onSubmit={enroll}>
          <div className="form-grid">
            <div className="field"><label htmlFor="clinician-name">Display name</label><input id="clinician-name" className="input" required minLength={3} maxLength={120} value={newName} onChange={event => setNewName(event.target.value)} /></div>
            <div className="field"><label htmlFor="clinician-subject">Keycloak account ID</label><input id="clinician-subject" className="input" required minLength={5} maxLength={128} value={newSubject} onChange={event => setNewSubject(event.target.value)} /></div>
          </div>
          <button className="btn" disabled={busy || newName.trim().length < 3 || newSubject.trim().length < 5}>Add doctor</button>
        </form>
      </details>
      <div className="section-head"><h2 id="doctor-directory">Doctor directory</h2><button className="btn secondary" disabled={busy} onClick={openQueue}>Verification queue</button></div>
      <section className="card" aria-labelledby="doctor-directory" aria-busy={busy}>
        <form className="filter-form" aria-label="Search doctor directory" onSubmit={event => { event.preventDefault(); search(draft); }}>
          <div className="form-grid">
            <div className="field"><label htmlFor="doctor-query">Search by name</label><input id="doctor-query" className="input" type="search" maxLength={80} value={draft.query} onChange={event => setDraft({ ...draft, query: event.target.value })} /></div>
            <div className="field"><label htmlFor="doctor-status">Status</label><select id="doctor-status" className="input" value={draft.status} onChange={event => setDraft({ ...draft, status: event.target.value as Filters['status'] })}>
              <option value="">All statuses</option><option value="unverified">Needs verification</option><option value="active">Active and verified</option><option value="inactive">Inactive and verified</option>
            </select></div>
          </div>
          <div className="actions"><button className="btn" disabled={busy}>Search</button><button type="button" className="btn secondary" disabled={busy} onClick={() => { setDraft(allDoctors); search(allDoctors); }}>Clear filters</button></div>
        </form>
        {directory?.items.length === 0 && <p className="empty">No doctors match these filters.</p>}
        {directory?.items.map(doctor => <div className="record" key={doctor.id}>
          <div><div className="record-title">{doctor.displayName}</div><div className="record-meta">{doctor.active ? 'Active' : 'Inactive'} · {doctor.verified ? 'Verified' : 'Needs verification'}</div></div>
          {edit?.id === doctor.id ? <form aria-label={`Edit ${doctor.displayName}`} onSubmit={event => {
            event.preventDefault();
            updateDoctor(doctor, { displayName: edit.name.trim() }, 'Doctor profile updated.');
          }}>
            <div className="field"><label htmlFor="edit-doctor-name">Display name</label><input autoFocus id="edit-doctor-name" className="input" required minLength={3} maxLength={120} value={edit.name} onChange={event => setEdit({ id: doctor.id, name: event.target.value })} /></div>
            <div className="actions"><button className="btn" disabled={busy || edit.name.trim().length < 3 || edit.name.trim() === doctor.displayName}>Save name</button><button type="button" className="btn secondary" disabled={busy} onClick={() => setEdit(null)}>Cancel</button></div>
          </form> : <div className="actions">
            <button className="btn secondary" disabled={busy} onClick={() => setEdit({ id: doctor.id, name: doctor.displayName })}>Edit name</button>
            {!doctor.verified && !doctor.active && <button className="btn" disabled={busy} onClick={() => {
              if (window.confirm(`Verify ${doctor.displayName} and activate their hospital access?`)) updateDoctor(doctor, { verified: true, active: true }, 'Doctor verified and activated.');
            }}>Verify and activate</button>}
            <button className="btn outline" disabled={busy} onClick={() => {
              if (!doctor.verified || window.confirm(`Remove verification for ${doctor.displayName}?`)) updateDoctor(doctor, { verified: !doctor.verified }, 'Doctor verification updated.');
            }}>{doctor.verified ? 'Remove verification' : 'Verify'}</button>
            {(doctor.verified || doctor.active) && <button className="btn secondary" disabled={busy} onClick={() => {
              if (!doctor.active || window.confirm(`Deactivate hospital access for ${doctor.displayName}?`)) updateDoctor(doctor, { active: !doctor.active }, 'Doctor access updated.');
            }}>{doctor.active ? 'Deactivate' : 'Activate'}</button>}
          </div>}
        </div>)}
        {directory?.nextCursor && <button className="btn secondary" disabled={busy} onClick={() => run(async () => {
          const page = await listDoctors(directory.filters, directory.nextCursor ?? undefined);
          setDirectory({ ...page, items: [...directory.items, ...page.items], filters: directory.filters });
        })}>Load more doctors</button>}
      </section>
      <div className="section-head"><h2 id="hospital-audit">Hospital administration audit</h2><button className="btn secondary" disabled={busy} onClick={() => run(() => refresh(directory?.filters ?? allDoctors))}>Refresh</button></div>
      <section className="card">
        {audit?.items.length === 0 && <p className="empty">No administrative changes yet.</p>}
        {audit?.items.map(event => <div className="record" key={event.id}>
          <div><div className="record-title">{event.action.toLowerCase().replaceAll('_', ' ')}</div><div className="record-meta">{event.targetKind} · {new Date(event.createdAt).toLocaleString()}</div></div><span className="pill">{event.outcome}</span>
        </div>)}
        {audit?.nextCursor && <button className="btn secondary" disabled={busy} onClick={() => run(async () => {
          const query = new URLSearchParams({ limit: '25', cursor: audit.nextCursor ?? '' });
          const page = await api<Page<Audit>>(`${prefix}/audit/page?${query}`);
          setAudit({ ...page, items: [...audit.items, ...page.items] });
        })}>Load more audit events</button>}
      </section>
    </>}
  </>;
}
