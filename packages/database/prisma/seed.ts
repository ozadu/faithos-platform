import { OrganizationStatus, PrismaClient, UserStatus } from '@prisma/client';
import { hash } from 'argon2';

const prisma = new PrismaClient();

const DEMO_EMAIL = 'admin@demo.faithos.local';
const DEMO_PASSWORD = 'FaithOS-Demo-2026!';

const permissions = [
  ['organizations.read', 'View organization', 'organizations'],
  ['organizations.write', 'Update organization', 'organizations'],
  ['departments.read', 'View departments', 'departments'],
  ['departments.write', 'Manage departments', 'departments'],
  ['users.read', 'View users', 'users'],
  ['users.write', 'Manage users', 'users'],
  ['roles.read', 'View roles and permissions', 'roles'],
  ['roles.write', 'Manage role permissions', 'roles'],
  ['audit.read', 'View audit history', 'audit'],
] as const;

async function upsertSystemRole(
  name: string,
  description: string,
): Promise<{ id: string }> {
  const existing = await prisma.role.findFirst({
    where: { isSystem: true, name, organizationId: null },
  });

  if (existing) {
    return prisma.role.update({
      data: { description },
      where: { id: existing.id },
    });
  }

  return prisma.role.create({
    data: { description, isSystem: true, name },
  });
}

async function main(): Promise<void> {
  const organization = await prisma.organization.upsert({
    create: {
      country: 'NG',
      email: 'hello@demo.faithos.local',
      name: 'FaithOS Demo Organization',
      slug: 'faithos-demo',
      status: OrganizationStatus.ACTIVE,
      timezone: 'Africa/Lagos',
    },
    update: {},
    where: { slug: 'faithos-demo' },
  });

  const permissionRecords = await Promise.all(
    permissions.map(([code, displayName, module]) =>
      prisma.permission.upsert({
        create: { code, displayName, module },
        update: { displayName, module },
        where: { code },
      }),
    ),
  );

  const systemAdministrator = await upsertSystemRole(
    'System Administrator',
    'Full access to the FaithOS identity foundation.',
  );
  await upsertSystemRole(
    'Organization Administrator',
    'Administrative access within an organization.',
  );
  await upsertSystemRole(
    'Standard User',
    'Baseline authenticated user access.',
  );

  await prisma.rolePermission.createMany({
    data: permissionRecords.map((permission) => ({
      permissionId: permission.id,
      roleId: systemAdministrator.id,
    })),
    skipDuplicates: true,
  });

  const organizationAdministrator = await prisma.role.upsert({
    create: {
      description: 'Full identity administration within the demo organization.',
      isSystem: false,
      name: 'Organization Administrator',
      organizationId: organization.id,
    },
    update: {},
    where: {
      organizationId_name: {
        name: 'Organization Administrator',
        organizationId: organization.id,
      },
    },
  });
  await prisma.rolePermission.createMany({
    data: permissionRecords.map((permission) => ({
      permissionId: permission.id,
      roleId: organizationAdministrator.id,
    })),
    skipDuplicates: true,
  });

  await prisma.user.upsert({
    create: {
      email: DEMO_EMAIL,
      firstName: 'Demo',
      lastName: 'Administrator',
      organizationId: organization.id,
      passwordHash: await hash(DEMO_PASSWORD),
      roleId: organizationAdministrator.id,
      status: UserStatus.ACTIVE,
    },
    update: {
      organizationId: organization.id,
      roleId: organizationAdministrator.id,
      status: UserStatus.ACTIVE,
    },
    where: { email: DEMO_EMAIL },
  });

  console.log(`Seeded demo user ${DEMO_EMAIL}`);
}

void main()
  .then(() => prisma.$disconnect())
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exitCode = 1;
  });
