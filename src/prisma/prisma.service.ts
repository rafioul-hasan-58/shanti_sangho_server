import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const dbUrl = process.env.DATABASE_LOCAL_URL || process.env.DATABASE_URL;
    super(
      dbUrl
        ? {
            datasources: {
              db: {
                url: dbUrl,
              },
            },
          }
        : undefined,
    );
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
