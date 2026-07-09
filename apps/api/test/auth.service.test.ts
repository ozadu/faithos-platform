import 'reflect-metadata';

import { UnauthorizedException } from '@nestjs/common';
import { hash } from 'argon2';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { AuditService } from '../src/audit/audit.service';
import { AuthService } from '../src/auth/auth.service';
import { PrismaService } from '../src/database/prisma.service';
import { SessionsService } from '../src/sessions/sessions.service';

describe('AuthService', () => {
  it('validates an Argon2 password hash', async () => {
    const service = new AuthService(
      {} as PrismaService,
      {} as SessionsService,
      {} as AuditService,
    );
    const passwordHash = await hash('correct horse battery staple');

    assert.equal(
      await service.validatePassword(
        passwordHash,
        'correct horse battery staple',
      ),
      true,
    );
    assert.equal(
      await service.validatePassword(passwordHash, 'wrong password'),
      false,
    );
  });

  it('logs in an active user without exposing passwordHash', async () => {
    const passwordHash = await hash('FaithOS-Demo-2026!');
    const user = {
      createdAt: new Date(),
      deletedAt: null,
      departmentId: null,
      email: 'admin@demo.faithos.local',
      firstName: 'Demo',
      id: 'user-id',
      jobTitle: null,
      lastLoginAt: null,
      lastName: 'Administrator',
      organization: { id: 'org-id', status: 'ACTIVE' },
      organizationId: 'org-id',
      passwordHash,
      phone: null,
      role: null,
      roleId: null,
      status: 'ACTIVE',
      updatedAt: new Date(),
    };
    const prisma = {
      user: {
        findUnique: async () => user,
        update: async () => user,
      },
    } as unknown as PrismaService;
    const sessions = {
      issue: async () => ({ accessToken: 'access', refreshToken: 'refresh' }),
    } as unknown as SessionsService;
    const audit = { record: async () => undefined } as unknown as AuditService;
    const service = new AuthService(prisma, sessions, audit);

    const result = await service.login(
      { email: user.email, password: 'FaithOS-Demo-2026!' },
      {},
    );

    assert.equal(result.accessToken, 'access');
    assert.equal('passwordHash' in result.user, false);
  });

  it('rejects an invalid login', async () => {
    const prisma = {
      user: { findUnique: async () => null },
    } as unknown as PrismaService;
    const service = new AuthService(
      prisma,
      {} as SessionsService,
      {} as AuditService,
    );

    await assert.rejects(
      service.login(
        { email: 'missing@example.com', password: 'incorrect' },
        {},
      ),
      UnauthorizedException,
    );
  });
});
