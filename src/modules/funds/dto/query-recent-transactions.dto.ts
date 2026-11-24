import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

export enum RecentTransactionType {
  ALL = 'ALL',
  DONATION = 'DONATION',
  EXPENSE = 'EXPENSE',
}

export class QueryRecentTransactionsDto {
  @ApiPropertyOptional({
    description: 'Filter transaction type: ALL, DONATION, or EXPENSE',
    enum: RecentTransactionType,
    default: RecentTransactionType.ALL,
  })
  @IsOptional()
  @IsIn(['ALL', 'DONATION', 'EXPENSE'])
  type?: RecentTransactionType = RecentTransactionType.ALL;

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
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;
}
