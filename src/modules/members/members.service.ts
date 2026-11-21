import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Member, Prisma, UserStatus } from '@prisma/client';
import { MembersRepository } from './members.repository';
import { QueryMemberDto, UpdateMemberDto, UpdateProfileDto } from './dto';
import { sanitizeMember } from './members.utils';

const NULLABLE_PROFILE_STRING_FIELDS = [
  'fatherName',
  'motherName',
  'profileImage',
  'phoneNumber',
  'bio',
  'summary',
  'profession',
  'village',
  'currentLocation',
  'whatsappNumber',
  'facebookProfile',
] as const;

@Injectable()
export class MembersService {
  constructor(private readonly membersRepository: MembersRepository) {}

  // Check if a valid MongoDB ObjectId.
  private isValidObjectId(id: string): boolean {
    return /^[0-9a-fA-F]{24}$/.test(id);
  }

  // Fetch member by ID and throw if ID is invalid or member does not exist.
  private async findMemberByIdOrThrow(memberId: string): Promise<Member> {
    const cleanId = memberId.trim();
    if (!this.isValidObjectId(cleanId)) {
      throw new BadRequestException('Invalid member ID format');
    }

    const member = await this.membersRepository.findById(cleanId);
    if (!member) {
      throw new NotFoundException(`Member with ID '${cleanId}' was not found`);
    }

    return member;
  }

  // Fetch member by ID and verify the account exists and is not suspended.
  private async findActiveMemberOrThrow(memberId: string): Promise<Member> {
    const member = await this.membersRepository.findById(memberId);
    if (!member) {
      throw new NotFoundException('Member not found');
    }
    if (member.status === UserStatus.SUSPENDED) {
      throw new UnauthorizedException('Your account has been suspended!');
    }
    return member;
  }

  // Map shared profile fields from DTO into a Prisma update payload.
  private buildProfileUpdateData(
    dto: UpdateProfileDto,
  ): Prisma.MemberUpdateInput {
    const updateData: Prisma.MemberUpdateInput = {};

    if (dto.fullName !== undefined) {
      if (!dto.fullName || typeof dto.fullName !== 'string') {
        throw new BadRequestException(
          'Full name must be at least 2 characters',
        );
      }
      const trimmedName = dto.fullName.trim();
      if (trimmedName.length < 2) {
        throw new BadRequestException(
          'Full name must be at least 2 characters',
        );
      }
      updateData.fullName = trimmedName;
    }

    for (const field of NULLABLE_PROFILE_STRING_FIELDS) {
      const value = dto[field];
      if (value !== undefined) {
        updateData[field] = value ? value.trim() || null : null;
      }
    }

    if (dto.bloodGroup !== undefined) {
      updateData.bloodGroup = dto.bloodGroup;
    }

    if (dto.membershipType !== undefined) {
      updateData.membershipType = dto.membershipType;
    }

    return updateData;
  }

  // Get the authenticated member's profile.
  async getProfile(memberId: string) {
    const member = await this.findActiveMemberOrThrow(memberId);
    return sanitizeMember(member);
  }

  // Update the authenticated member's profile fields.
  async updateProfile(memberId: string, dto: UpdateProfileDto) {
    const existing = await this.findActiveMemberOrThrow(memberId);
    const updateData = this.buildProfileUpdateData(dto);

    if (Object.keys(updateData).length === 0) {
      return sanitizeMember(existing);
    }

    const updated = await this.membersRepository.update(memberId, updateData);
    return sanitizeMember(updated);
  }

  // Get all members by filter and pagination
  async findAll(query: QueryMemberDto) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 10;
    const skip = (page - 1) * limit;
    const take = limit;

    const where: Prisma.MemberWhereInput = {};

    if (query.role) {
      where.role = query.role;
    }
    if (query.status) {
      where.status = query.status;
    }
    if (query.membershipType) {
      where.membershipType = query.membershipType;
    }
    if (query.bloodGroup) {
      where.bloodGroup = query.bloodGroup;
    }
    if (typeof query.emailVerified === 'boolean') {
      where.emailVerified = query.emailVerified;
    }

    if (query.search?.trim()) {
      const term = query.search.trim();
      where.OR = [
        { fullName: { contains: term, mode: Prisma.QueryMode.insensitive } },
        { email: { contains: term, mode: Prisma.QueryMode.insensitive } },
        { phoneNumber: { contains: term, mode: Prisma.QueryMode.insensitive } },
        { village: { contains: term, mode: Prisma.QueryMode.insensitive } },
        { profession: { contains: term, mode: Prisma.QueryMode.insensitive } },
        {
          currentLocation: {
            contains: term,
            mode: Prisma.QueryMode.insensitive,
          },
        },
      ];
    }

    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder || 'desc';
    const orderBy: Prisma.MemberOrderByWithRelationInput[] = [
      { [sortBy]: sortOrder },
    ];
    if (sortBy !== 'createdAt') {
      orderBy.push({ createdAt: 'desc' });
    }

    const [members, total] = await Promise.all([
      this.membersRepository.findAll({ where, orderBy, skip, take }),
      this.membersRepository.count(where),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      members: members.map(sanitizeMember),
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

  // Get member details by admin
  async findOne(memberId: string) {
    const member = await this.findMemberByIdOrThrow(memberId);
    return sanitizeMember(member);
  }

  // Update member by admin
  async updateMember(memberId: string, dto: UpdateMemberDto, actorId?: string) {
    const existing = await this.findMemberByIdOrThrow(memberId);
    const updateData = this.buildProfileUpdateData(dto);

    if (dto.role !== undefined) {
      if (actorId && existing.id === actorId && dto.role !== existing.role) {
        throw new BadRequestException('You cannot change your own role');
      }
      updateData.role = dto.role;
    }

    if (dto.status !== undefined) {
      if (
        actorId &&
        existing.id === actorId &&
        dto.status === UserStatus.SUSPENDED
      ) {
        throw new BadRequestException('You cannot suspend your own account');
      }
      updateData.status = dto.status;
    }

    if (dto.emailVerified !== undefined) {
      updateData.emailVerified = dto.emailVerified;
    }

    if (dto.phoneVerified !== undefined) {
      updateData.phoneVerified = dto.phoneVerified;
    }

    if (dto.adminVerified !== undefined) {
      updateData.adminVerified = dto.adminVerified;
    }

    if (Object.keys(updateData).length === 0) {
      return sanitizeMember(existing);
    }

    const updated = await this.membersRepository.update(
      existing.id,
      updateData,
    );
    return sanitizeMember(updated);
  }

  // Toggle a member's blocked status between SUSPENDED and ACTIVE (Admin).
  async toggleBlockMember(memberId: string, actorId?: string) {
    const existing = await this.findMemberByIdOrThrow(memberId);

    if (actorId && existing.id === actorId) {
      throw new BadRequestException(
        'You cannot block or unblock your own account',
      );
    }

    const nextStatus =
      existing.status === UserStatus.SUSPENDED
        ? UserStatus.ACTIVE
        : UserStatus.SUSPENDED;

    const updated = await this.membersRepository.update(existing.id, {
      status: nextStatus,
    });

    return sanitizeMember(updated);
  }

  // Delete member by admin
  async deleteMember(memberId: string, actorId?: string) {
    const existing = await this.findMemberByIdOrThrow(memberId);

    if (actorId && existing.id === actorId) {
      throw new BadRequestException('You cannot delete your own account');
    }

    const deleted = await this.membersRepository.delete(existing.id);
    return sanitizeMember(deleted);
  }
}
