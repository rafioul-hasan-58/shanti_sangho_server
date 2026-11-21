import { Injectable } from '@nestjs/common';
import { Contribution, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { IBaseRepository } from '../../core/repositories/base.repository.interface';

export interface FindContributionsOptions {
  where?: Prisma.ContributionWhereInput;
  orderBy?: Prisma.ContributionOrderByWithRelationInput[];
  skip?: number;
  take?: number;
}

export const contributionInclude = {
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

export type ContributionWithRelations = Prisma.ContributionGetPayload<{
  include: typeof contributionInclude;
}>;

@Injectable()
export class ContributionsRepository implements IBaseRepository<
  Contribution,
  Prisma.ContributionCreateInput,
  Prisma.ContributionUpdateInput
> {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.ContributionCreateInput): Promise<Contribution> {
    return this.prisma.contribution.create({ data });
  }

  async findAll(
    options?: FindContributionsOptions,
  ): Promise<ContributionWithRelations[]> {
    return this.prisma.contribution.findMany({
      where: options?.where,
      orderBy: options?.orderBy,
      skip: options?.skip,
      take: options?.take,
      include: contributionInclude,
    });
  }

  async count(where?: Prisma.ContributionWhereInput): Promise<number> {
    return this.prisma.contribution.count({ where });
  }

  async aggregateAmount(
    where?: Prisma.ContributionWhereInput,
  ): Promise<number> {
    const result = await this.prisma.contribution.aggregate({
      where,
      _sum: {
        amount: true,
      },
    });
    return result._sum.amount || 0;
  }

  async findById(id: string): Promise<ContributionWithRelations | null> {
    return this.prisma.contribution.findUnique({
      where: { id },
      include: contributionInclude,
    });
  }

  async update(
    id: string,
    data: Prisma.ContributionUpdateInput,
  ): Promise<Contribution> {
    return this.prisma.contribution.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<Contribution> {
    return this.prisma.contribution.delete({ where: { id } });
  }
}
