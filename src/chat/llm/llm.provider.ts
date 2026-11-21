import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { EnvConfig } from '../../config/env.schema';
import { LLM_CLIENT } from './llm.constants';

export const LlmClientProvider: Provider = {
  provide: LLM_CLIENT,
  inject: [ConfigService],
  useFactory: (configService: ConfigService<EnvConfig, true>) => {
    const apiKey = configService.get('DEEPSEEK_API_KEY', { infer: true });
    const baseURL =
      configService.get('DEEPSEEK_BASE_URL', { infer: true }) ||
      'https://api.deepseek.com';

    return new OpenAI({
      apiKey,
      baseURL,
    });
  },
};
