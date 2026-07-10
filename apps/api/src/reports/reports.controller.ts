import { Controller, Get, Header, Query, Res, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { apiResponse } from '../common/api-response';
import { AuthenticatedUser } from '../common/authenticated-user';
import { CurrentUser } from '../common/current-user.decorator';
import { RawResponse } from '../common/raw-response.decorator';
import { ReportQueryDto } from './dto/report-query.dto';
import {
  ActivityReportRowDto,
  DepartmentReportRowDto,
  DocumentReportRowDto,
  OverdueReportRowDto,
  ReportSummaryDto,
  TurnaroundReportDto,
  UserActivityReportRowDto,
  WorkflowReportRowDto,
} from './dto/report-response.dto';
import { ReportsService } from './reports.service';

type HeaderResponse = {
  setHeader(name: string, value: string): void;
};

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('summary')
  @RequirePermissions('reports.view')
  @ApiOperation({ summary: 'Get management reporting summary metrics' })
  @ApiOkResponse({ type: ReportSummaryDto })
  async summary(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ReportQueryDto,
  ) {
    return apiResponse(
      'Report summary retrieved',
      await this.reports.summary(user, query),
    );
  }

  @Get('documents/export.csv')
  @RequirePermissions('reports.view', 'reports.export')
  @RawResponse()
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @ApiOperation({ summary: 'Export document report as CSV' })
  async documentsCsv(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ReportQueryDto,
    @Res({ passthrough: true }) response: HeaderResponse,
  ) {
    response.setHeader(
      'Content-Disposition',
      'attachment; filename="faithos-document-report.csv"',
    );
    return this.reports.documentsCsv(user, query);
  }

  @Get('workflows/export.csv')
  @RequirePermissions('reports.view', 'reports.export')
  @RawResponse()
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @ApiOperation({ summary: 'Export workflow report as CSV' })
  async workflowsCsv(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ReportQueryDto,
    @Res({ passthrough: true }) response: HeaderResponse,
  ) {
    response.setHeader(
      'Content-Disposition',
      'attachment; filename="faithos-workflow-report.csv"',
    );
    return this.reports.workflowsCsv(user, query);
  }

  @Get('overdue/export.csv')
  @RequirePermissions('reports.view', 'reports.export')
  @RawResponse()
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @ApiOperation({ summary: 'Export overdue workflow report as CSV' })
  async overdueCsv(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ReportQueryDto,
    @Res({ passthrough: true }) response: HeaderResponse,
  ) {
    response.setHeader(
      'Content-Disposition',
      'attachment; filename="faithos-overdue-report.csv"',
    );
    return this.reports.overdueCsv(user, query);
  }

  @Get('activity/export.csv')
  @RequirePermissions('reports.view', 'reports.export')
  @RawResponse()
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @ApiOperation({ summary: 'Export activity report as CSV' })
  async activityCsv(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ReportQueryDto,
    @Res({ passthrough: true }) response: HeaderResponse,
  ) {
    response.setHeader(
      'Content-Disposition',
      'attachment; filename="faithos-activity-report.csv"',
    );
    return this.reports.activityCsv(user, query);
  }

  @Get('documents')
  @RequirePermissions('reports.view')
  @ApiOperation({ summary: 'Get document report rows' })
  @ApiOkResponse({ type: DocumentReportRowDto })
  async documents(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ReportQueryDto,
  ) {
    return apiResponse(
      'Document report retrieved',
      await this.reports.documents(user, query),
    );
  }

  @Get('workflows')
  @RequirePermissions('reports.view')
  @ApiOperation({ summary: 'Get workflow report rows' })
  @ApiOkResponse({ type: WorkflowReportRowDto })
  async workflows(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ReportQueryDto,
  ) {
    return apiResponse(
      'Workflow report retrieved',
      await this.reports.workflows(user, query),
    );
  }

  @Get('departments')
  @RequirePermissions('reports.view')
  @ApiOperation({ summary: 'Get department analytics' })
  @ApiOkResponse({ type: DepartmentReportRowDto })
  async departments(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ReportQueryDto,
  ) {
    return apiResponse(
      'Department report retrieved',
      await this.reports.departments(user, query),
    );
  }

  @Get('users')
  @RequirePermissions('reports.view')
  @ApiOperation({ summary: 'Get user activity analytics' })
  @ApiOkResponse({ type: UserActivityReportRowDto })
  async users(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ReportQueryDto,
  ) {
    return apiResponse(
      'User activity report retrieved',
      await this.reports.users(user, query),
    );
  }

  @Get('overdue')
  @RequirePermissions('reports.view')
  @ApiOperation({ summary: 'Get overdue workflow report rows' })
  @ApiOkResponse({ type: OverdueReportRowDto })
  async overdue(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ReportQueryDto,
  ) {
    return apiResponse(
      'Overdue report retrieved',
      await this.reports.overdue(user, query),
    );
  }

  @Get('turnaround')
  @RequirePermissions('reports.view')
  @ApiOperation({ summary: 'Get turnaround and approval timing report' })
  @ApiOkResponse({ type: TurnaroundReportDto })
  async turnaround(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ReportQueryDto,
  ) {
    return apiResponse(
      'Turnaround report retrieved',
      await this.reports.turnaround(user, query),
    );
  }

  @Get('activity')
  @RequirePermissions('reports.view')
  @ApiOperation({ summary: 'Get activity timeline and audit report rows' })
  @ApiOkResponse({ type: ActivityReportRowDto })
  async activity(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ReportQueryDto,
  ) {
    return apiResponse(
      'Activity report retrieved',
      await this.reports.activity(user, query),
    );
  }
}
