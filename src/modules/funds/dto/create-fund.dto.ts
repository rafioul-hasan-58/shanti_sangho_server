import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FundCategory } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateFundDto {
  @ApiProperty({
    description: 'Unique name of the fund / campaign',
    example: 'GPL 2026 Tournament Fund',
  })
  @IsNotEmpty({ message: 'Fund name is required' })
  @IsString({ message: 'Fund name must be a string' })
  @MinLength(2, { message: 'Fund name must be at least 2 characters' })
  @MaxLength(100, { message: 'Fund name cannot exceed 100 characters' })
  name: string;

  @ApiProperty({
    enum: FundCategory,
    description: 'Category of the fund',
    example: FundCategory.GPL,
  })
  @IsNotEmpty({ message: 'Fund category is required' })
  @IsEnum(FundCategory, { message: 'Invalid fund category' })
  category: FundCategory;

  @ApiPropertyOptional({
    description:
      'Whether the fund is currently active and accepting contributions',
    default: true,
    example: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'isActive must be a boolean' })
  isActive?: boolean;
}
