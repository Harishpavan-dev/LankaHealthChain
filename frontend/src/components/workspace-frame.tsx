import Link from 'next/link';
import type { ReactNode } from 'react';

export function Brand() {
  return <Link className="brand" href="/">
    <span className="mark" aria-hidden="true" />
    LankaHealthChain
  </Link>;
}

export function SiteHeader() {
  return <header className="site-header">
    <div className="site-header-inner">
      <Brand />
      <span className="environment-label">Synthetic data only</span>
    </div>
  </header>;
}

export function WorkspaceMessage({ title, children }: { title: string; children?: ReactNode }) {
  return <>
    <SiteHeader />
    <main className="auth-layout">
      <section className="card auth" aria-labelledby="workspace-title">
        <h1 id="workspace-title">{title}</h1>
        {children}
        <Link className="auth-back" href="/"><span aria-hidden="true">←</span> All workspaces</Link>
      </section>
    </main>
  </>;
}

export function WorkspaceLoading() {
  return <WorkspaceMessage title="Opening your workspace…" />;
}
