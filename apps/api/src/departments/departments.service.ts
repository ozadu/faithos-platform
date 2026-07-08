import { Injectable, NotFoundException } from '@nestjs/common';

import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../common/authenticated-user';
import { RequestMetadata } from '../common/request-metadata.decorator';
import { TenantScopeService } from '../common/tenant-scope.service';
import { PrismaService } from '../database/prisma.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';

@Injectable()
export class DepartmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantScopeService,
    private readonly audit: AuditService,
  ) {}

  list(organizationId: string) {
    return this.prisma.department.findMany({
      include: {
        departmentHead: {
          select: { email: true, firstName: true, id: true, lastName: true },
        },
      },
      orderBy: { name: 'asc' },
      where: { deletedAt: null, organizationId },
    });
  }

  async create(
    principal: AuthenticatedUser,
    input: CreateDepartmentDto,
    metadata: RequestMetadata,
  ) {
    await this.assertHead(principal.organizationId, input.departmentHeadId);
    const department = await this.prisma.department.create({
      data: { ...input, organizationId: principal.organizationId },
    });
    await this.audit.record({
      action: 'department.created',
      entityId: department.id,
      entityType: 'Department',
      newValues: { name: department.name },
      organizationId: principal.organizationId,
      userId: principal.id,
      ...metadata,
    });
    return department;
  }

  async update(
    principal: AuthenticatedUser,
    id: string,
    input: UpdateDepartmentDto,
    metadata: RequestMetadata,
  ) {
    const existing = await this.find(principal.organizationId, id);
    await this.assertHead(principal.organizationId, input.departmentHeadId);
    const department = await this.prisma.department.update({
      data: input,
      where: { id },
    });
    await this.audit.record({
      action: 'department.updated',
      entityId: department.id,
      entityType: 'Department',
      newValues: { name: department.name },
      oldValues: { name: existing.name },
      organizationId: principal.organizationId,
      userId: principal.id,
      ...metadata,
    });
    return department;
  }

  async remove(organizationId: string, id: string) {
    await this.find(organizationId, id);
    return this.prisma.department.update({
      data: { deletedAt: new Date(), departmentHeadId: null },
      where: { id },
    });
  }

  private async find(organizationId: string, id: string) {
    const department = await this.prisma.department.findFirst({
      where: this.tenant.where(organizationId, { deletedAt: null, id }),
    });
    if (!department) throw new NotFoundException('Department not found');
    return department;
  }

  private async assertHead(
    organizationId: string,
    departmentHeadId?: string | null,
  ): Promise<void> {
    if (!departmentHeadId) return;
    const user = await this.prisma.user.findFirst({
      where: { deletedAt: null, id: departmentHeadId, organizationId },
    });
    if (!user) throw new NotFoundException('Department head not found');
  }
}
