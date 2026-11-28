'use client';
import dynamic from 'next/dynamic';
import { WorkspaceLoading } from '@/components/workspace-frame';
const Dashboard=dynamic(()=>import('@/portal-pages/researcher').then(m=>m.App), {ssr:false,loading: WorkspaceLoading});
export default function Page(){return <Dashboard/>;}
