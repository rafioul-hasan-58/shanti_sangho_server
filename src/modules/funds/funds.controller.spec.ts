import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { FundCategory } from '@prisma/client';
import { FundsController } from './funds.controller';
import { FundsService } from './funds.service';
import { CreateFundDto, QueryFundDto, UpdateFundDto } from './dto';

describe('FundsController', () => {
  let controller: FundsController;
  let fundsService: {
    create: jest.Mock;
    findAll: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
  };

  const mockFundResponse = {
    id: '64a1b2c3d4e5f67890123456',
    name: 'GPL 2026 Tournament Fund',
    category: FundCategory.GPL,
    isActive: true,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    summary: {
      totalCollected: 8000,
      totalSpent: 2000,
      balance: 6000,
      contributionsCount: 2,
      expensesCount: 1,
    },
  };

  beforeEach(async () => {
    fundsService = {
      create: jest.fn().mockResolvedValue(mockFundResponse),
      findAll: jest.fn().mockResolvedValue({
        funds: [mockFundResponse],
        meta: {
          total: 1,
          page: 1,
          limit: 10,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      }),
      findOne: jest.fn().mockResolvedValue(mockFundResponse),
      update: jest.fn().mockResolvedValue({
        ...mockFundResponse,
        name: 'Updated GPL Fund',
      }),
      remove: jest.fn().mockResolvedValue(mockFundResponse),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FundsController],
      providers: [
        {
          provide: FundsService,
          useValue: fundsService,
        },
        {
          provide: JwtService,
          useValue: { verifyAsync: jest.fn() },
        },
        Reflector,
      ],
    }).compile();

    controller = module.get<FundsController>(FundsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should create a fund on POST /funds', async () => {
    const dto: CreateFundDto = {
      name: 'GPL 2026 Tournament Fund',
      category: FundCategory.GPL,
    };
    const res = await controller.create(dto);
    expect(fundsService.create).toHaveBeenCalledWith(dto);
    expect(res.message).toBe('Fund created successfully');
    expect(res.data).toEqual(mockFundResponse);
  });

  it('should return paginated funds on GET /funds', async () => {
    const query: QueryFundDto = { page: 1, limit: 10 };
    const res = await controller.findAll(query);
    expect(fundsService.findAll).toHaveBeenCalledWith(query);
    expect(res.message).toBe('Funds retrieved successfully');
    expect(res.data.funds).toHaveLength(1);
  });

  it('should return a single fund on GET /funds/:id', async () => {
    const res = await controller.findOne(mockFundResponse.id);
    expect(fundsService.findOne).toHaveBeenCalledWith(mockFundResponse.id);
    expect(res.message).toBe('Fund retrieved successfully');
    expect(res.data).toEqual(mockFundResponse);
  });

  it('should update a fund on PATCH /funds/:id', async () => {
    const dto: UpdateFundDto = { name: 'Updated GPL Fund' };
    const res = await controller.update(mockFundResponse.id, dto);
    expect(fundsService.update).toHaveBeenCalledWith(mockFundResponse.id, dto);
    expect(res.message).toBe('Fund updated successfully');
    expect(res.data.name).toBe('Updated GPL Fund');
  });

  it('should delete a fund on DELETE /funds/:id', async () => {
    const res = await controller.remove(mockFundResponse.id);
    expect(fundsService.remove).toHaveBeenCalledWith(mockFundResponse.id);
    expect(res.message).toBe('Fund deleted successfully');
    expect(res.data).toEqual(mockFundResponse);
  });
});
