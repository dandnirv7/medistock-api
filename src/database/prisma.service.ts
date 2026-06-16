import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

/**
 * Thin Nest-friendly wrapper around the generated PrismaClient.
 *
 * The Prisma 7 runtime requires an explicit driver adapter instead of
 * reading DATABASE_URL by magic, so we build a PrismaPg factory from
 * the same connection string the Prisma CLI uses (see prisma.config.ts).
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error('DATABASE_URL is not set — cannot create PrismaService');
    }
    super({
      adapter: new PrismaPg(url),
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('Prisma connected.');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
