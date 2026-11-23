import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ChatMessage, ChatSession } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { MAX_HISTORY } from './chatbot.constants';
import { AuthUser } from './tools/tool-context';

@Injectable()
export class ChatHistoryService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find an existing chat session with ownership verification, or create a new session.
   */
  async findOrCreateSession(
    sessionId?: string,
    user?: AuthUser | null,
  ): Promise<ChatSession> {
    if (sessionId) {
      const session = await this.prisma.chatSession.findUnique({
        where: { id: sessionId },
      });

      if (!session) {
        throw new NotFoundException('Chat session not found');
      }

      // If session is owned by a member, verify the authenticated user matches
      if (session.memberId) {
        const callerId = user?.memberId || user?.id;
        if (!user || session.memberId !== callerId) {
          throw new ForbiddenException(
            'You do not have permission to access this chat session.',
          );
        }
      }

      return session;
    }

    // Create a new session
    const memberId = user ? user.memberId || user.id : null;

    return this.prisma.chatSession.create({
      data: {
        memberId: memberId || null,
      },
    });
  }

  /**
   * Persist a single message to the database under the given session.
   */
  async saveMessage(
    sessionId: string,
    role: 'user' | 'assistant' | 'tool',
    content: string,
  ): Promise<ChatMessage> {
    return this.prisma.chatMessage.create({
      data: {
        sessionId,
        role,
        content,
      },
    });
  }

  /**
   * Fetch the last MAX_HISTORY messages for this session in chronological order.
   */
  async getRecentMessages(
    sessionId: string,
    limit: number = MAX_HISTORY,
  ): Promise<ChatMessage[]> {
    const messages = await this.prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    // Return in ascending chronological order [oldest ... newest]
    return messages.reverse();
  }
}
