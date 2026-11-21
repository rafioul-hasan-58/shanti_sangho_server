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
}
