import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class AdminUserImportDto {
  @ApiProperty({
    description:
      'CSV text with firstName,lastName,email,departmentCode,roleName,active columns.',
  })
  @IsString()
  csvText!: string;

  @ApiProperty({ example: 'faithos-users.csv' })
  @IsString()
  fileName!: string;

  @ApiProperty({ maximum: 1048576, minimum: 1 })
  @IsInt()
  @Min(1)
  @Max(1024 * 1024)
  sizeBytes!: number;
}

export class AdminUserImportPreviewDto extends AdminUserImportDto {
  @ApiProperty({ default: 50, required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(250)
  previewLimit?: number;
}
