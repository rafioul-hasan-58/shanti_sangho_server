import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { MailModule } from './mail/mail.module';
import { ConfigModule } from '@nestjs/config';
import { validateConfig } from './config/env.schema';
import { AuthModule } from './auth/auth.module';
import { MembersModule } from './modules/members';
import { ExecutivesModule } from './modules/executives';
import { FundsModule } from './modules/funds';
import { ContributionsModule } from './modules/contributions';
import { ExpensesModule } from './modules/expenses';
import { HealthModule } from './health/health.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { UploadModule } from './upload/upload.module';
import { ClubInfoModule } from './club-info/club-info.module';
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
