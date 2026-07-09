import { Global, Module } from '@nestjs/common';

import { TenantScopeService } from './tenant-scope.service';

@Global()
@Module({
  exports: [TenantScopeService],
  providers: [TenantScopeService],
})
export class CommonModule {}
