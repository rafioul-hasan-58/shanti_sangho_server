import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { FundsRepository } from './funds.repository';
import { FundsService } from './funds.service';
import { FundsController } from './funds.controller';

@Module({
  imports: [PrismaModule],
  controllers: [FundsController],
  providers: [FundsRepository, FundsService],
  exports: [FundsRepository, FundsService],
})
export class FundsModule {}
