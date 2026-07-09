import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { RequestContext } from '../common/authenticated-user';
import { PrismaService } from '../database/prisma.service';
import { PERMISSIONS_KEY } from './permissions.decorator';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!required?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestContext>();
    const roleId = request.user?.roleId;

    if (!roleId) {
      throw new ForbiddenException('The current user has no assigned role');
    }

    const grants = await this.prisma.rolePermission.findMany({
      select: { permission: { select: { code: true } } },
      where: {
        permission: { code: { in: required } },
        roleId,
      },
    });
    const granted = new Set(grants.map((grant) => grant.permission.code));

    if (!required.every((permission) => granted.has(permission))) {
      throw new ForbiddenException('Required permission is missing');
    }

    return true;
  }
}
