/** Consent requests have a finite decision window to prevent stale approvals. */
export interface PendingRequest {
  status: string;
  decisionDeadlineAt: Date | string;
}
export function isRequestPendingAndLive(request: PendingRequest | null | undefined, now = new Date()): boolean {
  if (!request || request.status !== 'PENDING') return false;
  const deadline = new Date(request.decisionDeadlineAt).getTime();
  return Number.isFinite(deadline) && Number.isFinite(now.getTime()) && deadline > now.getTime();
}
/** Reject out-of-policy duration before any database operation. */
export function decisionDeadline(now = new Date(), hours = 24): Date {
  if (!Number.isSafeInteger(hours) || hours < 1 || hours > 72 || !Number.isFinite(now.getTime()))
    throw new Error('Invalid consent request deadline');
  return new Date(now.getTime() + hours * 60 * 60 * 1000);
}
