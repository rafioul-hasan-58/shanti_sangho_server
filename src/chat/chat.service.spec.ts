import { Test, TestingModule } from '@nestjs/testing';
import { FALLBACK_MESSAGE } from './chat.constants';
import { ChatHistoryService } from './chat-history.service';
import { ChatService } from './chat.service';
import { LlmService } from './llm/llm.service';
import { ToolsRegistry } from './tools/tools.registry';

describe('ChatService', () => {
  let service: ChatService;
  let chatHistoryService: {
    findOrCreateSession: jest.Mock;
    saveMessage: jest.Mock;
    getRecentMessages: jest.Mock;
  };
  let llmService: {
    chatCompletion: jest.Mock;
  };
  let toolsRegistry: {
    getDefinitionsForUser: jest.Mock;
    executeTool: jest.Mock;
  };

  const mockSession = {
    id: '64a1b2c3d4e5f67890123456',
    memberId: null,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    chatHistoryService = {
      findOrCreateSession: jest.fn().mockResolvedValue(mockSession),
      saveMessage: jest
        .fn()
        .mockImplementation(
          (
            sessionId: string,
            role: 'user' | 'assistant' | 'tool',
            content: string,
          ) =>
            Promise.resolve({
              id: 'msg_123',
              sessionId,
              role,
              content,
              createdAt: new Date(),
            }),
        ),
      getRecentMessages: jest.fn().mockResolvedValue([]),
    };

    llmService = {
      chatCompletion: jest.fn(),
    };

    toolsRegistry = {
      getDefinitionsForUser: jest.fn().mockReturnValue([]),
      executeTool: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        {
          provide: ChatHistoryService,
          useValue: chatHistoryService,
        },
        {
          provide: LlmService,
          useValue: llmService,
        },
        {
          provide: ToolsRegistry,
          useValue: toolsRegistry,
        },
      ],
    }).compile();

    service = module.get<ChatService>(ChatService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('no-tool answer', () => {
    it('should return direct LLM response when no tools are requested', async () => {
      llmService.chatCompletion.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: 'Welcome to Shanti Sangho! How can I assist you?',
              tool_calls: undefined,
            },
          },
        ],
      });

      const response = await service.sendMessage({ message: 'Hello' }, null);

      expect(chatHistoryService.findOrCreateSession).toHaveBeenCalledWith(
        undefined,
        null,
      );
      expect(chatHistoryService.saveMessage).toHaveBeenCalledWith(
        mockSession.id,
        'user',
        'Hello',
      );
      expect(llmService.chatCompletion).toHaveBeenCalledTimes(1);
      expect(chatHistoryService.saveMessage).toHaveBeenCalledWith(
        mockSession.id,
        'assistant',
        'Welcome to Shanti Sangho! How can I assist you?',
      );
      expect(response).toEqual({
        sessionId: mockSession.id,
        message: 'Welcome to Shanti Sangho! How can I assist you?',
        role: 'assistant',
      });
    });
  });

  describe('one tool round', () => {
    it('should execute requested tool, append result, and return final answer on round 2', async () => {
      toolsRegistry.getDefinitionsForUser.mockReturnValueOnce([
        {
          type: 'function',
          function: {
            name: 'search_club_info',
            description: 'Search club info',
            parameters: {},
          },
        },
      ]);

      // Round 1: Model requests search_club_info tool
      llmService.chatCompletion.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: null,
              tool_calls: [
                {
                  id: 'call_abc123',
                  type: 'function',
                  function: {
                    name: 'search_club_info',
                    arguments: '{"query":"fees"}',
                  },
                },
              ],
            },
          },
        ],
      });

      toolsRegistry.executeTool.mockResolvedValueOnce({
        results: [
          {
            category: 'fees',
            title: 'Membership Fees',
            content: 'Monthly fee is 500 BDT.',
          },
        ],
      });

      // Round 2: Model uses tool result to produce final answer
      llmService.chatCompletion.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: 'General membership fee is 500 BDT per month.',
              tool_calls: undefined,
            },
          },
        ],
      });

      const response = await service.sendMessage(
        { message: 'How much are club fees?' },
        null,
      );

      expect(llmService.chatCompletion).toHaveBeenCalledTimes(2);
      expect(toolsRegistry.executeTool).toHaveBeenCalledWith(
        'search_club_info',
        '{"query":"fees"}',
        { user: null },
      );
      expect(response.message).toBe(
        'General membership fee is 500 BDT per month.',
      );
      expect(chatHistoryService.saveMessage).toHaveBeenLastCalledWith(
        mockSession.id,
        'assistant',
        'General membership fee is 500 BDT per month.',
      );
    });
  });

  describe('round cap reached', () => {
    it('should return safe fallback message when MAX_TOOL_ROUNDS is exhausted', async () => {
      // Model continuously emits tool calls for all 3 rounds
      const toolCallResponse = {
        choices: [
          {
            message: {
              content: null,
              tool_calls: [
                {
                  id: 'call_infinite',
                  type: 'function',
                  function: {
                    name: 'search_club_info',
                    arguments: '{"query":"loop"}',
                  },
                },
              ],
            },
          },
        ],
      };

      llmService.chatCompletion
        .mockResolvedValueOnce(toolCallResponse)
        .mockResolvedValueOnce(toolCallResponse)
        .mockResolvedValueOnce(toolCallResponse);

      toolsRegistry.executeTool.mockResolvedValue({ results: [] });

      const response = await service.sendMessage(
        { message: 'Loop question' },
        null,
      );

      expect(llmService.chatCompletion).toHaveBeenCalledTimes(3);
      expect(response.message).toBe(FALLBACK_MESSAGE);
      expect(chatHistoryService.saveMessage).toHaveBeenLastCalledWith(
        mockSession.id,
        'assistant',
        FALLBACK_MESSAGE,
      );
    });
  });
});
