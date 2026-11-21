import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { MemberType } from '@prisma/client';
import { MembersService } from '../../modules/members/members.service';
import { GetMyMembershipTool } from './get-my-membership.tool';

describe('GetMyMembershipTool', () => {
  let tool: GetMyMembershipTool;
  let membersService: {
    findOne: jest.Mock;
  };

  const mockMember = {
    id: '64a1b2c3d4e5f67890123456',
    slug: 'sourav-member',
    nameEn: 'Sourav Prodhan',
    nameBn: 'সৌরভ প্রধান',
    roleEn: 'General Secretary',
    roleBn: 'সাধারণ সম্পাদক',
    type: MemberType.COMMITTEE,
    joiningYear: '2020',
    isKeyLeader: true,
    villageEn: 'Shavarchala',
    villageBn: 'সাবারচালা',
    summaryEn: 'Active sports organizer',
    image: 'https://example.com/photo.jpg',
    imagePublicId: 'members/photo123',
    internalSecret: 'sensitive-hash-here',
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
      expect(result).toHaveProperty('nameEn', mockMember.nameEn);
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
        nameEn: mockMember.nameEn,
        nameBn: mockMember.nameBn,
        roleEn: mockMember.roleEn,
        roleBn: mockMember.roleBn,
        type: mockMember.type,
        joiningYear: mockMember.joiningYear,
        isKeyLeader: mockMember.isKeyLeader,
        villageEn: mockMember.villageEn,
        villageBn: mockMember.villageBn,
        summaryEn: mockMember.summaryEn,
      });

      // Ensure internal or unused fields are never exposed
      expect(result).not.toHaveProperty('internalSecret');
      expect(result).not.toHaveProperty('imagePublicId');
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
          'No sports club membership profile was found linked to your authenticated user account.',
      });
    });
  });
});
