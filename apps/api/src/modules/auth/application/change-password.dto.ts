import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({ example: 'currentPassword123', minLength: 6, maxLength: 50 })
  @IsString() @MinLength(6) @MaxLength(50)
  currentPassword!: string;

  @ApiProperty({ example: 'newPassword123', minLength: 6, maxLength: 50 })
  @IsString() @MinLength(6) @MaxLength(50)
  newPassword!: string;
}