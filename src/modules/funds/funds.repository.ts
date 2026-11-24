import { Injectable } from '@nestjs/common';
import { Fund, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { IBaseRepository } from '../../core/repositories/base.repository.interface';

export interface FindFundsOptions {
  where?: Prisma.FundWhereInput;
  orderBy?: Prisma.FundOrderByWithRelationInput[];
  skip?: number;
  take?: number;
  includeStats?: boolean;
}

export type FundWithStats = Fund & {
  _count?: {
    contributions: number;
    expenses: number;
  };
  contributions?: { amount: number }[];
  expenses?: { amount: number }[];
};

export const recentContributionInclude = {
  fund: {
    select: {
      id: true,
      name: true,
      category: true,
      isActive: true,
    },
  },
  giverMember: {
    select: {
      id: true,
      fullName: true,
      email: true,
      profileImage: true,
      phoneNumber: true,
      village: true,
    },
  },
  receivedBy: {
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
    },
  },
} as const;

export type RecentContributionRecord = Prisma.ContributionGetPayload<{
  include: typeof recentContributionInclude;
}>;

export const recentExpenseInclude = {
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

export type RecentExpenseRecord = Prisma.ExpenseGetPayload<{
  include: typeof recentExpenseInclude;
}>;

@Injectable()
export class FundsRepository implements IBaseRepository<
  Fund,
  Prisma.FundCreateInput,
  Prisma.FundUpdateInput
> {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.FundCreateInput): Promise<Fund> {
    return this.prisma.fund.create({ data });
  }

  async findAll(options?: FindFundsOptions): Promise<FundWithStats[]> {
    return this.prisma.fund.findMany({
      where: options?.where,
      orderBy: options?.orderBy,
      skip: options?.skip,
      take: options?.take,
      include: {
        _count: {
          select: {
            contributions: true,
            expenses: true,
          },
        },
        contributions: {
          select: {
            amount: true,
          },
        },
        expenses: {
          select: {
            amount: true,
          },
        },
      },
    });
  }

  async count(where?: Prisma.FundWhereInput): Promise<number> {
    return this.prisma.fund.count({ where });
  }

  async findById(id: string): Promise<Fund | null> {
    return this.prisma.fund.findUnique({ where: { id } });
  }

  async findByIdWithSummary(id: string): Promise<FundWithStats | null> {
    return this.prisma.fund.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            contributions: true,
            expenses: true,
          },
        },
        contributions: {
          select: {
            amount: true,
          },
        },
        expenses: {
          select: {
            amount: true,
          },
        },
      },
    });
  }

  async findByName(name: string): Promise<Fund | null> {
    return this.prisma.fund.findUnique({ where: { name } });
  }

  async update(id: string, data: Prisma.FundUpdateInput): Promise<Fund> {
    return this.prisma.fund.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<Fund> {
    return this.prisma.fund.delete({ where: { id } });
  }

  async findRecentContributions(options: {
    fundId?: string;
    take: number;
    skip?: number;
  }): Promise<RecentContributionRecord[]> {
    return this.prisma.contribution.findMany({
      where: options.fundId ? { fundId: options.fundId } : undefined,
      orderBy: { createdAt: 'desc' },
      take: options.take,
      skip: options.skip,
      include: recentContributionInclude,
    });
  }

  async findRecentExpenses(options: {
    fundId?: string;
    take: number;
    skip?: number;
  }): Promise<RecentExpenseRecord[]> {
    return this.prisma.expense.findMany({
      where: options.fundId ? { fundId: options.fundId } : undefined,
      orderBy: { createdAt: 'desc' },
      take: options.take,
      skip: options.skip,
      include: recentExpenseInclude,
    });
  }

  async countContributions(
    where?: Prisma.ContributionWhereInput,
  ): Promise<number> {
    return this.prisma.contribution.count({ where });
  }

  async countExpenses(where?: Prisma.ExpenseWhereInput): Promise<number> {
    return this.prisma.expense.count({ where });
  }
}
