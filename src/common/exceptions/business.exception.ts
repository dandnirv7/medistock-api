import { HttpException, HttpStatus } from '@nestjs/common';

export interface BusinessExceptionOptions {
  code: string;
  message: string;
  status?: HttpStatus;
  details?: unknown;
}

/**
 * Throws an HttpException whose body carries a custom error code that the
 * global HttpExceptionFilter will surface as `error.code` (instead of the
 * generic status-derived code).
 */
export class BusinessException extends HttpException {
  constructor(options: BusinessExceptionOptions) {
    const { code, message, status = HttpStatus.BAD_REQUEST, details } = options;
    super({ message, code, details }, status);
  }
}
