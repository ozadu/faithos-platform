import { ApiPropertyOptional } from '@nestjs/swagger';
import { WorkflowNotificationType } from '@faithos/database';
import { IsBooleanString, IsEnum, IsIn, IsOptional } from 'class-validator';

export class NotificationQueryDto {
  @ApiPropertyOptional({
    enum: ['documents', 'workflows'],
    description: 'Filter notifications by source module.',
  })
  @IsIn(['documents', 'workflows'])
  @IsOptional()
  module?: 'documents' | 'workflows';

  @ApiPropertyOptional({
    description: 'When true, only unread notifications are returned.',
  })
  @IsBooleanString()
  @IsOptional()
  unread?: string;

  @ApiPropertyOptional({ enum: WorkflowNotificationType })
  @IsEnum(WorkflowNotificationType)
  @IsOptional()
  type?: WorkflowNotificationType;
}
