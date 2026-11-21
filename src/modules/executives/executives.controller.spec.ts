import { Test, TestingModule } from '@nestjs/testing';
import { Executive, ExecutiveType } from '@prisma/client';
import { ExecutivesController } from './executives.controller';
import { ExecutivesService } from './executives.service';
import {
  CreateExecutiveDto,
  QueryExecutiveDto,
  UpdateExecutiveDto,
} from './dto';

describe('ExecutivesController', () => {
  let controller: ExecutivesController;
  let service: {
    create: jest.Mock;
    findAll: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };

  const mockExecutive: Executive = {
    id: '64a1b2c3d4e5f67890123456',
    slug: 'emon',
    nameEn: 'Md. Emon Hasan',
    nameBn: 'মোঃ ইমন হাসান',
    roleEn: 'President',
    roleBn: 'সভাপতি',
    image: 'https://example.com/emon.jpg',
    imagePublicId: null,
    villageEn: 'Shavarchala',
    villageBn: 'শাভারচালা',
    summaryEn: 'Community leader',
    summaryBn: 'সমাজকর্মী',
    keyContributionEn: ['Sports club founder'],
    keyContributionBn: ['ক্রীড়া ক্লাব প্রতিষ্ঠাতা'],
    mottoEn: 'Unity is strength',
    mottoBn: 'একতাই বল',
    joiningYear: '2018',
    isKeyLeader: true,
    type: ExecutiveType.COMMITTEE,
    order: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    service = {
      create: jest.fn().mockResolvedValue(mockExecutive),
      findAll: jest.fn().mockResolvedValue({
        executives: [mockExecutive],
        meta: {
          total: 1,
          page: 1,
          limit: 10,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      }),
      findOne: jest.fn().mockResolvedValue(mockExecutive),
      update: jest.fn().mockResolvedValue(mockExecutive),
      delete: jest.fn().mockResolvedValue(mockExecutive),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExecutivesController],
      providers: [
        {
          provide: ExecutivesService,
          useValue: service,
        },
      ],
    }).compile();

    controller = module.get<ExecutivesController>(ExecutivesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should create an executive via POST /executives', async () => {
    const dto: CreateExecutiveDto = {
      nameEn: 'Md. Emon Hasan',
      nameBn: 'মোঃ ইমন হাসান',
      roleEn: 'President',
      roleBn: 'সভাপতি',
      villageEn: 'Shavarchala',
      villageBn: 'শাভারচালা',
      summaryEn: 'Community leader',
      summaryBn: 'সমাজকর্মী',
      joiningYear: '2018',
    };

    const result = await controller.create(dto);
    expect(service.create).toHaveBeenCalledWith(dto);
    expect(result.message).toBe('Executive created successfully');
    expect(result.data).toBe(mockExecutive);
  });

  it('should get all executives via GET /executives', async () => {
    const query: QueryExecutiveDto = { page: 1, limit: 10 };
    const result = await controller.findAll(query);
    expect(service.findAll).toHaveBeenCalledWith(query);
    expect(result.message).toBe('Executives retrieved successfully');
    expect(result.data.executives).toEqual([mockExecutive]);
  });

  it('should get a single executive via GET /executives/:identifier', async () => {
    const result = await controller.findOne('emon');
    expect(service.findOne).toHaveBeenCalledWith('emon');
    expect(result.message).toBe('Executive retrieved successfully');
    expect(result.data).toBe(mockExecutive);
  });

  it('should update an executive via PATCH /executives/:identifier', async () => {
    const dto: UpdateExecutiveDto = { roleEn: 'Senior Advisor' };
    const result = await controller.update('emon', dto);
    expect(service.update).toHaveBeenCalledWith('emon', dto);
    expect(result.message).toBe('Executive updated successfully');
  });

  it('should delete an executive via DELETE /executives/:identifier', async () => {
    const result = await controller.delete('emon');
    expect(service.delete).toHaveBeenCalledWith('emon');
    expect(result.message).toBe('Executive deleted successfully');
  });
});
