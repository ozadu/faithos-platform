import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';

const setupSteps = [
  'organization',
  'departments',
  'adminUser',
  'documentTypes',
  'workflowAssignments',
  'systemSettings',
  'pilotReadiness',
] as const;

export type SetupStep = (typeof setupSteps)[number];

export class CompleteSetupStepDto {
  @ApiProperty({ enum: setupSteps })
  @IsIn(setupSteps)
  step!: SetupStep;
}

export class SetupOrganizationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  website?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  timezone?: string;
}
