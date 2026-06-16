import { Controller, Get } from '@nestjs/common';

import { Public } from '../common/decorators/public.decorator';

/**
 * API health check. Lives under the global /api/v1 prefix:
 *   GET /api/v1/health
 *
 * Public so smoke tests and load balancers can hit it without a token.
 * The pure liveness probe at /health is in main.ts.
 */
@Public()
@Controller('health')
export class HealthController {
  @Get()
  check(): { status: 'ok' } {
    return { status: 'ok' };
  }
}
