import { Injectable, Logger } from '@nestjs/common';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import {
  FALLBACK_MESSAGE,
  MAX_HISTORY,
  MAX_TOOL_ROUNDS,
} from './chatbot.constants';
import { ChatHistoryService } from './chat-history.service';
import { ChatResponseDto, SendMessageDto } from './dto';
import { LlmService } from './llm/llm.service';
import { buildSystemPrompt } from './prompts/system.prompt';
import { AuthUser, ToolContext } from './tools/tool-context';
import { ToolsRegistry } from './tools/tools.registry';

@Injectable()
export class ChatbotService {
  private readonly logger = new Logger(ChatbotService.name);

  constructor(
    private readonly chatHistoryService: ChatHistoryService,
    private readonly llmService: LlmService,
    private readonly toolsRegistry: ToolsRegistry,
  ) {}

  /**
   * Main chat orchestrator: builds context, executes the tool loop up to MAX_TOOL_ROUNDS,
   * persists conversation turns, and returns the assistant's answer.
   */
  async sendMessage(
    dto: SendMessageDto,
    user: AuthUser | null = null,
  ): Promise<ChatResponseDto> {
    const session = await this.chatHistoryService.findOrCreateSession(
      dto.sessionId,
      user,
    );

    // 1. Persist the incoming user message
    await this.chatHistoryService.saveMessage(session.id, 'user', dto.message);

    // 2. Load recent message history for context (up to MAX_HISTORY)
    const recentHistory = await this.chatHistoryService.getRecentMessages(
      session.id,
      MAX_HISTORY,
    );

    // 3. Assemble initial messages array starting with system prompt
    const conversationMessages: ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: buildSystemPrompt({ user }),
      },
    ];

    for (const msg of recentHistory) {
      if (msg.role === 'user') {
        conversationMessages.push({ role: 'user', content: msg.content });
      } else if (msg.role === 'assistant') {
        conversationMessages.push({ role: 'assistant', content: msg.content });
      }
    }

    // Ensure the current user message is at the end of context if not already
    const lastMsg = conversationMessages[conversationMessages.length - 1];
    if (lastMsg.role !== 'user' || lastMsg.content !== dto.message) {
      conversationMessages.push({ role: 'user', content: dto.message });
    }

    // 4. Retrieve available tool definitions for caller's auth status
    const tools = this.toolsRegistry.getDefinitionsForUser(user);
    const toolContext: ToolContext = { user };

    // 5. Tool-calling loop up to MAX_TOOL_ROUNDS
    let currentRound = 0;
    let finalAnswer: string | null = null;

    while (currentRound < MAX_TOOL_ROUNDS) {
      currentRound++;

      const completion = await this.llmService.chatCompletion({
        messages: conversationMessages,
        tools: tools.length > 0 ? tools : undefined,
      });

      const choice = completion.choices[0];
      const message = choice.message;

      // Check if the model requested any tool calls
      if (message.tool_calls && message.tool_calls.length > 0) {
        // Append assistant tool-call intent to conversation
        conversationMessages.push({
          role: 'assistant',
          content: message.content || null,
          tool_calls: message.tool_calls,
        });

        // Execute each requested tool call
        for (const toolCall of message.tool_calls) {
          if (toolCall.type === 'function') {
            const toolResult = await this.toolsRegistry.executeTool(
              toolCall.function.name,
              toolCall.function.arguments,
              toolContext,
            );

            conversationMessages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: JSON.stringify(toolResult),
            });
          }
        }
      } else {
        // Final textual answer reached
        finalAnswer = message.content?.trim() || '';
        break;
      }
    }

    // If max rounds reached without final answer, use safe fallback
    if (finalAnswer === null) {
      this.logger.warn(
        `Session ${session.id} exceeded MAX_TOOL_ROUNDS (${MAX_TOOL_ROUNDS}). Using fallback.`,
      );
      finalAnswer = FALLBACK_MESSAGE;
    }

    // 6. Persist final assistant response
    await this.chatHistoryService.saveMessage(
      session.id,
      'assistant',
      finalAnswer,
    );

    return {
      sessionId: session.id,
      message: finalAnswer,
      role: 'assistant',
    };
  }
}

export { ChatbotService as ChatService };
