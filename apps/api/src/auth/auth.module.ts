import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { EmailModule } from '../email/email.module';
import { SessionsModule } from '../sessions/sessions.module';
import { AuthController } from './auth.controller';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PermissionGuard } from './permission.guard';
import { AuthService } from './auth.service';

@Module({
  controllers: [AuthController],
  exports: [JwtModule, JwtAuthGuard, PermissionGuard],
  imports: [JwtModule.register({}), SessionsModule, EmailModule],
  providers: [AuthService, JwtAuthGuard, PermissionGuard],
})
export class AuthModule {}
