import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ReceiveMethod, Role } from '@prisma/client';
import { ContributionsController } from './contributions.controller';
import { ContributionsService } from './contributions.service';
import type { JwtPayload } from '../../common/guards/auth.guard';
import {
  CreateContributionDto,
  QueryContributionDto,
  UpdateContributionDto,
} from './dto';

describe('ContributionsController', () => {
  let controller: ContributionsController;
  let contributionsService: {
    create: jest.Mock;
    findAll: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
  };

  const mockUser: JwtPayload = {
    id: '64a1b2c3d4e5f67890123499',
    email: 'admin@example.com',
    role: Role.ADMIN,
  };

  const mockContribution = {
    id: '64a1b2c3d4e5f67890123411',
    fundId: '64a1b2c3d4e5f67890123456',
    amount: 5000,
    method: ReceiveMethod.BKASH,
    receivedAt: new Date('2026-11-21'),
    note: 'Donation',
    reference: 'TRX-123',
    giverMemberId: null,
    giverName: 'Donor',
    receivedById: mockUser.id,
    createdAt: new Date('2026-11-21'),
    updatedAt: new Date('2026-11-21'),
  };

  beforeEach(async () => {
    contributionsService = {
      create: jest.fn().mockResolvedValue(mockContribution),
      findAll: jest.fn().mockResolvedValue({
        contributions: [mockContribution],
        totalAmount: 5000,
        meta: {
          total: 1,
          page: 1,
          limit: 10,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      }),
      findOne: jest.fn().mockResolvedValue(mockContribution),
      update: jest.fn().mockResolvedValue({
        ...mockContribution,
        amount: 6000,
      }),
      remove: jest.fn().mockResolvedValue(mockContribution),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ContributionsController],
      providers: [
        {
          provide: ContributionsService,
          useValue: contributionsService,
        },
        {
          provide: JwtService,
          useValue: { verifyAsync: jest.fn() },
        },
        Reflector,
      ],
    }).compile();

    controller = module.get<ContributionsController>(ContributionsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should record a contribution on POST /contributions', async () => {
    const dto: CreateContributionDto = {
      fundId: mockContribution.fundId,
      amount: 5000,
      method: ReceiveMethod.BKASH,
    };
    const res = await controller.create(dto, mockUser);
    expect(contributionsService.create).toHaveBeenCalledWith(dto, mockUser.id);
    expect(res.message).toBe('Contribution recorded successfully');
    expect(res.data).toEqual(mockContribution);
  });

  it('should return contributions on GET /contributions', async () => {
    const query: QueryContributionDto = { page: 1, limit: 10 };
    const res = await controller.findAll(query);
    expect(contributionsService.findAll).toHaveBeenCalledWith(query);
    expect(res.message).toBe('Contributions retrieved successfully');
    expect(res.data.contributions).toHaveLength(1);
    expect(res.data.totalAmount).toBe(5000);
  });

  it('should return a single contribution on GET /contributions/:id', async () => {
    const res = await controller.findOne(mockContribution.id);
    expect(contributionsService.findOne).toHaveBeenCalledWith(
      mockContribution.id,
    );
    expect(res.message).toBe('Contribution retrieved successfully');
    expect(res.data).toEqual(mockContribution);
  });

  it('should update a contribution on PATCH /contributions/:id', async () => {
    const dto: UpdateContributionDto = { amount: 6000 };
    const res = await controller.update(mockContribution.id, dto);
    expect(contributionsService.update).toHaveBeenCalledWith(
      mockContribution.id,
      dto,
    );
    expect(res.message).toBe('Contribution updated successfully');
  });

  it('should delete a contribution on DELETE /contributions/:id', async () => {
    const res = await controller.remove(mockContribution.id);
    expect(contributionsService.remove).toHaveBeenCalledWith(
      mockContribution.id,
    );
    expect(res.message).toBe('Contribution deleted successfully');
  });
});
