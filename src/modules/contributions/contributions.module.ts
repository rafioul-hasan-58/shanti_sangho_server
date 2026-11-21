import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { FundsModule } from '../funds/funds.module';
import { MembersModule } from '../members/members.module';
import { ContributionsRepository } from './contributions.repository';
import { ContributionsService } from './contributions.service';
import { ContributionsController } from './contributions.controller';

@Module({
  imports: [PrismaModule, FundsModule, MembersModule],
  controllers: [ContributionsController],
  providers: [ContributionsRepository, ContributionsService],
  exports: [ContributionsRepository, ContributionsService],
})
export class ContributionsModule {}
