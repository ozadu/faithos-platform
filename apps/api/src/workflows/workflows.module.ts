import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { WorkflowsController } from './workflows.controller';
import { WorkflowsService } from './workflows.service';

@Module({
  controllers: [WorkflowsController],
  exports: [WorkflowsService],
  imports: [AuthModule],
  providers: [WorkflowsService],
})
export class WorkflowsModule {}
