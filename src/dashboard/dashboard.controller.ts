import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { EnvelopeDto } from '../common/dto/envelope.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { DashboardService } from './dashboard.service';
import { DashboardSummaryDto } from './dto/dashboard-summary.dto';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
@ApiTags('dashboard')
@ApiBearerAuth('jwt')
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Home screen summary cards + lists' })
  @ApiOkResponse({ type: EnvelopeDto<DashboardSummaryDto> })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  summary(): Promise<DashboardSummaryDto> {
    return this.service.summary();
  }
}
