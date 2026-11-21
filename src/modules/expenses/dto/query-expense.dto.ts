import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Min,
} from 'class-validator';

export class QueryExpenseDto {
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
    description: 'Filter by Fund ID',
    example: '64a1b2c3d4e5f67890123456',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[0-9a-fA-F]{24}$/, {
    message: 'fundId must be a valid 24-character hex ObjectId',
  })
  fundId?: string;

  @ApiPropertyOptional({
    description: 'Filter by Spent By Member ID',
    example: '64a1b2c3d4e5f67890123499',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[0-9a-fA-F]{24}$/, {
    message: 'spentById must be a valid 24-character hex ObjectId',
  })
  spentById?: string;

  @ApiPropertyOptional({
    description: 'Filter expenses spent on or after this ISO date',
    example: '2026-01-01T00:00:00.000Z',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startDate?: Date;

  @ApiPropertyOptional({
    description: 'Filter expenses spent on or before this ISO date',
    example: '2026-12-31T23:59:59.999Z',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endDate?: Date;

  @ApiPropertyOptional({
    description: 'Search keyword matching spentOn or note',
    example: 'Jersey',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Field to sort by',
    enum: ['spentAt', 'amount', 'createdAt'],
    default: 'spentAt',
  })
  @IsOptional()
  @IsIn(['spentAt', 'amount', 'createdAt'])
  sortBy?: 'spentAt' | 'amount' | 'createdAt' = 'spentAt';

  @ApiPropertyOptional({
    description: 'Sort direction',
    enum: ['asc', 'desc'],
    default: 'desc',
  })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}
