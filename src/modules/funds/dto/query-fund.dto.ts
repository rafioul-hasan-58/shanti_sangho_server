import { ApiPropertyOptional } from '@nestjs/swagger';
import { FundCategory } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class QueryFundDto {
  @ApiPropertyOptional({
    description: 'Page number (starts from 1)',
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    default: 10,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Filter by fund category',
    enum: FundCategory,
  })
  @IsOptional()
  @IsEnum(FundCategory, { message: 'Invalid fund category' })
  category?: FundCategory;

  @ApiPropertyOptional({
    description: 'Filter by active status',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return undefined;
  })
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Search keyword matching fund name',
    example: 'GPL',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Field to sort by',
    enum: ['createdAt', 'updatedAt', 'name', 'category', 'isActive'],
    default: 'createdAt',
  })
  @IsOptional()
  @IsIn(['createdAt', 'updatedAt', 'name', 'category', 'isActive'])
  sortBy?: 'createdAt' | 'updatedAt' | 'name' | 'category' | 'isActive' =
    'createdAt';

  @ApiPropertyOptional({
    description: 'Sort direction',
    enum: ['asc', 'desc'],
    default: 'desc',
  })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}
