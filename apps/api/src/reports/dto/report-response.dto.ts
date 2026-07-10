import { ApiProperty } from '@nestjs/swagger';

export class ReportPaginationDto {
  @ApiProperty()
  page!: number;

  @ApiProperty()
  pageSize!: number;

  @ApiProperty()
  total!: number;
}

export class ReportListResponseDto<T> {
  @ApiProperty()
  items!: T[];

  @ApiProperty({ type: ReportPaginationDto })
  pagination!: ReportPaginationDto;
}

export class ReportMetricDto {
  @ApiProperty()
  label!: string;

  @ApiProperty()
  value!: number;
}

export class ReportSummaryDto {
  @ApiProperty()
  totalDocuments!: number;

  @ApiProperty()
  documentsCreatedThisWeek!: number;

  @ApiProperty()
  documentsSubmittedThisWeek!: number;

  @ApiProperty()
  documentsCompletedThisWeek!: number;

  @ApiProperty()
  documentsArchived!: number;

  @ApiProperty()
  pendingDocuments!: number;

  @ApiProperty()
  overdueWorkflows!: number;

  @ApiProperty()
  completedWorkflows!: number;

  @ApiProperty()
  averageWorkflowCompletionHours!: number;

  @ApiProperty()
  averageApprovalHours!: number;
}

export class DocumentReportRowDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  referenceNumber!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  priority!: string;

  @ApiProperty()
  confidentiality!: string;
}

export class WorkflowReportRowDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  workflowName!: string;

  @ApiProperty()
  documentReference!: string;

  @ApiProperty()
  status!: string;
}

export class DepartmentReportRowDto {
  @ApiProperty()
  departmentId!: string;

  @ApiProperty()
  departmentName!: string;

  @ApiProperty()
  documentsReceived!: number;
}

export class UserActivityReportRowDto {
  @ApiProperty()
  userId!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  documentsCreated!: number;
}

export class OverdueReportRowDto {
  @ApiProperty()
  taskId!: string;

  @ApiProperty()
  documentReference!: string;

  @ApiProperty()
  dueAt!: Date;

  @ApiProperty()
  daysOverdue!: number;
}

export class TurnaroundReportDto {
  @ApiProperty()
  averageCreationToSubmissionHours!: number;

  @ApiProperty()
  averageSubmissionToCompletionHours!: number;
}

export class ActivityReportRowDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  actor!: string;

  @ApiProperty()
  action!: string;

  @ApiProperty()
  entityType!: string;

  @ApiProperty()
  timestamp!: Date;
}
