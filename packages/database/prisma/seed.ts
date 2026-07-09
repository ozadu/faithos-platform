import {
  DocumentConfidentiality,
  DocumentPriority,
  DocumentRouteAction,
  DocumentStatus,
  DocumentTimelineAction,
  OrganizationStatus,
  PrismaClient,
  UserStatus,
  WorkflowConditionOperator,
  WorkflowHistoryAction,
  WorkflowInstanceStatus,
  WorkflowNotificationType,
  WorkflowTaskStatus,
} from '@prisma/client';
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
  ['documents.read', 'View documents and folders', 'documents'],
  ['documents.write', 'Create and update documents', 'documents'],
  [
    'documents.route',
    'Submit, receive, forward, and return documents',
    'documents',
  ],
  ['workflows.read', 'View workflows and workflow activity', 'workflows'],
  ['workflows.write', 'Manage workflow templates and assignments', 'workflows'],
  ['workflows.execute', 'Execute workflow approval tasks', 'workflows'],
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

  const departments = await Promise.all(
    [
      ['Executive Office', 'Leadership review and approvals'],
      ['Finance', 'Budgeting, procurement, and financial controls'],
      ['Operations', 'Internal operations and service delivery'],
      ['People', 'Human resources and staff administration'],
    ].map(([name, description]) =>
      prisma.department.upsert({
        create: { description, name, organizationId: organization.id },
        update: { description },
        where: {
          organizationId_name: {
            name,
            organizationId: organization.id,
          },
        },
      }),
    ),
  );
  const [
    executiveDepartment,
    financeDepartment,
    operationsDepartment,
    peopleDepartment,
  ] = departments;

  const adminUser = await prisma.user.upsert({
    create: {
      departmentId: executiveDepartment.id,
      email: DEMO_EMAIL,
      firstName: 'Demo',
      lastName: 'Administrator',
      organizationId: organization.id,
      passwordHash: await hash(DEMO_PASSWORD),
      roleId: organizationAdministrator.id,
      status: UserStatus.ACTIVE,
    },
    update: {
      departmentId: executiveDepartment.id,
      organizationId: organization.id,
      roleId: organizationAdministrator.id,
      status: UserStatus.ACTIVE,
    },
    where: { email: DEMO_EMAIL },
  });

  const sampleUsers = await Promise.all(
    [
      [
        'finance.lead@demo.faithos.local',
        'Finance',
        'Lead',
        financeDepartment.id,
      ],
      [
        'ops.manager@demo.faithos.local',
        'Operations',
        'Manager',
        operationsDepartment.id,
      ],
      [
        'people.partner@demo.faithos.local',
        'People',
        'Partner',
        peopleDepartment.id,
      ],
    ].map(async ([email, firstName, lastName, departmentId]) =>
      prisma.user.upsert({
        create: {
          departmentId,
          email,
          firstName,
          lastName,
          organizationId: organization.id,
          passwordHash: await hash(DEMO_PASSWORD),
          roleId: organizationAdministrator.id,
          status: UserStatus.ACTIVE,
        },
        update: {
          departmentId,
          organizationId: organization.id,
          roleId: organizationAdministrator.id,
          status: UserStatus.ACTIVE,
        },
        where: { email },
      }),
    ),
  );

  await seedDocuments({
    actorId: adminUser.id,
    departments: {
      executive: executiveDepartment.id,
      finance: financeDepartment.id,
      operations: operationsDepartment.id,
      people: peopleDepartment.id,
    },
    organizationId: organization.id,
    ownerId: adminUser.id,
  });

  await seedWorkflows({
    actorId: adminUser.id,
    departments: {
      executive: executiveDepartment.id,
      finance: financeDepartment.id,
      operations: operationsDepartment.id,
      people: peopleDepartment.id,
    },
    organizationId: organization.id,
    ownerId: adminUser.id,
    users: {
      admin: adminUser.id,
      financeLead: sampleUsers[0].id,
      operationsManager: sampleUsers[1].id,
      peoplePartner: sampleUsers[2].id,
    },
  });

  console.log(`Seeded demo user ${DEMO_EMAIL}`);
  console.log(
    `Seeded ${departments.length} departments, ${sampleUsers.length + 1} users, DocRoute documents, and workflow examples`,
  );
}

