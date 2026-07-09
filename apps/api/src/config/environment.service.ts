import { Injectable, OnModuleInit } from '@nestjs/common';

@Injectable()
export class EnvironmentService implements OnModuleInit {
  onModuleInit(): void {
    const jwtSecret = this.jwtSecret;
    const jwtRefreshSecret = this.jwtRefreshSecret;

    if (jwtSecret.length < 32 || jwtRefreshSecret.length < 32) {
      throw new Error('JWT secrets must each contain at least 32 characters');
    }
    if (jwtSecret === jwtRefreshSecret) {
      throw new Error('JWT_SECRET and JWT_REFRESH_SECRET must be different');
    }

    void this.accessTokenTtlSeconds;
    void this.refreshTokenTtlSeconds;
  }

  get jwtSecret(): string {
    return this.required('JWT_SECRET');
  }

  get jwtRefreshSecret(): string {
    return this.required('JWT_REFRESH_SECRET');
  }

  get accessTokenTtlSeconds(): number {
    return this.positiveInteger('JWT_ACCESS_TTL_SECONDS', 900);
  }

  get refreshTokenTtlSeconds(): number {
    return this.positiveInteger('JWT_REFRESH_TTL_SECONDS', 604_800);
  }

  private required(name: string): string {
    const value = process.env[name];

    if (!value) {
      throw new Error(`${name} must be configured`);
    }

    return value;
  }

  private positiveInteger(name: string, fallback: number): number {
    const value = Number.parseInt(process.env[name] ?? String(fallback), 10);

    if (!Number.isInteger(value) || value <= 0) {
      throw new Error(`${name} must be a positive integer`);
    }

    return value;
  }
}
