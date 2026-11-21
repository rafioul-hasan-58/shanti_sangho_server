import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { JwtPayload } from './auth.guard';

@Injectable()
export class OptionalJwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      request['user'] = null;
      return true;
    }

    const [type, token] = authHeader.split(/\s+/);

    if (type?.toLowerCase() !== 'bearer' || !token) {
      request['user'] = null;
      return true;
    }

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token);
      request['user'] = payload;
    } catch {
      // Invalid/expired token is gracefully treated as anonymous visitor; never throws
      request['user'] = null;
    }

    return true;
  }
}
