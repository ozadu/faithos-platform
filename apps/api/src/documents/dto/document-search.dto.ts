import { DocumentPriority, DocumentStatus } from '@faithos/database';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class DocumentSearchDto {
  @ApiPropertyOptional({ example: 'DOC-2026-000001' })
  @IsString()
  @IsOptional()
  referenceNumber?: string;

  @ApiPropertyOptional({ example: 'Budget' })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsUUID()
  @IsOptional()
  departmentId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsUUID()
  @IsOptional()
  senderDepartmentId?: string;

  @ApiPropertyOptional({ enum: DocumentStatus })
  @IsEnum(DocumentStatus)
  @IsOptional()
  status?: DocumentStatus;

  @ApiPropertyOptional({ enum: DocumentPriority })
  @IsEnum(DocumentPriority)
  @IsOptional()
  priority?: DocumentPriority;

  @ApiPropertyOptional({ example: '2026-07-01T00:00:00.000Z' })
  @IsDateString()
  @IsOptional()
  dateFrom?: string;

  @ApiPropertyOptional({ example: '2026-07-31T23:59:59.999Z' })
  @IsDateString()
  @IsOptional()
  dateTo?: string;
}
