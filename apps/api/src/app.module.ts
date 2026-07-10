import { Module } from '@nestjs/common';

import { AppController } from './app.controller';
import { AdminModule } from './admin/admin.module';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { CommonModule } from './common/common.module';
import { EnvironmentModule } from './config/environment.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { DatabaseModule } from './database/database.module';
import { DepartmentsModule } from './departments/departments.module';
import { DocumentsModule } from './documents/documents.module';
import { EmailModule } from './email/email.module';
import { NotificationsModule } from './notifications/notifications.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { PermissionsModule } from './permissions/permissions.module';
import { ReportsModule } from './reports/reports.module';
import { RolesModule } from './roles/roles.module';
import { UsersModule } from './users/users.module';
import { WorkflowsModule } from './workflows/workflows.module';

@Module({
  controllers: [AppController],
  imports: [
    EnvironmentModule,
    DatabaseModule,
    EmailModule,
    CommonModule,
    AuditModule,
    AuthModule,
    AdminModule,
    OrganizationsModule,
    DepartmentsModule,
    UsersModule,
    RolesModule,
    PermissionsModule,
    ReportsModule,
    NotificationsModule,
    DashboardModule,
    DocumentsModule,
    WorkflowsModule,
  ],
})
export class AppModule {}
