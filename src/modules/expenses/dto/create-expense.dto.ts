import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
} from 'class-validator';

export class CreateExpenseDto {
  @ApiProperty({
    description: 'MongoDB ObjectId of the target Fund',
    example: '64a1b2c3d4e5f67890123456',
  })
  @IsNotEmpty({ message: 'fundId is required' })
  @IsString({ message: 'fundId must be a string' })
  @Matches(/^[0-9a-fA-F]{24}$/, {
    message: 'fundId must be a valid 24-character hex ObjectId',
  })
  fundId: string;

  @ApiProperty({
    description: 'Amount spent in BDT (integer)',
    example: 1500,
    minimum: 1,
  })
  @Type(() => Number)
  @IsInt({ message: 'Amount must be an integer' })
  @IsPositive({ message: 'Amount must be greater than zero' })
  amount: number;

  @ApiProperty({
    description: 'What the money was spent on',
    example: 'Jersey printing and refreshments for final match',
  })
  @IsNotEmpty({ message: 'spentOn is required' })
  @IsString({ message: 'spentOn must be a string' })
  spentOn: string;

  @ApiPropertyOptional({
    description: 'Date and time the expense occurred (defaults to now)',
    example: '2026-11-21T15:30:00.000Z',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: 'spentAt must be a valid Date' })
  spentAt?: Date;

  @ApiPropertyOptional({
    description: 'Optional note or remark for this expense',
    example: 'Approved by Committee President',
  })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({
    description: 'Receipt, invoice, or voucher image URL',
    example: 'https://res.cloudinary.com/demo/image/upload/receipt123.jpg',
  })
  @IsOptional()
  @IsString()
  receiptUrl?: string;

  @ApiPropertyOptional({
    description:
      'MongoDB ObjectId of the member who spent the money (defaults to current user)',
    example: '64a1b2c3d4e5f67890123499',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[0-9a-fA-F]{24}$/, {
    message: 'spentById must be a valid 24-character hex ObjectId',
  })
  spentById?: string;
}
