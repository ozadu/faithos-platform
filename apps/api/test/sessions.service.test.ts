import 'reflect-metadata';

import { JwtService } from '@nestjs/jwt';
import { hash } from 'argon2';
import assert from 'node:assert/strict';
import { it } from 'node:test';

import { EnvironmentService } from '../src/config/environment.service';
import { PrismaService } from '../src/database/prisma.service';
import { SessionsService } from '../src/sessions/sessions.service';

it('rotates a refresh token and revokes the old session', async () => {
  process.env.JWT_SECRET = 'test-access-secret-with-sufficient-length';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-with-sufficient-length';
  process.env.JWT_ACCESS_TTL_SECONDS = '900';
  process.env.JWT_REFRESH_TTL_SECONDS = '3600';

  const jwt = new JwtService();
  const oldRefreshToken = await jwt.signAsync(
    {
      organizationId: 'org-id',
      roleId: 'role-id',
      sessionId: 'old-session-id',
      sub: 'user-id',
      type: 'refresh',
    },
    { expiresIn: 3600, secret: process.env.JWT_REFRESH_SECRET },
  );
  let revoked = false;
  let created = false;
  const prisma = {
    session: {
      create: async () => {
        created = true;
      },
      findUnique: async () => ({
        expiresAt: new Date(Date.now() + 60_000),
        id: 'old-session-id',
        refreshTokenHash: await hash(oldRefreshToken),
        revokedAt: null,
        user: {
          deletedAt: null,
          id: 'user-id',
          organizationId: 'org-id',
          roleId: 'role-id',
          status: 'ACTIVE',
        },
      }),
      update: async () => {
        revoked = true;
      },
    },
  } as unknown as PrismaService;
  const service = new SessionsService(prisma, jwt, new EnvironmentService());

  const tokens = await service.rotate(oldRefreshToken, {});

  assert.equal(revoked, true);
  assert.equal(created, true);
  assert.notEqual(tokens.refreshToken, oldRefreshToken);
});
