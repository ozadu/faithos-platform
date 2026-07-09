import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class RouteDocumentDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  departmentId!: string;

  @ApiPropertyOptional({ example: 'Please review and advise.' })
  @IsString()
  @MaxLength(1_000)
  @IsOptional()
  note?: string;
}

export class DocumentActionNoteDto {
  @ApiPropertyOptional({ example: 'Submitted for review.' })
  @IsString()
  @MaxLength(1_000)
  @IsOptional()
  note?: string;
}
