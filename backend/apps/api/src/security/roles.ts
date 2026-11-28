import { ForbiddenException } from '@nestjs/common';
import type { Principal } from './jwt.guard';
export function requireRole(principal: Principal, role: 'patient'|'doctor'|'network_admin'|'hospital_admin'|'security_auditor'|'researcher') {
 if (!principal.roles.includes(role)) throw new ForbiddenException(`Requires ${role} role`);
}
