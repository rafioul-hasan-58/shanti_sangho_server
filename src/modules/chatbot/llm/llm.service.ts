import {
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import type {
  ChatCompletion,
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from 'openai/resources/chat/completions';
import { EnvConfig } from '../../../config/env.schema';
import {
  DEFAULT_LLM_TIMEOUT_MS,
  DEFAULT_MAX_TOKENS,
  LLM_CLIENT,
} from './llm.constants';

export interface LlmChatOptions {
  messages: ChatCompletionMessageParam[];
  tools?: ChatCompletionTool[];
  toolChoice?: 'auto' | 'none' | 'required';
  maxTokens?: number;
  timeoutMs?: number;
}

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);
  private readonly defaultModel: string;

  constructor(
    @Inject(LLM_CLIENT)
    private readonly client: OpenAI,
    private readonly configService: ConfigService<EnvConfig, true>,
  ) {
    this.defaultModel =
      this.configService.get('DEEPSEEK_MODEL', { infer: true }) ||
      'deepseek-chat';
  }

  /**
   * Execute chat completion against the configured DeepSeek LLM endpoint.
   * Handles timeouts, token logging, and maps upstream failures to a friendly 503.
   */
  async chatCompletion(options: LlmChatOptions): Promise<ChatCompletion> {
    const timeout = options.timeoutMs ?? DEFAULT_LLM_TIMEOUT_MS;
    const maxTokens = options.maxTokens ?? DEFAULT_MAX_TOKENS;

    try {
      const completion = await this.client.chat.completions.create(
        {
          model: this.defaultModel,
          messages: options.messages,
          tools:
            options.tools && options.tools.length > 0
              ? options.tools
              : undefined,
          tool_choice:
            options.tools && options.tools.length > 0
              ? (options.toolChoice ?? 'auto')
              : undefined,
          max_tokens: maxTokens,
        },
        {
          timeout,
        },
      );

      // Log token usage without logging message content or PII
      if (completion.usage) {
        this.logger.log(
          `LLM completion succeeded. Usage: prompt=${completion.usage.prompt_tokens}, completion=${completion.usage.completion_tokens}, total=${completion.usage.total_tokens}`,
        );
      }

      return completion;
    } catch (error: unknown) {
      this.handleLlmError(error);
    }
  }

  /**
   * Maps LLM client errors (network timeout, rate limit, provider 5xx) to HTTP 503
   * without leaking internal provider details or secrets to the client.
   */
  private handleLlmError(error: unknown): never {
    if (error instanceof OpenAI.APIError) {
      this.logger.error(
        `OpenAI/DeepSeek API Error: status=${error.status}, type=${error.type}, code=${error.code}, message=${error.message}`,
      );

      if (error.status === 429) {
        this.logger.warn('DeepSeek rate limit reached');
      } else if (error.status && error.status >= 500) {
        this.logger.error('DeepSeek provider server error');
      }
    } else if (error instanceof OpenAI.APIConnectionTimeoutError) {
      this.logger.error('DeepSeek request timed out');
    } else if (error instanceof OpenAI.APIConnectionError) {
      this.logger.error(`DeepSeek connection failed: ${error.message}`);
    } else {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Unexpected LLM execution error: ${msg}`);
    }

    throw new ServiceUnavailableException(
      'The AI assistant is temporarily unavailable. Please try again shortly.',
    );
  }
}
