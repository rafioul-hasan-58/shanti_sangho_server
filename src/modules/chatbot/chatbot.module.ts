import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerModule } from '@nestjs/throttler';
import { ClubInfoModule } from '../../infrastructure/club-info/club-info.module';
import { MembersModule } from '../members';
import { PrismaModule } from '../../prisma/prisma.module';
import { ChatHistoryService } from './chat-history.service';
import { ChatbotController } from './chatbot.controller';
import { ChatbotService } from './chatbot.service';
import { ChatThrottlerGuard } from './guards/chat-throttler.guard';
import { LlmClientProvider } from './llm/llm.provider';
import { LlmService } from './llm/llm.service';
import { GetMyMembershipTool } from './tools/get-my-membership.tool';
import { SearchClubInfoTool } from './tools/search-club-info.tool';
import { ToolsRegistry } from './tools/tools.registry';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    ClubInfoModule,
    MembersModule,
    JwtModule,
    ThrottlerModule.forRoot([
      {
        name: 'anonymous',
        ttl: 60000,
        limit: 10,
      },
      {
        name: 'authenticated',
        ttl: 60000,
        limit: 30,
      },
    ]),
  ],
  controllers: [ChatbotController],
  providers: [
    LlmClientProvider,
    LlmService,
    GetMyMembershipTool,
    SearchClubInfoTool,
    ToolsRegistry,
    ChatHistoryService,
    ChatbotService,
    ChatThrottlerGuard,
  ],
  exports: [ChatbotService],
})
export class ChatbotModule {}

export { ChatbotModule as ChatModule };
