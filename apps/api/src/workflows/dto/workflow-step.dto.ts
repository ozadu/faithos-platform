import { WorkflowConditionOperator } from '@faithos/database';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class WorkflowStepDto {
  @ApiProperty({ example: 1, minimum: 1 })
  @IsInt()
  @Min(1)
  sequence!: number;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  departmentId!: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  roleId?: string;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  approvalRequired?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  canReturn?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  canForward?: boolean;

  @ApiPropertyOptional({ default: 2, minimum: 0, maximum: 365 })
  @IsInt()
  @Min(0)
  @Max(365)
  @IsOptional()
  dueDays?: number;

  @ApiPropertyOptional({ default: 1, minimum: 0, maximum: 365 })
  @IsInt()
  @Min(0)
  @Max(365)
  @IsOptional()
  escalationDays?: number;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  notifyEmail?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  notifyInApp?: boolean;

  @ApiPropertyOptional({
    description: 'Document or metadata field used for conditional routing.',
    example: 'purchaseAmount',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  conditionField?: string;

  @ApiPropertyOptional({ enum: WorkflowConditionOperator, example: 'GTE' })
  @IsOptional()
  @IsEnum(WorkflowConditionOperator)
  conditionOperator?: WorkflowConditionOperator;

  @ApiPropertyOptional({ example: '500000' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  conditionValue?: string;
}
