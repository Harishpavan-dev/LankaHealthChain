export interface PublicApiError {
  statusCode: number;
  code: string;
  message: string | string[];
  requestId: string;
}
const CODES: Record<number, string> = {
  400: 'BAD_REQUEST', 401: 'UNAUTHORIZED', 403: 'FORBIDDEN',
  404: 'NOT_FOUND', 409: 'CONFLICT', 413: 'PAYLOAD_TOO_LARGE',
  422: 'UNPROCESSABLE_ENTITY', 429: 'RATE_LIMITED', 503: 'SERVICE_UNAVAILABLE',
};
/** Never expose unexpected errors, internal SQL details or stacks to callers. */
export function publicApiError(statusCode: number, body: unknown, requestId: string): PublicApiError {
  const safeStatus = Number.isInteger(statusCode) && statusCode >= 400 && statusCode <= 599 ? statusCode : 500;
  const defaultMessage = safeStatus >= 500 ? 'Service temporarily unavailable' : 'Request failed';
  let message: string | string[] = defaultMessage;
  if (safeStatus < 500 && body && typeof body === 'object' && !Array.isArray(body)) {
    const source = (body as {message?: unknown}).message;
    if (typeof source === 'string' && source.length <= 400) message = source;
    else if (Array.isArray(source) && source.length <= 20 &&
       source.every(item => typeof item === 'string' && item.length <= 400)) message = source;
  }
  return {statusCode:safeStatus, code:CODES[safeStatus] ?? 'HTTP_ERROR', message,
    requestId:/^[0-9a-f-]{36}$/i.test(requestId) ? requestId : 'unavailable'};
}