async function seedDocuments({
  actorId,
  departments,
  organizationId,
  ownerId,
}: {
  actorId: string;
  departments: {
    executive: string;
    finance: string;
    operations: string;
    people: string;
  };
  organizationId: string;
  ownerId: string;
}): Promise<void> {
  const samples = [
    [
      'DOC-2026-000001',
      'Procurement policy review',
      'Finance',
      DocumentStatus.DRAFT,
      departments.finance,
    ],
    [
      'DOC-2026-000002',
      'Facility maintenance request',
      'Operations',
      DocumentStatus.SUBMITTED,
      departments.operations,
    ],
    [
      'DOC-2026-000003',
      'Q3 budget approval',
      'Finance',
      DocumentStatus.FORWARDED,
      departments.finance,
    ],
    [
      'DOC-2026-000004',
      'Staff onboarding checklist',
      'People',
      DocumentStatus.IN_REVIEW,
      departments.people,
    ],
    [
      'DOC-2026-000005',
      'Vendor assessment memo',
      'Operations',
      DocumentStatus.RETURNED,
      departments.operations,
    ],
    [
      'DOC-2026-000006',
      'Leadership briefing note',
      'Executive',
      DocumentStatus.ARCHIVED,
      departments.executive,
    ],
    [
      'DOC-2026-000007',
      'Travel reimbursement update',
      'Finance',
      DocumentStatus.SUBMITTED,
      departments.finance,
    ],
    [
      'DOC-2026-000008',
      'Security desk handover',
      'Operations',
      DocumentStatus.FORWARDED,
      departments.operations,
    ],
    [
      'DOC-2026-000009',
      'Training calendar approval',
      'People',
      DocumentStatus.IN_REVIEW,
      departments.people,
    ],
    [
      'DOC-2026-000010',
      'Interdepartmental service memo',
      'Executive',
      DocumentStatus.DRAFT,
      departments.executive,
    ],
  ] as const;

  for (const [
    referenceNumber,
    title,
    category,
    status,
    senderDepartmentId,
  ] of samples) {
    const existing = await prisma.document.findUnique({
      where: { referenceNumber },
    });
    if (existing) continue;

    const currentDepartmentId =
      status === DocumentStatus.FORWARDED || status === DocumentStatus.IN_REVIEW
        ? departments.executive
        : senderDepartmentId;

    const document = await prisma.document.create({
      data: {
        body: `Seeded DocRoute sample for ${title}.`,
        category,
        confidentiality: DocumentConfidentiality.INTERNAL,
        currentDepartmentId,
        ownerUserId: ownerId,
        organizationId,
        priority:
          status === DocumentStatus.FORWARDED
            ? DocumentPriority.HIGH
            : DocumentPriority.NORMAL,
        referenceNumber,
        senderDepartmentId,
        status,
        subject: title,
        title,
        createdBy: actorId,
        updatedBy: actorId,
      },
    });

    await prisma.documentTimelineEvent.create({
      data: {
        action: DocumentTimelineAction.CREATED,
        actorUserId: actorId,
        documentId: document.id,
        organizationId,
        toDepartmentId: senderDepartmentId,
      },
    });

    if (status !== DocumentStatus.DRAFT) {
      await prisma.documentRoute.create({
        data: {
          action: DocumentRouteAction.SUBMITTED,
          documentId: document.id,
          fromDepartmentId: senderDepartmentId,
          isRead: true,
          organizationId,
          receivedAt: new Date(),
          routedBy: actorId,
          toDepartmentId: senderDepartmentId,
        },
      });
      await prisma.documentTimelineEvent.create({
        data: {
          action: DocumentTimelineAction.SUBMITTED,
          actorUserId: actorId,
          documentId: document.id,
          fromDepartmentId: senderDepartmentId,
          organizationId,
          toDepartmentId: senderDepartmentId,
        },
      });
    }

    if (
      status === DocumentStatus.FORWARDED ||
      status === DocumentStatus.IN_REVIEW
    ) {
      await prisma.documentRoute.create({
        data: {
          action: DocumentRouteAction.FORWARDED,
          documentId: document.id,
          fromDepartmentId: senderDepartmentId,
          organizationId,
          routedBy: actorId,
          toDepartmentId: departments.executive,
        },
      });
      await prisma.documentTimelineEvent.create({
        data: {
          action: DocumentTimelineAction.FORWARDED,
          actorUserId: actorId,
          documentId: document.id,
          fromDepartmentId: senderDepartmentId,
          organizationId,
          toDepartmentId: departments.executive,
        },
      });
    }

    if (status === DocumentStatus.IN_REVIEW) {
      await prisma.documentRoute.updateMany({
        data: { isRead: true, receivedAt: new Date() },
        where: {
          documentId: document.id,
          toDepartmentId: departments.executive,
        },
      });
      await prisma.documentTimelineEvent.create({
        data: {
          action: DocumentTimelineAction.RECEIVED,
          actorUserId: actorId,
          documentId: document.id,
          organizationId,
          toDepartmentId: departments.executive,
        },
      });
    }

    if (status === DocumentStatus.RETURNED) {
      await prisma.documentRoute.create({
        data: {
          action: DocumentRouteAction.RETURNED,
          documentId: document.id,
          fromDepartmentId: departments.executive,
          organizationId,
          routedBy: actorId,
          toDepartmentId: senderDepartmentId,
        },
      });
      await prisma.documentTimelineEvent.create({
        data: {
          action: DocumentTimelineAction.RETURNED,
          actorUserId: actorId,
          documentId: document.id,
          fromDepartmentId: departments.executive,
          organizationId,
          toDepartmentId: senderDepartmentId,
        },
      });
    }

    if (status === DocumentStatus.ARCHIVED) {
      await prisma.documentTimelineEvent.create({
        data: {
          action: DocumentTimelineAction.ARCHIVED,
          actorUserId: actorId,
          documentId: document.id,
          fromDepartmentId: senderDepartmentId,
          organizationId,
        },
      });
    }
  }
}

