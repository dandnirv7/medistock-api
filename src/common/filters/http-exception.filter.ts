import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

/**
 * Global exception filter producing the error envelope from
 * docs/api_contract.md §2.1 and §4.
 *
 *   { success: false, message, error: { code, details? } }
 *
 * Resolution order for `code`:
 *   1. `code` from the HttpException body (BusinessException pattern)
 *   2. Built-in map by HTTP status (VALIDATION_ERROR / UNAUTHORIZED / …)
 *   3. Fallback: INTERNAL_SERVER_ERROR
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let code = 'INTERNAL_SERVER_ERROR';
    let details: unknown = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const raw = exception.getResponse();

      // Resolve message + optional custom code/details from the body.
      if (raw && typeof raw === 'object') {
        const obj = raw as Record<string, unknown>;
        if (typeof obj.code === 'string') {
          code = obj.code;
        }
        if (typeof obj.message === 'string') {
          message = obj.message;
        } else if (Array.isArray(obj.message) && obj.message.length > 0) {
          // class-validator string array
          message = 'Validation failed';
          code = code === 'INTERNAL_SERVER_ERROR' ? 'VALIDATION_ERROR' : code;
          details = obj.message;
        } else {
          // class-validator sometimes puts details inline
          if (
            status === HttpStatus.BAD_REQUEST &&
            code === 'INTERNAL_SERVER_ERROR'
          ) {
            code = 'VALIDATION_ERROR';
            message = 'Validation failed';
            details = obj;
          }
        }
        if ('details' in obj && obj.details !== undefined) {
          details = obj.details;
        }
      } else if (typeof raw === 'string') {
        message = raw;
      }

      // If no custom code was supplied, derive from status.
      if (
        code === 'INTERNAL_SERVER_ERROR' &&
        status !== HttpStatus.INTERNAL_SERVER_ERROR
      ) {
        code = this.statusToCode(status);
        if (
          status === HttpStatus.BAD_REQUEST &&
          message === 'Internal server error'
        ) {
          message = 'Validation failed';
        }
      }

      // Rate limiting (@nestjs/throttler) throws a 429 whose default body
      // message is the raw "ThrottlerException: Too Many Requests". That
      // leaks an internal class name AND, because 429 was not in the
      // status->code map, it used to be mislabeled INTERNAL_SERVER_ERROR.
      // Normalise it to a clean, client-friendly envelope so the mobile
      // app can detect it (code) and show a calm message (message) instead
      // of a crash-like error. The ThrottlerGuard's Retry-After header is
      // left untouched on the response.
      if (status === HttpStatus.TOO_MANY_REQUESTS) {
        code = 'RATE_LIMITED';
        message = 'Terlalu banyak permintaan. Coba lagi sebentar.';
      }
    } else if (exception instanceof Error) {
      this.logger.error(exception.message, exception.stack);
    } else {
      this.logger.error(`Unknown exception: ${String(exception)}`);
    }

    response.status(status).json({
      success: false,
      message,
      error: {
        code,
        ...(details !== undefined ? { details } : {}),
      },
      path: request.url,
    });
  }

  private statusToCode(status: number): string {
    const map: Record<number, string> = {
      400: 'VALIDATION_ERROR',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'DUPLICATE_RESOURCE',
      422: 'VALIDATION_ERROR',
      429: 'RATE_LIMITED',
      500: 'INTERNAL_SERVER_ERROR',
    };
    return map[status] ?? 'INTERNAL_SERVER_ERROR';
  }
}
