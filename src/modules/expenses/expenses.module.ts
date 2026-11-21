import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { FundsModule } from '../funds/funds.module';
import { MembersModule } from '../members/members.module';
import { ExpensesRepository } from './expenses.repository';
import { ExpensesService } from './expenses.service';
import { ExpensesController } from './expenses.controller';

@Module({
  imports: [PrismaModule, FundsModule, MembersModule],
  controllers: [ExpensesController],
  providers: [ExpensesRepository, ExpensesService],
  exports: [ExpensesRepository, ExpensesService],
})
export class ExpensesModule {}
