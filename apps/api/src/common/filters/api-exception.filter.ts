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
    const body = exception instanceof HttpException ? exception.getResponse() : undefined;
    const requestId = String(response.getHeader('X-Request-ID') ?? '');
    response.status(status).json(publicApiError(status, body, requestId));
  }
}
