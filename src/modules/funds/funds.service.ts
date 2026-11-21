import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Fund, Prisma } from '@prisma/client';
import { FundsRepository, FundWithStats } from './funds.repository';
import { CreateFundDto, QueryFundDto, UpdateFundDto } from './dto';

export interface FundResponse {
  id: string;
  name: string;
  category: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  summary: {
    totalCollected: number;
    totalSpent: number;
    balance: number;
    contributionsCount: number;
    expensesCount: number;
  };
}

@Injectable()
export class FundsService {
  constructor(private readonly fundsRepository: FundsRepository) {}

  /**
   * Helper to check if a string is a 24-character hexadecimal MongoDB ObjectId
   */
  private isValidObjectId(id: string): boolean {
    return /^[0-9a-fA-F]{24}$/.test(id);
  }

  /**
   * Find a fund by ID or throw an appropriate exception
   */
  private async findFundByIdOrThrow(id: string): Promise<Fund> {
    const cleanId = id.trim();
    if (!this.isValidObjectId(cleanId)) {
      throw new BadRequestException('Invalid fund ID format');
    }

    const fund = await this.fundsRepository.findById(cleanId);
    if (!fund) {
      throw new NotFoundException(`Fund with ID '${cleanId}' was not found`);
    }

    return fund;
  }

  /**
   * Attach financial summary calculations to a fund record
   */
  private formatFundWithSummary(fund: FundWithStats): FundResponse {
    const totalCollected = (fund.contributions || []).reduce(
      (acc, c) => acc + (c.amount || 0),
      0,
    );
    const totalSpent = (fund.expenses || []).reduce(
      (acc, e) => acc + (e.amount || 0),
      0,
    );
    const balance = totalCollected - totalSpent;
    const contributionsCount =
      fund._count?.contributions ?? (fund.contributions?.length || 0);
    const expensesCount = fund._count?.expenses ?? (fund.expenses?.length || 0);

    return {
      id: fund.id,
      name: fund.name,
      category: fund.category,
      isActive: fund.isActive,
      createdAt: fund.createdAt,
      updatedAt: fund.updatedAt,
      summary: {
        totalCollected,
        totalSpent,
        balance,
        contributionsCount,
        expensesCount,
      },
    };
  }

  /**
   * Create a new fund / campaign
   */
  async create(dto: CreateFundDto): Promise<FundResponse> {
    const trimmedName = dto.name.trim();

    const existing = await this.fundsRepository.findByName(trimmedName);
    if (existing) {
      throw new ConflictException(
        `A fund with the name '${trimmedName}' already exists`,
      );
    }

    const created = await this.fundsRepository.create({
      name: trimmedName,
      category: dto.category,
      isActive: dto.isActive !== undefined ? dto.isActive : true,
    });

    return this.formatFundWithSummary(created);
  }

  /**
   * Retrieve all funds with pagination, filtering, sorting, and balance summaries
   */
  async findAll(query: QueryFundDto) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 10;
    const skip = (page - 1) * limit;
    const take = limit;

    const where: Prisma.FundWhereInput = {};

    if (query.category) {
      where.category = query.category;
    }

    if (typeof query.isActive === 'boolean') {
      where.isActive = query.isActive;
    }

    if (query.search?.trim()) {
      where.name = {
        contains: query.search.trim(),
        mode: Prisma.QueryMode.insensitive,
      };
    }

    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder || 'desc';
    const orderBy: Prisma.FundOrderByWithRelationInput[] = [
      { [sortBy]: sortOrder },
    ];
    if (sortBy !== 'createdAt') {
      orderBy.push({ createdAt: 'desc' });
    }

    const [funds, total] = await Promise.all([
      this.fundsRepository.findAll({ where, orderBy, skip, take }),
      this.fundsRepository.count(where),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      funds: funds.map((f) => this.formatFundWithSummary(f)),
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
   * Retrieve a single fund by its ID with full summary
   */
  async findOne(id: string): Promise<FundResponse> {
    const cleanId = id.trim();
    if (!this.isValidObjectId(cleanId)) {
      throw new BadRequestException('Invalid fund ID format');
    }

    const fund = await this.fundsRepository.findByIdWithSummary(cleanId);
    if (!fund) {
      throw new NotFoundException(`Fund with ID '${cleanId}' was not found`);
    }

    return this.formatFundWithSummary(fund);
  }

  /**
   * Update an existing fund
   */
  async update(id: string, dto: UpdateFundDto): Promise<FundResponse> {
    const existing = await this.findFundByIdOrThrow(id);

    const updateData: Prisma.FundUpdateInput = {};

    if (dto.name !== undefined) {
      const trimmedName = dto.name.trim();
      if (trimmedName.length < 2) {
        throw new BadRequestException(
          'Fund name must be at least 2 characters',
        );
      }

      if (trimmedName !== existing.name) {
        const nameConflict = await this.fundsRepository.findByName(trimmedName);
        if (nameConflict && nameConflict.id !== existing.id) {
          throw new ConflictException(
            `A fund with the name '${trimmedName}' already exists`,
          );
        }
        updateData.name = trimmedName;
      }
    }

    if (dto.category !== undefined) {
      updateData.category = dto.category;
    }

    if (dto.isActive !== undefined) {
      updateData.isActive = dto.isActive;
    }

    if (Object.keys(updateData).length === 0) {
      return this.findOne(existing.id);
    }

    await this.fundsRepository.update(existing.id, updateData);
    return this.findOne(existing.id);
  }

  /**
   * Delete a fund by ID (blocked if it contains contributions or expenses)
   */
  async remove(id: string): Promise<Fund> {
    const cleanId = id.trim();
    if (!this.isValidObjectId(cleanId)) {
      throw new BadRequestException('Invalid fund ID format');
    }

    const fundWithStats =
      await this.fundsRepository.findByIdWithSummary(cleanId);
    if (!fundWithStats) {
      throw new NotFoundException(`Fund with ID '${cleanId}' was not found`);
    }

    const contributionsCount = fundWithStats._count?.contributions || 0;
    const expensesCount = fundWithStats._count?.expenses || 0;

    if (contributionsCount > 0 || expensesCount > 0) {
      throw new BadRequestException(
        `Cannot delete fund '${fundWithStats.name}' because it contains ` +
          `${contributionsCount} contribution(s) and ${expensesCount} expense(s). ` +
          `Please set isActive to false instead to archive it.`,
      );
    }

    return this.fundsRepository.delete(fundWithStats.id);
  }
}
