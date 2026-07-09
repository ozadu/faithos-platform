import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserStatus } from '@faithos/database';
import { hash } from 'argon2';
import { randomBytes } from 'node:crypto';

import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../common/authenticated-user';
import { RequestMetadata } from '../common/request-metadata.decorator';
import { TenantScopeService } from '../common/tenant-scope.service';
import { PrismaService } from '../database/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const publicUserSelect = {
  createdAt: true,
  deletedAt: true,
  department: { select: { id: true, name: true } },
  departmentId: true,
  email: true,
  firstName: true,
  id: true,
  jobTitle: true,
  lastLoginAt: true,
  lastName: true,
  organizationId: true,
  phone: true,
  role: { select: { id: true, isSystem: true, name: true } },
  roleId: true,
  status: true,
  updatedAt: true,
} as const;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantScopeService,
    private readonly audit: AuditService,
  ) {}

  list(organizationId: string) {
    return this.prisma.user.findMany({
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      select: publicUserSelect,
      where: { deletedAt: null, organizationId },
    });
  }

  async get(organizationId: string, id: string) {
    const user = await this.prisma.user.findFirst({
      select: publicUserSelect,
      where: this.tenant.where(organizationId, { deletedAt: null, id }),
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async create(
    principal: AuthenticatedUser,
    input: CreateUserDto,
    metadata: RequestMetadata,
  ) {
    const email = input.email.toLowerCase();
    await this.assertEmailAvailable(email);
    await this.assertRelations(
      principal.organizationId,
      input.departmentId,
      input.roleId,
    );
    const temporaryPassword =
      input.temporaryPassword ?? randomBytes(18).toString('base64url');
    const user = await this.prisma.user.create({
      data: {
        email,
        firstName: input.firstName,
        lastName: input.lastName,
        organizationId: principal.organizationId,
        passwordHash: await hash(temporaryPassword),
        status: input.status ?? UserStatus.ACTIVE,
        ...(input.departmentId ? { departmentId: input.departmentId } : {}),
        ...(input.jobTitle ? { jobTitle: input.jobTitle } : {}),
        ...(input.phone ? { phone: input.phone } : {}),
        ...(input.roleId ? { roleId: input.roleId } : {}),
      },
      select: publicUserSelect,
    });
    await this.audit.record({
      action: 'user.created',
      entityId: user.id,
      entityType: 'User',
      newValues: { email: user.email, status: user.status },
      organizationId: principal.organizationId,
      userId: principal.id,
      ...metadata,
    });
    return { temporaryPassword, user };
  }

  async update(
    principal: AuthenticatedUser,
    id: string,
    input: UpdateUserDto,
    metadata: RequestMetadata,
  ) {
    const existing = await this.get(principal.organizationId, id);
    if (input.email && input.email.toLowerCase() !== existing.email) {
      await this.assertEmailAvailable(input.email.toLowerCase());
    }
    await this.assertRelations(
      principal.organizationId,
      input.departmentId,
      input.roleId,
    );
    const user = await this.prisma.user.update({
      data: {
        ...input,
        ...(input.email ? { email: input.email.toLowerCase() } : {}),
      },
      select: publicUserSelect,
      where: { id },
    });
    await this.audit.record({
      action: 'user.updated',
      entityId: user.id,
      entityType: 'User',
      newValues: { email: user.email, status: user.status },
      oldValues: { email: existing.email, status: existing.status },
      organizationId: principal.organizationId,
      userId: principal.id,
      ...metadata,
    });
    return user;
  }

  async remove(organizationId: string, id: string): Promise<void> {
    await this.get(organizationId, id);
    await this.prisma.$transaction([
      this.prisma.user.update({
        data: { deletedAt: new Date(), status: UserStatus.DISABLED },
        where: { id },
      }),
      this.prisma.session.updateMany({
        data: { revokedAt: new Date() },
        where: { revokedAt: null, userId: id },
      }),
    ]);
  }

  private async assertEmailAvailable(email: string): Promise<void> {
    if (await this.prisma.user.findUnique({ where: { email } })) {
      throw new ConflictException('Email is already in use');
    }
  }

  private async assertRelations(
    organizationId: string,
    departmentId?: string | null,
    roleId?: string | null,
  ): Promise<void> {
    if (departmentId) {
      const department = await this.prisma.department.findFirst({
        where: { deletedAt: null, id: departmentId, organizationId },
      });
      if (!department) throw new NotFoundException('Department not found');
    }
    if (roleId) {
      const role = await this.prisma.role.findFirst({
        where: {
          id: roleId,
          OR: [{ organizationId }, { isSystem: true, organizationId: null }],
        },
      });
      if (!role) throw new NotFoundException('Role not found');
    }
  }
}
