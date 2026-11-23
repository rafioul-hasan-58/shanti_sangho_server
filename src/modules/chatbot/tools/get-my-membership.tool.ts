import { Injectable, Logger } from '@nestjs/common';
import type { ChatCompletionTool } from 'openai/resources/chat/completions';
import { MembersService } from '../../members/members.service';
import { ChatTool } from './chat-tool.interface';
import { ToolContext } from './tool-context';

@Injectable()
export class GetMyMembershipTool implements ChatTool {
  private readonly logger = new Logger(GetMyMembershipTool.name);

  readonly name = 'get_my_membership';
  readonly requiresAuth = true;

  readonly definition: ChatCompletionTool = {
    type: 'function',
    function: {
      name: 'get_my_membership',
      description:
        "Retrieve the currently logged-in member's own membership details, status, membership type, contact info, and club profile. Takes no arguments.",
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  };

  constructor(private readonly membersService: MembersService) {}

  async execute(
    _args: Record<string, unknown>,
    ctx: ToolContext,
  ): Promise<Record<string, unknown>> {
    if (!ctx.user || !ctx.user.id) {
      return {
        error: 'login_required',
        message: 'You must be logged in to view your membership information.',
      };
    }

    try {
      const identifier = ctx.user.memberId || ctx.user.id;
      const member = await this.membersService.findOne(identifier);

      if (!member) {
        return {
          error: 'member_not_found',
          message:
            'No matching club membership record was found for your account.',
        };
      }

      // Explicit whitelist of safe fields - no credentials or internal hashes
      return {
        memberNumber: member.id,
        fullName: member.fullName,
        email: member.email,
        phoneNumber: member.phoneNumber,
        membershipType: member.membershipType,
        bloodGroup: member.bloodGroup,
        status: member.status,
        village: member.village,
        profession: member.profession,
        currentLocation: member.currentLocation,
        memberSince: member.createdAt,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `Could not retrieve membership for member ${ctx.user.id}: ${msg}`,
      );
      return {
        error: 'member_not_found',
        message:
          'No sports club membership profile was found linked to your authenticated member account.',
      };
    }
  }
}
