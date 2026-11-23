import { Injectable, Logger } from '@nestjs/common';
import type { ChatCompletionTool } from 'openai/resources/chat/completions';
import { z } from 'zod';
import { ClubInfoService } from '../../../club-info/club-info.service';
import { ChatTool } from './chat-tool.interface';
import { ToolContext } from './tool-context';

const searchClubInfoSchema = z.object({
  query: z
    .string()
    .min(1, 'Query parameter is required')
    .max(200, 'Query parameter cannot exceed 200 characters'),
});

@Injectable()
export class SearchClubInfoTool implements ChatTool {
  private readonly logger = new Logger(SearchClubInfoTool.name);

  readonly name = 'search_club_info';
  readonly requiresAuth = false;

  readonly definition: ChatCompletionTool = {
    type: 'function',
    function: {
      name: 'search_club_info',
      description:
        'Search the sports club official database for verified static club info including membership fees, rules, opening hours, schedule, contacts, and FAQs.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description:
              'The topic or question keyword to search (e.g., "fees", "opening hours", "rules", "contact").',
          },
        },
        required: ['query'],
      },
    },
  };

  constructor(private readonly clubInfoService: ClubInfoService) {}

  async execute(
    args: Record<string, unknown>,
    _ctx: ToolContext,
  ): Promise<Record<string, unknown>> {
    void _ctx;
    try {
      const parsed = searchClubInfoSchema.safeParse(args);
      if (!parsed.success) {
        return {
          error: 'invalid_arguments',
          message: 'The query must be a valid non-empty string.',
        };
      }

      const results = await this.clubInfoService.search(parsed.data.query);

      if (!results || results.length === 0) {
        return {
          results: [],
          message:
            'No verified club information found matching your query. Please ask a club staff member.',
        };
      }

      // Whitelist only safe display fields
      const whitelisted = results.map((item) => ({
        category: item.category,
        title: item.title,
        content: item.content,
        tags: item.tags,
      }));

      return {
        results: whitelisted,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Error executing search_club_info: ${msg}`);
      return {
        error: 'search_failed',
        message: 'Could not search club information at this time.',
      };
    }
  }
}
