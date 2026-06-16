import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * Wraps every successful response in the global envelope defined by
 * docs/api_contract.md §2.1.
 *
 *   Single payload:    { success: true, message: "Success", data: <payload> }
 *   Paginated list:    { success: true, message: "Success", data: [...], meta: {...} }
 *
 * Handlers that already return the full envelope (with `success`) are passed
 * through unchanged.
 *
 * Handlers that return a { data, meta } object (common pattern for paginated
 * controllers) are unwrapped: the array becomes `data` and `meta` is hoisted
 * to the top level so it sits alongside the envelope.
 */
@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<Record<string, unknown>> {
    return next.handle().pipe(
      map((raw: unknown) => {
        if (
          raw !== null &&
          typeof raw === 'object' &&
          'success' in (raw as Record<string, unknown>)
        ) {
          return raw as Record<string, unknown>;
        }
        if (this.isPaginated(raw)) {
          const { data, meta } = raw;
          return {
            success: true,
            message: 'Success',
            data: data === undefined ? null : data,
            meta,
          };
        }
        return {
          success: true,
          message: 'Success',
          data: raw === undefined ? null : raw,
        };
      }),
    );
  }

  private isPaginated(raw: unknown): raw is { data: unknown; meta: unknown } {
    if (raw === null || typeof raw !== 'object') return false;
    const obj = raw as Record<string, unknown>;
    return 'data' in obj && 'meta' in obj && !('success' in obj);
  }
}
