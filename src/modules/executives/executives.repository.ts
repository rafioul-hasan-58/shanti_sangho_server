import { Injectable } from '@nestjs/common';
import { Executive, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { IBaseRepository } from '../../core/repositories/base.repository.interface';

export interface FindExecutivesOptions {
  where?: Prisma.ExecutiveWhereInput;
  orderBy?: Prisma.ExecutiveOrderByWithRelationInput[];
  skip?: number;
  take?: number;
}

@Injectable()
export class ExecutivesRepository implements IBaseRepository<
  Executive,
  Prisma.ExecutiveCreateInput,
  Prisma.ExecutiveUpdateInput
> {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.ExecutiveCreateInput): Promise<Executive> {
    return this.prisma.executive.create({ data });
  }

  async findAll(options?: FindExecutivesOptions): Promise<Executive[]> {
    return this.prisma.executive.findMany({
      where: options?.where,
      orderBy: options?.orderBy,
      skip: options?.skip,
      take: options?.take,
    });
  }

  async count(where?: Prisma.ExecutiveWhereInput): Promise<number> {
    return this.prisma.executive.count({ where });
  }

  async findById(id: string): Promise<Executive | null> {
    return this.prisma.executive.findUnique({ where: { id } });
  }

  async findBySlug(slug: string): Promise<Executive | null> {
    return this.prisma.executive.findUnique({ where: { slug } });
  }

  async update(
    id: string,
    data: Prisma.ExecutiveUpdateInput,
  ): Promise<Executive> {
    return this.prisma.executive.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<Executive> {
    return this.prisma.executive.delete({ where: { id } });
  }
}
