import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { BloodGroup, MembershipType, UserStatus } from '@prisma/client';
import { MembersService } from '../../members/members.service';
import { GetMyMembershipTool } from './get-my-membership.tool';

describe('GetMyMembershipTool', () => {
  let tool: GetMyMembershipTool;
  let membersService: {
    findOne: jest.Mock;
  };

  const mockMember = {
    id: '64a1b2c3d4e5f67890123456',
    fullName: 'Sourav Prodhan',
    email: 'sourav@example.com',
    phoneNumber: '+8801700000000',
    membershipType: MembershipType.PERMANENT,
    bloodGroup: BloodGroup.O_POSITIVE,
    status: UserStatus.ACTIVE,
    village: 'Shavarchala',
    profession: 'Software Engineer',
    currentLocation: 'Dhaka',
    dateOfBirth: null,
    createdAt: new Date('2023-01-01'),
    password: 'hashed_secret_password',
  };

  beforeEach(async () => {
    membersService = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetMyMembershipTool,
        {
          provide: MembersService,
          useValue: membersService,
        },
      ],
    }).compile();

    tool = module.get<GetMyMembershipTool>(GetMyMembershipTool);
  });

  it('should be defined', () => {
    expect(tool).toBeDefined();
    expect(tool.name).toBe('get_my_membership');
    expect(tool.requiresAuth).toBe(true);
  });

  describe('anonymous vs authenticated', () => {
    it('should return login_required error when user context is null', async () => {
      const result = await tool.execute({}, { user: null });

      expect(result).toEqual({
        error: 'login_required',
        message: 'You must be logged in to view your membership information.',
      });
      expect(membersService.findOne).not.toHaveBeenCalled();
    });

    it('should fetch membership details when user context is authenticated', async () => {
      membersService.findOne.mockResolvedValueOnce(mockMember);

      const result = await tool.execute(
        {},
        { user: { id: mockMember.id, role: 'USER' } },
      );

      expect(membersService.findOne).toHaveBeenCalledWith(mockMember.id);
      expect(result).toHaveProperty('memberNumber', mockMember.id);
      expect(result).toHaveProperty('fullName', mockMember.fullName);
    });

    it('should prefer memberId from user context if provided', async () => {
      membersService.findOne.mockResolvedValueOnce(mockMember);

      await tool.execute(
        {},
        {
          user: {
            id: 'user_account_id',
            memberId: 'member_specific_id',
            role: 'USER',
          },
        },
      );

      expect(membersService.findOne).toHaveBeenCalledWith('member_specific_id');
    });
  });

  describe('field whitelisting', () => {
    it('should only return whitelisted member fields and omit sensitive attributes', async () => {
      membersService.findOne.mockResolvedValueOnce(mockMember);

      const result = await tool.execute({}, { user: { id: mockMember.id } });

      expect(result).toEqual({
        memberNumber: mockMember.id,
        fullName: mockMember.fullName,
        email: mockMember.email,
        phoneNumber: mockMember.phoneNumber,
        membershipType: mockMember.membershipType,
        bloodGroup: mockMember.bloodGroup,
        status: mockMember.status,
        village: mockMember.village,
        profession: mockMember.profession,
        currentLocation: mockMember.currentLocation,
        dateOfBirth: mockMember.dateOfBirth,
        memberSince: mockMember.createdAt,
      });

      // Ensure password or credentials are never exposed
      expect(result).not.toHaveProperty('password');
    });
  });

  describe('member not found', () => {
    it('should return member_not_found error when membersService throws NotFoundException', async () => {
      membersService.findOne.mockRejectedValueOnce(
        new NotFoundException('Member not found'),
      );

      const result = await tool.execute({}, { user: { id: 'unknown_id' } });

      expect(result).toEqual({
        error: 'member_not_found',
        message:
          'No sports club membership profile was found linked to your authenticated member account.',
      });
    });
  });
});
