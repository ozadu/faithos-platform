import { Injectable } from '@nestjs/common';
import { Prisma } from '@faithos/database';

import { PrismaService } from '../database/prisma.service';

export interface AuditEntry {
  action: string;
  entityId?: string;
  entityType: string;
  ipAddress?: string;
  newValues?: Prisma.InputJsonValue;
  oldValues?: Prisma.InputJsonValue;
  organizationId?: string;
  userAgent?: string;
  userId?: string;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(entry: AuditEntry): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        action: entry.action,
        entityType: entry.entityType,
        ...(entry.entityId ? { entityId: entry.entityId } : {}),
        ...(entry.ipAddress ? { ipAddress: entry.ipAddress } : {}),
        ...(entry.newValues ? { newValues: entry.newValues } : {}),
        ...(entry.oldValues ? { oldValues: entry.oldValues } : {}),
        ...(entry.organizationId
          ? { organizationId: entry.organizationId }
          : {}),
        ...(entry.userAgent ? { userAgent: entry.userAgent } : {}),
        ...(entry.userId ? { userId: entry.userId } : {}),
      },
    });
  }
}
