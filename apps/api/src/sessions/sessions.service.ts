import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { hash, verify } from 'argon2';
import { randomUUID } from 'node:crypto';

import { RequestMetadata } from '../common/request-metadata.decorator';
import { EnvironmentService } from '../config/environment.service';
import { PrismaService } from '../database/prisma.service';
import { JwtPayload } from '../auth/jwt-payload';

interface SessionPrincipal {
  id: string;
  organizationId: string;
  roleId: string | null;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class SessionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly environment: EnvironmentService,
  ) {}

  async issue(
    user: SessionPrincipal,
    metadata: RequestMetadata,
  ): Promise<TokenPair> {
    const sessionId = randomUUID();
    const basePayload = {
      organizationId: user.organizationId,
      roleId: user.roleId,
      sessionId,
      sub: user.id,
    };
    const accessToken = await this.jwt.signAsync(
      { ...basePayload, type: 'access' satisfies JwtPayload['type'] },
      {
        expiresIn: this.environment.accessTokenTtlSeconds,
        secret: this.environment.jwtSecret,
      },
    );
    const refreshToken = await this.jwt.signAsync(
      { ...basePayload, type: 'refresh' satisfies JwtPayload['type'] },
      {
        expiresIn: this.environment.refreshTokenTtlSeconds,
        secret: this.environment.jwtRefreshSecret,
      },
    );

    await this.prisma.session.create({
      data: {
        expiresAt: new Date(
          Date.now() + this.environment.refreshTokenTtlSeconds * 1000,
        ),
        id: sessionId,
        organizationId: user.organizationId,
        refreshTokenHash: await hash(refreshToken),
        userId: user.id,
        ...(metadata.ipAddress ? { ipAddress: metadata.ipAddress } : {}),
        ...(metadata.userAgent ? { userAgent: metadata.userAgent } : {}),
      },
    });

    return { accessToken, refreshToken };
  }

  async rotate(
    refreshToken: string,
    metadata: RequestMetadata,
  ): Promise<TokenPair> {
    const payload = await this.verifyRefreshToken(refreshToken);
    const session = await this.prisma.session.findUnique({
      include: { user: true },
      where: { id: payload.sessionId },
    });

    if (
      !session ||
      session.revokedAt ||
      session.expiresAt <= new Date() ||
      session.user.deletedAt ||
      session.user.status !== 'ACTIVE' ||
      !(await verify(session.refreshTokenHash, refreshToken))
    ) {
      throw new UnauthorizedException('Refresh token is invalid or expired');
    }

    await this.prisma.session.update({
      data: { revokedAt: new Date() },
      where: { id: session.id },
    });

    return this.issue(session.user, metadata);
  }

  async revoke(refreshToken: string): Promise<SessionPrincipal> {
    const payload = await this.verifyRefreshToken(refreshToken);
    const session = await this.prisma.session.findUnique({
      include: { user: true },
      where: { id: payload.sessionId },
    });

    if (!session || !(await verify(session.refreshTokenHash, refreshToken))) {
      throw new UnauthorizedException('Refresh token is invalid');
    }

    if (!session.revokedAt) {
      await this.prisma.session.update({
        data: { revokedAt: new Date() },
        where: { id: session.id },
      });
    }

    return session.user;
  }

  private async verifyRefreshToken(token: string): Promise<JwtPayload> {
    try {
      const payload = await this.jwt.verifyAsync<JwtPayload>(token, {
        secret: this.environment.jwtRefreshSecret,
      });

      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid refresh token');
      }

      return payload;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException('Refresh token is invalid or expired');
    }
  }
}
