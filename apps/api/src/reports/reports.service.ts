import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DocumentStatus,
  Prisma,
  WorkflowInstanceStatus,
  WorkflowTaskStatus,
} from '@faithos/database';

import { AuthenticatedUser } from '../common/authenticated-user';
import { PrismaService } from '../database/prisma.service';
import { toCsv } from './csv';
import { ReportQueryDto } from './dto/report-query.dto';

const activeTaskStatuses = [
  WorkflowTaskStatus.PENDING,
  WorkflowTaskStatus.RECEIVED,
  WorkflowTaskStatus.OVERDUE,
] satisfies WorkflowTaskStatus[];
const activeTaskStatusSet = new Set<WorkflowTaskStatus>(activeTaskStatuses);

type Scope =
  | { level: 'department'; departmentId: string }
  | { level: 'organization' }
  | { level: 'self'; userId: string };

type Pagination = { page: number; pageSize: number; total: number };
type Paginated<T> = { items: T[]; pagination: Pagination };

type UserLite = {
  email: string;
  firstName: string;
  id: string;
  lastName: string;
};

type DepartmentLite = {
  id: string;
  name: string;
};

type DocumentReportRow = {
  completedDate: Date | null;
  confidentiality: string;
  createdBy: UserLite | null;
  createdDate: Date;
  currentDepartment: DepartmentLite | null;
  currentWorkflowStatus: string | null;
  id: string;
  priority: string;
  referenceNumber: string;
  status: string;
  submittedDate: Date | null;
  title: string;
};

type WorkflowReportRow = {
  completedAt: Date | null;
  currentAssignee: UserLite | null;
  currentDepartment: DepartmentLite | null;
  currentStep: number | null;
  documentReference: string;
  documentTitle: string;
  id: string;
  isOverdue: boolean;
  slaStatus: 'ON_TRACK' | 'OVERDUE';
  startedAt: Date;
  status: string;
  totalDurationHours: number | null;
  workflowName: string;
};

type DepartmentReportRow = {
  averageTurnaroundHours: number;
  departmentId: string;
  departmentName: string;
  documentsCompleted: number;
  documentsReceived: number;
  documentsSent: number;
  overdueTasks: number;
  pendingTasks: number;
  recentActivity: Array<{
    action: string;
    createdAt: Date;
    documentReference: string | null;
  }>;
};

type UserActivityReportRow = {
  averageResponseHours: number;
  documentsCreated: number;
  lastActivityDate: Date | null;
  tasksApproved: number;
  tasksCompleted: number;
  tasksForwarded: number;
  tasksReceived: number;
  tasksRejected: number;
  tasksReturned: number;
  user: UserLite;
};

type OverdueReportRow = {
  assignedDepartment: DepartmentLite | null;
  assignedUser: UserLite | null;
  daysOverdue: number;
  documentReference: string;
  documentTitle: string;
  dueAt: Date;
  escalationStatus: 'ESCALATED' | 'PENDING';
  lastNotificationDate: Date | null;
  taskId: string;
};

type ActivityReportRow = {
  action: string;
  actor: UserLite | null;
  comment: string | null;
  department: DepartmentLite | null;
  entityReference: string | null;
  entityType: string;
  id: string;
  timestamp: Date;
};

