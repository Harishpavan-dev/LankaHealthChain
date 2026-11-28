/** No protected data or wallet secrets belong in background worker status. */
export const ANCHOR_WORKER_ID = 'cardano-anchor-preparer' as const;
export const DEFAULT_WORKER_POLL_MS = 15000;
export const MAX_FAILURE_BACKOFF_MS = 300000;
export const MAX_BATCH_SIZE = 100;

/** Fail startup on invalid operator configuration instead of busy-looping. */
export function parseWorkerPollMs(value: string | undefined): number {
  if (value === undefined || value === '') return DEFAULT_WORKER_POLL_MS;
  if (!/^[1-9][0-9]*$/.test(value)) throw new Error('WORKER_POLL_MS must be a positive integer');
  const parsed=Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 5000 || parsed > 600000)
    throw new Error('WORKER_POLL_MS must be between 5000 and 600000');
  return parsed;
}
export function nextWorkerDelayMs(pollMs:number, consecutiveFailures:number):number {
  if (!Number.isSafeInteger(pollMs)||pollMs<5000||pollMs>600000)throw new Error('Invalid poll period');
  if (!Number.isSafeInteger(consecutiveFailures)||consecutiveFailures<0)throw new Error('Invalid retry count');
  return consecutiveFailures===0?pollMs:Math.min(MAX_FAILURE_BACKOFF_MS, pollMs*2**Math.min(consecutiveFailures,10));
}
export function workerHealth(now:Date,lastSeenAt:Date | null,pollMs:number):'offline'|'stale'|'healthy' {
  if (!lastSeenAt || !Number.isFinite(lastSeenAt.getTime()))return 'offline';
  const age=now.getTime()-lastSeenAt.getTime();
  return age>=0 && age<=Math.max(90000,pollMs*3)?'healthy':'stale';
}

/** A running worker that failed its latest cycle is degraded, not healthy. */
export function workerOperationalStatus(
  now:Date,lastSeenAt:Date|null,pollMs:number,lastErrorCode:string|null,
):'offline'|'stale'|'degraded'|'healthy'{
  const liveness=workerHealth(now,lastSeenAt,pollMs);
  return liveness!=='healthy'?liveness:(lastErrorCode?'degraded':'healthy');
}
