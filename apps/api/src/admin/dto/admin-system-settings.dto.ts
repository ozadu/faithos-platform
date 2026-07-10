import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class UpdateSystemSettingsDto {
  @ApiPropertyOptional({ example: 'DOC-YYYY-000001' })
  @IsOptional()
  @IsString()
  referenceNumberFormat?: string;

  @ApiPropertyOptional({ example: 10485760 })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxAttachmentSizeBytes?: number;

  @ApiPropertyOptional({ isArray: true, type: String })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedAttachmentTypes?: string[];

  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @IsInt()
  @Min(1)
  defaultSlaDays?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  emailNotificationsEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  maintenanceMode?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  brandingName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  brandingSubtitle?: string;
}
