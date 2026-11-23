import { Injectable } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerRequest } from '@nestjs/throttler';
import { Request } from 'express';
import { AuthUser } from '../tools/tool-context';

@Injectable()
export class ChatThrottlerGuard extends ThrottlerGuard {
  protected override async getTracker(
    req: Record<string, unknown>,
  ): Promise<string> {
    const user = req['user'] as AuthUser | undefined;
    if (user?.id) {
      return Promise.resolve(`user:${user.id}`);
    }
    const ip = (req as unknown as Request).ip;
    return Promise.resolve(`ip:${ip || 'anonymous'}`);
  }

  protected override async handleRequest(
    requestProps: ThrottlerRequest,
  ): Promise<boolean> {
    const { context, throttler } = requestProps;
    const req = context.switchToHttp().getRequest<Request>();
    const user = req['user'] as AuthUser | undefined;
    const isAuth = Boolean(user && user.id);

    // Differentiate between anonymous vs authenticated throttler buckets
    if (isAuth && throttler.name === 'anonymous') {
      return true;
    }

    if (!isAuth && throttler.name === 'authenticated') {
      return true;
    }

    return super.handleRequest(requestProps);
  }
}
