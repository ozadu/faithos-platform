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
    this.validateProductionEnvironment();
  }

  get nodeEnv(): string {
    return process.env.NODE_ENV ?? 'development';
  }

  get isProductionLike(): boolean {
    return ['production', 'staging', 'pilot'].includes(
      this.nodeEnv.toLowerCase(),
    );
  }

  get enableDemoSeed(): boolean {
    const value = process.env.ENABLE_DEMO_SEED;
    if (value) return value.toLowerCase() === 'true';
    return !this.isProductionLike;
  }

  get emailNotificationsEnabled(): boolean {
    return process.env.EMAIL_NOTIFICATIONS_ENABLED?.toLowerCase() !== 'false';
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

  safeSummary(): Record<string, string | boolean | number> {
    return {
      accessTokenTtlSeconds: this.accessTokenTtlSeconds,
      demoSeedEnabled: this.enableDemoSeed,
      emailNotificationsEnabled: this.emailNotificationsEnabled,
      nodeEnv: this.nodeEnv,
      productionLike: this.isProductionLike,
      refreshTokenTtlSeconds: this.refreshTokenTtlSeconds,
    };
  }

  private validateProductionEnvironment(): void {
    if (!this.isProductionLike) return;

    const required = [
      'DATABASE_URL',
      'REDIS_URL',
      'JWT_SECRET',
      'JWT_REFRESH_SECRET',
      'APP_URL',
      'NODE_ENV',
    ];
    if (this.emailNotificationsEnabled) {
      required.push('SMTP_HOST', 'SMTP_PORT');
    }
    const missing = required.filter((name) => !process.env[name]);
    if (missing.length > 0) {
      throw new Error(
        `Production configuration is incomplete. Missing: ${missing.join(', ')}`,
      );
    }
    const unsafeValues = [
      'replace-with-a-long-random-secret',
      'replace-with-a-different-long-random-secret',
      'development-secret',
      'demo-secret',
      'FaithOS-Demo-2026!',
    ];
    for (const [name, value] of [
      ['JWT_SECRET', this.jwtSecret],
      ['JWT_REFRESH_SECRET', this.jwtRefreshSecret],
    ] as const) {
      if (unsafeValues.includes(value) || /demo|replace-with/i.test(value)) {
        throw new Error(`${name} uses an unsafe default/demo value`);
      }
    }
    if (this.enableDemoSeed) {
      throw new Error(
        'ENABLE_DEMO_SEED must be false in production-like environments',
      );
    }
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
