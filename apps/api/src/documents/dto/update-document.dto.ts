import { DocumentConfidentiality, DocumentPriority } from '@faithos/database';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateDocumentDto {
  @ApiPropertyOptional({ example: 'Quarterly Budget Review' })
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ example: 'Budget review request for Q3 planning' })
  @IsString()
  @MinLength(3)
  @MaxLength(300)
  @IsOptional()
  subject?: string;

  @ApiPropertyOptional({ example: 'Updated body text.' })
  @IsString()
  @MinLength(1)
  @IsOptional()
  body?: string;

  @ApiPropertyOptional({ example: 'Finance' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({ enum: DocumentPriority })
  @IsEnum(DocumentPriority)
  @IsOptional()
  priority?: DocumentPriority;

  @ApiPropertyOptional({ enum: DocumentConfidentiality })
  @IsEnum(DocumentConfidentiality)
  @IsOptional()
  confidentiality?: DocumentConfidentiality;
}
