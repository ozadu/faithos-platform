import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { PermissionsController } from './permissions.controller';
import { PermissionsService } from './permissions.service';

@Module({
  controllers: [PermissionsController],
  imports: [AuthModule],
  providers: [PermissionsService],
})
export class PermissionsModule {}
