import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { validateConfig } from './config/env.schema';
import {
  AuthModule,
  CloudinaryModule,
  ClubInfoModule,
  HealthModule,
  MailModule,
} from './infrastructure';
import { MembersModule } from './modules/members';
import { ExecutivesModule } from './modules/executives';
import { FundsModule } from './modules/funds';
import { ContributionsModule } from './modules/contributions';
import { ExpensesModule } from './modules/expenses';
import { UploadModule } from './upload/upload.module';
import { ChatbotModule } from './modules/chatbot';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateConfig,
    }),
    PrismaModule,
    MailModule,
    AuthModule,
    MembersModule,
    ExecutivesModule,
    FundsModule,
    ContributionsModule,
    ExpensesModule,
    HealthModule,
    CloudinaryModule,
    UploadModule,
    ClubInfoModule,
    ChatbotModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
