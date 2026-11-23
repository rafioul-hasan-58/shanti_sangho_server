import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { Executive, ExecutiveType, Prisma } from '@prisma/client';
import { ExecutivesRepository } from './executives.repository';
import {
  CreateExecutiveDto,
  QueryExecutiveDto,
  UpdateExecutiveDto,
} from './dto';
import { CloudinaryService } from '../../infrastructure/cloudinary/cloudinary.service';

@Injectable()
export class ExecutivesService {
  private readonly logger = new Logger(ExecutivesService.name);

  constructor(
    private readonly executivesRepository: ExecutivesRepository,
    @Optional()
    private readonly cloudinaryService?: CloudinaryService,
  ) {}

  /**
   * Helper to check if a string is a 24-character hexadecimal MongoDB ObjectId
   */
  private isValidObjectId(id: string): boolean {
    return /^[0-9a-fA-F]{24}$/.test(id);
  }

  /**
   * Helper to generate a URL-safe slug from English name
   */
  private generateBaseSlug(name: string): string {
    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    return slug || 'executive';
  }

  /**
   * Resolve a unique slug for a new executive
   */
  private async resolveUniqueSlug(
    providedSlug?: string,
    nameEn?: string,
  ): Promise<string> {
    if (providedSlug?.trim()) {
      const normalized = providedSlug
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9-_]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');

      const existing = await this.executivesRepository.findBySlug(normalized);
      if (existing) {
        throw new ConflictException(
          `An executive with slug '${normalized}' already exists`,
        );
      }
      return normalized;
    }

    const baseSlug = this.generateBaseSlug(nameEn || 'executive');
    let candidate = baseSlug;
    let counter = 1;

    while (await this.executivesRepository.findBySlug(candidate)) {
      candidate = `${baseSlug}-${counter}`;
      counter++;
    }

