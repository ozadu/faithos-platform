import { Injectable, NotFoundException } from '@nestjs/common';

import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../common/authenticated-user';
import { RequestMetadata } from '../common/request-metadata.decorator';
import { PrismaService } from '../database/prisma.service';
import { UpdateRolePermissionsDto } from './dto/update-role-permissions.dto';

@Injectable()
export class RolesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  list(organizationId: string) {
    return this.prisma.role.findMany({
      include: {
        rolePermissions: { include: { permission: true } },
      },
      orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
      where: {
        OR: [{ organizationId }, { isSystem: true, organizationId: null }],
      },
    });
  }

  async updatePermissions(
    principal: AuthenticatedUser,
    id: string,
    input: UpdateRolePermissionsDto,
    metadata: RequestMetadata,
  ) {
    const role = await this.prisma.role.findFirst({
      include: { rolePermissions: true },
      where: {
        id,
        organizationId: principal.organizationId,
      },
    });
    if (!role) throw new NotFoundException('Role not found');

    const permissionCount = await this.prisma.permission.count({
      where: { id: { in: input.permissionIds } },
    });
    if (permissionCount !== input.permissionIds.length) {
      throw new NotFoundException('One or more permissions were not found');
    }

    await this.prisma.$transaction([
      this.prisma.rolePermission.deleteMany({ where: { roleId: id } }),
      this.prisma.rolePermission.createMany({
        data: input.permissionIds.map((permissionId) => ({
          permissionId,
          roleId: id,
        })),
      }),
    ]);
    await this.audit.record({
      action: 'role.permissions.updated',
      entityId: id,
      entityType: 'Role',
      newValues: { permissionIds: input.permissionIds },
      oldValues: {
        permissionIds: role.rolePermissions.map((item) => item.permissionId),
      },
      organizationId: principal.organizationId,
      userId: principal.id,
      ...metadata,
    });

    return this.prisma.role.findUnique({
      include: { rolePermissions: { include: { permission: true } } },
      where: { id },
    });
  }
}
