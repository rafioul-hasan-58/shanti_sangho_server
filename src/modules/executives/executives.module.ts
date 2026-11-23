import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { CloudinaryModule } from '../../infrastructure/cloudinary/cloudinary.module';
import { ExecutivesRepository } from './executives.repository';
import { ExecutivesService } from './executives.service';
import { ExecutivesController } from './executives.controller';

@Module({
  imports: [PrismaModule, CloudinaryModule],
  controllers: [ExecutivesController],
  providers: [ExecutivesRepository, ExecutivesService],
  exports: [ExecutivesRepository, ExecutivesService],
})
export class ExecutivesModule {}