async function seedWorkflows({
  actorId,
  departments,
  organizationId,
  ownerId,
  users,
}: {
  actorId: string;
  departments: {
    executive: string;
    finance: string;
    operations: string;
    people: string;
  };
  organizationId: string;
  ownerId: string;
  users: {
    admin: string;
    financeLead: string;
    operationsManager: string;
    peoplePartner: string;
  };
}): Promise<void> {
  const purchaseWorkflow = await ensureWorkflow({
    description:
      'Conditional purchase approvals. Finance handles smaller requests; Executive Office handles larger approvals.',
    name: 'Purchase Request Approval',
    organizationId,
    steps: [
      {
        conditionField: 'purchaseAmount',
        conditionOperator: WorkflowConditionOperator.LT,
        conditionValue: '500000',
        departmentId: departments.finance,
        dueDays: 2,
        escalationDays: 1,
        sequence: 1,
      },
      {
        canForward: true,
        conditionField: 'purchaseAmount',
        conditionOperator: WorkflowConditionOperator.GTE,
        conditionValue: '500000',
        departmentId: departments.executive,
        dueDays: 3,
        escalationDays: 1,
        sequence: 2,
      },
    ],
  });

  const memoWorkflow = await ensureWorkflow({
    description: 'Memo review across operations and executive leadership.',
    name: 'Memo Review',
    organizationId,
    steps: [
      {
        departmentId: departments.operations,
        dueDays: 2,
        escalationDays: 1,
        sequence: 1,
      },
      {
        departmentId: departments.executive,
        dueDays: 2,
        escalationDays: 1,
        sequence: 2,
      },
    ],
  });

  const leaveWorkflow = await ensureWorkflow({
    description: 'People team review followed by executive approval.',
    name: 'Leave Request Approval',
    organizationId,
    steps: [
      {
        departmentId: departments.people,
        dueDays: 1,
        escalationDays: 1,
        sequence: 1,
      },
      {
        departmentId: departments.executive,
        dueDays: 2,
        escalationDays: 1,
        sequence: 2,
      },
    ],
  });

  for (const [documentType, workflowId] of [
    ['Memo', memoWorkflow.id],
    ['Purchase Request', purchaseWorkflow.id],
    ['Leave Request', leaveWorkflow.id],
    ['Circular', memoWorkflow.id],
    ['Asset Request', purchaseWorkflow.id],
    ['Travel Request', memoWorkflow.id],
  ] as const) {
    await prisma.workflowAssignment.upsert({
      create: {
        active: true,
        documentType,
        organizationId,
        workflowId,
      },
      update: { active: true, workflowId },
      where: {
        organizationId_documentType: {
          documentType,
          organizationId,
        },
      },
    });
  }

  await prisma.workflowDelegation.upsert({
    create: {
      active: true,
      endsAt: new Date('2026-12-31T23:59:59.000Z'),
      fromUserId: users.financeLead,
      organizationId,
      reason: 'Demo leave coverage for workflow delegation testing.',
      startsAt: new Date('2026-07-01T00:00:00.000Z'),
      toUserId: users.operationsManager,
    },
    update: {
      active: true,
      endsAt: new Date('2026-12-31T23:59:59.000Z'),
      startsAt: new Date('2026-07-01T00:00:00.000Z'),
      toUserId: users.operationsManager,
    },
    where: {
      id: await findOrCreateDelegationId({
        fromUserId: users.financeLead,
        organizationId,
      }),
    },
  });

  const pendingDocument = await ensureWorkflowDocument({
    actorId,
    category: 'Purchase Request',
    currentDepartmentId: departments.executive,
    organizationId,
    ownerId,
    referenceNumber: 'DOC-2026-000011',
    senderDepartmentId: departments.finance,
    title: 'Generator procurement request',
  });

  const activeVersion = await prisma.workflowVersion.findFirstOrThrow({
    orderBy: { version: 'desc' },
    where: { active: true, workflowId: purchaseWorkflow.id },
  });
  const executiveStep = await prisma.workflowStep.findFirstOrThrow({
    orderBy: { sequence: 'asc' },
    where: {
      conditionOperator: WorkflowConditionOperator.GTE,
      workflowVersionId: activeVersion.id,
    },
  });

  const existingInstance = await prisma.workflowInstance.findFirst({
    where: {
      documentId: pendingDocument.id,
      organizationId,
      status: WorkflowInstanceStatus.IN_PROGRESS,
    },
  });
  if (!existingInstance) {
    const instance = await prisma.workflowInstance.create({
      data: {
        currentStepId: executiveStep.id,
        documentId: pendingDocument.id,
        metadata: { purchaseAmount: 750000 },
        organizationId,
        startedBy: actorId,
        workflowId: purchaseWorkflow.id,
        workflowVersionId: activeVersion.id,
      },
    });
    await prisma.workflowTask.create({
      data: {
        assignedDepartmentId: departments.executive,
        assignedUserId: users.admin,
        documentId: pendingDocument.id,
        dueAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        organizationId,
        reminderAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        status: WorkflowTaskStatus.PENDING,
        stepId: executiveStep.id,
        workflowInstanceId: instance.id,
      },
    });
    await prisma.workflowHistoryEvent.create({
      data: {
        action: WorkflowHistoryAction.STARTED,
        actorDepartmentId: departments.finance,
        actorUserId: actorId,
        comments: 'Seeded purchase request entered the approval workflow.',
        documentId: pendingDocument.id,
        nextStepId: executiveStep.id,
        organizationId,
        workflowInstanceId: instance.id,
      },
    });
    await prisma.workflowNotification.create({
      data: {
        departmentId: departments.executive,
        documentId: pendingDocument.id,
        message: 'Generator procurement request requires approval.',
        organizationId,
        title: 'Workflow approval required',
        type: WorkflowNotificationType.APPROVAL_REQUIRED,
        userId: users.admin,
        workflowInstanceId: instance.id,
      },
    });
  }
}

