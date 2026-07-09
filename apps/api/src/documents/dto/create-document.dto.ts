import { DocumentConfidentiality, DocumentPriority } from '@faithos/database';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateDocumentDto {
  @ApiProperty({ example: 'Quarterly Budget Review' })
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title!: string;

  @ApiProperty({ example: 'Budget review request for Q3 planning' })
  @IsString()
  @MinLength(3)
  @MaxLength(300)
  subject!: string;

  @ApiProperty({ example: 'Please review the attached budget proposal.' })
  @IsString()
  @MinLength(1)
  body!: string;

  @ApiProperty({ example: 'Finance' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  category!: string;

  @ApiPropertyOptional({ enum: DocumentPriority, example: 'NORMAL' })
  @IsEnum(DocumentPriority)
  @IsOptional()
  priority?: DocumentPriority;

  @ApiPropertyOptional({
    enum: DocumentConfidentiality,
    example: 'INTERNAL',
  })
  @IsEnum(DocumentConfidentiality)
  @IsOptional()
  confidentiality?: DocumentConfidentiality;
}
