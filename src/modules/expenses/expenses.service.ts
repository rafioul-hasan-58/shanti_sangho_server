import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Member, Prisma } from '@prisma/client';
import {
  ExpensesRepository,
  ExpenseWithRelations,
} from './expenses.repository';
import { FundsRepository } from '../funds/funds.repository';
import { MembersRepository } from '../members/members.repository';
import { CreateExpenseDto, QueryExpenseDto, UpdateExpenseDto } from './dto';

@Injectable()
export class ExpensesService {
  constructor(
    private readonly expensesRepository: ExpensesRepository,
    private readonly fundsRepository: FundsRepository,
    private readonly membersRepository: MembersRepository,
  ) {}

  private isValidObjectId(id: string): boolean {
    return /^[0-9a-fA-F]{24}$/.test(id);
  }

  private async findExpenseByIdOrThrow(
    id: string,
  ): Promise<ExpenseWithRelations> {
    const cleanId = id.trim();
    if (!this.isValidObjectId(cleanId)) {
      throw new BadRequestException('Invalid expense ID format');
    }

    const expense = await this.expensesRepository.findById(cleanId);
    if (!expense) {
      throw new NotFoundException(`Expense with ID '${cleanId}' was not found`);
    }

    return expense;
  }

  /**
   * Record a new expense
   */
  async create(dto: CreateExpenseDto, actorId: string) {
    const fund = await this.fundsRepository.findById(dto.fundId);
    if (!fund) {
      throw new NotFoundException(`Fund with ID '${dto.fundId}' not found`);
    }

    const spentById = dto.spentById || actorId;
    let spender: Member | null = null;
    if (spentById) {
      spender = await this.membersRepository.findById(spentById);
      if (!spender) {
        throw new NotFoundException(
          `Spender Member with ID '${spentById}' not found`,
        );
      }
    }

    const created = await this.expensesRepository.create({
      amount: dto.amount,
      spentOn: dto.spentOn.trim(),
      spentAt: dto.spentAt || new Date(),
      note: dto.note?.trim() || null,
      receiptUrl: dto.receiptUrl?.trim() || null,
      fund: {
        connect: { id: fund.id },
      },
      ...(spender
        ? {
            spentBy: {
              connect: { id: spender.id },
            },
          }
        : {}),
    });

    return this.findOne(created.id);
  }

  /**
   * Retrieve all expenses matching query filters
   */
  async findAll(query: QueryExpenseDto) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 10;
    const skip = (page - 1) * limit;
    const take = limit;

    const where: Prisma.ExpenseWhereInput = {};

    if (query.fundId) {
      where.fundId = query.fundId;
    }

    if (query.spentById) {
      where.spentById = query.spentById;
    }

    if (query.startDate || query.endDate) {
      where.spentAt = {};
      if (query.startDate) {
        where.spentAt.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        where.spentAt.lte = new Date(query.endDate);
      }
    }

    if (query.search?.trim()) {
      const term = query.search.trim();
      where.OR = [
        { spentOn: { contains: term, mode: Prisma.QueryMode.insensitive } },
        { note: { contains: term, mode: Prisma.QueryMode.insensitive } },
      ];
    }

    const sortBy = query.sortBy || 'spentAt';
    const sortOrder = query.sortOrder || 'desc';
    const orderBy: Prisma.ExpenseOrderByWithRelationInput[] = [
      { [sortBy]: sortOrder },
    ];
    if (sortBy !== 'createdAt') {
      orderBy.push({ createdAt: 'desc' });
    }

    const [expenses, total, totalAmount] = await Promise.all([
      this.expensesRepository.findAll({ where, orderBy, skip, take }),
      this.expensesRepository.count(where),
      this.expensesRepository.aggregateAmount(where),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      expenses,
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
   * Get single expense by ID
   */
  async findOne(id: string): Promise<ExpenseWithRelations> {
    return this.findExpenseByIdOrThrow(id);
  }

  /**
   * Update expense
   */
  async update(id: string, dto: UpdateExpenseDto) {
    const existing = await this.findExpenseByIdOrThrow(id);

    const updateData: Prisma.ExpenseUpdateInput = {};

    if (dto.amount !== undefined) {
      updateData.amount = dto.amount;
    }

    if (dto.spentOn !== undefined) {
      if (!dto.spentOn.trim()) {
        throw new BadRequestException('spentOn cannot be empty');
      }
      updateData.spentOn = dto.spentOn.trim();
    }

    if (dto.spentAt !== undefined) {
      updateData.spentAt = dto.spentAt;
    }

    if (dto.note !== undefined) {
      updateData.note = dto.note ? dto.note.trim() || null : null;
    }

    if (dto.receiptUrl !== undefined) {
      updateData.receiptUrl = dto.receiptUrl
        ? dto.receiptUrl.trim() || null
        : null;
    }

    if (dto.fundId !== undefined && dto.fundId !== existing.fundId) {
      const fund = await this.fundsRepository.findById(dto.fundId);
      if (!fund) {
        throw new NotFoundException(`Fund with ID '${dto.fundId}' not found`);
      }
      updateData.fund = { connect: { id: fund.id } };
    }

    if (dto.spentById !== undefined) {
      if (dto.spentById) {
        const spender = await this.membersRepository.findById(dto.spentById);
        if (!spender) {
          throw new NotFoundException(
            `Spender Member with ID '${dto.spentById}' not found`,
          );
        }
        updateData.spentBy = { connect: { id: spender.id } };
      } else {
        updateData.spentBy = { disconnect: true };
      }
    }

    if (Object.keys(updateData).length === 0) {
      return existing;
    }

    await this.expensesRepository.update(existing.id, updateData);
    return this.findOne(existing.id);
  }

  /**
   * Delete expense
   */
  async remove(id: string) {
    const existing = await this.findExpenseByIdOrThrow(id);
    return this.expensesRepository.delete(existing.id);
  }
}
