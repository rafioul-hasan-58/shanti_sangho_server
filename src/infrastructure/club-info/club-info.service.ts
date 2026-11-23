import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface ClubInfoSearchResult {
  id: string;
  category: string;
  title: string;
  content: string;
  tags: string[];
}

@Injectable()
export class ClubInfoService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Search club information by keyword/query across title, content, category, and tags.
   */
  async search(query: string, limit = 5): Promise<ClubInfoSearchResult[]> {
    const cleanQuery = query?.trim();

    if (!cleanQuery) {
      return this.prisma.clubInfo.findMany({
        take: limit,
        select: {
          id: true,
          category: true,
          title: true,
          content: true,
          tags: true,
        },
      });
    }

    const where: Prisma.ClubInfoWhereInput = {
      OR: [
        { title: { contains: cleanQuery, mode: 'insensitive' } },
        { content: { contains: cleanQuery, mode: 'insensitive' } },
        { category: { contains: cleanQuery, mode: 'insensitive' } },
        { tags: { has: cleanQuery.toLowerCase() } },
      ],
    };

    return this.prisma.clubInfo.findMany({
      where,
      take: limit,
      select: {
        id: true,
        category: true,
        title: true,
        content: true,
        tags: true,
      },
    });
  }
}
