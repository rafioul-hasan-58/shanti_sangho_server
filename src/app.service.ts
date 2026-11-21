import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

  async getHello(): Promise<string> {
    const memberCount = await this.prisma.member.count();
    return `Welcome to shanti_sangho_server! (Hello World! ${memberCount})`;
  }
  async triggerNotFound() {
    return this.prisma.member.update({
      where: { id: '000000000000000000000000' }, // valid ObjectId format, doesn't exist
      data: { fullName: 'test' },
    });
  }
}
