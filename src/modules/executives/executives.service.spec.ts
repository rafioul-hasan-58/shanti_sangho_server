import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Executive, ExecutiveType } from '@prisma/client';
import { ExecutivesService } from './executives.service';
import { ExecutivesRepository } from './executives.repository';
import { CloudinaryService } from '../../infrastructure/cloudinary/cloudinary.service';

describe('ExecutivesService', () => {
  let service: ExecutivesService;
  let repository: {
    create: jest.Mock;
    findAll: jest.Mock;
    count: jest.Mock;
    findById: jest.Mock;
    findBySlug: jest.Mock;
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
    repository = {
      create: jest.fn(),
      findAll: jest.fn(),
      count: jest.fn(),
      findById: jest.fn(),
      findBySlug: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExecutivesService,
        {
          provide: ExecutivesRepository,
          useValue: repository,
        },
      ],
    }).compile();

    service = module.get<ExecutivesService>(ExecutivesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create an executive with explicit slug', async () => {
      repository.findBySlug.mockResolvedValue(null);
      repository.create.mockResolvedValue(mockExecutive);

      const result = await service.create({
        slug: 'emon',
        nameEn: 'Md. Emon Hasan',
        nameBn: 'মোঃ ইমন হাসান',
        roleEn: 'President',
        roleBn: 'সভাপতি',
        villageEn: 'Shavarchala',
        villageBn: 'শাভারচালা',
        summaryEn: 'Community leader',
        summaryBn: 'সমাজকর্মী',
        joiningYear: '2018',
      });

      expect(repository.findBySlug).toHaveBeenCalledWith('emon');
      expect(repository.create).toHaveBeenCalled();
      expect(result.slug).toBe('emon');
    });

    it('should auto-generate slug from nameEn when slug is omitted', async () => {
      repository.findBySlug.mockResolvedValue(null);
      repository.create.mockResolvedValue({
        ...mockExecutive,
        slug: 'md-emon-hasan',
      });

      const result = await service.create({
        nameEn: 'Md. Emon Hasan',
        nameBn: 'মোঃ ইমন হাসান',
        roleEn: 'President',
        roleBn: 'সভাপতি',
        villageEn: 'Shavarchala',
        villageBn: 'শাভারচালা',
        summaryEn: 'Community leader',
        summaryBn: 'সমাজকর্মী',
        joiningYear: '2018',
      });

      expect(repository.findBySlug).toHaveBeenCalledWith('md-emon-hasan');
      expect(result.slug).toBe('md-emon-hasan');
    });

    it('should throw ConflictException if slug already exists', async () => {
      repository.findBySlug.mockResolvedValue(mockExecutive);

      await expect(
        service.create({
          slug: 'emon',
          nameEn: 'Md. Emon Hasan',
          nameBn: 'মোঃ ইমন হাসান',
          roleEn: 'President',
          roleBn: 'সভাপতি',
          villageEn: 'Shavarchala',
          villageBn: 'শাভারচালা',
          summaryEn: 'Community leader',
          summaryBn: 'সমাজকর্মী',
          joiningYear: '2018',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('should return paginated executives and metadata', async () => {
      repository.findAll.mockResolvedValue([mockExecutive]);
      repository.count.mockResolvedValue(1);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result.executives).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.totalPages).toBe(1);
      expect(result.meta.page).toBe(1);
    });

    it('should filter by type and search keyword', async () => {
      repository.findAll.mockResolvedValue([mockExecutive]);
      repository.count.mockResolvedValue(1);

      const result = await service.findAll({
        type: ExecutiveType.COMMITTEE,
        search: 'Emon',
        isKeyLeader: true,
      });

      expect(repository.findAll).toHaveBeenCalled();
      expect(repository.count).toHaveBeenCalled();
      expect(result.executives).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    it('should find an executive by valid 24-hex ObjectId', async () => {
      repository.findById.mockResolvedValue(mockExecutive);

      const result = await service.findOne('64a1b2c3d4e5f67890123456');
      expect(repository.findById).toHaveBeenCalledWith(
        '64a1b2c3d4e5f67890123456',
      );
      expect(result.id).toBe(mockExecutive.id);
    });

    it('should find an executive by slug if not an ObjectId', async () => {
      repository.findBySlug.mockResolvedValue(mockExecutive);

      const result = await service.findOne('emon');
      expect(repository.findBySlug).toHaveBeenCalledWith('emon');
      expect(result.slug).toBe('emon');
    });

    it('should throw NotFoundException if executive not found', async () => {
      repository.findBySlug.mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update executive data successfully', async () => {
      repository.findBySlug.mockResolvedValue(mockExecutive);
      const updated = { ...mockExecutive, roleEn: 'Vice President' };
      repository.update.mockResolvedValue(updated);

      const result = await service.update('emon', {
        roleEn: 'Vice President',
      });

      expect(result.roleEn).toBe('Vice President');
      expect(repository.update).toHaveBeenCalled();
    });

    it('should throw ConflictException if updated slug is taken by another executive', async () => {
      repository.findBySlug.mockImplementation((slug: string) => {
        if (slug === 'emon') return Promise.resolve(mockExecutive);
        if (slug === 'new-slug')
          return Promise.resolve({
            ...mockExecutive,
            id: 'another_id_123456789012',
            slug: 'new-slug',
          });
        return Promise.resolve(null);
      });

      await expect(
        service.update('emon', { slug: 'new-slug' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('delete', () => {
    it('should delete executive successfully', async () => {
      repository.findBySlug.mockResolvedValue(mockExecutive);
      repository.delete.mockResolvedValue(mockExecutive);

      const result = await service.delete('emon');
      expect(repository.delete).toHaveBeenCalledWith(mockExecutive.id);
      expect(result.id).toBe(mockExecutive.id);
    });

    it('should delete executive and call cloudinary deleteImage if imagePublicId exists', async () => {
      const executiveWithImage = {
        ...mockExecutive,
        imagePublicId: 'members/emon_123',
      };
      repository.findBySlug.mockResolvedValue(executiveWithImage);
      repository.delete.mockResolvedValue(executiveWithImage);
      const mockCloudinary = {
        deleteImage: jest.fn().mockResolvedValue({ deleted: true }),
      };

      const serviceWithCloudinary = new ExecutivesService(
        repository as unknown as ExecutivesRepository,
        mockCloudinary as unknown as CloudinaryService,
      );

      const result = await serviceWithCloudinary.delete('emon');
      expect(repository.delete).toHaveBeenCalledWith(executiveWithImage.id);
      expect(mockCloudinary.deleteImage).toHaveBeenCalledWith(
        'members/emon_123',
      );
      expect(result.id).toBe(executiveWithImage.id);
    });

    it('should not fail executive delete if cloudinary deleteImage throws', async () => {
      const executiveWithImage = {
        ...mockExecutive,
        imagePublicId: 'members/emon_123',
      };
      repository.findBySlug.mockResolvedValue(executiveWithImage);
      repository.delete.mockResolvedValue(executiveWithImage);
      const mockCloudinary = {
        deleteImage: jest.fn().mockRejectedValue(new Error('Cloudinary down')),
      };

      const serviceWithCloudinary = new ExecutivesService(
        repository as unknown as ExecutivesRepository,
        mockCloudinary as unknown as CloudinaryService,
      );

      const result = await serviceWithCloudinary.delete('emon');
      expect(repository.delete).toHaveBeenCalledWith(executiveWithImage.id);
      expect(result.id).toBe(executiveWithImage.id);
    });

    it('should throw NotFoundException when deleting non-existent executive', async () => {
      repository.findBySlug.mockResolvedValue(null);

      await expect(service.delete('unknown')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
