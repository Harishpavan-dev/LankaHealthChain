'use client';
import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import Link from 'next/link';
import { auth, authenticate, getInitialSession, getSession, subscribeToSession } from '@/lib/auth';
import { workspaces, type WorkspaceName } from '@/lib/workspaces';
import { Brand, WorkspaceMessage } from './workspace-frame';

function AuthButton({ className = 'btn', action, children }: { className?: string; action: () => Promise<void>; children: ReactNode }) {
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  async function run() {
    setPending(true);
    setFailed(false);
    try { await action(); }
    catch { setFailed(true); }
    finally { setPending(false); }
  }
  return <div className="auth-action">
    <button type="button" className={className} disabled={pending} onClick={run}>{pending ? 'Connecting…' : children}</button>
    {failed && <p className="muted" role="alert">Could not connect to Keycloak. Please try again.</p>}
  </div>;
}

type SectionLink = readonly [id: string, label: string];

export function Shell({ title, subtitle, children, role, sections = [] }: {
  title: string;
  subtitle: string;
  children: ReactNode;
  role: WorkspaceName;
  sections?: readonly SectionLink[];
}) {
  const session = useSyncExternalStore(subscribeToSession, getSession, getInitialSession);
  return <div className="app">
    <a className="skip-link" href="#overview">Skip to content</a>
    <aside className="sidebar">
      <Brand />
      <div className="sidebar-nav">
        <nav aria-label="Workspace navigation">
          <Link className="nav-link directory-link" href="/"><span aria-hidden="true">←</span> All workspaces</Link>
          {session.status === 'authenticated' && workspaces.filter(workspace => session.roles.includes(workspace.role)).map(workspace =>
            <Link key={workspace.href} className={workspace.name === role ? 'nav-link active' : 'nav-link'} href={workspace.href} aria-current={workspace.name === role ? 'page' : undefined}>{workspace.name}</Link>,
          )}
        </nav>
        {sections.length > 0 && <nav className="section-nav" aria-label="On this page">
          <p className="section-nav-label">On this page</p>
          {sections.map(([id, label]) => <a className="nav-link" key={id} href={`#${id}`}>{label}</a>)}
        </nav>}
      </div>
    </aside>
    <main className="main" id="overview" tabIndex={-1}>
      <header className="top">
        <h1>{title}</h1>
        <AuthButton className="btn secondary logout" action={() => auth.logout({ redirectUri: window.location.origin })}>Sign out</AuthButton>
        <p className="subtitle">{subtitle}</p>
      </header>
      <p className="environment-notice" role="note">This environment uses synthetic records and demo consent.</p>
      {children}
    </main>
  </div>;
}

export function Gate({ role, children }: { role: WorkspaceName; children: ReactNode }) {
  const session = useSyncExternalStore(subscribeToSession, getSession, getInitialSession);
  const workspace = workspaces.find(item => item.name === role);
  useEffect(() => { void authenticate(); }, []);

  if (session.status === 'authenticated' && workspace && session.roles.includes(workspace.role)) return <>{children}</>;

  return <WorkspaceMessage title={`${role} workspace`}>
    {session.status === 'loading' && <p className="muted" role="status">Checking sign-in…</p>}
    {session.status === 'unavailable' && <>
      <p className="notice error" role="alert">Keycloak sign-in is unavailable. Try again in a moment.</p>
      <button type="button" className="btn" onClick={() => window.location.reload()}>Retry connection</button>
    </>}
    {session.status === 'authenticated' && <>
      <p className="notice warning" role="alert">Your account does not have access to this workspace.</p>
      <AuthButton action={() => auth.logout({ redirectUri: window.location.origin + window.location.pathname })}>Switch account</AuthButton>
    </>}
    {(session.status === 'anonymous' || session.status === 'expired') && <>
      <p className="muted">{session.status === 'expired' ? 'Your session ended. Sign in again to continue.' : 'Sign in to open this workspace.'}</p>
      <AuthButton action={() => auth.login()}>Sign in with Keycloak</AuthButton>
    </>}
  </WorkspaceMessage>;
}

export function Metric({ label, value, href }: { label: string; value: string | number; href?: string }) {
  const content = <>
    <span className="stat-label">{label}</span>
    <strong className="stat-val">{value}</strong>
  </>;
  return href ? <a className="metric metric-link" href={href}>{content}</a> : <div className="metric">{content}</div>;
}
