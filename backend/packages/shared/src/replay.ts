/** Ephemeral, per-process replay guard for local demo only.
 * Replace with Redis SET NX + TTL or request-bound mTLS in multi-replica deployments.
 */
export class ReplayGuard {
  private readonly seen = new Map<string,number>();
  accept(jti:string, exp:number, now=Math.floor(Date.now()/1000)):boolean {
    if (!/^[a-f0-9-]{36}$/i.test(jti) || !Number.isSafeInteger(exp) || exp<=now) return false;
    for (const [key,until] of this.seen) if (until<=now) this.seen.delete(key);
    if (this.seen.has(jti)) return false;
    if (this.seen.size>=100000) return false;
    this.seen.set(jti,exp); return true;
  }
}
