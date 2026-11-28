export const workspaces = [
  { name: 'Patient', href: '/patient', role: 'patient', description: 'Review your medical history and manage access to your records.' },
  { name: 'Doctor', href: '/doctor', role: 'doctor', description: 'Request patient consent and view authorized records.' },
  { name: 'Network Admin', href: '/admin', role: 'network_admin', description: 'Monitor the hospital network and manage administrative access.' },
  { name: 'Hospital Admin', href: '/hospital-admin', role: 'hospital_admin', description: 'Manage your hospital’s clinicians and verification queue.' },
  { name: 'Security Auditor', href: '/auditor', role: 'security_auditor', description: 'Review de-identified access and administrative events.' },
  { name: 'Researcher', href: '/researcher', role: 'researcher', description: 'Explore approved aggregate statistics from synthetic records.' },
] as const;

export type WorkspaceName = typeof workspaces[number]['name'];
