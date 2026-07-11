import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';

const feedbackTypes = [
  'Bug',
  'Confusion',
  'Feature request',
  'Process improvement',
  'Training need',
  'Other',
] as const;

const feedbackPriorities = ['Low', 'Medium', 'High', 'Critical'] as const;
const productionFeedbackCategories = [
  'BUG',
  'FEATURE_REQUEST',
  'CONFUSING_UI',
  'PERFORMANCE',
  'OTHER',
] as const;
const productionFeedbackSeverities = [
  'LOW',
  'MEDIUM',
  'HIGH',
  'CRITICAL',
] as const;
const feedbackStatuses = [
  'NEW',
  'REVIEWED',
  'PLANNED',
  'RESOLVED',
  'WONT_FIX',
] as const;
const issueSources = [
  'Manual',
  'Feedback',
  'UAT',
  'Admin observation',
] as const;
const issueStatuses = [
  'Open',
  'In Review',
  'Planned',
  'Fixed',
  'Closed',
] as const;
const issueSeverities = ['Low', 'Medium', 'High', 'Critical'] as const;

export class CreatePilotFeedbackDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  roleOrDepartment?: string;

  @ApiPropertyOptional({ enum: feedbackTypes })
  @IsOptional()
  @IsIn(feedbackTypes)
  type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  affectedArea?: string;

  @ApiPropertyOptional({ enum: feedbackPriorities })
  @IsOptional()
  @IsIn(feedbackPriorities)
  priority?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(5)
  message?: string;

  @ApiPropertyOptional({ enum: productionFeedbackCategories })
  @IsOptional()
  @IsIn(productionFeedbackCategories)
  category?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(5)
  description?: string;

  @ApiPropertyOptional({ enum: productionFeedbackSeverities })
  @IsOptional()
  @IsIn(productionFeedbackSeverities)
  severity?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currentRoute?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  screenshotUrl?: string;
}

export class PilotFeedbackQueryDto {
  @ApiPropertyOptional({ enum: feedbackTypes })
  @IsOptional()
  @IsIn(feedbackTypes)
  type?: string;

  @ApiPropertyOptional({ enum: feedbackPriorities })
  @IsOptional()
  @IsIn(feedbackPriorities)
  priority?: string;

  @ApiPropertyOptional({ enum: feedbackStatuses })
  @IsOptional()
  @IsIn(feedbackStatuses)
  status?: string;

  @ApiPropertyOptional({ enum: productionFeedbackCategories })
  @IsOptional()
  @IsIn(productionFeedbackCategories)
  category?: string;

  @ApiPropertyOptional({ enum: productionFeedbackSeverities })
  @IsOptional()
  @IsIn(productionFeedbackSeverities)
  severity?: string;
}

export class UpdatePilotFeedbackDto {
  @ApiPropertyOptional({ enum: feedbackStatuses })
  @IsOptional()
  @IsIn(feedbackStatuses)
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  adminNote?: string;
}

export class UpdatePilotChecklistItemDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  acknowledged?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}

export class CreatePilotIssueDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  title!: string;

  @ApiProperty()
  @IsString()
  @MinLength(5)
  description!: string;

  @ApiProperty({ enum: issueSources })
  @IsIn(issueSources)
  source!: string;

  @ApiProperty({ enum: issueSeverities })
  @IsIn(issueSeverities)
  severity!: string;

  @ApiPropertyOptional({ enum: issueStatuses })
  @IsOptional()
  @IsIn(issueStatuses)
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  assignedOwner?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  relatedArea?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  feedbackId?: string;
}

export class PilotIssueQueryDto {
  @ApiPropertyOptional({ enum: issueSeverities })
  @IsOptional()
  @IsIn(issueSeverities)
  severity?: string;

  @ApiPropertyOptional({ enum: issueStatuses })
  @IsOptional()
  @IsIn(issueStatuses)
  status?: string;

  @ApiPropertyOptional({ enum: issueSources })
  @IsOptional()
  @IsIn(issueSources)
  source?: string;
}

export class UpdatePilotIssueDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: issueSeverities })
  @IsOptional()
  @IsIn(issueSeverities)
  severity?: string;

  @ApiPropertyOptional({ enum: issueStatuses })
  @IsOptional()
  @IsIn(issueStatuses)
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  assignedOwner?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  relatedArea?: string;
}
