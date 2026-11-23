import { Injectable, Logger } from '@nestjs/common';
import type { ChatCompletionTool } from 'openai/resources/chat/completions';
import { ChatTool } from './chat-tool.interface';
import { GetMyMembershipTool } from './get-my-membership.tool';
import { SearchClubInfoTool } from './search-club-info.tool';
import { AuthUser, ToolContext } from './tool-context';

@Injectable()
export class ToolsRegistry {
  private readonly logger = new Logger(ToolsRegistry.name);
  private readonly tools = new Map<string, ChatTool>();

  constructor(
    private readonly getMyMembershipTool: GetMyMembershipTool,
    private readonly searchClubInfoTool: SearchClubInfoTool,
  ) {
    this.registerTool(this.getMyMembershipTool);
    this.registerTool(this.searchClubInfoTool);
  }

  private registerTool(tool: ChatTool): void {
    this.tools.set(tool.name, tool);
  }

  /**
   * Return tool definitions available to the caller.
   * If caller is anonymous, authenticated-only tools are omitted entirely.
   */
  getDefinitionsForUser(user: AuthUser | null): ChatCompletionTool[] {
    const definitions: ChatCompletionTool[] = [];

    for (const tool of this.tools.values()) {
      if (tool.requiresAuth && !user) {
        continue;
      }
      definitions.push(tool.definition);
    }

    return definitions;
  }

  /**
   * Safely execute a requested tool by name with parsed arguments and context.
   */
  async executeTool(
    name: string,
    rawArguments: string | Record<string, unknown>,
    ctx: ToolContext,
  ): Promise<Record<string, unknown>> {
    const tool = this.tools.get(name);

    if (!tool) {
      this.logger.warn(`Model requested unknown tool: '${name}'`);
      return {
        error: 'unknown_tool',
        message: `The tool '${name}' is not recognized or supported.`,
      };
    }

    if (tool.requiresAuth && !ctx.user) {
      return {
        error: 'login_required',
        message: 'This tool requires an authenticated member account.',
      };
    }

    let parsedArgs: Record<string, unknown> = {};

    if (typeof rawArguments === 'string') {
      try {
        parsedArgs = (
          rawArguments.trim() ? JSON.parse(rawArguments) : {}
        ) as Record<string, unknown>;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.warn(
          `Failed to parse tool arguments for '${name}': ${msg}`,
        );
        return {
          error: 'invalid_json_arguments',
          message: 'Tool arguments could not be parsed as valid JSON.',
        };
      }
    } else if (rawArguments && typeof rawArguments === 'object') {
      parsedArgs = rawArguments;
    }

    try {
      return await tool.execute(parsedArgs, ctx);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `Unhandled error during tool execution '${name}': ${msg}`,
      );
      return {
        error: 'tool_execution_failed',
        message: 'An error occurred while executing the tool.',
      };
    }
  }
}
