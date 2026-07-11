import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

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

export class CreateFirstAdminDto {
  @ApiProperty({ example: 'FaithOS Pilot Organization' })
  @IsString()
  @MinLength(2)
  organizationName!: string;

  @ApiPropertyOptional({ example: 'admin@example.org' })
  @IsOptional()
  @IsEmail()
  organizationEmail?: string;

  @ApiProperty({ example: 'Ada' })
  @IsString()
  @MinLength(1)
  firstName!: string;

  @ApiProperty({ example: 'Okafor' })
  @IsString()
  @MinLength(1)
  lastName!: string;

  @ApiProperty({ example: 'admin@example.org' })
  @IsEmail()
  email!: string;

  @ApiProperty({ minLength: 12 })
  @IsString()
  @MinLength(12)
  password!: string;
}
