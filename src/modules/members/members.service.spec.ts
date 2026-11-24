import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  AuthProvider,
  BloodGroup,
  Member,
  MembershipType,
  Role,
  UserStatus,
} from '@prisma/client';
import { MembersService } from './members.service';
import { MembersRepository } from './members.repository';

describe('MembersService', () => {
  let service: MembersService;
  let repository: {
    findMany: jest.Mock;
    findAll: jest.Mock;
    count: jest.Mock;
    findById: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };

  const mockMember: Member = {
    id: '64a1b2c3d4e5f67890123456',
    fullName: 'Test Member',
    fatherName: null,
    motherName: null,
    email: 'test@example.com',
    password: 'hashed_secret_password',
    profileImage: null,
    phoneNumber: null,
    bloodGroup: BloodGroup.UNKNOWN,
    bio: null,
    summary: null,
    status: UserStatus.ACTIVE,
    role: Role.USER,
    profession: null,
    village: null,
    currentLocation: null,
    whatsappNumber: null,
    membershipType: MembershipType.PERMANENT,
    facebookProfile: null,
    authProvider: AuthProvider.EMAIL,
    emailVerified: false,
    phoneVerified: false,
    adminVerified: false,
    googleId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const findManyMock = jest.fn();
    repository = {
      findAll: findManyMock,
      findMany: findManyMock,
      count: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MembersService,
        {
          provide: MembersRepository,
          useValue: repository,
        },
      ],
    }).compile();

    service = module.get<MembersService>(MembersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getProfile', () => {
    it('should return sanitized member profile without password', async () => {
      repository.findById.mockResolvedValue(mockMember);

      const profile = await service.getProfile(mockMember.id);

      expect(repository.findById).toHaveBeenCalledWith(mockMember.id);
      expect(profile.id).toBe(mockMember.id);
      expect(profile.email).toBe(mockMember.email);
      expect('password' in profile).toBe(false);
    });

    it('should throw NotFoundException if member does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.getProfile('missing_id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw UnauthorizedException if member is suspended', async () => {
      repository.findById.mockResolvedValue({
        ...mockMember,
        status: UserStatus.SUSPENDED,
      });

      await expect(service.getProfile(mockMember.id)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('updateProfile', () => {
    it('should update allowed profile fields and return sanitized member', async () => {
      repository.findById.mockResolvedValue(mockMember);
      const updatedMember: Member = {
        ...mockMember,
        fullName: 'Updated Name',
        village: 'Shavarchala',
        bloodGroup: BloodGroup.O_POSITIVE,
        bio: null,
      };
      repository.update.mockResolvedValue(updatedMember);

      const result = await service.updateProfile(mockMember.id, {
        fullName: '  Updated Name  ',
        village: '  Shavarchala ',
        bloodGroup: BloodGroup.O_POSITIVE,
        bio: '   ',
      });

      expect(repository.update).toHaveBeenCalledWith(mockMember.id, {
        fullName: 'Updated Name',
        village: 'Shavarchala',
        bloodGroup: BloodGroup.O_POSITIVE,
        bio: null,
      });
      expect(result.fullName).toBe('Updated Name');
      expect(result.village).toBe('Shavarchala');
      expect('password' in result).toBe(false);
    });

    it('should skip repository update when payload has no fields', async () => {
      repository.findById.mockResolvedValue(mockMember);

      const result = await service.updateProfile(mockMember.id, {});

      expect(repository.update).not.toHaveBeenCalled();
      expect(result.id).toBe(mockMember.id);
      expect('password' in result).toBe(false);
    });

    it('should safely handle null values in nullable profile fields without throwing', async () => {
      repository.findById.mockResolvedValue(mockMember);
      repository.update.mockResolvedValue({
        ...mockMember,
        fatherName: null,
        bio: null,
      });

      const result = await service.updateProfile(mockMember.id, {
        fatherName: null as unknown as string,
        bio: null as unknown as string,
      });

      expect(repository.update).toHaveBeenCalledWith(mockMember.id, {
        fatherName: null,
        bio: null,
      });
      expect(result.id).toBe(mockMember.id);
    });

    it('should throw BadRequestException if trimmed fullName is shorter than 2 characters', async () => {
      repository.findById.mockResolvedValue(mockMember);

      await expect(
        service.updateProfile(mockMember.id, { fullName: '  A ' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if member does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(
        service.updateProfile('missing_id', { fullName: 'Someone' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw UnauthorizedException if member is suspended', async () => {
      repository.findById.mockResolvedValue({
        ...mockMember,
        status: UserStatus.SUSPENDED,
      });

      await expect(
        service.updateProfile(mockMember.id, { fullName: 'Someone' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('findAll', () => {
    it('should return paginated sanitized members with metadata and apply filters', async () => {
      repository.findAll.mockResolvedValue([mockMember]);
      repository.count.mockResolvedValue(1);

      const result = await service.findAll({
        page: 2,
        limit: 5,
        role: Role.USER,
        status: UserStatus.ACTIVE,
        emailVerified: false,
        search: 'Test',
        sortBy: 'fullName',
        sortOrder: 'asc',
      });

      expect(repository.findAll).toHaveBeenCalledWith({
        where: {
          role: Role.USER,
          status: UserStatus.ACTIVE,
          emailVerified: false,
          OR: [
            { fullName: { contains: 'Test', mode: 'insensitive' } },
            { email: { contains: 'Test', mode: 'insensitive' } },
            { phoneNumber: { contains: 'Test', mode: 'insensitive' } },
            { village: { contains: 'Test', mode: 'insensitive' } },
            { profession: { contains: 'Test', mode: 'insensitive' } },
            { currentLocation: { contains: 'Test', mode: 'insensitive' } },
          ],
        },
        orderBy: [{ fullName: 'asc' }, { createdAt: 'desc' }],
        skip: 5,
        take: 5,
      });
      expect(result.members).toHaveLength(1);
      expect('password' in result.members[0]).toBe(false);
      expect(result.meta).toEqual({
        total: 1,
        page: 2,
        limit: 5,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: true,
      });
    });

    it('should support QueryBuilder searchTerm and sort string format', async () => {
      repository.findAll.mockResolvedValue([mockMember]);
      repository.count.mockResolvedValue(10);

      const result = await service.findAll({
        searchTerm: 'john',
        sort: '-createdAt,fullName',
        page: 1,
        limit: 10,
      });

      expect(repository.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { fullName: { contains: 'john', mode: 'insensitive' } },
            { email: { contains: 'john', mode: 'insensitive' } },
            { phoneNumber: { contains: 'john', mode: 'insensitive' } },
            { village: { contains: 'john', mode: 'insensitive' } },
            { profession: { contains: 'john', mode: 'insensitive' } },
            { currentLocation: { contains: 'john', mode: 'insensitive' } },
          ],
        },
        orderBy: [{ createdAt: 'desc' }, { fullName: 'asc' }],
        skip: 0,
        take: 10,
      });
      expect(result.meta.totalPages).toBe(1);
    });
  });

  describe('findOne', () => {
    it('should return a sanitized member by ObjectId', async () => {
      repository.findById.mockResolvedValue(mockMember);

      const result = await service.findOne(mockMember.id);

      expect(repository.findById).toHaveBeenCalledWith(mockMember.id);
      expect(result.id).toBe(mockMember.id);
      expect('password' in result).toBe(false);
    });

    it('should throw BadRequestException for invalid ObjectId', async () => {
      await expect(service.findOne('not-an-object-id')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException if member does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.findOne('64a1b2c3d4e5f67890123457')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateMember', () => {
    const actorId = '64a1b2c3d4e5f67890123499';

    it('should update admin and profile fields and return sanitized member', async () => {
      repository.findById.mockResolvedValue(mockMember);
      const updatedMember: Member = {
        ...mockMember,
        fullName: 'Updated Admin Target',
        role: Role.MODERATOR,
        status: UserStatus.SUSPENDED,
        emailVerified: true,
        phoneVerified: true,
        adminVerified: true,
      };
      repository.update.mockResolvedValue(updatedMember);

      const result = await service.updateMember(
        mockMember.id,
        {
          fullName: ' Updated Admin Target ',
          role: Role.MODERATOR,
          status: UserStatus.SUSPENDED,
          emailVerified: true,
          phoneVerified: true,
          adminVerified: true,
        },
        actorId,
      );

      expect(repository.update).toHaveBeenCalledWith(mockMember.id, {
        fullName: 'Updated Admin Target',
        role: Role.MODERATOR,
        status: UserStatus.SUSPENDED,
        emailVerified: true,
        phoneVerified: true,
        adminVerified: true,
      });
      expect(result.role).toBe(Role.MODERATOR);
      expect('password' in result).toBe(false);
    });

    it('should set adminVerified to false when disabled', async () => {
      repository.findById.mockResolvedValue({
        ...mockMember,
        adminVerified: true,
      });
      repository.update.mockResolvedValue({
        ...mockMember,
        adminVerified: false,
      });

      const result = await service.updateMember(
        mockMember.id,
        { adminVerified: false },
        actorId,
      );

      expect(repository.update).toHaveBeenCalledWith(mockMember.id, {
        adminVerified: false,
      });
      expect(result.adminVerified).toBe(false);
    });

    it('should safely handle null values when updating member via admin API', async () => {
      repository.findById.mockResolvedValue(mockMember);
      repository.update.mockResolvedValue({
        ...mockMember,
        profession: null,
      });

      const result = await service.updateMember(
        mockMember.id,
        {
          profession: null as unknown as string,
        },
        actorId,
      );

      expect(repository.update).toHaveBeenCalledWith(mockMember.id, {
        profession: null,
      });
      expect(result.id).toBe(mockMember.id);
    });

    it('should prevent changing own role or suspending own account', async () => {
      repository.findById.mockResolvedValue({
        ...mockMember,
        role: Role.ADMIN,
      });

      await expect(
        service.updateMember(mockMember.id, { role: Role.USER }, mockMember.id),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.updateMember(
          mockMember.id,
          { status: UserStatus.SUSPENDED },
          mockMember.id,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('toggleBlockMember', () => {
    const actorId = '64a1b2c3d4e5f67890123499';

    it('should block an active member by setting status to SUSPENDED', async () => {
      repository.findById.mockResolvedValue({
        ...mockMember,
        status: UserStatus.ACTIVE,
      });
      repository.update.mockResolvedValue({
        ...mockMember,
        status: UserStatus.SUSPENDED,
      });

      const result = await service.toggleBlockMember(mockMember.id, actorId);

      expect(repository.update).toHaveBeenCalledWith(mockMember.id, {
        status: UserStatus.SUSPENDED,
      });
      expect(result.status).toBe(UserStatus.SUSPENDED);
      expect('password' in result).toBe(false);
    });

    it('should unblock a suspended member by setting status to ACTIVE', async () => {
      repository.findById.mockResolvedValue({
        ...mockMember,
        status: UserStatus.SUSPENDED,
      });
      repository.update.mockResolvedValue({
        ...mockMember,
        status: UserStatus.ACTIVE,
      });

      const result = await service.toggleBlockMember(mockMember.id, actorId);

      expect(repository.update).toHaveBeenCalledWith(mockMember.id, {
        status: UserStatus.ACTIVE,
      });
      expect(result.status).toBe(UserStatus.ACTIVE);
    });

    it('should throw BadRequestException if admin tries to block themselves', async () => {
      repository.findById.mockResolvedValue(mockMember);

      await expect(
        service.toggleBlockMember(mockMember.id, mockMember.id),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('deleteMember', () => {
    const actorId = '64a1b2c3d4e5f67890123499';

    it('should delete member and return sanitized deleted record', async () => {
      repository.findById.mockResolvedValue(mockMember);
      repository.delete.mockResolvedValue(mockMember);

      const result = await service.deleteMember(mockMember.id, actorId);

      expect(repository.delete).toHaveBeenCalledWith(mockMember.id);
      expect(result.id).toBe(mockMember.id);
      expect('password' in result).toBe(false);
    });

    it('should throw BadRequestException if admin tries to delete themselves', async () => {
      repository.findById.mockResolvedValue(mockMember);

      await expect(
        service.deleteMember(mockMember.id, mockMember.id),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
