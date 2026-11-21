import { ApiPropertyOptional } from '@nestjs/swagger';
import { ReceiveMethod } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Min,
} from 'class-validator';

export class QueryContributionDto {
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
    description: 'Filter by Giver Member ID',
    example: '64a1b2c3d4e5f67890123477',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[0-9a-fA-F]{24}$/, {
    message: 'giverMemberId must be a valid 24-character hex ObjectId',
  })
  giverMemberId?: string;

  @ApiPropertyOptional({
    description: 'Filter by Received By Member ID',
    example: '64a1b2c3d4e5f67890123499',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[0-9a-fA-F]{24}$/, {
    message: 'receivedById must be a valid 24-character hex ObjectId',
  })
  receivedById?: string;

  @ApiPropertyOptional({
    description: 'Filter by payment method',
    enum: ReceiveMethod,
  })
  @IsOptional()
  @IsEnum(ReceiveMethod, { message: 'Invalid payment method' })
  method?: ReceiveMethod;

  @ApiPropertyOptional({
    description: 'Filter contributions received on or after this ISO date',
    example: '2026-01-01T00:00:00.000Z',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startDate?: Date;

  @ApiPropertyOptional({
    description: 'Filter contributions received on or before this ISO date',
    example: '2026-12-31T23:59:59.999Z',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endDate?: Date;

  @ApiPropertyOptional({
    description: 'Search keyword matching giverName, reference, or note',
    example: 'BKASH',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Field to sort by',
    enum: ['receivedAt', 'amount', 'createdAt'],
    default: 'receivedAt',
  })
  @IsOptional()
  @IsIn(['receivedAt', 'amount', 'createdAt'])
  sortBy?: 'receivedAt' | 'amount' | 'createdAt' = 'receivedAt';

  @ApiPropertyOptional({
    description: 'Sort direction',
    enum: ['asc', 'desc'],
    default: 'desc',
  })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}
