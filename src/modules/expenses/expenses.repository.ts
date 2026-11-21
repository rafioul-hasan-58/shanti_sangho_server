import { Injectable } from '@nestjs/common';
import { Expense, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { IBaseRepository } from '../../core/repositories/base.repository.interface';

export interface FindExpensesOptions {
  where?: Prisma.ExpenseWhereInput;
  orderBy?: Prisma.ExpenseOrderByWithRelationInput[];
  skip?: number;
  take?: number;
}

export const expenseInclude = {
  fund: {
    select: {
      id: true,
      name: true,
      category: true,
      isActive: true,
    },
  },
  spentBy: {
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      profileImage: true,
    },
  },
} as const;

export type ExpenseWithRelations = Prisma.ExpenseGetPayload<{
  include: typeof expenseInclude;
}>;

@Injectable()
export class ExpensesRepository implements IBaseRepository<
  Expense,
  Prisma.ExpenseCreateInput,
  Prisma.ExpenseUpdateInput
> {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.ExpenseCreateInput): Promise<Expense> {
    return this.prisma.expense.create({ data });
  }

  async findAll(
    options?: FindExpensesOptions,
  ): Promise<ExpenseWithRelations[]> {
    return this.prisma.expense.findMany({
      where: options?.where,
      orderBy: options?.orderBy,
      skip: options?.skip,
      take: options?.take,
      include: expenseInclude,
    });
  }

  async count(where?: Prisma.ExpenseWhereInput): Promise<number> {
    return this.prisma.expense.count({ where });
  }

  async aggregateAmount(where?: Prisma.ExpenseWhereInput): Promise<number> {
    const result = await this.prisma.expense.aggregate({
      where,
      _sum: {
        amount: true,
      },
    });
    return result._sum.amount || 0;
  }

  async findById(id: string): Promise<ExpenseWithRelations | null> {
    return this.prisma.expense.findUnique({
      where: { id },
      include: expenseInclude,
    });
  }

  async update(id: string, data: Prisma.ExpenseUpdateInput): Promise<Expense> {
    return this.prisma.expense.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<Expense> {
    return this.prisma.expense.delete({ where: { id } });
  }
}
