import { Module } from '@nestjs/common';

import { AppController } from './app.controller';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { CommonModule } from './common/common.module';
import { EnvironmentModule } from './config/environment.module';
import { DatabaseModule } from './database/database.module';
import { DepartmentsModule } from './departments/departments.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { PermissionsModule } from './permissions/permissions.module';
import { RolesModule } from './roles/roles.module';
import { UsersModule } from './users/users.module';

@Module({
  controllers: [AppController],
  imports: [
    EnvironmentModule,
    DatabaseModule,
    CommonModule,
    AuditModule,
    AuthModule,
    OrganizationsModule,
    DepartmentsModule,
    UsersModule,
    RolesModule,
    PermissionsModule,
  ],
})
export class AppModule {}
