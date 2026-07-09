import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import {
  AuthenticatedUser,
  RequestContext,
} from '../common/authenticated-user';
import { EnvironmentService } from '../config/environment.service';
import { PrismaService } from '../database/prisma.service';
import { JwtPayload } from './jwt-payload';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly environment: EnvironmentService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestContext>();
    const authorization = request.headers.authorization;

    if (
      typeof authorization !== 'string' ||
      !authorization.startsWith('Bearer ')
    ) {
      throw new UnauthorizedException('A bearer access token is required');
    }

    try {
      const payload = await this.jwt.verifyAsync<JwtPayload>(
        authorization.slice(7),
        { secret: this.environment.jwtSecret },
      );

      if (payload.type !== 'access') {
        throw new UnauthorizedException('Invalid access token');
      }

      const session = await this.prisma.session.findFirst({
        select: { id: true },
        where: {
          expiresAt: { gt: new Date() },
          id: payload.sessionId,
          organizationId: payload.organizationId,
          revokedAt: null,
          userId: payload.sub,
        },
      });
      if (!session) {
        throw new UnauthorizedException('Session is no longer active');
      }

      const user: AuthenticatedUser = {
        id: payload.sub,
        organizationId: payload.organizationId,
        roleId: payload.roleId,
        sessionId: payload.sessionId,
      };
      request.user = user;
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException('Access token is invalid or expired');
    }
  }
}
