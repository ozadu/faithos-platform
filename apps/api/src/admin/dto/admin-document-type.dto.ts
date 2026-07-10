import { DocumentConfidentiality, DocumentPriority } from '@faithos/database';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateAdminDocumentTypeDto {
  @ApiProperty({ example: 'Purchase Request' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'PR' })
  @IsOptional()
  @IsString()
  referencePrefix?: string;

  @ApiPropertyOptional({ enum: DocumentConfidentiality })
  @IsOptional()
  @IsEnum(DocumentConfidentiality)
  defaultConfidentiality?: DocumentConfidentiality;

  @ApiPropertyOptional({ enum: DocumentPriority })
  @IsOptional()
  @IsEnum(DocumentPriority)
  defaultPriority?: DocumentPriority;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  workflowId?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class UpdateAdminDocumentTypeDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  referencePrefix?: string;

  @ApiPropertyOptional({ enum: DocumentConfidentiality })
  @IsOptional()
  @IsEnum(DocumentConfidentiality)
  defaultConfidentiality?: DocumentConfidentiality;

  @ApiPropertyOptional({ enum: DocumentPriority })
  @IsOptional()
  @IsEnum(DocumentPriority)
  defaultPriority?: DocumentPriority;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class AssignDocumentTypeWorkflowDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  workflowId!: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
