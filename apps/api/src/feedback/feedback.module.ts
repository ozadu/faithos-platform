import { Module } from '@nestjs/common';

import { AdminModule } from '../admin/admin.module';
import { AuthModule } from '../auth/auth.module';
import { FeedbackController } from './feedback.controller';

@Module({
  controllers: [FeedbackController],
  imports: [AdminModule, AuthModule],
})
export class FeedbackModule {}
