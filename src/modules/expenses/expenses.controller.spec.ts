import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import { ExpensesController } from './expenses.controller';
import { ExpensesService } from './expenses.service';
import type { JwtPayload } from '../../common/guards/auth.guard';
import { CreateExpenseDto, QueryExpenseDto, UpdateExpenseDto } from './dto';

describe('ExpensesController', () => {
  let controller: ExpensesController;
  let expensesService: {
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

  const mockExpense = {
    id: '64a1b2c3d4e5f67890123422',
    fundId: '64a1b2c3d4e5f67890123456',
    amount: 1500,
    spentOn: 'Referee fee',
    spentAt: new Date('2026-11-21'),
    note: 'Match 1',
    receiptUrl: null,
    spentById: mockUser.id,
    createdAt: new Date('2026-11-21'),
    updatedAt: new Date('2026-11-21'),
  };

  beforeEach(async () => {
    expensesService = {
      create: jest.fn().mockResolvedValue(mockExpense),
      findAll: jest.fn().mockResolvedValue({
        expenses: [mockExpense],
        totalAmount: 1500,
        meta: {
          total: 1,
          page: 1,
          limit: 10,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      }),
      findOne: jest.fn().mockResolvedValue(mockExpense),
      update: jest.fn().mockResolvedValue({
        ...mockExpense,
        amount: 2000,
      }),
      remove: jest.fn().mockResolvedValue(mockExpense),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExpensesController],
      providers: [
        {
          provide: ExpensesService,
          useValue: expensesService,
        },
        {
          provide: JwtService,
          useValue: { verifyAsync: jest.fn() },
        },
        Reflector,
      ],
    }).compile();

    controller = module.get<ExpensesController>(ExpensesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should record an expense on POST /expenses', async () => {
    const dto: CreateExpenseDto = {
      fundId: mockExpense.fundId,
      amount: 1500,
      spentOn: 'Referee fee',
    };
    const res = await controller.create(dto, mockUser);
    expect(expensesService.create).toHaveBeenCalledWith(dto, mockUser.id);
    expect(res.message).toBe('Expense recorded successfully');
    expect(res.data).toEqual(mockExpense);
  });

  it('should return expenses on GET /expenses', async () => {
    const query: QueryExpenseDto = { page: 1, limit: 10 };
    const res = await controller.findAll(query);
    expect(expensesService.findAll).toHaveBeenCalledWith(query);
    expect(res.message).toBe('Expenses retrieved successfully');
    expect(res.data.expenses).toHaveLength(1);
    expect(res.data.totalAmount).toBe(1500);
  });

  it('should return a single expense on GET /expenses/:id', async () => {
    const res = await controller.findOne(mockExpense.id);
    expect(expensesService.findOne).toHaveBeenCalledWith(mockExpense.id);
    expect(res.message).toBe('Expense retrieved successfully');
    expect(res.data).toEqual(mockExpense);
  });

  it('should update an expense on PATCH /expenses/:id', async () => {
    const dto: UpdateExpenseDto = { amount: 2000 };
    const res = await controller.update(mockExpense.id, dto);
    expect(expensesService.update).toHaveBeenCalledWith(mockExpense.id, dto);
    expect(res.message).toBe('Expense updated successfully');
  });

  it('should delete an expense on DELETE /expenses/:id', async () => {
    const res = await controller.remove(mockExpense.id);
    expect(expensesService.remove).toHaveBeenCalledWith(mockExpense.id);
    expect(res.message).toBe('Expense deleted successfully');
  });
});
