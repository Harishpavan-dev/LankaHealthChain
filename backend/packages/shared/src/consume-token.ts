/**
 * Atomically consume a short-lived internal service token in the owning hospital DB.
 * `jti` is a UUID, backed by a PostgreSQL primary key; a second replica cannot
 * accept the same token. A DB outage FAILS CLOSED rather than silently falling
 * back to per-process memory.
 */
export interface ServiceTokenLedger {
  usedServiceToken: {
    create(args: {data: {jti: string; expiresAt: Date}}): Promise<unknown>;
  };
}
function uniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null &&
    'code' in error && error.code === 'P2002';
}
export async function consumeServiceToken(
  ledger: ServiceTokenLedger,
  claims: {jti: string; exp: number},
  nowSeconds = Math.floor(Date.now() / 1000),
): Promise<boolean> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(claims.jti) ||
      !Number.isSafeInteger(claims.exp) || claims.exp <= nowSeconds || claims.exp > nowSeconds + 45)
    return false;
  try {
    await ledger.usedServiceToken.create({data:{
      jti:claims.jti, expiresAt:new Date(claims.exp * 1000),
    }});
    return true;
  } catch(error) {
    // Prisma duplicate-key: exactly one of simultaneous replicas can win.
    if (uniqueViolation(error)) return false;
    throw error;
  }
}
