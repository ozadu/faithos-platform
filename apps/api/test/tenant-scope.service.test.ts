import { ForbiddenException } from '@nestjs/common';
import assert from 'node:assert/strict';
import { it } from 'node:test';

import { TenantScopeService } from '../src/common/tenant-scope.service';

it('adds organizationId to tenant queries and rejects cross-tenant access', () => {
  const tenant = new TenantScopeService();

  assert.deepEqual(tenant.where('org-a', { id: 'resource-id' }), {
    id: 'resource-id',
    organizationId: 'org-a',
  });
  assert.throws(
    () => tenant.assertOrganization('org-a', 'org-b'),
    ForbiddenException,
  );
});
