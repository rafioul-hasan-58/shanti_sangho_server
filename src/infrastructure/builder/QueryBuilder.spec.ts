/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { QueryBuilder } from './QueryBuilder';

describe('QueryBuilder', () => {
  let mockModel: {
    findMany: jest.Mock;
    count: jest.Mock;
  };

  beforeEach(() => {
    mockModel = {
      findMany: jest.fn().mockResolvedValue([{ id: '1', name: 'Test' }]),
      count: jest.fn().mockResolvedValue(25),
    };
  });

  it('should initialize with model and query', () => {
    const qb = new QueryBuilder(mockModel, { searchTerm: 'abc' });
    expect(qb).toBeDefined();
  });

  describe('search', () => {
    it('should build insensitive search conditions for flat fields', () => {
      const qb = new QueryBuilder(mockModel, { searchTerm: 'john' });
      qb.search(['fullName', 'email']);

      const queryObj = qb.getPrismaQuery();
      expect(queryObj.where.OR).toEqual([
        { fullName: { contains: 'john', mode: 'insensitive' } },
        { email: { contains: 'john', mode: 'insensitive' } },
      ]);
    });

    it('should build search conditions for nested fields', () => {
      const qb = new QueryBuilder(mockModel, { searchTerm: 'engineer' });
      qb.search(['job.title']);

      const queryObj = qb.getPrismaQuery();
      expect(queryObj.where.OR).toEqual([
        { job: { title: { contains: 'engineer', mode: 'insensitive' } } },
      ]);
    });

    it('should not add where OR when searchTerm is empty or omitted', () => {
      const qb = new QueryBuilder(mockModel, {});
      qb.search(['fullName']);

      const queryObj = qb.getPrismaQuery();
      expect(queryObj.where).toBeUndefined();
    });
  });

  describe('filter', () => {
    it('should filter excluding pagination and search fields', () => {
      const qb = new QueryBuilder(mockModel, {
        status: 'ACTIVE',
        searchTerm: 'ignored',
        page: '1',
        limit: '10',
        sort: '-createdAt',
        fields: 'id,name',
      });
      qb.filter();

      const queryObj = qb.getPrismaQuery();
      expect(queryObj.where).toEqual({ status: 'ACTIVE' });
    });

    it('should handle nested field filters', () => {
      const qb = new QueryBuilder(mockModel, {
        'profile.city': 'Dhaka',
      });
      qb.filter();

      const queryObj = qb.getPrismaQuery();
      expect(queryObj.where).toEqual({
        profile: { city: 'Dhaka' },
      });
    });

    it('should handle bracket-based range operators in keys', () => {
      const qb = new QueryBuilder(mockModel, {
        'salary[gte]': '5000',
      });
      qb.filter();

      const queryObj = qb.getPrismaQuery();
      expect(queryObj.where).toEqual({
        salary: { gte: 5000 },
      });
    });

    it('should handle rawFilter merging', () => {
      const qb = new QueryBuilder(mockModel, {});
      qb.rawFilter({ isDeleted: false });

      const queryObj = qb.getPrismaQuery();
      expect(queryObj.where).toEqual({ isDeleted: false });
    });
  });

  describe('sort', () => {
    it('should sort ascending and descending with hyphen prefix', () => {
      const qb = new QueryBuilder(mockModel, {
        sort: '-createdAt,fullName',
      });
      qb.sort();

      const queryObj = qb.getPrismaQuery();
      expect(queryObj.orderBy).toEqual([
        { createdAt: 'desc' },
        { fullName: 'asc' },
      ]);
    });

    it('should default to -createdAt when no sort specified', () => {
      const qb = new QueryBuilder(mockModel, {});
      qb.sort();

      const queryObj = qb.getPrismaQuery();
      expect(queryObj.orderBy).toEqual([{ createdAt: 'desc' }]);
    });
  });

  describe('paginate', () => {
    it('should calculate skip and take based on page and limit', () => {
      const qb = new QueryBuilder(mockModel, {
        page: '3',
        limit: '20',
      });
      qb.paginate();

      const queryObj = qb.getPrismaQuery();
      expect(queryObj.skip).toBe(40);
      expect(queryObj.take).toBe(20);
    });

    it('should default to page 1 and limit 10', () => {
      const qb = new QueryBuilder(mockModel, {});
      qb.paginate();

      const queryObj = qb.getPrismaQuery();
      expect(queryObj.skip).toBe(0);
      expect(queryObj.take).toBe(10);
    });
  });

  describe('fields and select', () => {
    it('should project fields specified by comma-separated string', () => {
      const qb = new QueryBuilder(mockModel, {
        fields: 'id,fullName,email',
      });
      qb.fields();

      const queryObj = qb.getPrismaQuery();
      expect(queryObj.select).toEqual({
        id: true,
        fullName: true,
        email: true,
      });
    });

    it('should merge custom select definitions', () => {
      const qb = new QueryBuilder(mockModel, {});
      qb.select({ id: true, profile: true });

      const queryObj = qb.getPrismaQuery();
      expect(queryObj.select).toEqual({ id: true, profile: true });
    });
  });

  describe('include', () => {
    it('should set relation include options', () => {
      const qb = new QueryBuilder(mockModel, {});
      qb.include({ executive: true });

      const queryObj = qb.getPrismaQuery();
      expect(queryObj.include).toEqual({ executive: true });
    });
  });

  describe('priceRange', () => {
    it('should set gte and lte price ranges', () => {
      const qb = new QueryBuilder(mockModel, {});
      qb.priceRange(100, 500);

      const queryObj = qb.getPrismaQuery();
      expect(queryObj.where.price).toEqual({ gte: 100, lte: 500 });
    });
  });

  describe('execute and countTotal', () => {
    it('should execute findMany with compiled prismaQuery', async () => {
      const qb = new QueryBuilder(mockModel, { page: '1', limit: '5' });
      qb.paginate();

      const result = await qb.execute();
      expect(mockModel.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 5,
      });
      expect(result).toEqual([{ id: '1', name: 'Test' }]);
    });

    it('should return pagination metadata via countTotal', async () => {
      const qb = new QueryBuilder(mockModel, { page: '2', limit: '10' });
      qb.filter();

      const meta = await qb.countTotal();
      expect(mockModel.count).toHaveBeenCalledWith({ where: {} });
      expect(meta).toEqual({
        page: 2,
        limit: 10,
        total: 25,
        totalPage: 3,
      });
    });
  });
});
