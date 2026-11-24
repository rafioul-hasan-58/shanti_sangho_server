import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { BloodGroup, MembershipType, Role, UserStatus } from '@prisma/client';
import { MembersController } from './members.controller';
import { MembersService } from './members.service';
import type { JwtPayload } from '../../common/guards/auth.guard';
import { QueryMemberDto, UpdateMemberDto, UpdateProfileDto } from './dto';

describe('MembersController', () => {
  let controller: MembersController;
  let membersService: {
    getProfile: jest.Mock;
    updateProfile: jest.Mock;
    findAll: jest.Mock;
    findOne: jest.Mock;
    toggleBlockMember: jest.Mock;
    updateMember: jest.Mock;
    deleteMember: jest.Mock;
  };

  const mockJwtUser: JwtPayload = {
    id: '64a1b2c3d4e5f67890123456',
    email: 'test@example.com',
    role: Role.USER,
  };

  const mockAdminUser: JwtPayload = {
    id: '64a1b2c3d4e5f67890123499',
    email: 'admin@example.com',
    role: Role.ADMIN,
  };

  const mockProfile = {
    id: mockJwtUser.id,
    fullName: 'Test Member',
    email: mockJwtUser.email,
    role: Role.USER,
    status: UserStatus.ACTIVE,
    bloodGroup: BloodGroup.O_POSITIVE,
    membershipType: MembershipType.PERMANENT,
    village: 'Shavarchala',
  };

  beforeEach(async () => {
    membersService = {
      getProfile: jest.fn().mockResolvedValue(mockProfile),
      updateProfile: jest.fn().mockResolvedValue({
        ...mockProfile,
        fullName: 'Updated Member',
      }),
      findAll: jest.fn().mockResolvedValue({
        members: [mockProfile],
        meta: {
          total: 1,
          page: 1,
          limit: 10,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      }),
      findOne: jest.fn().mockResolvedValue(mockProfile),
      toggleBlockMember: jest.fn().mockResolvedValue({
        ...mockProfile,
        status: UserStatus.SUSPENDED,
      }),
      updateMember: jest.fn().mockResolvedValue({
        ...mockProfile,
        role: Role.MODERATOR,
      }),
      deleteMember: jest.fn().mockResolvedValue(mockProfile),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MembersController],
      providers: [
        {
          provide: MembersService,
          useValue: membersService,
        },
        {
          provide: JwtService,
          useValue: { verifyAsync: jest.fn() },
        },
        Reflector,
      ],
    }).compile();

    controller = module.get<MembersController>(MembersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return authenticated member profile on GET /members/profile', async () => {
    const res = await controller.getMyProfile(mockJwtUser);
    expect(membersService.getProfile).toHaveBeenCalledWith(mockJwtUser.id);
    expect(res.message).toBe('Profile retrieved successfully');
    expect(res.data).toEqual(mockProfile);
  });

  it('should update authenticated member profile on PATCH /members/profile', async () => {
    const dto: UpdateProfileDto = { fullName: 'Updated Member' };
    const res = await controller.updateMyProfile(mockJwtUser, dto);
    expect(membersService.updateProfile).toHaveBeenCalledWith(
      mockJwtUser.id,
      dto,
    );
    expect(res.message).toBe('Profile updated successfully');
    expect(res.data.fullName).toBe('Updated Member');
  });

  it('should return paginated members on GET /members/get-all', async () => {
    const query: QueryMemberDto = { page: 1, limit: 10 };
    const res = await controller.findAll(query);
    expect(membersService.findAll).toHaveBeenCalledWith(query);
    expect(res.message).toBe('Members retrieved successfully');
    expect(res.data.members).toHaveLength(1);
  });

  it('should return a single member on GET /members/details/:id', async () => {
    const res = await controller.findOne(mockJwtUser.id);
    expect(membersService.findOne).toHaveBeenCalledWith(mockJwtUser.id);
    expect(res.message).toBe('Member retrieved successfully');
    expect(res.data).toEqual(mockProfile);
  });

  it('should toggle block status on PATCH /members/:id/toggle-block', async () => {
    const res = await controller.toggleBlock(mockJwtUser.id, mockAdminUser);
    expect(membersService.toggleBlockMember).toHaveBeenCalledWith(
      mockJwtUser.id,
      mockAdminUser.id,
    );
    expect(res.message).toBe('Member blocked successfully');
    expect(res.data.status).toBe(UserStatus.SUSPENDED);
  });

  it('should update a member on PATCH /members/update/:id', async () => {
    const dto: UpdateMemberDto = { role: Role.MODERATOR };
    const res = await controller.update(mockJwtUser.id, dto, mockAdminUser);
    expect(membersService.updateMember).toHaveBeenCalledWith(
      mockJwtUser.id,
      dto,
      mockAdminUser.id,
    );
    expect(res.message).toBe('Member updated successfully');
    expect(res.data.role).toBe(Role.MODERATOR);
  });

  it('should delete a member on DELETE /members/delete/:id', async () => {
    const res = await controller.remove(mockJwtUser.id, mockAdminUser);
    expect(membersService.deleteMember).toHaveBeenCalledWith(
      mockJwtUser.id,
      mockAdminUser.id,
    );
    expect(res.message).toBe('Member deleted successfully');
    expect(res.data).toEqual(mockProfile);
  });
});
