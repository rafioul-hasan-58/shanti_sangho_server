import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { FundCategory, ReceiveMethod, Role } from '@prisma/client';
import { ContributionsService } from './contributions.service';
import {
  ContributionsRepository,
  ContributionWithRelations,
} from './contributions.repository';
import { FundsRepository } from '../funds/funds.repository';
import { MembersRepository } from '../members/members.repository';

describe('ContributionsService', () => {
  let service: ContributionsService;
  let contributionsRepo: {
    create: jest.Mock;
    findAll: jest.Mock;
    count: jest.Mock;
    aggregateAmount: jest.Mock;
    findById: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  let fundsRepo: {
    findById: jest.Mock;
  };
  let membersRepo: {
    findById: jest.Mock;
  };

  const mockFund = {
    id: '64a1b2c3d4e5f67890123456',
    name: 'GPL 2026 Tournament Fund',
    category: FundCategory.GPL,
    isActive: true,
  };

  const mockReceiver = {
    id: '64a1b2c3d4e5f67890123499',
    fullName: 'Admin Collector',
    email: 'admin@example.com',
    role: Role.ADMIN,
  };

  const mockGiver = {
    id: '64a1b2c3d4e5f67890123477',
    fullName: 'Generous Member',
    email: 'member@example.com',
  };

  const mockContribution: ContributionWithRelations = {
    id: '64a1b2c3d4e5f67890123411',
    fundId: mockFund.id,
    amount: 5000,
    method: ReceiveMethod.BKASH,
    receivedAt: new Date('2026-11-21'),
    note: 'Tournament sponsorship',
    reference: 'BKASH-TRX-1234',
    giverMemberId: mockGiver.id,
    giverName: mockGiver.fullName,
    receivedById: mockReceiver.id,
    createdAt: new Date('2026-11-21'),
    updatedAt: new Date('2026-11-21'),
    fund: {
      id: mockFund.id,
      name: mockFund.name,
      category: mockFund.category,
      isActive: mockFund.isActive,
    },
    giverMember: {
      id: mockGiver.id,
      fullName: mockGiver.fullName,
      email: mockGiver.email,
      profileImage: null,
      phoneNumber: null,
      village: 'Shavarchala',
    },
    receivedBy: {
      id: mockReceiver.id,
      fullName: mockReceiver.fullName,
      email: mockReceiver.email,
      role: mockReceiver.role,
    },
  };

  beforeEach(async () => {
    contributionsRepo = {
      create: jest.fn(),
      findAll: jest.fn(),
      count: jest.fn(),
      aggregateAmount: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    fundsRepo = {
      findById: jest.fn(),
    };
    membersRepo = {
      findById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContributionsService,
        {
          provide: ContributionsRepository,
          useValue: contributionsRepo,
        },
        {
          provide: FundsRepository,
          useValue: fundsRepo,
        },
        {
          provide: MembersRepository,
          useValue: membersRepo,
        },
      ],
    }).compile();

    service = module.get<ContributionsService>(ContributionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should successfully record a contribution', async () => {
      fundsRepo.findById.mockResolvedValue(mockFund);
      membersRepo.findById.mockImplementation((id: string) => {
        if (id === mockReceiver.id) return Promise.resolve(mockReceiver);
        if (id === mockGiver.id) return Promise.resolve(mockGiver);
        return Promise.resolve(null);
      });
      contributionsRepo.create.mockResolvedValue({ id: mockContribution.id });
      contributionsRepo.findById.mockResolvedValue(mockContribution);

      const result = await service.create(
        {
          fundId: mockFund.id,
          amount: 5000,
          method: ReceiveMethod.BKASH,
          giverMemberId: mockGiver.id,
          reference: 'BKASH-TRX-1234',
        },
        mockReceiver.id,
      );

      expect(fundsRepo.findById).toHaveBeenCalledWith(mockFund.id);
      expect(contributionsRepo.create).toHaveBeenCalled();
      expect(result.id).toBe(mockContribution.id);
      expect(result.amount).toBe(5000);
    });

    it('should throw BadRequestException if fund is inactive', async () => {
      fundsRepo.findById.mockResolvedValue({ ...mockFund, isActive: false });

      await expect(
        service.create(
          {
            fundId: mockFund.id,
            amount: 5000,
            method: ReceiveMethod.CASH,
          },
          mockReceiver.id,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('should return paginated contributions with total aggregated amount', async () => {
      contributionsRepo.findAll.mockResolvedValue([mockContribution]);
      contributionsRepo.count.mockResolvedValue(1);
      contributionsRepo.aggregateAmount.mockResolvedValue(5000);

      const result = await service.findAll({
        page: 1,
        limit: 10,
        fundId: mockFund.id,
        method: ReceiveMethod.BKASH,
      });

      expect(contributionsRepo.findAll).toHaveBeenCalled();
      expect(result.contributions).toHaveLength(1);
      expect(result.totalAmount).toBe(5000);
      expect(result.meta.total).toBe(1);
    });
  });

  describe('findOne', () => {
    it('should return a contribution by ID', async () => {
      contributionsRepo.findById.mockResolvedValue(mockContribution);

      const result = await service.findOne(mockContribution.id);

      expect(contributionsRepo.findById).toHaveBeenCalledWith(
        mockContribution.id,
      );
      expect(result.id).toBe(mockContribution.id);
    });

    it('should throw NotFoundException if contribution is missing', async () => {
      contributionsRepo.findById.mockResolvedValue(null);

      await expect(service.findOne('64a1b2c3d4e5f67890123400')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update contribution details', async () => {
      contributionsRepo.findById.mockResolvedValue(mockContribution);
      contributionsRepo.update.mockResolvedValue({
        ...mockContribution,
        amount: 6000,
      });

      const result = await service.update(mockContribution.id, {
        amount: 6000,
      });

      expect(contributionsRepo.update).toHaveBeenCalled();
      expect(result.amount).toBe(5000); // returns findOne output
    });
  });

  describe('remove', () => {
    it('should delete contribution', async () => {
      contributionsRepo.findById.mockResolvedValue(mockContribution);
      contributionsRepo.delete.mockResolvedValue(mockContribution);

      const result = await service.remove(mockContribution.id);

      expect(contributionsRepo.delete).toHaveBeenCalledWith(
        mockContribution.id,
      );
      expect(result.id).toBe(mockContribution.id);
    });
  });
});
