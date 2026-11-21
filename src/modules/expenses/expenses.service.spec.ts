import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { FundCategory, Role } from '@prisma/client';
import { ExpensesService } from './expenses.service';
import {
  ExpensesRepository,
  ExpenseWithRelations,
} from './expenses.repository';
import { FundsRepository } from '../funds/funds.repository';
import { MembersRepository } from '../members/members.repository';

describe('ExpensesService', () => {
  let service: ExpensesService;
  let expensesRepo: {
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

  const mockSpender = {
    id: '64a1b2c3d4e5f67890123499',
    fullName: 'Tournament Secretary',
    email: 'secretary@example.com',
    role: Role.ADMIN,
  };

  const mockExpense: ExpenseWithRelations = {
    id: '64a1b2c3d4e5f67890123422',
    fundId: mockFund.id,
    amount: 1500,
    spentAt: new Date('2026-11-21'),
    spentOn: 'Referee match fee',
    note: 'Final game officiating fee',
    receiptUrl: 'https://example.com/receipt.jpg',
    spentById: mockSpender.id,
    createdAt: new Date('2026-11-21'),
    updatedAt: new Date('2026-11-21'),
    fund: {
      id: mockFund.id,
      name: mockFund.name,
      category: mockFund.category,
      isActive: mockFund.isActive,
    },
    spentBy: {
      id: mockSpender.id,
      fullName: mockSpender.fullName,
      email: mockSpender.email,
      role: mockSpender.role,
      profileImage: null,
    },
  };

  beforeEach(async () => {
    expensesRepo = {
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
        ExpensesService,
        {
          provide: ExpensesRepository,
          useValue: expensesRepo,
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

    service = module.get<ExpensesService>(ExpensesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should successfully record an expense', async () => {
      fundsRepo.findById.mockResolvedValue(mockFund);
      membersRepo.findById.mockResolvedValue(mockSpender);
      expensesRepo.create.mockResolvedValue({ id: mockExpense.id });
      expensesRepo.findById.mockResolvedValue(mockExpense);

      const result = await service.create(
        {
          fundId: mockFund.id,
          amount: 1500,
          spentOn: 'Referee match fee',
          spentById: mockSpender.id,
        },
        mockSpender.id,
      );

      expect(fundsRepo.findById).toHaveBeenCalledWith(mockFund.id);
      expect(expensesRepo.create).toHaveBeenCalled();
      expect(result.id).toBe(mockExpense.id);
      expect(result.amount).toBe(1500);
    });

    it('should throw NotFoundException if fund does not exist', async () => {
      fundsRepo.findById.mockResolvedValue(null);

      await expect(
        service.create(
          {
            fundId: 'non_existent_fund_123',
            amount: 1500,
            spentOn: 'Referee fee',
          },
          mockSpender.id,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return paginated expenses with total aggregated amount', async () => {
      expensesRepo.findAll.mockResolvedValue([mockExpense]);
      expensesRepo.count.mockResolvedValue(1);
      expensesRepo.aggregateAmount.mockResolvedValue(1500);

      const result = await service.findAll({
        page: 1,
        limit: 10,
        fundId: mockFund.id,
      });

      expect(expensesRepo.findAll).toHaveBeenCalled();
      expect(result.expenses).toHaveLength(1);
      expect(result.totalAmount).toBe(1500);
      expect(result.meta.total).toBe(1);
    });
  });

  describe('findOne', () => {
    it('should return an expense by ID', async () => {
      expensesRepo.findById.mockResolvedValue(mockExpense);

      const result = await service.findOne(mockExpense.id);

      expect(expensesRepo.findById).toHaveBeenCalledWith(mockExpense.id);
      expect(result.id).toBe(mockExpense.id);
    });

    it('should throw NotFoundException if expense is missing', async () => {
      expensesRepo.findById.mockResolvedValue(null);

      await expect(service.findOne('64a1b2c3d4e5f67890123400')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update expense details', async () => {
      expensesRepo.findById.mockResolvedValue(mockExpense);
      expensesRepo.update.mockResolvedValue({
        ...mockExpense,
        amount: 2000,
      });

      const result = await service.update(mockExpense.id, {
        amount: 2000,
      });

      expect(expensesRepo.update).toHaveBeenCalled();
      expect(result.amount).toBe(1500); // returns findOne output
    });
  });

  describe('remove', () => {
    it('should delete expense', async () => {
      expensesRepo.findById.mockResolvedValue(mockExpense);
      expensesRepo.delete.mockResolvedValue(mockExpense);

      const result = await service.remove(mockExpense.id);

      expect(expensesRepo.delete).toHaveBeenCalledWith(mockExpense.id);
      expect(result.id).toBe(mockExpense.id);
    });
  });
});
