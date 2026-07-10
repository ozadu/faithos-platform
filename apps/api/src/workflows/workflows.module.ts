import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { EmailModule } from '../email/email.module';
import { WorkflowsController } from './workflows.controller';
import { WorkflowsService } from './workflows.service';

@Module({
  controllers: [WorkflowsController],
  exports: [WorkflowsService],
  imports: [AuthModule, EmailModule],
  providers: [WorkflowsService],
})
export class WorkflowsModule {}
