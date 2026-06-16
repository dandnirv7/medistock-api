import { Controller, Get, HttpException, HttpStatus } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import {
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';

import { Public } from '../common/decorators/public.decorator';
import { EnvelopeDto } from '../common/dto/envelope.dto';
import { PrismaService } from '../database/prisma.service';

class HealthPayload {
  status!: 'ok' | 'degraded';
  database!: 'up' | 'down';
  uptime!: number;
}

/**
 * API health check. Lives under the global /api/v1 prefix:
 *   GET /api/v1/health
 *
 * Public so smoke tests and load balancers can hit it without a token.
 * Probes the database with `SELECT 1` so a broken pool / bad credentials
 * surfaces as 503 instead of a silent 200. The pure liveness probe at
 * /health is in main.ts.
 */
@ApiTags('health')
@Public()
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  // Uptime monitors and load balancers may poll /api/v1/health every
  // few seconds. The global 60/min prod throttler would trip within
  // an hour, so health probes are exempt.
  @SkipThrottle()
  @Get()
  @ApiOperation({ summary: 'Liveness + DB readiness probe' })
  @ApiOkResponse({ type: EnvelopeDto<HealthPayload> })
  @ApiServiceUnavailableResponse({
    description: 'Database is unreachable',
    schema: {
      example: {
        success: false,
        message: 'Service Unavailable',
        data: {
          status: 'degraded',
          database: 'down',
          uptime: 12.5,
          error: 'connection refused',
        },
      },
    },
  })
  async check(): Promise<HealthPayload> {
    let database: 'up' | 'down' = 'down';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      database = 'up';
    } catch (err) {
      throw new HttpException(
        {
          success: false,
          message: 'Service Unavailable',
          data: {
            status: 'degraded' as const,
            database: 'down' as const,
            uptime: process.uptime(),
            error: err instanceof Error ? err.message : 'unknown',
          },
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    return {
      status: database === 'up' ? 'ok' : 'degraded',
      database,
      uptime: process.uptime(),
    };
  }
}