async function ensureWorkflow({
  description,
  name,
  organizationId,
  steps,
}: {
  description: string;
  name: string;
  organizationId: string;
  steps: Array<{
    canForward?: boolean;
    conditionField?: string;
    conditionOperator?: WorkflowConditionOperator;
    conditionValue?: string;
    departmentId: string;
    dueDays: number;
    escalationDays: number;
    sequence: number;
  }>;
}) {
  const workflow = await prisma.workflow.upsert({
    create: {
      active: true,
      description,
      name,
      organizationId,
      version: 1,
    },
    update: { active: true, description },
    where: {
      organizationId_name: {
        name,
        organizationId,
      },
    },
  });

  const version = await prisma.workflowVersion.upsert({
    create: {
      active: true,
      description: 'Seeded workflow version',
      version: 1,
      workflowId: workflow.id,
    },
    update: { active: true, description: 'Seeded workflow version' },
    where: {
      workflowId_version: {
        version: 1,
        workflowId: workflow.id,
      },
    },
  });

  for (const step of steps) {
    const existing = await prisma.workflowStep.findFirst({
      where: {
        sequence: step.sequence,
        workflowId: workflow.id,
        workflowVersionId: version.id,
      },
    });
    const data = {
      approvalRequired: true,
      canForward: step.canForward ?? false,
      canReturn: true,
      conditionField: step.conditionField,
      conditionOperator: step.conditionOperator,
      conditionValue: step.conditionValue,
      departmentId: step.departmentId,
      dueDays: step.dueDays,
      escalationDays: step.escalationDays,
      notifyEmail: false,
      notifyInApp: true,
      sequence: step.sequence,
      workflowId: workflow.id,
      workflowVersionId: version.id,
    };

    if (existing) {
      await prisma.workflowStep.update({ data, where: { id: existing.id } });
    } else {
      await prisma.workflowStep.create({ data });
    }
  }

  return workflow;
}

