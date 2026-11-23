import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length, Matches } from 'class-validator';
import { MAX_MESSAGE_LENGTH } from '../chatbot.constants';

export class SendMessageDto {
  @ApiProperty({
    description:
      'The question or message to ask the club assistant (1 to 1000 characters)',
    example: 'What are the membership fees and opening hours?',
    minLength: 1,
    maxLength: MAX_MESSAGE_LENGTH,
  })
  @IsString({ message: 'message must be a string' })
  @Length(1, MAX_MESSAGE_LENGTH, {
    message: `message must be between 1 and ${MAX_MESSAGE_LENGTH} characters`,
  })
  message: string;

  @ApiPropertyOptional({
    description:
      'Optional 24-character hexadecimal MongoDB ObjectId of an existing chat session to continue',
    example: '64a1b2c3d4e5f67890123456',
  })
  @IsOptional()
  @IsString({ message: 'sessionId must be a string' })
  @Matches(/^[0-9a-fA-F]{24}$/, {
    message: 'sessionId must be a valid 24-character hex MongoDB ObjectId',
  })
  sessionId?: string;
}
