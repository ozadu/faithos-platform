import 'reflect-metadata';

import assert from 'node:assert/strict';
import { it } from 'node:test';

import { AuditService } from '../src/audit/audit.service';
import { TenantScopeService } from '../src/common/tenant-scope.service';
import { PrismaService } from '../src/database/prisma.service';
import { UsersService } from '../src/users/users.service';

it('creates a tenant user with a hashed password and public response', async () => {
  let persistedPasswordHash = '';
  const publicUser = {
    createdAt: new Date(),
    deletedAt: null,
    department: null,
    departmentId: null,
    email: 'new.user@example.com',
    firstName: 'New',
    id: 'new-user-id',
    jobTitle: null,
    lastLoginAt: null,
    lastName: 'User',
    organizationId: 'org-id',
    phone: null,
    role: null,
    roleId: null,
    status: 'ACTIVE',
    updatedAt: new Date(),
  };
  const prisma = {
    user: {
      create: async ({ data }: { data: { passwordHash: string } }) => {
        persistedPasswordHash = data.passwordHash;
        return publicUser;
      },
      findUnique: async () => null,
    },
  } as unknown as PrismaService;
  const service = new UsersService(prisma, new TenantScopeService(), {
    record: async () => undefined,
  } as unknown as AuditService);

  const result = await service.create(
    {
      id: 'admin-id',
      organizationId: 'org-id',
      roleId: null,
      sessionId: 'session-id',
    },
    {
      email: publicUser.email,
      firstName: publicUser.firstName,
      lastName: publicUser.lastName,
      temporaryPassword: 'temporary-password-123',
    },
    {},
  );

  assert.notEqual(persistedPasswordHash, 'temporary-password-123');
  assert.equal('passwordHash' in result.user, false);
  assert.equal(result.user.organizationId, 'org-id');
});