    return candidate;
  }

  /**
   * Create a new executive
   */
  async create(dto: CreateExecutiveDto): Promise<Executive> {
    const slug = await this.resolveUniqueSlug(dto.slug, dto.nameEn);

    return this.executivesRepository.create({
      slug,
      nameEn: dto.nameEn.trim(),
      nameBn: dto.nameBn.trim(),
      roleEn: dto.roleEn.trim(),
      roleBn: dto.roleBn.trim(),
      villageEn: dto.villageEn.trim(),
      villageBn: dto.villageBn.trim(),
      summaryEn: dto.summaryEn.trim(),
      summaryBn: dto.summaryBn.trim(),
      image: dto.image?.trim() || null,
      imagePublicId: dto.imagePublicId?.trim() || null,
      joiningYear: dto.joiningYear.trim(),
      keyContributionEn: dto.keyContributionEn || [],
      keyContributionBn: dto.keyContributionBn || [],
      mottoEn: dto.mottoEn?.trim() || null,
      mottoBn: dto.mottoBn?.trim() || null,
      isKeyLeader: dto.isKeyLeader ?? false,
      type: dto.type || ExecutiveType.COMMITTEE,
      order: dto.order ?? 0,
    });
  }

  /**
   * Get all executives with filters and pagination
   */
  async findAll(query: QueryExecutiveDto) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 10;
    const skip = (page - 1) * limit;
    const take = limit;

    const where: Prisma.ExecutiveWhereInput = {};

    if (query.type) {
      where.type = query.type;
    }

    if (typeof query.isKeyLeader === 'boolean') {
      where.isKeyLeader = query.isKeyLeader;
    }

    if (query.search?.trim()) {
      const term = query.search.trim();
      where.OR = [
        { nameEn: { contains: term, mode: Prisma.QueryMode.insensitive } },
        { nameBn: { contains: term } },
        { roleEn: { contains: term, mode: Prisma.QueryMode.insensitive } },
        { roleBn: { contains: term } },
        { villageEn: { contains: term, mode: Prisma.QueryMode.insensitive } },
        { villageBn: { contains: term } },
        { slug: { contains: term, mode: Prisma.QueryMode.insensitive } },
      ];
    }

    const sortBy = query.sortBy || 'order';
    const sortOrder = query.sortOrder || 'asc';
    const orderBy: Prisma.ExecutiveOrderByWithRelationInput[] = [
      { [sortBy]: sortOrder },
    ];
    if (sortBy !== 'createdAt') {
      orderBy.push({ createdAt: 'desc' });
    }

    const [executives, total] = await Promise.all([
      this.executivesRepository.findAll({ where, orderBy, skip, take }),
      this.executivesRepository.count(where),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      executives,
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
   * Get a single executive by MongoDB ObjectId or Slug
   */
  async findOne(identifier: string): Promise<Executive> {
    const cleanId = identifier.trim();
    let executive: Executive | null = null;

    if (this.isValidObjectId(cleanId)) {
      executive = await this.executivesRepository.findById(cleanId);
    }

    if (!executive) {
      executive = await this.executivesRepository.findBySlug(cleanId);
    }

    if (!executive) {
      throw new NotFoundException(
        `Executive with identifier '${cleanId}' was not found`,
      );
    }

    return executive;
  }

  /**
   * Update an executive by ID or Slug
   */
  async update(
    identifier: string,
    dto: UpdateExecutiveDto,
  ): Promise<Executive> {
    const existing = await this.findOne(identifier);

    let newSlug = existing.slug;
    if (dto.slug?.trim()) {
      const normalized = dto.slug
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9-_]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');

      if (normalized !== existing.slug) {
        const conflict = await this.executivesRepository.findBySlug(normalized);
        if (conflict && conflict.id !== existing.id) {
          throw new ConflictException(
            `An executive with slug '${normalized}' already exists`,
          );
        }
        newSlug = normalized;
      }
    }

    const updateData: Prisma.ExecutiveUpdateInput = {
      ...(dto.nameEn !== undefined && { nameEn: dto.nameEn?.trim() }),
      ...(dto.nameBn !== undefined && { nameBn: dto.nameBn?.trim() }),
      ...(dto.roleEn !== undefined && { roleEn: dto.roleEn?.trim() }),
      ...(dto.roleBn !== undefined && { roleBn: dto.roleBn?.trim() }),
      ...(dto.villageEn !== undefined && { villageEn: dto.villageEn?.trim() }),
      ...(dto.villageBn !== undefined && { villageBn: dto.villageBn?.trim() }),
      ...(dto.summaryEn !== undefined && { summaryEn: dto.summaryEn?.trim() }),
      ...(dto.summaryBn !== undefined && { summaryBn: dto.summaryBn?.trim() }),
      ...(dto.joiningYear !== undefined && {
        joiningYear: dto.joiningYear?.trim(),
      }),
      ...(dto.image !== undefined && {
        image: dto.image?.trim() || null,
      }),
      ...(dto.imagePublicId !== undefined && {
        imagePublicId: dto.imagePublicId?.trim() || null,
      }),
      ...(dto.mottoEn !== undefined && {
        mottoEn: dto.mottoEn?.trim() || null,
      }),
      ...(dto.mottoBn !== undefined && {
        mottoBn: dto.mottoBn?.trim() || null,
      }),
      ...(dto.keyContributionEn !== undefined && {
        keyContributionEn: dto.keyContributionEn,
      }),
      ...(dto.keyContributionBn !== undefined && {
        keyContributionBn: dto.keyContributionBn,
      }),
      ...(dto.isKeyLeader !== undefined && { isKeyLeader: dto.isKeyLeader }),
      ...(dto.type !== undefined && { type: dto.type }),
      ...(dto.order !== undefined && { order: dto.order }),
      slug: newSlug,
    };

    return this.executivesRepository.update(existing.id, updateData);
  }

  /**
   * Delete an executive by ID or Slug
   */
  async delete(identifier: string): Promise<Executive> {
    const existing = await this.findOne(identifier);
    const deleted = await this.executivesRepository.delete(existing.id);

    if (existing.imagePublicId && this.cloudinaryService) {
      try {
        await this.cloudinaryService.deleteImage(existing.imagePublicId);
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        this.logger.warn(
          `Failed to delete Cloudinary image '${existing.imagePublicId}' for executive '${existing.id}': ${msg}`,
        );
      }
    }

    return deleted;
  }
}
