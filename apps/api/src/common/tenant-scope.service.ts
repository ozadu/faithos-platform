import { ForbiddenException, Injectable } from '@nestjs/common';

@Injectable()
export class TenantScopeService {
  where<T extends Record<string, unknown>>(
    organizationId: string,
    where: T,
  ): T & { organizationId: string } {
    return { ...where, organizationId };
  }

  assertOrganization(
    expectedOrganizationId: string,
    actualOrganizationId: string,
  ): void {
    if (expectedOrganizationId !== actualOrganizationId) {
      throw new ForbiddenException('Resource belongs to another organization');
    }
  }
}