async function findOrCreateDelegationId({
  fromUserId,
  organizationId,
}: {
  fromUserId: string;
  organizationId: string;
}) {
  const existing = await prisma.workflowDelegation.findFirst({
    select: { id: true },
    where: { fromUserId, organizationId },
  });

  return existing?.id ?? '00000000-0000-0000-0000-000000000001';
}

async function ensureWorkflowDocument({
  actorId,
  category,
  currentDepartmentId,
  organizationId,
  ownerId,
  referenceNumber,
  senderDepartmentId,
  title,
}: {
  actorId: string;
  category: string;
  currentDepartmentId: string;
  organizationId: string;
  ownerId: string;
  referenceNumber: string;
  senderDepartmentId: string;
  title: string;
}) {
  const existing = await prisma.document.findUnique({
    where: { referenceNumber },
  });
  if (existing) return existing;

  const document = await prisma.document.create({
    data: {
      body: `Seeded workflow sample for ${title}.`,
      category,
      confidentiality: DocumentConfidentiality.INTERNAL,
      currentDepartmentId,
      ownerUserId: ownerId,
      organizationId,
      priority: DocumentPriority.HIGH,
      referenceNumber,
      senderDepartmentId,
      status: DocumentStatus.IN_REVIEW,
      subject: title,
      title,
      createdBy: actorId,
      updatedBy: actorId,
    },
  });
  await prisma.documentTimelineEvent.create({
    data: {
      action: DocumentTimelineAction.SUBMITTED,
      actorUserId: actorId,
      documentId: document.id,
      fromDepartmentId: senderDepartmentId,
      organizationId,
      toDepartmentId: currentDepartmentId,
    },
  });

  return document;
}

void main()
  .then(() => prisma.$disconnect())
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exitCode = 1;
  });
