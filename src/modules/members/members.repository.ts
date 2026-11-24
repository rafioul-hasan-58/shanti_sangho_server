import { Injectable } from '@nestjs/common';
import { Member, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { IBaseRepository } from '../../core/repositories/base.repository.interface';

export interface FindMembersOptions {
  where?: Prisma.MemberWhereInput;
  orderBy?: Prisma.MemberOrderByWithRelationInput[];
  skip?: number;
  take?: number;
}

@Injectable()
export class MembersRepository implements IBaseRepository<
  Member,
  Prisma.MemberCreateInput,
  Prisma.MemberUpdateInput
> {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.MemberCreateInput): Promise<Member> {
    return this.prisma.member.create({ data });
  }

  async findMany(options?: FindMembersOptions): Promise<Member[]> {
    return this.findAll(options);
  }

  async findAll(options?: FindMembersOptions): Promise<Member[]> {
    return this.prisma.member.findMany({
      where: options?.where,
      orderBy: options?.orderBy,
      skip: options?.skip,
      take: options?.take,
    });
  }

  async count(
    argsOrWhere?: Prisma.MemberCountArgs | Prisma.MemberWhereInput,
  ): Promise<number> {
    if (
      argsOrWhere &&
      typeof argsOrWhere === 'object' &&
      'where' in argsOrWhere
    ) {
      return this.prisma.member.count(argsOrWhere);
    }
    return this.prisma.member.count({
      where: argsOrWhere as Prisma.MemberWhereInput,
    });
  }

  async findById(id: string): Promise<Member | null> {
    return this.prisma.member.findUnique({ where: { id } });
  }

  async findByEmail(email: string): Promise<Member | null> {
    return this.prisma.member.findUnique({ where: { email } });
  }

  async update(id: string, data: Prisma.MemberUpdateInput): Promise<Member> {
    return this.prisma.member.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<Member> {
    return this.prisma.member.delete({ where: { id } });
  }
}
