import Image from 'next/image';
import Link from 'next/link';
import { workspaces } from '@/lib/workspaces';
import { SiteHeader } from '@/components/workspace-frame';
import consultation from '@/assets/clinic-consultation.webp';

export default function Home() {
  return <>
    <SiteHeader />
    <main className="welcome">
      <header className="welcome-head">
        <div className="welcome-intro">
          <h1>Choose your workspace</h1>
          <p className="subtitle">Connected healthcare with patient-controlled access. Select the role assigned to your account.</p>
          <a className="welcome-action" href="#role-workspaces">Browse roles <span aria-hidden="true">↓</span></a>
        </div>
        <div className="welcome-image">
          <Image src={consultation} alt="" fill priority unoptimized />
        </div>
      </header>
      <ul className="workspace-grid" id="role-workspaces" aria-label="Role workspaces" role="list" tabIndex={-1}>
        {workspaces.map(({ name, href, description }) => <li key={href}>
          <Link href={href} className="workspace-card">
            <span className="workspace-name">{name}</span>
            <span className="workspace-arrow" aria-hidden="true">→</span>
            <p>{description}</p>
          </Link>
        </li>)}
      </ul>
    </main>
  </>;
}
