import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { Request } from 'express';

export interface Principal { sub: string; roles: string[]; }
export type AuthenticatedRequest = Request & { principal: Principal };
@Injectable()
export class JwtGuard implements CanActivate {
 private jwks = createRemoteJWKSet(new URL(`${process.env.OIDC_ISSUER}/protocol/openid-connect/certs`));
 async canActivate(context: ExecutionContext): Promise<boolean> {
   const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
   const authorization = req.headers.authorization;
   if (!authorization?.startsWith('Bearer ')) throw new UnauthorizedException('Bearer access token required');
   try {
     const { payload } = await jwtVerify(authorization.slice(7), this.jwks, {
       issuer: process.env.OIDC_ISSUER,
       audience: process.env.OIDC_AUDIENCE,
       algorithms: ['RS256'],
     });
     if (!payload.sub) throw new Error('sub absent');
     const roles = (payload.realm_access as { roles?: unknown } | undefined)?.roles;
     req.principal = { sub: payload.sub, roles: Array.isArray(roles) ? roles.filter((r): r is string => typeof r === 'string') : [] };
     return true;
   } catch { throw new UnauthorizedException('Access token verification failed'); }
 }
}
