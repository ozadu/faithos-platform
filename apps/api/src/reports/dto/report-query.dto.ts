import {
  DocumentConfidentiality,
  DocumentPriority,
  DocumentStatus,
  WorkflowInstanceStatus,
} from '@faithos/database';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBooleanString,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class ReportQueryDto {
  @ApiPropertyOptional({ example: '2026-07-01T00:00:00.000Z' })
  @IsDateString()
  @IsOptional()
  dateFrom?: string;

  @ApiPropertyOptional({ example: '2026-07-31T23:59:59.999Z' })
  @IsDateString()
  @IsOptional()
  dateTo?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsUUID()
  @IsOptional()
  departmentId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsUUID()
  @IsOptional()
  userId?: string;

  @ApiPropertyOptional({ enum: DocumentStatus })
  @IsEnum(DocumentStatus)
  @IsOptional()
  status?: DocumentStatus;

  @ApiPropertyOptional({ enum: DocumentPriority })
  @IsEnum(DocumentPriority)
  @IsOptional()
  priority?: DocumentPriority;

  @ApiPropertyOptional({ enum: DocumentConfidentiality })
  @IsEnum(DocumentConfidentiality)
  @IsOptional()
  confidentiality?: DocumentConfidentiality;

  @ApiPropertyOptional({ example: 'Purchase Request' })
  @IsString()
  @IsOptional()
  documentType?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsUUID()
  @IsOptional()
  workflowId?: string;

  @ApiPropertyOptional({ enum: WorkflowInstanceStatus })
  @IsEnum(WorkflowInstanceStatus)
  @IsOptional()
  workflowStatus?: WorkflowInstanceStatus;

  @ApiPropertyOptional({ example: 'APPROVED' })
  @IsString()
  @IsOptional()
  action?: string;

  @ApiPropertyOptional({ example: 'WorkflowTask' })
  @IsString()
  @IsOptional()
  entityType?: string;

  @ApiPropertyOptional({ example: 'true' })
  @IsBooleanString()
  @IsOptional()
  overdueOnly?: string;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ default: 25, maximum: 100, minimum: 1 })
  @IsInt()
  @Max(100)
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  pageSize?: number;
}
