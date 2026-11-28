'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { api, ApiError, auth } from '@/lib/auth';
import { Gate, Metric, Shell } from '@/components/portal';
import { resourceLabel, statusLabel } from '@/lib/display-labels';

type AccessRequest = { id: string; status: string; purpose: string; requestedTypes: string[]; createdAt: string; decisionDeadlineAt: string };
type RecordResult = {
  recordId: string;
  sourceHospital: string;
  resource: { resourceType: string };
  integrity: { localHash: string; cardano: string };
};
type RecordsPage = { items: RecordResult[]; nextCursor: string | null };
type Submission = { body: string; id: string };

const demoPatientId = process.env.NEXT_PUBLIC_DEMO_PATIENT_ID ?? '';
const resourceTypes = ['Observation', 'DiagnosticReport', 'MedicationRequest', 'AllergyIntolerance', 'Condition'];
const patientIdPattern = '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}';

export function App() {
  return <Gate role="Doctor"><Dashboard /></Gate>;
}

function Dashboard() {
  const [requests, setRequests] = useState<AccessRequest[] | null>(null);
  const [requestPatientId, setRequestPatientId] = useState(demoPatientId);
  const [recordPatientId, setRecordPatientId] = useState(demoPatientId);
  const [types, setTypes] = useState(['Observation', 'DiagnosticReport']);
  const [purpose, setPurpose] = useState('treatment');
  const [duration, setDuration] = useState('60');
  const [systolic, setSystolic] = useState('120');
  const [records, setRecords] = useState<RecordsPage | null>(null);
  const [activeRequest, setActiveRequest] = useState<string | null>(null);
  const [historyError, setHistoryError] = useState('');
  const [accessBlocked, setAccessBlocked] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [copyStatus, setCopyStatus] = useState('');
  const [refreshing, setRefreshing] = useState(true);
  const [action, setAction] = useState<'request' | 'record' | 'read' | null>(null);
  const pendingRequest = useRef<Submission | null>(null);
  const pendingRecord = useRef<Submission | null>(null);
  const accountId = auth.tokenParsed?.sub;

  async function copyAccountId(id: string) {
    try {
      await navigator.clipboard.writeText(id);
      setCopyStatus('Account ID copied.');
    } catch { setCopyStatus('Select the account ID to copy it manually.'); }
  }

  async function refresh(signal?: AbortSignal) {
    setRefreshing(true);
    setHistoryError('');
    try {
      setRequests(await api<AccessRequest[]>('/access-requests/mine', { signal }));
      setAccessBlocked(false);
    } catch (error) {
      if (signal?.aborted) return;
      if (error instanceof ApiError && error.status === 403) {
        setAccessBlocked(true);
        setRequests(null);
        setRecords(null);
        setActiveRequest(null);
        setHistoryError(`${error.message}. Contact your hospital administrator.`);
      } else setHistoryError(String(error));
    }
    finally { if (!signal?.aborted) setRefreshing(false); }
  }

  useEffect(() => {
    const controller = new AbortController();
    void refresh(controller.signal);
    return () => controller.abort();
  }, []);

  async function createRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (action || accessBlocked || !types.length) return;
    setAction('request');
    setError('');
    setSuccess('');
    try {
      const body = JSON.stringify({ patientId: requestPatientId.trim(), purpose, requestedTypes: types, requestedDurationMinutes: Number(duration) });
      if (pendingRequest.current?.body !== body) pendingRequest.current = { body, id: crypto.randomUUID() };
      await api('/access-requests', { method: 'POST', body, headers: { 'Idempotency-Key': pendingRequest.current.id } });
      pendingRequest.current = null;
      setSuccess('Access request submitted for patient approval.');
      await refresh();
    } catch (error) { setError(String(error)); }
    finally { setAction(null); }
  }

  async function createObservation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (action || accessBlocked) return;
    setAction('record');
    setError('');
    setSuccess('');
    try {
      const patientId = recordPatientId.trim();
      const resource = {
        resourceType: 'Observation', status: 'final',
        category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'vital-signs' }] }],
        code: { coding: [{ system: 'http://loinc.org', code: '8480-6', display: 'Systolic blood pressure' }] },
        valueQuantity: { value: Number(systolic), unit: 'mmHg', system: 'http://unitsofmeasure.org', code: 'mm[Hg]' },
      };
      const payload = JSON.stringify({ patientId, resource });
      if (pendingRecord.current?.body !== payload) pendingRecord.current = { body: payload, id: crypto.randomUUID() };
      const result = await api<{ id: string; anchorStatus: string }>('/records', {
        method: 'POST', body: JSON.stringify({ patientId, resource: { ...resource, id: pendingRecord.current.id } }),
      });
      pendingRecord.current = null;
      setSuccess(`Observation saved. Cardano anchor status is ${result.anchorStatus}.`);
    } catch (error) { setError(String(error)); }
    finally { setAction(null); }
  }

  async function getRecords(requestId: string, cursor?: string) {
    if (action || accessBlocked) return;
    setAction('read');
    setError('');
    setSuccess('');
    setActiveRequest(requestId);
    if (!cursor) setRecords(null);
    try {
      const query = new URLSearchParams({ limit: '25' });
      if (cursor) query.set('cursor', cursor);
      const page = await api<RecordsPage>(`/access-requests/${requestId}/records/page?${query}`);
      setRecords(prior => ({ ...page, items: cursor && prior ? [...prior.items, ...page.items] : page.items }));
    } catch (error) {
      setRecords(null);
      setActiveRequest(null);
      setError(String(error));
    } finally { setAction(null); }
  }

  return <Shell title="Clinical workspace" subtitle="Request record access and add synthetic observations." role="Doctor"
    sections={[
      ['request-title', 'Request access'],
      ['observation-title', 'Add an observation'],
      ['request-history', 'Previous requests'],
    ]}>
    {error && <p className="notice error" role="alert">{error}</p>}
    {historyError && <p className="notice error" role="alert">{historyError}</p>}
    {success && <p className="notice" role="status">{success}</p>}
    <div className="metric-grid">
      <Metric label="Access requests" value={requests?.length ?? '—'} href="#request-history" />
      <Metric label="Approved requests" value={requests?.filter(request => request.status === 'APPROVED').length ?? '—'} />
    </div>
    <div className="form-pair">
      <form className="card" aria-labelledby="request-title" onSubmit={createRequest}>
        <h2 id="request-title">Request record access</h2>
        <div className="field"><label htmlFor="request-patient">Patient ID</label><input id="request-patient" className="input" required pattern={patientIdPattern} value={requestPatientId} onChange={event => setRequestPatientId(event.target.value)} /></div>
        <div className="form-grid">
          <div className="field"><label htmlFor="request-purpose">Purpose</label><select id="request-purpose" className="input" value={purpose} onChange={event => setPurpose(event.target.value)}><option value="treatment">Treatment</option><option value="follow-up">Follow-up</option></select></div>
          <div className="field"><label htmlFor="request-duration">Access duration (minutes)</label><input id="request-duration" className="input" type="number" required min="1" max="1440" value={duration} onChange={event => setDuration(event.target.value)} /></div>
        </div>
        <fieldset className="field">
          <legend>Requested FHIR resource types</legend>
          <div className="actions">{resourceTypes.map(type => <label key={type} className="check-label"><input type="checkbox" checked={types.includes(type)} onChange={event => setTypes(event.target.checked ? [...types, type] : types.filter(t => t !== type))} /> {resourceLabel(type)}</label>)}</div>
        </fieldset>
        <button className="btn" disabled={action !== null || accessBlocked || !types.length}>{action === 'request' ? 'Submitting…' : 'Submit approval request'}</button>
      </form>

      <div>
        <form className="card" aria-labelledby="observation-title" onSubmit={createObservation}>
          <h2 id="observation-title">Add a synthetic observation</h2>
          <div className="form-grid">
            <div className="field"><label htmlFor="observation-patient">Patient ID</label><input id="observation-patient" className="input" required pattern={patientIdPattern} value={recordPatientId} onChange={event => setRecordPatientId(event.target.value)} /></div>
            <div className="field"><label htmlFor="systolic">Systolic pressure (mmHg)</label><input id="systolic" className="input" type="number" required min="1" max="300" value={systolic} onChange={event => setSystolic(event.target.value)} /></div>
          </div>
          <button className="btn" disabled={action !== null || accessBlocked}>{action === 'record' ? 'Saving…' : 'Save synthetic observation'}</button>
        </form>
        {accountId && <details className="card">
          <summary className="record-title">My enrollment details</summary>
          <p className="muted">Share this Keycloak account ID with your hospital administrator to link your doctor profile.</p>
          <code className="account-id">{accountId}</code>
          <button className="btn secondary" onClick={() => copyAccountId(accountId)}>Copy account ID</button>
          {copyStatus && <p className="muted" role="status">{copyStatus}</p>}
        </details>}
      </div>
    </div>

    <div className="section-head"><h2 id="request-history">Previous requests</h2><button className="btn secondary" disabled={refreshing || action !== null} onClick={() => refresh()}>{refreshing ? 'Refreshing…' : 'Refresh'}</button></div>
    <section className="card" aria-labelledby="request-history" aria-busy={refreshing}>
      {!requests && refreshing && <p className="empty" role="status">Loading access requests…</p>}
      {requests?.length === 0 && <p className="empty">No requests submitted yet.</p>}
      {requests?.map(request => <div className="record" key={request.id}>
        <div><div className="record-title">{statusLabel(request.purpose)} · {request.requestedTypes.map(resourceLabel).join(', ')}</div><div className="record-meta">{request.status === 'PENDING' && Date.parse(request.decisionDeadlineAt) <= Date.now() ? 'Expired' : statusLabel(request.status)} · Requested {new Date(request.createdAt).toLocaleString()} · Approval deadline {new Date(request.decisionDeadlineAt).toLocaleString()}</div></div>
        {request.status === 'APPROVED' && <button className="btn" disabled={action !== null} onClick={() => getRecords(request.id)}>View records</button>}
      </div>)}
    </section>
    {activeRequest && <section className="card" aria-busy={action === 'read'}>
      <h2>Authorized synthetic records</h2>
      {!records && <p className="empty" role="status">Loading authorized records…</p>}
      {records?.items.length === 0 && <p className="empty">No matching records for this request.</p>}
      {records?.items.map(record => <details key={record.recordId} className="record-detail">
        <summary>{resourceLabel(record.resource.resourceType)} · {record.sourceHospital}</summary>
        <p className="muted">Local integrity {record.integrity.localHash} · Cardano {record.integrity.cardano}</p>
        <pre className="json">{JSON.stringify(record.resource, null, 2)}</pre>
      </details>)}
      {records?.nextCursor && <button className="btn secondary" disabled={action !== null} onClick={() => getRecords(activeRequest, records.nextCursor ?? undefined)}>{action === 'read' ? 'Loading…' : 'Load more records'}</button>}
    </section>}
  </Shell>;
}
