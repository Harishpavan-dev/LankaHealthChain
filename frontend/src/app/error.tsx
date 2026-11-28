'use client';
import { WorkspaceMessage } from '@/components/workspace-frame';

export default function WorkspaceError({ reset }: { reset: () => void }) {
  return <WorkspaceMessage title="Workspace could not load">
    <p className="muted" role="alert">Retry this page or return to the workspace directory.</p>
    <button type="button" className="btn" onClick={reset}>Retry workspace</button>
  </WorkspaceMessage>;
}
