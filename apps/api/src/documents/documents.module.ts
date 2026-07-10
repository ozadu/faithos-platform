import { Module } from '@nestjs/common';

import { AttachmentsController } from '../attachments/attachments.controller';
import { AttachmentsService } from '../attachments/attachments.service';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';
import { CommonModule } from '../common/common.module';
import { DatabaseModule } from '../database/database.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { WorkflowsModule } from '../workflows/workflows.module';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';

@Module({
  controllers: [DocumentsController, AttachmentsController],
  exports: [DocumentsService],
  imports: [
    DatabaseModule,
    CommonModule,
    AuditModule,
    AuthModule,
    WorkflowsModule,
    NotificationsModule,
  ],
  providers: [DocumentsService, AttachmentsService],
})
export class DocumentsModule {}
