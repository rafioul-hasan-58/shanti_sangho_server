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
import { HealthModule } from './health/health.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { UploadModule } from './upload/upload.module';
import { ClubInfoModule } from './club-info/club-info.module';
import { ChatModule } from './chat/chat.module';

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
    HealthModule,
    CloudinaryModule,
    UploadModule,
    ClubInfoModule,
    ChatModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
