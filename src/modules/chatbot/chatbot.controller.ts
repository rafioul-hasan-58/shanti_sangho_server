import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import { ChatbotService } from './chatbot.service';
import { ChatResponseDto, SendMessageDto } from './dto';
import { ChatThrottlerGuard } from './guards/chat-throttler.guard';
import { AuthUser } from './tools/tool-context';

@ApiTags('Chatbot')
@Controller(['chatbot', 'chat'])
@UseGuards(OptionalJwtAuthGuard, ChatThrottlerGuard)
export class ChatbotController {
  constructor(private readonly chatbotService: ChatbotService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Send a message to the club AI chatbot (Public / Authenticated)',
    description:
      'Interact with the sports club AI assistant. Anonymous visitors can ask about club fees, rules, opening hours, schedule, and FAQs. Authenticated members can also query their own membership details.',
  })
  @ApiResponse({
    status: 200,
    description: 'Chat response generated successfully.',
    type: ChatResponseDto,
  })
  @ApiResponse({
    status: 400,
    description:
      'Validation failed (e.g., message empty or exceeding 1000 characters).',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden: Chat session belongs to another member.',
  })
  @ApiResponse({
    status: 404,
    description: 'Chat session not found.',
  })
  @ApiResponse({
    status: 429,
    description: 'Too many requests. Please slow down.',
  })
  @ApiResponse({
    status: 503,
    description:
      'AI assistant is temporarily unavailable. Please retry shortly.',
  })
  async sendMessage(
    @Body() dto: SendMessageDto,
    @CurrentUser() user?: AuthUser | null,
  ): Promise<ChatResponseDto> {
    return this.chatbotService.sendMessage(dto, user ?? null);
  }
}

export { ChatbotController as ChatController };
