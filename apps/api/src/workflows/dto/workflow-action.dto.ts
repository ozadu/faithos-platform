import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class StartWorkflowDto {
  @ApiPropertyOptional({ example: 'Submitted into configured workflow.' })
  @IsOptional()
  @IsString()
  @MaxLength(1_000)
  comments?: string;

  @ApiPropertyOptional({
    description: 'Rule metadata such as purchaseAmount.',
    example: { purchaseAmount: 750000 },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class WorkflowActionDto {
  @ApiPropertyOptional({ example: 'Approved for the next step.' })
  @IsOptional()
  @IsString()
  @MaxLength(1_000)
  comments?: string;
}

export class ForwardWorkflowTaskDto extends WorkflowActionDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  departmentId!: string;
}
