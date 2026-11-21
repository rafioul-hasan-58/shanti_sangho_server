import {
  INestApplication,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { ChatHistoryService } from '../src/chat/chat-history.service';
import { LlmService } from '../src/chat/llm/llm.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';

describe('ChatController (e2e)', () => {
  let app: INestApplication<App>;

  jest.setTimeout(30000);

  const mockPrismaService = {
    $connect: jest.fn().mockResolvedValue(undefined),
    $disconnect: jest.fn().mockResolvedValue(undefined),
    chatSession: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    chatMessage: {
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn(),
    },
    clubInfo: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  };

  const mockLlmService = {
    chatCompletion: jest.fn().mockResolvedValue({
      choices: [
        {
          message: {
            content:
              'Shanti Sangho Sports Club premises open daily from 6:00 AM to 10:00 PM.',
            tool_calls: undefined,
          },
        },
      ],
    }),
  };

  const mockChatHistoryService = {
    findOrCreateSession: jest.fn().mockResolvedValue({
      id: '64a1b2c3d4e5f67890123456',
      memberId: null,
      createdAt: new Date(),
    }),
    saveMessage: jest
      .fn()
      .mockImplementation(
        (
          sessionId: string,
          role: 'user' | 'assistant' | 'tool',
          content: string,
        ) =>
          Promise.resolve({
            id: '64a1b2c3d4e5f67890123457',
            sessionId,
            role,
            content,
            createdAt: new Date(),
          }),
      ),
    getRecentMessages: jest.fn().mockResolvedValue([]),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrismaService)
      .overrideProvider(LlmService)
      .useValue(mockLlmService)
      .overrideProvider(ChatHistoryService)
      .useValue(mockChatHistoryService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.enableVersioning({
      type: VersioningType.URI,
      defaultVersion: '1',
    });
    app.useGlobalInterceptors(new TransformInterceptor());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/api/v1/chat (POST) - Anonymous visitor can ask club questions', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/chat')
      .send({
        message: 'What are the opening hours of the club?',
      })
      .expect(200);

    const body = res.body as {
      success: boolean;
      statusCode: number;
      data: {
        sessionId: string;
        message: string;
        role: string;
      };
    };

    expect(body.success).toBe(true);
    expect(body.statusCode).toBe(200);
    expect(body.data.sessionId).toBe('64a1b2c3d4e5f67890123456');
    expect(body.data.message).toContain('6:00 AM to 10:00 PM');
    expect(body.data.role).toBe('assistant');
  });

  it('/api/v1/chat (POST) - Rejects empty message with 400 Bad Request', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/chat')
      .send({
        message: '',
      })
      .expect(400);
  });

  it('/api/v1/chat (POST) - Rejects forbidden extra non-whitelisted properties', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/chat')
      .send({
        message: 'Hello',
        unknownField: 'malicious-data',
      })
      .expect(400);
  });
});
