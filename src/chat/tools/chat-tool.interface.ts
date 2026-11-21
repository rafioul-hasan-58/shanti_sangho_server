import type { ChatCompletionTool } from 'openai/resources/chat/completions';
import { ToolContext } from './tool-context';

export interface ChatTool {
  readonly name: string;
  readonly definition: ChatCompletionTool;
  readonly requiresAuth: boolean;
  execute(
    args: Record<string, unknown>,
    ctx: ToolContext,
  ): Promise<Record<string, unknown>>;
}
