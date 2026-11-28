import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import type { Request, Response } from 'express';
import { publicApiError } from '@lhc/shared/api-error';

/** Sanitized, correlated error envelope. Never emit stack traces or PHI. */
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const status = exception instanceof HttpException
      ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    let body: unknown;
    if (exception instanceof HttpException) {
      const cause = exception.cause;
      // Express parser and URL-decoding errors can include raw request input.
      if (cause instanceof SyntaxError) body = { message: 'Invalid JSON body' };
      else if (cause instanceof URIError) body = { message: 'Invalid request URL' };
      else body = exception.getResponse();
    }
    const requestId = String(response.getHeader('X-Request-ID') ?? '');
    response.status(status).json(publicApiError(status, body, requestId));
  }
}
