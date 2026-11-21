import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  ContributionsRepository,
  ContributionWithRelations,
} from './contributions.repository';
import { FundsRepository } from '../funds/funds.repository';
import { MembersRepository } from '../members/members.repository';
import {
  CreateContributionDto,
  QueryContributionDto,
  UpdateContributionDto,
} from './dto';

@Injectable()
export class ContributionsService {
  constructor(
    private readonly contributionsRepository: ContributionsRepository,
    private readonly fundsRepository: FundsRepository,
    private readonly membersRepository: MembersRepository,
  ) {}

  private isValidObjectId(id: string): boolean {
    return /^[0-9a-fA-F]{24}$/.test(id);
  }

  private async findContributionByIdOrThrow(
    id: string,
  ): Promise<ContributionWithRelations> {
    const cleanId = id.trim();
    if (!this.isValidObjectId(cleanId)) {
      throw new BadRequestException('Invalid contribution ID format');
    }

    const contribution = await this.contributionsRepository.findById(cleanId);
    if (!contribution) {
      throw new NotFoundException(
        `Contribution with ID '${cleanId}' was not found`,
      );
    }

    return contribution;
  }

  /**
   * Record a new contribution
   */
  async create(dto: CreateContributionDto, actorId: string) {
    const fund = await this.fundsRepository.findById(dto.fundId);
    if (!fund) {
      throw new NotFoundException(`Fund with ID '${dto.fundId}' not found`);
    }

    if (!fund.isActive) {
      throw new BadRequestException(
        `Fund '${fund.name}' is currently inactive and not accepting contributions`,
      );
    }

    // Determine who received the money
    const receivedById = dto.receivedById || actorId;
    const receiver = await this.membersRepository.findById(receivedById);
    if (!receiver) {
      throw new NotFoundException(
        `Receiver Member with ID '${receivedById}' not found`,
      );
    }

    let giverName = dto.giverName?.trim() || null;
    const giverMemberId = dto.giverMemberId || null;

    if (giverMemberId) {
      const giver = await this.membersRepository.findById(giverMemberId);
      if (!giver) {
        throw new NotFoundException(
          `Giver Member with ID '${giverMemberId}' not found`,
        );
      }
      if (!giverName) {
        giverName = giver.fullName;
      }
    }

    const created = await this.contributionsRepository.create({
      amount: dto.amount,
      method: dto.method,
      receivedAt: dto.receivedAt || new Date(),
      note: dto.note?.trim() || null,
      reference: dto.reference?.trim() || null,
      giverName,
      fund: {
        connect: { id: fund.id },
      },
      receivedBy: {
        connect: { id: receiver.id },
      },
      ...(giverMemberId
        ? {
            giverMember: {
              connect: { id: giverMemberId },
            },
          }
        : {}),
    });

    return this.findOne(created.id);
  }

  /**
   * Retrieve all contributions matching query filters
   */
  async findAll(query: QueryContributionDto) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 10;
    const skip = (page - 1) * limit;
    const take = limit;

    const where: Prisma.ContributionWhereInput = {};

    if (query.fundId) {
      where.fundId = query.fundId;
    }

    if (query.giverMemberId) {
      where.giverMemberId = query.giverMemberId;
    }

    if (query.receivedById) {
      where.receivedById = query.receivedById;
    }

    if (query.method) {
      where.method = query.method;
    }

    if (query.startDate || query.endDate) {
      where.receivedAt = {};
      if (query.startDate) {
        where.receivedAt.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        where.receivedAt.lte = new Date(query.endDate);
      }
    }

    if (query.search?.trim()) {
      const term = query.search.trim();
      where.OR = [
        { giverName: { contains: term, mode: Prisma.QueryMode.insensitive } },
        { reference: { contains: term, mode: Prisma.QueryMode.insensitive } },
        { note: { contains: term, mode: Prisma.QueryMode.insensitive } },
      ];
    }

    const sortBy = query.sortBy || 'receivedAt';
    const sortOrder = query.sortOrder || 'desc';
    const orderBy: Prisma.ContributionOrderByWithRelationInput[] = [
      { [sortBy]: sortOrder },
    ];
    if (sortBy !== 'createdAt') {
      orderBy.push({ createdAt: 'desc' });
    }

    const [contributions, total, totalAmount] = await Promise.all([
      this.contributionsRepository.findAll({ where, orderBy, skip, take }),
      this.contributionsRepository.count(where),
      this.contributionsRepository.aggregateAmount(where),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      contributions,
      totalAmount,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  /**
   * Get single contribution by ID
   */
  async findOne(id: string): Promise<ContributionWithRelations> {
    return this.findContributionByIdOrThrow(id);
  }

  /**
   * Update contribution
   */
  async update(id: string, dto: UpdateContributionDto) {
    const existing = await this.findContributionByIdOrThrow(id);

    const updateData: Prisma.ContributionUpdateInput = {};

    if (dto.amount !== undefined) {
      updateData.amount = dto.amount;
    }

    if (dto.method !== undefined) {
      updateData.method = dto.method;
    }

    if (dto.receivedAt !== undefined) {
      updateData.receivedAt = dto.receivedAt;
    }

    if (dto.note !== undefined) {
      updateData.note = dto.note ? dto.note.trim() || null : null;
    }

    if (dto.reference !== undefined) {
      updateData.reference = dto.reference
        ? dto.reference.trim() || null
        : null;
    }

    if (dto.fundId !== undefined && dto.fundId !== existing.fundId) {
      const fund = await this.fundsRepository.findById(dto.fundId);
      if (!fund) {
        throw new NotFoundException(`Fund with ID '${dto.fundId}' not found`);
      }
      updateData.fund = { connect: { id: fund.id } };
    }

    if (
      dto.receivedById !== undefined &&
      dto.receivedById !== existing.receivedById
    ) {
      const receiver = await this.membersRepository.findById(dto.receivedById);
      if (!receiver) {
        throw new NotFoundException(
          `Receiver Member with ID '${dto.receivedById}' not found`,
        );
      }
      updateData.receivedBy = { connect: { id: receiver.id } };
    }

    if (dto.giverMemberId !== undefined) {
      if (dto.giverMemberId) {
        const giver = await this.membersRepository.findById(dto.giverMemberId);
        if (!giver) {
          throw new NotFoundException(
            `Giver Member with ID '${dto.giverMemberId}' not found`,
          );
        }
        updateData.giverMember = { connect: { id: giver.id } };
        if (dto.giverName === undefined && !existing.giverName) {
          updateData.giverName = giver.fullName;
        }
      } else {
        updateData.giverMember = { disconnect: true };
      }
    }

    if (dto.giverName !== undefined) {
      updateData.giverName = dto.giverName
        ? dto.giverName.trim() || null
        : null;
    }

    if (Object.keys(updateData).length === 0) {
      return existing;
    }

    await this.contributionsRepository.update(existing.id, updateData);
    return this.findOne(existing.id);
  }

  /**
   * Delete contribution
   */
  async remove(id: string) {
    const existing = await this.findContributionByIdOrThrow(id);
    return this.contributionsRepository.delete(existing.id);
  }
}
