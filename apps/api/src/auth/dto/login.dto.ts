import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin@demo.faithos.local' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'FaithOS-Demo-2026!', minLength: 8 })
  @IsString()
  @MinLength(8)
  password!: string;
}
