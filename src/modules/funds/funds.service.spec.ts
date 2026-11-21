import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { FundCategory } from '@prisma/client';
import { FundsService } from './funds.service';
import { FundsRepository, FundWithStats } from './funds.repository';

describe('FundsService', () => {
  let service: FundsService;
  let repository: {
    create: jest.Mock;
    findAll: jest.Mock;
    count: jest.Mock;
    findById: jest.Mock;
    findByIdWithSummary: jest.Mock;
    findByName: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };

  const mockFund: FundWithStats = {
    id: '64a1b2c3d4e5f67890123456',
    name: 'GPL 2026 Tournament Fund',
    category: FundCategory.GPL,
    isActive: true,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    _count: {
      contributions: 2,
      expenses: 1,
    },
    contributions: [{ amount: 5000 }, { amount: 3000 }],
    expenses: [{ amount: 2000 }],
  };

  beforeEach(async () => {
    repository = {
      create: jest.fn(),
      findAll: jest.fn(),
      count: jest.fn(),
      findById: jest.fn(),
      findByIdWithSummary: jest.fn(),
      findByName: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FundsService,
        {
          provide: FundsRepository,
          useValue: repository,
        },
      ],
    }).compile();

    service = module.get<FundsService>(FundsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new fund when name is unique', async () => {
      repository.findByName.mockResolvedValue(null);
      repository.create.mockResolvedValue(mockFund);

      const result = await service.create({
        name: 'GPL 2026 Tournament Fund',
        category: FundCategory.GPL,
        isActive: true,
      });

      expect(repository.findByName).toHaveBeenCalledWith(
        'GPL 2026 Tournament Fund',
      );
      expect(repository.create).toHaveBeenCalledWith({
        name: 'GPL 2026 Tournament Fund',
        category: FundCategory.GPL,
        isActive: true,
      });
      expect(result.id).toBe(mockFund.id);
      expect(result.summary.totalCollected).toBe(8000);
      expect(result.summary.totalSpent).toBe(2000);
      expect(result.summary.balance).toBe(6000);
    });

    it('should throw ConflictException if fund name already exists', async () => {
      repository.findByName.mockResolvedValue(mockFund);

      await expect(
        service.create({
          name: 'GPL 2026 Tournament Fund',
          category: FundCategory.GPL,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('should return paginated funds with financial summary and metadata', async () => {
      repository.findAll.mockResolvedValue([mockFund]);
      repository.count.mockResolvedValue(1);

      const result = await service.findAll({
        page: 1,
        limit: 10,
        category: FundCategory.GPL,
        isActive: true,
        search: 'GPL',
      });

      expect(repository.findAll).toHaveBeenCalledWith({
        where: {
          category: FundCategory.GPL,
          isActive: true,
          name: { contains: 'GPL', mode: 'insensitive' },
        },
        orderBy: [{ createdAt: 'desc' }],
        skip: 0,
        take: 10,
      });
      expect(result.funds).toHaveLength(1);
      expect(result.funds[0].summary.balance).toBe(6000);
      expect(result.meta.total).toBe(1);
    });
  });

  describe('findOne', () => {
    it('should return a fund by ID with financial summary', async () => {
      repository.findByIdWithSummary.mockResolvedValue(mockFund);

      const result = await service.findOne(mockFund.id);

      expect(repository.findByIdWithSummary).toHaveBeenCalledWith(mockFund.id);
      expect(result.id).toBe(mockFund.id);
      expect(result.summary.totalCollected).toBe(8000);
      expect(result.summary.totalSpent).toBe(2000);
      expect(result.summary.balance).toBe(6000);
    });

    it('should throw BadRequestException if fund ID is invalid ObjectId', async () => {
      await expect(service.findOne('invalid-id')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException if fund does not exist', async () => {
      repository.findByIdWithSummary.mockResolvedValue(null);

      await expect(service.findOne('64a1b2c3d4e5f67890123499')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update fund properties and return updated summary', async () => {
      repository.findById.mockResolvedValue(mockFund);
      repository.findByName.mockResolvedValue(null);
      repository.update.mockResolvedValue({
        ...mockFund,
        name: 'Updated GPL Fund',
      });
      repository.findByIdWithSummary.mockResolvedValue({
        ...mockFund,
        name: 'Updated GPL Fund',
      });

      const result = await service.update(mockFund.id, {
        name: 'Updated GPL Fund',
        isActive: false,
      });

      expect(repository.update).toHaveBeenCalledWith(mockFund.id, {
        name: 'Updated GPL Fund',
        isActive: false,
      });
      expect(result.name).toBe('Updated GPL Fund');
    });

    it('should throw ConflictException if new name belongs to another fund', async () => {
      repository.findById.mockResolvedValue(mockFund);
      repository.findByName.mockResolvedValue({
        ...mockFund,
        id: 'different_fund_id_123456',
        name: 'Existing Other Fund',
      });

      await expect(
        service.update(mockFund.id, { name: 'Existing Other Fund' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    it('should delete a fund if it has no contributions and no expenses', async () => {
      const emptyFund: FundWithStats = {
        ...mockFund,
        _count: { contributions: 0, expenses: 0 },
        contributions: [],
        expenses: [],
      };
      repository.findByIdWithSummary.mockResolvedValue(emptyFund);
      repository.delete.mockResolvedValue(emptyFund);

      const result = await service.remove(mockFund.id);

      expect(repository.delete).toHaveBeenCalledWith(mockFund.id);
      expect(result.id).toBe(mockFund.id);
    });

    it('should throw BadRequestException if fund has existing contributions', async () => {
      repository.findByIdWithSummary.mockResolvedValue(mockFund);

      await expect(service.remove(mockFund.id)).rejects.toThrow(
        BadRequestException,
      );
      expect(repository.delete).not.toHaveBeenCalled();
    });
  });
});
