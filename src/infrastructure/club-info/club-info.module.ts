import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ClubInfoService } from './club-info.service';

@Module({
  imports: [PrismaModule],
  providers: [ClubInfoService],
  exports: [ClubInfoService],
})
export class ClubInfoModule {}
