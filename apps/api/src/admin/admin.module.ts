import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { EmailModule } from '../email/email.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  controllers: [AdminController],
  exports: [AdminService],
  imports: [AuthModule, EmailModule],
  providers: [AdminService],
})
export class AdminModule {}
