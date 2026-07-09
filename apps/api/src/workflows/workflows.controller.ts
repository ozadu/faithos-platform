import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { apiResponse } from '../common/api-response';
import { AuthenticatedUser } from '../common/authenticated-user';
import { CurrentUser } from '../common/current-user.decorator';
import {
  AssignWorkflowDto,
  UpdateWorkflowAssignmentDto,
} from './dto/assign-workflow.dto';
import { CreateDelegationDto } from './dto/delegation.dto';
import { CreateWorkflowDto } from './dto/create-workflow.dto';
import { UpdateWorkflowDto } from './dto/update-workflow.dto';
import {
  ForwardWorkflowTaskDto,
  StartWorkflowDto,
  WorkflowActionDto,
} from './dto/workflow-action.dto';
import { WorkflowsService } from './workflows.service';

@ApiTags('Workflows')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller()
export class WorkflowsController {
  constructor(private readonly workflows: WorkflowsService) {}

  @Get('workflows')
  @RequirePermissions('workflows.read')
  @ApiOperation({ summary: 'List workflow templates' })
  async listWorkflows(@CurrentUser() user: AuthenticatedUser) {
    return apiResponse(
      'Workflows retrieved',
      await this.workflows.listWorkflows(user),
    );
  }

  @Post('workflows')
  @RequirePermissions('workflows.write')
  @ApiOperation({ summary: 'Create workflow template with optional steps' })
  async createWorkflow(
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: CreateWorkflowDto,
  ) {
    return apiResponse(
      'Workflow created',
      await this.workflows.createWorkflow(user, input),
    );
  }

  @Get('workflows/:id')
  @RequirePermissions('workflows.read')
  @ApiParam({ format: 'uuid', name: 'id' })
  @ApiOperation({ summary: 'Get workflow template details' })
  async getWorkflow(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return apiResponse(
      'Workflow retrieved',
      await this.workflows.getWorkflow(user, id),
    );
  }

  @Patch('workflows/:id')
  @RequirePermissions('workflows.write')
  @ApiParam({ format: 'uuid', name: 'id' })
  @ApiOperation({
    summary:
      'Update workflow template and create a new version when steps change',
  })
  async updateWorkflow(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() input: UpdateWorkflowDto,
  ) {
    return apiResponse(
      'Workflow updated',
      await this.workflows.updateWorkflow(user, id, input),
    );
  }

  @Delete('workflows/:id')
  @RequirePermissions('workflows.write')
  @ApiParam({ format: 'uuid', name: 'id' })
  @ApiOperation({ summary: 'Deactivate workflow template' })
  async deactivateWorkflow(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return apiResponse(
      'Workflow deactivated',
      await this.workflows.deactivateWorkflow(user, id),
    );
  }

  @Get('workflow-assignments')
  @RequirePermissions('workflows.read')
  @ApiOperation({ summary: 'List document type workflow assignments' })
  async listAssignments(@CurrentUser() user: AuthenticatedUser) {
    return apiResponse(
      'Workflow assignments retrieved',
      await this.workflows.listAssignments(user),
    );
  }

  @Post('workflow-assignments')
  @RequirePermissions('workflows.write')
  @ApiOperation({ summary: 'Assign a document type to a workflow template' })
  async assignWorkflow(
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: AssignWorkflowDto,
  ) {
    return apiResponse(
      'Workflow assignment saved',
      await this.workflows.assignWorkflow(user, input),
    );
  }

