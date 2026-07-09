import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { SessionsService } from './sessions.service';

@Module({
  exports: [SessionsService],
  imports: [JwtModule.register({})],
  providers: [SessionsService],
})
export class SessionsModule {}
