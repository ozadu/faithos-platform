import { Injectable, UnauthorizedException } from '@nestjs/common';
import { verify } from 'argon2';

import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../common/authenticated-user';
import { RequestMetadata } from '../common/request-metadata.decorator';
import { PrismaService } from '../database/prisma.service';
import { SessionsService, TokenPair } from '../sessions/sessions.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessions: SessionsService,
    private readonly audit: AuditService,
  ) {}

  async login(credentials: LoginDto, metadata: RequestMetadata) {
    const user = await this.prisma.user.findUnique({
      include: { organization: true, role: true },
      where: { email: credentials.email.toLowerCase() },
    });

    if (
      !user ||
      user.deletedAt ||
      user.status !== 'ACTIVE' ||
      user.organization.status !== 'ACTIVE' ||
      !(await this.validatePassword(user.passwordHash, credentials.password))
    ) {
      throw new UnauthorizedException('Email or password is incorrect');
    }

    const tokens = await this.sessions.issue(user, metadata);
    await this.prisma.user.update({
      data: { lastLoginAt: new Date() },
      where: { id: user.id },
    });
    await this.audit.record({
      action: 'auth.login.success',
      entityId: user.id,
      entityType: 'User',
      organizationId: user.organizationId,
      userId: user.id,
      ...metadata,
    });

    return {
      ...tokens,
      organization: user.organization,
      user: this.toPublicUser(user),
    };
  }

  async refresh(
    refreshToken: string,
    metadata: RequestMetadata,
  ): Promise<TokenPair> {
    return this.sessions.rotate(refreshToken, metadata);
  }

  async logout(refreshToken: string, metadata: RequestMetadata): Promise<void> {
    const user = await this.sessions.revoke(refreshToken);
    await this.audit.record({
      action: 'auth.logout',
      entityId: user.id,
      entityType: 'Session',
      organizationId: user.organizationId,
      userId: user.id,
      ...metadata,
    });
  }

  async me(principal: AuthenticatedUser) {
    const user = await this.prisma.user.findFirst({
      include: { organization: true, role: true },
      where: {
        deletedAt: null,
        id: principal.id,
        organizationId: principal.organizationId,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Authenticated user no longer exists');
    }

    return {
      organization: user.organization,
      user: this.toPublicUser(user),
    };
  }

  async validatePassword(hash: string, password: string): Promise<boolean> {
    try {
      return await verify(hash, password);
    } catch {
      return false;
    }
  }

  private toPublicUser<T extends { passwordHash: string }>(
    user: T,
  ): Omit<T, 'passwordHash'> {
    const { passwordHash, ...publicUser } = user;
    void passwordHash;
    return publicUser;
  }
}