  @Patch('workflow-assignments/:id')
  @RequirePermissions('workflows.write')
  @ApiParam({ format: 'uuid', name: 'id' })
  @ApiOperation({ summary: 'Update workflow assignment' })
  async updateAssignment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() input: UpdateWorkflowAssignmentDto,
  ) {
    return apiResponse(
      'Workflow assignment updated',
      await this.workflows.updateAssignment(user, id, input),
    );
  }

  @Delete('workflow-assignments/:id')
  @RequirePermissions('workflows.write')
  @ApiParam({ format: 'uuid', name: 'id' })
  @ApiOperation({ summary: 'Deactivate workflow assignment' })
  async removeAssignment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return apiResponse(
      'Workflow assignment deactivated',
      await this.workflows.removeAssignment(user, id),
    );
  }

  @Post('documents/:id/workflow/start')
  @RequirePermissions('workflows.execute')
  @ApiParam({ format: 'uuid', name: 'id' })
  @ApiOperation({ summary: 'Start the assigned workflow for a document' })
  async startWorkflow(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() input: StartWorkflowDto,
  ) {
    return apiResponse(
      'Workflow started',
      await this.workflows.startWorkflow(user, id, input),
    );
  }

  @Get('workflow-tasks/my')
  @RequirePermissions('workflows.execute')
  @ApiOperation({
    summary: 'List workflow tasks assigned to me or my department',
  })
  async myTasks(@CurrentUser() user: AuthenticatedUser) {
    return apiResponse(
      'My workflow tasks retrieved',
      await this.workflows.myTasks(user),
    );
  }

  @Get('workflow-tasks/pending')
  @RequirePermissions('workflows.read')
  @ApiOperation({ summary: 'List pending workflow approvals' })
  async pendingApprovals(@CurrentUser() user: AuthenticatedUser) {
    return apiResponse(
      'Pending approvals retrieved',
      await this.workflows.pendingApprovals(user),
    );
  }

  @Post('workflow-tasks/:id/receive')
  @RequirePermissions('workflows.execute')
  @ApiParam({ format: 'uuid', name: 'id' })
  @ApiOperation({ summary: 'Receive a workflow task' })
  async receiveTask(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() input: WorkflowActionDto,
  ) {
    return apiResponse(
      'Workflow task received',
      await this.workflows.receiveTask(user, id, input),
    );
  }

  @Post('workflow-tasks/:id/approve')
  @RequirePermissions('workflows.execute')
  @ApiParam({ format: 'uuid', name: 'id' })
  @ApiOperation({
    summary: 'Approve a workflow task and route to the next eligible step',
  })
  async approveTask(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() input: WorkflowActionDto,
  ) {
    return apiResponse(
      'Workflow task approved',
      await this.workflows.approveTask(user, id, input),
    );
  }

  @Post('workflow-tasks/:id/reject')
  @RequirePermissions('workflows.execute')
  @ApiParam({ format: 'uuid', name: 'id' })
  @ApiOperation({ summary: 'Reject a workflow task' })
  async rejectTask(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() input: WorkflowActionDto,
  ) {
    return apiResponse(
      'Workflow task rejected',
      await this.workflows.rejectTask(user, id, input),
    );
  }

  @Post('workflow-tasks/:id/complete')
  @RequirePermissions('workflows.execute')
  @ApiParam({ format: 'uuid', name: 'id' })
  @ApiOperation({
    summary:
      'Complete a workflow task and close the workflow if it is the final step',
  })
  async completeTask(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() input: WorkflowActionDto,
  ) {
    return apiResponse(
      'Workflow task completed',
      await this.workflows.completeTask(user, id, input),
    );
  }

  @Post('workflow-tasks/:id/return')
  @RequirePermissions('workflows.execute')
  @ApiParam({ format: 'uuid', name: 'id' })
  @ApiOperation({ summary: 'Return a workflow task to the previous step' })
  async returnTask(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() input: WorkflowActionDto,
  ) {
    return apiResponse(
      'Workflow task returned',
      await this.workflows.returnTask(user, id, input),
    );
  }

  @Post('workflow-tasks/:id/forward')
  @RequirePermissions('workflows.execute')
  @ApiParam({ format: 'uuid', name: 'id' })
  @ApiOperation({ summary: 'Forward a workflow task to another department' })
  async forwardTask(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() input: ForwardWorkflowTaskDto,
  ) {
    return apiResponse(
      'Workflow task forwarded',
      await this.workflows.forwardTask(user, id, input),
    );
  }

  @Post('workflow-tasks/:id/cancel')
  @RequirePermissions('workflows.execute')
  @ApiParam({ format: 'uuid', name: 'id' })
  @ApiOperation({ summary: 'Cancel an in-progress workflow' })
  async cancelTask(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() input: WorkflowActionDto,
  ) {
    return apiResponse(
      'Workflow cancelled',
      await this.workflows.cancelTask(user, id, input),
    );
  }

  @Get('workflow-history')
  @RequirePermissions('workflows.read')
  @ApiQuery({ name: 'documentId', required: false })
  @ApiOperation({ summary: 'List immutable workflow history' })
  async history(
    @CurrentUser() user: AuthenticatedUser,
    @Query('documentId') documentId?: string,
  ) {
    return apiResponse(
      'Workflow history retrieved',
      await this.workflows.history(user, documentId),
    );
  }

  @Get('workflow-notifications')
  @RequirePermissions('workflows.read')
  @ApiOperation({ summary: 'List workflow notification records' })
  async notifications(@CurrentUser() user: AuthenticatedUser) {
    return apiResponse(
      'Workflow notifications retrieved',
      await this.workflows.notifications(user),
    );
  }

  @Get('workflow-delegations')
  @RequirePermissions('workflows.read')
  @ApiOperation({ summary: 'List temporary workflow delegations' })
  async delegations(@CurrentUser() user: AuthenticatedUser) {
    return apiResponse(
      'Workflow delegations retrieved',
      await this.workflows.delegations(user),
    );
  }

  @Post('workflow-delegations')
  @RequirePermissions('workflows.write')
  @ApiOperation({ summary: 'Create temporary workflow delegation' })
  async createDelegation(
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: CreateDelegationDto,
  ) {
    return apiResponse(
      'Workflow delegation created',
      await this.workflows.createDelegation(user, input),
    );
  }

  @Delete('workflow-delegations/:id')
  @RequirePermissions('workflows.write')
  @ApiParam({ format: 'uuid', name: 'id' })
  @ApiOperation({ summary: 'Deactivate workflow delegation' })
  async removeDelegation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return apiResponse(
      'Workflow delegation deactivated',
      await this.workflows.removeDelegation(user, id),
    );
  }

  @Post('workflow-sla/mark-overdue')
  @RequirePermissions('workflows.execute')
  @ApiOperation({
    summary: 'Mark overdue workflow tasks and create escalation notifications',
  })
  async markOverdue(@CurrentUser() user: AuthenticatedUser) {
    return apiResponse(
      'Workflow SLA evaluated',
      await this.workflows.markOverdue(user),
    );
  }
}
