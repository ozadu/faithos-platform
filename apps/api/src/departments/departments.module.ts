import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { DepartmentsController } from './departments.controller';
import { DepartmentsService } from './departments.service';

@Module({
  controllers: [DepartmentsController],
  imports: [AuthModule],
  providers: [DepartmentsService],
})
export class DepartmentsModule {}
