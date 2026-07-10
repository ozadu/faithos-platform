import {
  BadRequestException,
  Injectable,
  Optional,
  UnauthorizedException,
} from '@nestjs/common';
import { hash, verify } from 'argon2';
import { randomBytes } from 'node:crypto';

import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../common/authenticated-user';
import { RequestMetadata } from '../common/request-metadata.decorator';
import { PrismaService } from '../database/prisma.service';
import { EmailService } from '../email/email.service';
import { SessionsService, TokenPair } from '../sessions/sessions.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessions: SessionsService,
    private readonly audit: AuditService,
    @Optional() private readonly email?: EmailService,
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

  async forgotPassword(email: string, metadata: RequestMetadata) {
    const normalizedEmail = email.toLowerCase();
    const user = await this.prisma.user.findUnique({
      include: { organization: true },
      where: { email: normalizedEmail },
    });

    if (
      !user ||
      user.deletedAt ||
      user.status !== 'ACTIVE' ||
      user.organization.status !== 'ACTIVE'
    ) {
      return { emailSent: false, mailpitOnly: true };
    }

    const token = randomBytes(32).toString('base64url');
    await this.prisma.passwordResetToken.create({
      data: {
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        organizationId: user.organizationId,
        tokenHash: await hash(token),
        userId: user.id,
      },
    });

    const resetUrl = `${process.env.WEB_URL ?? 'http://localhost:3000'}/reset-password?token=${encodeURIComponent(token)}`;
    const delivery = await this.email?.send({
      subject: '[FaithOS] Password reset instructions',
      text: [
        'A FaithOS password reset was requested for your account.',
        '',
        'Open this link within 60 minutes:',
        resetUrl,
        '',
        'Development email uses Mailpit only. If you did not request this, ignore this message.',
      ].join('\n'),
      to: user.email,
    });

    await this.audit.record({
      action: 'auth.password_reset.requested',
      entityId: user.id,
      entityType: 'User',
      newValues: { emailSent: delivery?.skipped === false },
      organizationId: user.organizationId,
      userId: user.id,
      ...metadata,
    });

    return { emailSent: delivery?.skipped === false, mailpitOnly: true };
  }

  async resetPassword(
    token: string,
    password: string,
    metadata: RequestMetadata,
  ) {
    const candidates = await this.prisma.passwordResetToken.findMany({
      include: { user: true },
      orderBy: { createdAt: 'desc' },
      take: 25,
      where: {
        expiresAt: { gt: new Date() },
        usedAt: null,
      },
    });
    const resetToken = await this.findMatchingResetToken(candidates, token);

    if (!resetToken || resetToken.user.deletedAt) {
      throw new BadRequestException('Reset link is invalid or expired');
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        data: { passwordHash: await hash(password), status: 'ACTIVE' },
        where: { id: resetToken.userId },
      }),
      this.prisma.passwordResetToken.update({
        data: { usedAt: new Date() },
        where: { id: resetToken.id },
      }),
      this.prisma.session.updateMany({
        data: { revokedAt: new Date() },
        where: { revokedAt: null, userId: resetToken.userId },
      }),
    ]);
    await this.audit.record({
      action: 'auth.password_reset.completed',
      entityId: resetToken.userId,
      entityType: 'User',
      organizationId: resetToken.organizationId,
      userId: resetToken.userId,
      ...metadata,
    });

    return { reset: true };
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

  private async findMatchingResetToken<T extends { tokenHash: string }>(
    candidates: T[],
    token: string,
  ): Promise<T | null> {
    for (const candidate of candidates) {
      if (await verify(candidate.tokenHash, token)) {
        return candidate;
      }
    }

    return null;
  }
}
