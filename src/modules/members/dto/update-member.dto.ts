import { ApiPropertyOptional } from '@nestjs/swagger';
import { Role, UserStatus } from '@prisma/client';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { UpdateProfileDto } from './update-profile.dto';

export class UpdateMemberDto extends UpdateProfileDto {
  @ApiPropertyOptional({
    enum: Role,
    description: 'Role assigned to the member',
    example: Role.USER,
  })
  @IsOptional()
  @IsEnum(Role, { message: 'Invalid role' })
  role?: Role;

  @ApiPropertyOptional({
    enum: UserStatus,
    description: 'Account status of the member',
    example: UserStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(UserStatus, { message: 'Invalid member status' })
  status?: UserStatus;

  @ApiPropertyOptional({
    description: 'Whether the member email is verified',
    example: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'emailVerified must be a boolean' })
  emailVerified?: boolean;

  @ApiPropertyOptional({
    description: 'Whether the member phone number is verified',
    example: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'phoneVerified must be a boolean' })
  phoneVerified?: boolean;

  @ApiPropertyOptional({
    description: 'Whether the member is verified by an admin',
    example: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'adminVerified must be a boolean' })
  adminVerified?: boolean;
}