type TurnaroundReportRow = {
  creationToSubmissionHours: number | null;
  documentReference: string;
  documentTitle: string;
  id: string;
  stepDurations: Array<{
    department: DepartmentLite | null;
    durationHours: number | null;
    sequence: number;
  }>;
  submissionToCompletionHours: number | null;
};

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(principal: AuthenticatedUser, query: ReportQueryDto) {
    const scope = await this.scope(principal);
    const documentWhere = this.documentWhere(principal, scope, query);
    const workflowWhere = this.workflowInstanceWhere(principal, scope, query);
    const taskWhere = this.workflowTaskWhere(principal, scope, query);
    const weekStart = this.weekStart();

    const [
      totalDocuments,
      documentsCreatedThisWeek,
      documentsSubmittedThisWeek,
      documentsCompletedThisWeek,
      documentsArchived,
      pendingDocuments,
      overdueWorkflows,
      completedWorkflows,
      completedInstances,
      completedTasks,
      mostActiveDepartments,
      mostActiveUsers,
      highPriorityPendingItems,
    ] = await Promise.all([
      this.prisma.document.count({ where: documentWhere }),
      this.prisma.document.count({
        where: { ...documentWhere, createdAt: { gte: weekStart } },
      }),
      this.prisma.documentTimelineEvent.count({
        where: {
          action: 'SUBMITTED',
          createdAt: { gte: weekStart },
          organizationId: principal.organizationId,
          document: documentWhere,
        },
      }),
      this.prisma.document.count({
        where: {
          ...documentWhere,
          status: { in: [DocumentStatus.APPROVED, DocumentStatus.ARCHIVED] },
          updatedAt: { gte: weekStart },
        },
      }),
      this.prisma.document.count({
        where: { ...documentWhere, status: DocumentStatus.ARCHIVED },
      }),
      this.prisma.document.count({
        where: {
          ...documentWhere,
          status: {
            in: [
              DocumentStatus.SUBMITTED,
              DocumentStatus.IN_REVIEW,
              DocumentStatus.FORWARDED,
              DocumentStatus.RETURNED,
            ],
          },
        },
      }),
      this.prisma.workflowTask.count({
        where: {
          ...taskWhere,
          dueAt: { lt: new Date() },
          status: { in: activeTaskStatuses },
        },
      }),
      this.prisma.workflowInstance.count({
        where: { ...workflowWhere, status: WorkflowInstanceStatus.COMPLETED },
      }),
      this.prisma.workflowInstance.findMany({
        select: { completedAt: true, createdAt: true },
        where: {
          ...workflowWhere,
          completedAt: { not: null },
          status: WorkflowInstanceStatus.COMPLETED,
        },
      }),
      this.prisma.workflowTask.findMany({
        select: { completedAt: true, createdAt: true },
        where: {
          ...taskWhere,
          completedAt: { not: null },
          status: {
            in: [
              WorkflowTaskStatus.APPROVED,
              WorkflowTaskStatus.COMPLETED,
              WorkflowTaskStatus.FORWARDED,
            ],
          },
        },
      }),
      this.mostActiveDepartments(principal, scope, query),
      this.mostActiveUsers(principal, scope, query),
      this.highPriorityPendingItems(principal, scope, query),
    ]);

    return {
      averageApprovalHours: this.averageDurationHours(completedTasks),
      averageWorkflowCompletionHours:
        this.averageDurationHours(completedInstances),
      completedWorkflows,
      documentsArchived,
      documentsCompletedThisWeek,
      documentsCreatedThisWeek,
      documentsSubmittedThisWeek,
      highPriorityPendingItems,
      mostActiveDepartments,
      mostActiveUsers,
      overdueWorkflows,
      pendingDocuments,
      scope: scope.level,
      totalDocuments,
    };
  }

  async documents(
    principal: AuthenticatedUser,
    query: ReportQueryDto,
  ): Promise<Paginated<DocumentReportRow>> {
    const scope = await this.scope(principal);
    const pagination = this.pagination(query);
    const where = this.documentWhere(principal, scope, query);
    const [total, documents] = await Promise.all([
      this.prisma.document.count({ where }),
      this.prisma.document.findMany({
        include: {
          creator: {
            select: { email: true, firstName: true, id: true, lastName: true },
          },
          currentDepartment: { select: { id: true, name: true } },
          timeline: {
            orderBy: { createdAt: 'asc' },
            select: { action: true, createdAt: true },
          },
          workflowInstances: {
            include: {
              currentStep: { select: { sequence: true } },
              workflow: { select: { name: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: this.skip(pagination),
        take: pagination.pageSize,
        where,
      }),
    ]);

    return {
      items: documents.map((document) => {
        const submitted = document.timeline.find(
          (event) => event.action === 'SUBMITTED',
        );
        const completed = document.workflowInstances.find(
          (instance) => instance.completedAt,
        );
        const currentWorkflow = document.workflowInstances[0];
        return {
          completedDate: completed?.completedAt ?? null,
          confidentiality: document.confidentiality,
          createdBy: document.creator,
          createdDate: document.createdAt,
          currentDepartment: document.currentDepartment,
          currentWorkflowStatus: currentWorkflow?.status ?? null,
          id: document.id,
          priority: document.priority,
          referenceNumber: document.referenceNumber,
          status: document.status,
          submittedDate: submitted?.createdAt ?? null,
          title: document.title,
        };
      }),
      pagination: { ...pagination, total },
    };
  }

  async workflows(
    principal: AuthenticatedUser,
    query: ReportQueryDto,
  ): Promise<Paginated<WorkflowReportRow>> {
    const scope = await this.scope(principal);
    const pagination = this.pagination(query);
    const where = this.workflowInstanceWhere(principal, scope, query);
    const [total, instances] = await Promise.all([
      this.prisma.workflowInstance.count({ where }),
      this.prisma.workflowInstance.findMany({
        include: {
          currentStep: {
            include: { department: { select: { id: true, name: true } } },
          },
          document: { select: { referenceNumber: true, title: true } },
          tasks: {
            include: {
              assignedDepartment: { select: { id: true, name: true } },
              assignedUser: {
                select: {
                  email: true,
                  firstName: true,
                  id: true,
                  lastName: true,
                },
              },
              step: { select: { sequence: true } },
            },
            orderBy: { createdAt: 'desc' },
          },
          workflow: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: this.skip(pagination),
        take: pagination.pageSize,
        where,
      }),
    ]);

    const now = new Date();
    return {
      items: instances.map((instance) => {
        const currentTask =
          instance.tasks.find((task) => activeTaskStatusSet.has(task.status)) ??
          instance.tasks[0];
        const isOverdue = instance.tasks.some(
          (task) => activeTaskStatusSet.has(task.status) && task.dueAt < now,
        );
        return {
          completedAt: instance.completedAt,
          currentAssignee: currentTask?.assignedUser ?? null,
          currentDepartment:
            currentTask?.assignedDepartment ??
            instance.currentStep?.department ??
            null,
          currentStep:
            currentTask?.step.sequence ??
            instance.currentStep?.sequence ??
            null,
          documentReference: instance.document.referenceNumber,
          documentTitle: instance.document.title,
          id: instance.id,
          isOverdue,
          slaStatus: isOverdue ? 'OVERDUE' : 'ON_TRACK',
          startedAt: instance.createdAt,
          status: instance.status,
          totalDurationHours: instance.completedAt
            ? this.durationHours(instance.createdAt, instance.completedAt)
            : null,
          workflowName: instance.workflow.name,
        };
      }),
      pagination: { ...pagination, total },
    };
  }

  async departments(principal: AuthenticatedUser, query: ReportQueryDto) {
    const scope = await this.scope(principal);
    const dateFilter = this.dateFilter(query);
    const departments = await this.prisma.department.findMany({
      orderBy: { name: 'asc' },
      where: {
        deletedAt: null,
        organizationId: principal.organizationId,
        ...(query.departmentId ? { id: query.departmentId } : {}),
        ...(scope.level === 'department' ? { id: scope.departmentId } : {}),
      },
    });

    if (scope.level === 'self') {
      const profile = await this.profile(principal);
      return this.departmentRows(
        principal,
        departments.filter(
          (department) => department.id === profile.departmentId,
        ),
        dateFilter,
      );
    }

    return this.departmentRows(principal, departments, dateFilter);
  }

  async users(
    principal: AuthenticatedUser,
    query: ReportQueryDto,
  ): Promise<Paginated<UserActivityReportRow>> {
    const scope = await this.scope(principal);
    const pagination = this.pagination(query);
    const profile = await this.profile(principal);
    const userWhere: Prisma.UserWhereInput = {
      deletedAt: null,
      organizationId: principal.organizationId,
      ...(query.departmentId ? { departmentId: query.departmentId } : {}),
      ...(query.userId ? { id: query.userId } : {}),
      ...(scope.level === 'department'
        ? { departmentId: scope.departmentId }
        : {}),
      ...(scope.level === 'self' ? { id: principal.id } : {}),
    };
    if (
      scope.level === 'self' &&
      query.userId &&
      query.userId !== principal.id
    ) {
      throw new ForbiddenException(
        'Self-scoped reports cannot query other users',
      );
    }
    if (
      scope.level === 'department' &&
      query.departmentId &&
      query.departmentId !== profile.departmentId
    ) {
      throw new ForbiddenException(
        'Department reports are limited to your department',
      );
    }

    const [total, users] = await Promise.all([
      this.prisma.user.count({ where: userWhere }),
      this.prisma.user.findMany({
        orderBy: { lastName: 'asc' },
        select: { email: true, firstName: true, id: true, lastName: true },
        skip: this.skip(pagination),
        take: pagination.pageSize,
        where: userWhere,
      }),
    ]);

    const items = await Promise.all(
      users.map((user) => this.userActivity(principal, user, query)),
    );

    return { items, pagination: { ...pagination, total } };
  }

  async overdue(
    principal: AuthenticatedUser,
    query: ReportQueryDto,
  ): Promise<Paginated<OverdueReportRow>> {
    const scope = await this.scope(principal);
    const pagination = this.pagination(query);
    const where: Prisma.WorkflowTaskWhereInput = {
      ...this.workflowTaskWhere(principal, scope, query),
      dueAt: { lt: new Date() },
      status: { in: activeTaskStatuses },
    };
    const [total, tasks] = await Promise.all([
      this.prisma.workflowTask.count({ where }),
      this.prisma.workflowTask.findMany({
        include: {
          assignedDepartment: { select: { id: true, name: true } },
          assignedUser: {
            select: { email: true, firstName: true, id: true, lastName: true },
          },
          document: { select: { referenceNumber: true, title: true } },
          workflowInstance: {
            include: {
              notifications: {
                orderBy: { createdAt: 'desc' },
                select: { createdAt: true },
                take: 1,
              },
            },
          },
        },
        orderBy: { dueAt: 'asc' },
        skip: this.skip(pagination),
        take: pagination.pageSize,
        where,
      }),
    ]);

    const now = new Date();
    return {
      items: tasks.map((task) => ({
        assignedDepartment: task.assignedDepartment,
        assignedUser: task.assignedUser,
        daysOverdue: Math.max(
          0,
          Math.floor(
            (now.getTime() - task.dueAt.getTime()) / (24 * 60 * 60 * 1000),
          ),
        ),
        documentReference: task.document.referenceNumber,
        documentTitle: task.document.title,
        dueAt: task.dueAt,
        escalationStatus: task.escalatedAt ? 'ESCALATED' : 'PENDING',
        lastNotificationDate:
          task.workflowInstance.notifications[0]?.createdAt ?? null,
        taskId: task.id,
      })),
      pagination: { ...pagination, total },
    };
  }

  async turnaround(principal: AuthenticatedUser, query: ReportQueryDto) {
    const scope = await this.scope(principal);
    const where = this.documentWhere(principal, scope, query);
    const documents = await this.prisma.document.findMany({
      include: {
        timeline: {
          orderBy: { createdAt: 'asc' },
          select: { action: true, createdAt: true },
        },
        workflowInstances: {
          include: {
            tasks: {
              include: {
                assignedDepartment: { select: { id: true, name: true } },
                step: { select: { sequence: true } },
              },
              orderBy: { createdAt: 'asc' },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
      where,
    });

    const items: TurnaroundReportRow[] = documents.map((document) => {
      const submitted = document.timeline.find(
        (event) => event.action === 'SUBMITTED',
      );
      const instance = document.workflowInstances[0];
      const completedAt = instance?.completedAt ?? null;
      return {
        creationToSubmissionHours: submitted
          ? this.durationHours(document.createdAt, submitted.createdAt)
          : null,
        documentReference: document.referenceNumber,
        documentTitle: document.title,
        id: document.id,
        stepDurations:
          instance?.tasks.map((task) => ({
            department: task.assignedDepartment,
            durationHours: task.completedAt
              ? this.durationHours(task.createdAt, task.completedAt)
              : null,
            sequence: task.step.sequence,
          })) ?? [],
        submissionToCompletionHours:
          submitted && completedAt
            ? this.durationHours(submitted.createdAt, completedAt)
            : null,
      };
    });

    return {
      averageCreationToSubmissionHours: this.averageNumbers(
        items.map((item) => item.creationToSubmissionHours),
      ),
      averageDepartmentProcessingHours: this.averageNumbers(
        items.flatMap((item) =>
          item.stepDurations.map((step) => step.durationHours),
        ),
      ),
      averageSubmissionToCompletionHours: this.averageNumbers(
        items.map((item) => item.submissionToCompletionHours),
      ),
      items,
    };
  }

  async activity(
    principal: AuthenticatedUser,
    query: ReportQueryDto,
  ): Promise<Paginated<ActivityReportRow>> {
    const scope = await this.scope(principal);
    const pagination = this.pagination(query);
    const workflowRows =
      !query.entityType || query.entityType === 'Workflow'
        ? await this.workflowActivity(principal, scope, query)
        : [];
    const documentRows =
      !query.entityType || query.entityType === 'Document'
        ? await this.documentActivity(principal, scope, query)
        : [];
    const auditRows =
      !query.entityType || query.entityType === 'AuditLog'
        ? await this.auditActivity(principal, scope, query)
        : [];
    const rows = [...workflowRows, ...documentRows, ...auditRows]
      .filter((row) => (query.action ? row.action === query.action : true))
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return {
      items: rows.slice(
        this.skip(pagination),
        this.skip(pagination) + pagination.pageSize,
      ),
      pagination: { ...pagination, total: rows.length },
    };
  }

  async documentsCsv(principal: AuthenticatedUser, query: ReportQueryDto) {
    const report = await this.documents(principal, {
      ...query,
      page: 1,
      pageSize: 100,
    });
    return toCsv(
      report.items.map((item) => ({
        completedDate: item.completedDate?.toISOString(),
        createdBy: item.createdBy?.email,
        createdDate: item.createdDate.toISOString(),
        currentDepartment: item.currentDepartment?.name,
        currentWorkflowStatus: item.currentWorkflowStatus,
        referenceNumber: item.referenceNumber,
        status: item.status,
        title: item.title,
      })),
      [
        { key: 'referenceNumber', label: 'Reference Number' },
        { key: 'title', label: 'Title' },
        { key: 'status', label: 'Status' },
        { key: 'createdBy', label: 'Created By' },
        { key: 'currentDepartment', label: 'Current Department' },
        { key: 'createdDate', label: 'Created Date' },
        { key: 'completedDate', label: 'Completed Date' },
        { key: 'currentWorkflowStatus', label: 'Workflow Status' },
      ],
    );
  }

  async workflowsCsv(principal: AuthenticatedUser, query: ReportQueryDto) {
    const report = await this.workflows(principal, {
      ...query,
      page: 1,
      pageSize: 100,
    });
    return toCsv(
      report.items.map((item) => ({
        assignee: item.currentAssignee?.email,
        department: item.currentDepartment?.name,
        documentReference: item.documentReference,
        isOverdue: item.isOverdue,
        slaStatus: item.slaStatus,
        status: item.status,
        workflowName: item.workflowName,
      })),
      [
        { key: 'workflowName', label: 'Workflow' },
        { key: 'documentReference', label: 'Document Reference' },
        { key: 'department', label: 'Current Department' },
        { key: 'assignee', label: 'Assignee' },
        { key: 'status', label: 'Status' },
        { key: 'slaStatus', label: 'SLA Status' },
        { key: 'isOverdue', label: 'Overdue' },
      ],
    );
  }

  async overdueCsv(principal: AuthenticatedUser, query: ReportQueryDto) {
    const report = await this.overdue(principal, {
      ...query,
      page: 1,
      pageSize: 100,
    });
    return toCsv(
      report.items.map((item) => ({
        assignedDepartment: item.assignedDepartment?.name,
        assignedUser: item.assignedUser?.email,
        daysOverdue: item.daysOverdue,
        documentReference: item.documentReference,
        dueAt: item.dueAt.toISOString(),
        escalationStatus: item.escalationStatus,
      })),
      [
        { key: 'documentReference', label: 'Document Reference' },
        { key: 'assignedUser', label: 'Assigned User' },
        { key: 'assignedDepartment', label: 'Assigned Department' },
        { key: 'dueAt', label: 'Due Date' },
        { key: 'daysOverdue', label: 'Days Overdue' },
        { key: 'escalationStatus', label: 'Escalation Status' },
      ],
    );
  }

  async activityCsv(principal: AuthenticatedUser, query: ReportQueryDto) {
    const report = await this.activity(principal, {
      ...query,
      page: 1,
      pageSize: 100,
    });
    return toCsv(
      report.items.map((item) => ({
        action: item.action,
        actor: item.actor?.email,
        comment: item.comment,
        department: item.department?.name,
        entityReference: item.entityReference,
        entityType: item.entityType,
        timestamp: item.timestamp.toISOString(),
      })),
      [
        { key: 'timestamp', label: 'Timestamp' },
        { key: 'actor', label: 'Actor' },
        { key: 'action', label: 'Action' },
        { key: 'entityType', label: 'Entity Type' },
        { key: 'entityReference', label: 'Entity Reference' },
        { key: 'department', label: 'Department' },
        { key: 'comment', label: 'Comment' },
      ],
    );
  }

  private async scope(principal: AuthenticatedUser): Promise<Scope> {
    if (!principal.roleId) throw new ForbiddenException('Role is required');
    const grants = await this.prisma.rolePermission.findMany({
      select: { permission: { select: { code: true } } },
      where: { roleId: principal.roleId },
    });
    const permissions = new Set(grants.map((grant) => grant.permission.code));
    if (permissions.has('reports.view.organization')) {
      return { level: 'organization' };
    }
    if (permissions.has('reports.view.department')) {
      const profile = await this.profile(principal);
      if (!profile.departmentId) {
        throw new ForbiddenException('Department scope requires a department');
      }
      return { departmentId: profile.departmentId, level: 'department' };
    }
    if (
      permissions.has('reports.view.self') ||
      permissions.has('reports.view')
    ) {
      return { level: 'self', userId: principal.id };
    }
    throw new ForbiddenException('Required reporting permission is missing');
  }

  private async profile(principal: AuthenticatedUser) {
    const user = await this.prisma.user.findFirst({
      select: { departmentId: true, id: true },
      where: { id: principal.id, organizationId: principal.organizationId },
    });
    if (!user) throw new NotFoundException('Current user profile not found');
    return user;
  }

  private documentWhere(
    principal: AuthenticatedUser,
    scope: Scope,
    query: ReportQueryDto,
  ): Prisma.DocumentWhereInput {
    const where: Prisma.DocumentWhereInput = {
      organizationId: principal.organizationId,
      ...this.documentScope(principal, scope),
    };
    const and: Prisma.DocumentWhereInput[] = [];
    if (query.status) where.status = query.status;
    if (query.priority) where.priority = query.priority;
    if (query.confidentiality) where.confidentiality = query.confidentiality;
    if (query.documentType) {
      where.category = { contains: query.documentType, mode: 'insensitive' };
    }
    if (query.departmentId) {
      and.push({
        OR: [
          { currentDepartmentId: query.departmentId },
          { senderDepartmentId: query.departmentId },
        ],
      });
    }
    if (query.userId) {
      and.push({
        OR: [{ createdBy: query.userId }, { ownerUserId: query.userId }],
      });
    }
    const dateFilter = this.dateFilter(query);
    if (dateFilter) where.createdAt = dateFilter;
    if (and.length > 0) where.AND = and;
    return where;
  }

  private workflowInstanceWhere(
    principal: AuthenticatedUser,
    scope: Scope,
    query: ReportQueryDto,
  ): Prisma.WorkflowInstanceWhereInput {
    const where: Prisma.WorkflowInstanceWhereInput = {
      organizationId: principal.organizationId,
      ...this.workflowInstanceScope(principal, scope),
    };
    if (query.workflowId) where.workflowId = query.workflowId;
    if (query.workflowStatus) where.status = query.workflowStatus;
    if (query.overdueOnly === 'true') {
      where.tasks = {
        some: { dueAt: { lt: new Date() }, status: { in: activeTaskStatuses } },
      };
    }
    const dateFilter = this.dateFilter(query);
    if (dateFilter) where.createdAt = dateFilter;
    return where;
  }

  private workflowTaskWhere(
    principal: AuthenticatedUser,
    scope: Scope,
    query: ReportQueryDto,
  ): Prisma.WorkflowTaskWhereInput {
    const where: Prisma.WorkflowTaskWhereInput = {
      organizationId: principal.organizationId,
      ...this.workflowTaskScope(scope),
    };
    if (query.workflowId)
      where.workflowInstance = { workflowId: query.workflowId };
    if (query.departmentId) where.assignedDepartmentId = query.departmentId;
    if (query.userId) where.assignedUserId = query.userId;
    const dateFilter = this.dateFilter(query);
    if (dateFilter) where.createdAt = dateFilter;
    return where;
  }

  private documentScope(
    principal: AuthenticatedUser,
    scope: Scope,
  ): Prisma.DocumentWhereInput {
    if (scope.level === 'organization') return {};
    if (scope.level === 'department') {
      return {
        OR: [
          { currentDepartmentId: scope.departmentId },
          { senderDepartmentId: scope.departmentId },
        ],
      };
    }
    return { OR: [{ createdBy: principal.id }, { ownerUserId: principal.id }] };
  }

  private workflowInstanceScope(
    principal: AuthenticatedUser,
    scope: Scope,
  ): Prisma.WorkflowInstanceWhereInput {
    if (scope.level === 'organization') return {};
    if (scope.level === 'department') {
      return {
        OR: [
          { document: { currentDepartmentId: scope.departmentId } },
          { document: { senderDepartmentId: scope.departmentId } },
          { tasks: { some: { assignedDepartmentId: scope.departmentId } } },
        ],
      };
    }
    return {
      OR: [
        { document: { ownerUserId: principal.id } },
        { document: { createdBy: principal.id } },
        { startedBy: principal.id },
        { tasks: { some: { assignedUserId: principal.id } } },
      ],
    };
  }

  private workflowTaskScope(scope: Scope): Prisma.WorkflowTaskWhereInput {
    if (scope.level === 'organization') return {};
    if (scope.level === 'department') {
      return { assignedDepartmentId: scope.departmentId };
    }
    return { assignedUserId: scope.userId };
  }

  private dateFilter(query: ReportQueryDto): Prisma.DateTimeFilter | undefined {
    if (!query.dateFrom && !query.dateTo) return undefined;
    return {
      ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
      ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
    };
  }

  private pagination(query: ReportQueryDto) {
    return { page: query.page ?? 1, pageSize: query.pageSize ?? 25, total: 0 };
  }

  private skip(pagination: Pick<Pagination, 'page' | 'pageSize'>) {
    return (pagination.page - 1) * pagination.pageSize;
  }

  private async departmentRows(
    principal: AuthenticatedUser,
    departments: DepartmentLite[],
    dateFilter: Prisma.DateTimeFilter | undefined,
  ): Promise<DepartmentReportRow[]> {
    return Promise.all(
      departments.map(async (department) => {
        const taskWhere = {
          assignedDepartmentId: department.id,
          organizationId: principal.organizationId,
          ...(dateFilter ? { createdAt: dateFilter } : {}),
        } satisfies Prisma.WorkflowTaskWhereInput;
        const [
          documentsReceived,
          documentsSent,
          documentsCompleted,
          pendingTasks,
          overdueTasks,
          completedTasks,
          recentActivity,
        ] = await Promise.all([
          this.prisma.documentRoute.count({
            where: {
              organizationId: principal.organizationId,
              toDepartmentId: department.id,
              ...(dateFilter ? { createdAt: dateFilter } : {}),
            },
          }),
          this.prisma.documentRoute.count({
            where: {
              fromDepartmentId: department.id,
              organizationId: principal.organizationId,
              ...(dateFilter ? { createdAt: dateFilter } : {}),
            },
          }),
          this.prisma.document.count({
            where: {
              currentDepartmentId: department.id,
              organizationId: principal.organizationId,
              status: {
                in: [DocumentStatus.APPROVED, DocumentStatus.ARCHIVED],
              },
            },
          }),
          this.prisma.workflowTask.count({
            where: { ...taskWhere, status: { in: activeTaskStatuses } },
          }),
          this.prisma.workflowTask.count({
            where: {
              ...taskWhere,
              dueAt: { lt: new Date() },
              status: { in: activeTaskStatuses },
            },
          }),
          this.prisma.workflowTask.findMany({
            select: { completedAt: true, createdAt: true },
            where: { ...taskWhere, completedAt: { not: null } },
          }),
          this.prisma.workflowHistoryEvent.findMany({
            include: { document: { select: { referenceNumber: true } } },
            orderBy: { createdAt: 'desc' },
            take: 5,
            where: {
              actorDepartmentId: department.id,
              organizationId: principal.organizationId,
            },
          }),
        ]);

        return {
          averageTurnaroundHours: this.averageDurationHours(completedTasks),
          departmentId: department.id,
          departmentName: department.name,
          documentsCompleted,
          documentsReceived,
          documentsSent,
          overdueTasks,
          pendingTasks,
          recentActivity: recentActivity.map((event) => ({
            action: event.action,
            createdAt: event.createdAt,
            documentReference: event.document.referenceNumber,
          })),
        };
      }),
    );
  }

  private async userActivity(
    principal: AuthenticatedUser,
    user: UserLite,
    query: ReportQueryDto,
  ): Promise<UserActivityReportRow> {
    const dateFilter = this.dateFilter(query);
    const taskWhere = {
      assignedUserId: user.id,
      organizationId: principal.organizationId,
      ...(dateFilter ? { createdAt: dateFilter } : {}),
    } satisfies Prisma.WorkflowTaskWhereInput;
    const [
      documentsCreated,
      tasksReceived,
      tasksApproved,
      tasksRejected,
      tasksReturned,
      tasksForwarded,
      tasksCompleted,
      completedTasks,
      lastWorkflowActivity,
      lastDocumentActivity,
    ] = await Promise.all([
      this.prisma.document.count({
        where: {
          createdBy: user.id,
          organizationId: principal.organizationId,
          ...(dateFilter ? { createdAt: dateFilter } : {}),
        },
      }),
      this.prisma.workflowTask.count({ where: taskWhere }),
      this.prisma.workflowHistoryEvent.count({
        where: {
          action: 'APPROVED',
          actorUserId: user.id,
          organizationId: principal.organizationId,
        },
      }),
      this.prisma.workflowHistoryEvent.count({
        where: {
          action: 'REJECTED',
          actorUserId: user.id,
          organizationId: principal.organizationId,
        },
      }),
      this.prisma.workflowHistoryEvent.count({
        where: {
          action: 'RETURNED',
          actorUserId: user.id,
          organizationId: principal.organizationId,
        },
      }),
      this.prisma.workflowHistoryEvent.count({
        where: {
          action: 'FORWARDED',
          actorUserId: user.id,
          organizationId: principal.organizationId,
        },
      }),
      this.prisma.workflowHistoryEvent.count({
        where: {
          action: 'COMPLETED',
          actorUserId: user.id,
          organizationId: principal.organizationId,
        },
      }),
      this.prisma.workflowTask.findMany({
        select: { completedAt: true, createdAt: true },
        where: { ...taskWhere, completedAt: { not: null } },
      }),
      this.prisma.workflowHistoryEvent.findFirst({
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
        where: {
          actorUserId: user.id,
          organizationId: principal.organizationId,
        },
      }),
      this.prisma.documentTimelineEvent.findFirst({
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
        where: {
          actorUserId: user.id,
          organizationId: principal.organizationId,
        },
      }),
    ]);

    return {
      averageResponseHours: this.averageDurationHours(completedTasks),
      documentsCreated,
      lastActivityDate: this.latestDate([
        lastWorkflowActivity?.createdAt,
        lastDocumentActivity?.createdAt,
      ]),
      tasksApproved,
      tasksCompleted,
      tasksForwarded,
      tasksReceived,
      tasksRejected,
      tasksReturned,
      user,
    };
  }

  private async mostActiveDepartments(
    principal: AuthenticatedUser,
    scope: Scope,
    query: ReportQueryDto,
  ) {
    const rows = await this.departments(principal, query);
    return rows
      .map((row) => ({
        department: { id: row.departmentId, name: row.departmentName },
        totalActivity:
          row.documentsReceived +
          row.documentsSent +
          row.documentsCompleted +
          row.pendingTasks,
      }))
      .filter(() => scope.level !== 'self' || true)
      .sort((a, b) => b.totalActivity - a.totalActivity)
      .slice(0, 5);
  }

  private async mostActiveUsers(
    principal: AuthenticatedUser,
    scope: Scope,
    query: ReportQueryDto,
  ) {
    const report = await this.users(principal, {
      ...query,
      page: 1,
      pageSize: 10,
    });
    return report.items
      .map((row) => ({
        totalActivity:
          row.documentsCreated +
          row.tasksApproved +
          row.tasksCompleted +
          row.tasksForwarded +
          row.tasksRejected +
          row.tasksReturned,
        user: row.user,
      }))
      .filter(() => scope.level !== 'self' || true)
      .sort((a, b) => b.totalActivity - a.totalActivity)
      .slice(0, 5);
  }

  private highPriorityPendingItems(
    principal: AuthenticatedUser,
    scope: Scope,
    query: ReportQueryDto,
  ) {
    return this.prisma.document.findMany({
      include: { currentDepartment: { select: { id: true, name: true } } },
      orderBy: { updatedAt: 'desc' },
      take: 10,
      where: {
        ...this.documentWhere(principal, scope, query),
        priority: { in: ['HIGH', 'URGENT'] },
        status: {
          in: [
            DocumentStatus.SUBMITTED,
            DocumentStatus.IN_REVIEW,
            DocumentStatus.FORWARDED,
            DocumentStatus.RETURNED,
          ],
        },
      },
    });
  }

  private async workflowActivity(
    principal: AuthenticatedUser,
    scope: Scope,
    query: ReportQueryDto,
  ): Promise<ActivityReportRow[]> {
    const where: Prisma.WorkflowHistoryEventWhereInput = {
      organizationId: principal.organizationId,
      ...this.historyScope(principal, scope),
    };
    if (query.userId) where.actorUserId = query.userId;
    if (query.departmentId) where.actorDepartmentId = query.departmentId;
    const dateFilter = this.dateFilter(query);
    if (dateFilter) where.createdAt = dateFilter;

    const rows = await this.prisma.workflowHistoryEvent.findMany({
      include: {
        actor: {
          select: { email: true, firstName: true, id: true, lastName: true },
        },
        actorDepartment: { select: { id: true, name: true } },
        document: { select: { referenceNumber: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 250,
      where,
    });
    return rows.map((event) => ({
      action: event.action,
      actor: event.actor,
      comment: event.comments,
      department: event.actorDepartment,
      entityReference: event.document.referenceNumber,
      entityType: 'Workflow',
      id: event.id,
      timestamp: event.createdAt,
    }));
  }

  private async documentActivity(
    principal: AuthenticatedUser,
    scope: Scope,
    query: ReportQueryDto,
  ): Promise<ActivityReportRow[]> {
    const where: Prisma.DocumentTimelineEventWhereInput = {
      organizationId: principal.organizationId,
      ...this.documentTimelineScope(principal, scope),
    };
    if (query.userId) where.actorUserId = query.userId;
    if (query.departmentId) where.toDepartmentId = query.departmentId;
    const dateFilter = this.dateFilter(query);
    if (dateFilter) where.createdAt = dateFilter;

    const rows = await this.prisma.documentTimelineEvent.findMany({
      include: {
        actor: {
          select: { email: true, firstName: true, id: true, lastName: true },
        },
        document: { select: { referenceNumber: true } },
        toDepartment: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 250,
      where,
    });
    return rows.map((event) => ({
      action: event.action,
      actor: event.actor,
      comment: event.note,
      department: event.toDepartment,
      entityReference: event.document.referenceNumber,
      entityType: 'Document',
      id: event.id,
      timestamp: event.createdAt,
    }));
  }

  private async auditActivity(
    principal: AuthenticatedUser,
    scope: Scope,
    query: ReportQueryDto,
  ): Promise<ActivityReportRow[]> {
    const where: Prisma.AuditLogWhereInput = {
      organizationId: principal.organizationId,
    };
    if (query.userId) where.userId = query.userId;
    if (scope.level === 'self') where.userId = principal.id;
    const dateFilter = this.dateFilter(query);
    if (dateFilter) where.createdAt = dateFilter;

    const rows = await this.prisma.auditLog.findMany({
      include: {
        user: {
          select: { email: true, firstName: true, id: true, lastName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 250,
      where,
    });
    return rows.map((event) => ({
      action: event.action,
      actor: event.user,
      comment: null,
      department: null,
      entityReference: event.entityId,
      entityType: event.entityType,
      id: event.id,
      timestamp: event.createdAt,
    }));
  }

  private historyScope(
    principal: AuthenticatedUser,
    scope: Scope,
  ): Prisma.WorkflowHistoryEventWhereInput {
    if (scope.level === 'organization') return {};
    if (scope.level === 'department') {
      return { actorDepartmentId: scope.departmentId };
    }
    return { actorUserId: principal.id };
  }

  private documentTimelineScope(
    principal: AuthenticatedUser,
    scope: Scope,
  ): Prisma.DocumentTimelineEventWhereInput {
    if (scope.level === 'organization') return {};
    if (scope.level === 'department') {
      return {
        OR: [
          { fromDepartmentId: scope.departmentId },
          { toDepartmentId: scope.departmentId },
        ],
      };
    }
    return { actorUserId: principal.id };
  }

  private averageDurationHours(
    rows: Array<{ completedAt: Date | null; createdAt: Date }>,
  ) {
    return this.averageNumbers(
      rows.map((row) =>
        row.completedAt
          ? this.durationHours(row.createdAt, row.completedAt)
          : null,
      ),
    );
  }

  private averageNumbers(values: Array<null | number | undefined>) {
    const actual = values.filter(
      (value): value is number => typeof value === 'number',
    );
    if (actual.length === 0) return 0;
    return (
      Math.round(
        (actual.reduce((sum, value) => sum + value, 0) / actual.length) * 100,
      ) / 100
    );
  }

  private durationHours(start: Date, end: Date) {
    return (
      Math.round(((end.getTime() - start.getTime()) / 3_600_000) * 100) / 100
    );
  }

  private latestDate(values: Array<Date | undefined>) {
    const actual = values.filter(
      (value): value is Date => value instanceof Date,
    );
    if (actual.length === 0) return null;
    return new Date(Math.max(...actual.map((value) => value.getTime())));
  }

  private weekStart() {
    const date = new Date();
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    date.setDate(diff);
    date.setHours(0, 0, 0, 0);
    return date;
  }
}
