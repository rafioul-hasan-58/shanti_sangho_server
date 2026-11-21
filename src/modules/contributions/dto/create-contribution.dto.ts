import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReceiveMethod } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
} from 'class-validator';

export class CreateContributionDto {
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
    description: 'Amount contributed in BDT (integer)',
    example: 2000,
    minimum: 1,
  })
  @Type(() => Number)
  @IsInt({ message: 'Amount must be an integer' })
  @IsPositive({ message: 'Amount must be greater than zero' })
  amount: number;

  @ApiProperty({
    enum: ReceiveMethod,
    description: 'Payment receive method',
    example: ReceiveMethod.BKASH,
  })
  @IsNotEmpty({ message: 'Payment method is required' })
  @IsEnum(ReceiveMethod, { message: 'Invalid payment method' })
  method: ReceiveMethod;

  @ApiPropertyOptional({
    description:
      'Date and time the contribution was received (defaults to now)',
    example: '2026-11-21T10:00:00.000Z',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: 'receivedAt must be a valid Date' })
  receivedAt?: Date;

  @ApiPropertyOptional({
    description:
      'MongoDB ObjectId of the registered member who contributed (if applicable)',
    example: '64a1b2c3d4e5f67890123477',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[0-9a-fA-F]{24}$/, {
    message: 'giverMemberId must be a valid 24-character hex ObjectId',
  })
  giverMemberId?: string;

  @ApiPropertyOptional({
    description:
      'Name of the contributor / donor (external donor or custom display name)',
    example: 'Hasan Ali',
  })
  @IsOptional()
  @IsString()
  giverName?: string;

  @ApiPropertyOptional({
    description: 'Optional note or remark for this contribution',
    example: 'Tournament sponsorship donation',
  })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({
    description:
      'Transaction ID, bKash TrxID, bank slip, or receipt reference number',
    example: 'BKASH-9X8K7L2M',
  })
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiPropertyOptional({
    description:
      'MongoDB ObjectId of the member/admin who received the money (defaults to current user)',
    example: '64a1b2c3d4e5f67890123499',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[0-9a-fA-F]{24}$/, {
    message: 'receivedById must be a valid 24-character hex ObjectId',
  })
  receivedById?: string;
}
