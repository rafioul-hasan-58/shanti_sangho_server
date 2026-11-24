/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */

// Query Builder in Prisma
export class QueryBuilder<T = any> {
  private model: any;
  private query: Record<string, unknown>;
  private prismaQuery: any = {}; // Define as any for flexibility

  constructor(model: any, query: Record<string, unknown>) {
    this.model = model; // Prisma model instance
    this.query = query; // Query params
  }

  getPrismaQuery(): any {
    return this.prismaQuery;
  }

  // Search
  search(searchableFields: string[]) {
    const rawSearch = (this.query.searchTerm || this.query.search) as string;
    const searchTerm =
      typeof rawSearch === 'string' ? rawSearch.trim() : undefined;
    if (searchTerm) {
      const orConditions = searchableFields.map((field) => {
        if (field.includes('.')) {
          // handle nested fields like job.title
          const parts = field.split('.');
          return parts.reverse().reduce((acc, key, idx) => {
            if (idx === 0) {
              return { [key]: { contains: searchTerm, mode: 'insensitive' } };
            }
            return { [key]: acc };
          }, {});
        }

        // normal top-level field
        return {
          [field]: { contains: searchTerm, mode: 'insensitive' },
        };
      });

      this.prismaQuery.where = {
        ...this.prismaQuery.where,
        OR: orConditions,
      };
    }
    return this;
  }

  // Filter
  filter() {
    const queryObj = { ...this.query };
    const excludeFields = [
      'searchTerm',
      'search',
      'sort',
      'sortBy',
      'sortOrder',
      'limit',
      'page',
      'fields',
    ];
    excludeFields.forEach((field) => delete queryObj[field]);

    const formattedFilters: Record<string, any> = {};

    for (const [key, value] of Object.entries(queryObj)) {
      if (value === undefined) {
        continue;
      }
      if (key.includes('.')) {
        // handle nested filters like job.title
        const parts = key.split('.');
        const nestedFilter = parts.reverse().reduce((acc, k, idx) => {
          if (idx === 0) {
            return { [k]: value }; // primitive filter
          }
          return { [k]: acc };
        }, {});
        Object.assign(formattedFilters, nestedFilter);
      } else if (key.includes('[')) {
        // e.g. salary[gte]=5000 where key is "salary[gte]"
        const [field, operator] = key.split('[');
        const op = operator.slice(0, -1); // remove ]
        formattedFilters[field] = { [`${op}`]: parseFloat(value as string) };
      } else if (typeof value === 'string' && value.includes('[')) {
        // e.g. salary[gte]=5000
        const [field, operator] = key.split('[');
        const op = operator ? operator.slice(0, -1) : 'equals'; // remove ]
        formattedFilters[field] = { [`${op}`]: parseFloat(value) };
      } else {
        formattedFilters[key] = value;
      }
    }

    this.prismaQuery.where = {
      ...this.prismaQuery.where,
      ...formattedFilters,
    };

    return this;
  }

  //raw filter
  rawFilter(filters: Record<string, any>) {
    // Ensure that the filters are merged correctly with the existing where conditions
    this.prismaQuery.where = {
      ...this.prismaQuery.where,
      ...filters,
    };
    // console.log(this.prismaQuery.where);
    return this;
  }

  // Sorting
  sort() {
    let sortStr = this.query.sort as string;
    if (!sortStr && this.query.sortBy) {
      const order = this.query.sortOrder === 'asc' ? '' : '-';
      sortStr = `${order}${this.query.sortBy as string}`;
    }
    const sort = sortStr?.split(',') || ['-createdAt'];
    const orderBy = sort.map((field) => {
      if (field.startsWith('-')) {
        return { [field.slice(1)]: 'desc' };
      }
      return { [field]: 'asc' };
    });

    if (this.query.sortBy && this.query.sortBy !== 'createdAt') {
      const hasCreatedAt = orderBy.some((o) => 'createdAt' in o);
      if (!hasCreatedAt) {
        orderBy.push({ createdAt: 'desc' });
      }
    }

    this.prismaQuery.orderBy = orderBy;
    return this;
  }

  // Pagination
  paginate() {
    const page = Number(this.query.page) || 1;
    const limit = Number(this.query.limit) || 10;
    const skip = (page - 1) * limit;

    this.prismaQuery.skip = skip;
    this.prismaQuery.take = limit;

    return this;
  }

  // Fields Selection
  fields() {
    const fields = (this.query.fields as string)?.split(',') || [];
    if (fields.length > 0) {
      this.prismaQuery.select = fields.reduce(
        (acc: Record<string, boolean>, field) => {
          acc[field] = true;
          return acc;
        },
        {},
      );
    }
    return this;
  }

  select(selectableFields: Record<string, boolean | object>) {
    this.prismaQuery.select = {
      ...this.prismaQuery.select,
      ...selectableFields,
    };
    return this;
  }

  // **Include Related Models*/
  include(inculpableFields: Record<string, boolean | object>) {
    this.prismaQuery.include = {
      ...this.prismaQuery.include,
      ...inculpableFields,
    };
    return this;
  }

  // **Execute Query*/
  async execute(): Promise<T[]> {
    if (typeof this.model.findMany === 'function') {
      return await this.model.findMany(this.prismaQuery);
    }
    if (typeof this.model.findAll === 'function') {
      return await this.model.findAll(this.prismaQuery);
    }
    throw new Error(
      'Model delegate must provide either findMany or findAll method.',
    );
  }

  // Count Total
  async countTotal(): Promise<{
    page: number;
    limit: number;
    total: number;
    totalPage: number;
  }> {
    const rawTotal: unknown = await this.model.count({
      where: this.prismaQuery.where,
    });
    const total =
      typeof rawTotal === 'number' ? rawTotal : Number(rawTotal) || 0;
    const page = Number(this.query.page) || 1;
    const limit = Number(this.query.limit) || 10;
    const totalPage = Math.ceil(total / limit) || 1;
    return {
      page,
      limit,
      total,
      totalPage,
    };
  }

  priceRange(minPrice?: number, maxPrice?: number) {
    if (!this.prismaQuery.where) {
      this.prismaQuery.where = {};
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      this.prismaQuery.where.price = {};

      if (minPrice !== undefined) {
        this.prismaQuery.where.price.gte = minPrice;
      }

      if (maxPrice !== undefined) {
        this.prismaQuery.where.price.lte = maxPrice;
      }
    }

    return this;
  }
}

export default QueryBuilder;
