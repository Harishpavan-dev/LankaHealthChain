'use client';

import { useEffect, useState } from 'react';
import { Gate, Metric, Shell } from '@/components/portal';
import { api } from '@/lib/auth';
import { resourceLabel, statusLabel } from '@/lib/display-labels';

type AccessRequest = {
  id: string;
  purpose: string;
  requestedTypes: string[];
  decisionDeadlineAt: string;
  doctor: { displayName: string; hospital: { name: string } };
};
type Consent = { id: string; status: string; expiresAt: string; allowedTypes: string[] };
type Timeline = { id: string; resourceType: string; recordVersion: number; anchorStatus: string; hospital: { name: string } };
type AuditEvent = { id: string; action: string; outcome: string; createdAt: string };
type Verification = { cardanoStatus: string; onchainVerified: boolean; reason?: string };

export function App() {
  return <Gate role="Patient"><Dashboard /></Gate>;
}

function Dashboard() {
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [consents, setConsents] = useState<Consent[]>([]);
  const [timeline, setTimeline] = useState<Timeline[]>([]);
  const [audit, setAudit] = useState<AuditEvent[]>([]);
  const [recordType, setRecordType] = useState('');
  const [verifications, setVerifications] = useState<Record<string, Verification>>({});
  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function refresh(signal?: AbortSignal) {
    setRefreshing(true);
    setError('');
    try {
      const [pending, permissions, records, events] = await Promise.all([
        api<AccessRequest[]>('/patients/me/access-requests', { signal }),
        api<Consent[]>('/patients/me/consents', { signal }),
        api<Timeline[]>('/patients/me/timeline', { signal }),
        api<AuditEvent[]>('/audit/me', { signal }),
      ]);
      if (signal?.aborted) return;
      setRequests(pending);
      setConsents(permissions);
      setTimeline(records);
      setAudit(events);
      setRecordType(previous => records.some(record => record.resourceType === previous) ? previous : '');
      setLoaded(true);
    } catch (error) {
      if (!signal?.aborted) setError(error instanceof Error ? error.message : String(error));
    } finally {
      if (!signal?.aborted) setRefreshing(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    void refresh(controller.signal);
    return () => controller.abort();
  }, []);

  async function post(path: string, message: string) {
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      await api(path, { method: 'POST' });
      setSuccess(message);
      await refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  async function verifyAnchor(recordId: string) {
    setBusy(true);
    setError('');
    try {
      const result = await api<Verification>(`/records/${recordId}/verification`);
      setVerifications(previous => ({ ...previous, [recordId]: result }));
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  const recordTypes = [...new Set(timeline.map(record => record.resourceType))].sort();
  const visibleRecords = recordType ? timeline.filter(record => record.resourceType === recordType) : timeline;
  const hasPendingRequests = requests.length > 0;
  const activeConsents = consents.filter(consent => consent.status === 'ACTIVE' && Date.parse(consent.expiresAt) > Date.now()).length;
  const recordLink = ['medical-records', 'Medical records'] as const;
  const requestLink = ['access-requests', 'Access requests'] as const;

  const requestsPanel = <section className="card patient-panel" aria-labelledby="access-requests">
    <div className="panel-head"><h2 id="access-requests">Pending access requests</h2></div>
    {!hasPendingRequests && <p className="empty">No pending access requests.</p>}
    {requests.map(request => <div className="record" key={request.id}>
      <div>
        <div className="record-title">{request.doctor.displayName} · {request.doctor.hospital.name}</div>
        <div className="record-meta">{statusLabel(request.purpose)} · {request.requestedTypes.map(resourceLabel).join(', ')}</div>
        <div className="record-meta">Approve by {new Date(request.decisionDeadlineAt).toLocaleString()}</div>
      </div>
      <div className="actions">
        <button className="btn" disabled={busy || refreshing} onClick={() => post(`/access-requests/${request.id}/approve`, 'Access request approved.')}>Approve</button>
        <button className="btn danger" disabled={busy || refreshing} onClick={() => post(`/access-requests/${request.id}/reject`, 'Access request rejected.')}>Reject</button>
      </div>
    </div>)}
  </section>;

  return <Shell title="Your medical history" subtitle="Review your records and manage who can access them." role="Patient"
    sections={loaded ? [
      ...(hasPendingRequests ? [requestLink, recordLink] : [recordLink, requestLink]),
      ['consents', 'Consents'], ['access-history', 'Access history'],
    ] : []}>
    {error && <p className="notice error" role="alert">{error}</p>}
    {success && <p className="notice" role="status">{success}</p>}
    <div className="section-head">
      <h2>Overview</h2>
      <button className="btn secondary" disabled={busy || refreshing} onClick={() => refresh()}>{refreshing ? 'Refreshing…' : 'Refresh'}</button>
    </div>
    {!loaded && refreshing && <p className="card" role="status">Loading your medical history and access controls…</p>}
    {loaded && <>
      <div className="metric-grid">
        <Metric label="Medical record references" value={timeline.length} href="#medical-records" />
        <Metric label="Pending approvals" value={requests.length} href="#access-requests" />
        <Metric label="Active consents" value={activeConsents} href="#consents" />
      </div>
      {hasPendingRequests && requestsPanel}
      <div className="patient-columns">
        <section className="card patient-panel" aria-labelledby="medical-records">
          <div className="panel-head">
            <h2 id="medical-records">Medical record references</h2>
            {recordTypes.length > 1 && <div className="panel-filter">
              <label htmlFor="record-type">Record type</label>
              <select id="record-type" className="input" value={recordType} onChange={event => setRecordType(event.target.value)}>
                <option value="">All types</option>
                {recordTypes.map(type => <option value={type} key={type}>{resourceLabel(type)}</option>)}
              </select>
            </div>}
          </div>
          {timeline.length === 0 && <p className="empty">No medical record references yet.</p>}
          <p className="sr-only" role="status">{visibleRecords.length} record references shown</p>
          <div>
            {visibleRecords.map(record => {
              const verification = verifications[record.id];
              return <div className="record" key={record.id}>
                <div>
                  <div className="record-title">{resourceLabel(record.resourceType)}</div>
                  <div className="record-meta">{record.hospital.name} · Version {record.recordVersion}</div>
                </div>
                <div className="actions">
                  <span className="pill" aria-live="polite" data-tone={verification?.onchainVerified ? 'success' : undefined}>
                    {verification
                      ? (verification.onchainVerified ? 'On-chain verified' : `Not verified: ${verification.reason || statusLabel(verification.cardanoStatus)}`)
                      : `Anchor: ${statusLabel(record.anchorStatus)}`}
                  </span>
                  <button className="btn secondary" disabled={busy} onClick={() => verifyAnchor(record.id)}>Verify Cardano</button>
                </div>
              </div>;
            })}
          </div>
        </section>
        <div className="patient-side">
          {!hasPendingRequests && requestsPanel}
          <section className="card patient-panel" aria-labelledby="consents">
            <div className="panel-head"><h2 id="consents">Consents</h2></div>
            {consents.length === 0 && <p className="empty">No previous decisions.</p>}
            {consents.map(consent => {
              const status = consent.status === 'ACTIVE' && Date.parse(consent.expiresAt) <= Date.now() ? 'EXPIRED' : consent.status;
              return <div className="record" key={consent.id}>
                <div>
                  <div className="record-title">{consent.allowedTypes.map(resourceLabel).join(' · ')}</div>
                  <div className="record-meta">Expires {new Date(consent.expiresAt).toLocaleString()}</div>
                </div>
                <div className="actions">
                  <span className="pill" data-tone={status === 'ACTIVE' ? 'success' : undefined}>{statusLabel(status)}</span>
                  {status === 'ACTIVE' && <button className="btn danger" disabled={busy || refreshing} onClick={() => {
                    if (window.confirm('Revoke this record access consent?')) void post(`/consents/${consent.id}/revoke`, 'Consent revoked.');
                  }}>Revoke</button>}
                </div>
              </div>;
            })}
          </section>
        </div>
      </div>
      <section className="card patient-panel" aria-labelledby="access-history">
        <div className="panel-head"><h2 id="access-history">Access history</h2></div>
        {audit.length === 0 && <p className="empty">No access events yet.</p>}
        {audit.map(event => <div className="record" key={event.id}>
          <div>
            <div className="record-title">{statusLabel(event.action)}</div>
            <div className="record-meta">{new Date(event.createdAt).toLocaleString()}</div>
          </div>
          <span className="pill">{statusLabel(event.outcome)}</span>
        </div>)}
      </section>
    </>}
  </Shell>;
}
