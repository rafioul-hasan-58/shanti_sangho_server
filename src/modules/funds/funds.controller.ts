import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AuthGuard } from '../../common/guards/auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { FundsService } from './funds.service';
import { CreateFundDto, QueryFundDto, UpdateFundDto } from './dto';

@ApiTags('Funds')
@UseGuards(AuthGuard)
@Controller('funds')
export class FundsController {
  constructor(private readonly fundsService: FundsService) {}

  @Post()
  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new fund (Admin)' })
  @ApiResponse({
    status: 201,
    description: 'Fund created successfully.',
  })
  @ApiResponse({ status: 400, description: 'Validation failed.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 409, description: 'Fund name already in use.' })
  async create(@Body() dto: CreateFundDto) {
    const data = await this.fundsService.create(dto);
    return {
      message: 'Fund created successfully',
      data,
    };
  }

  @Public()
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Get all funds with optional filters, pagination, and financial balances (Public)',
  })
  @ApiResponse({
    status: 200,
    description: 'Funds retrieved successfully.',
  })
  async findAll(@Query() query: QueryFundDto) {
    const data = await this.fundsService.findAll(query);
    return {
      message: 'Funds retrieved successfully',
      data,
    };
  }

  @Public()
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get a single fund by ID with financial summary (Public)',
  })
  @ApiResponse({
    status: 200,
    description: 'Fund retrieved successfully.',
  })
  @ApiResponse({ status: 400, description: 'Invalid fund ID format.' })
  @ApiResponse({ status: 404, description: 'Fund not found.' })
  async findOne(@Param('id') id: string) {
    const data = await this.fundsService.findOne(id);
    return {
      message: 'Fund retrieved successfully',
      data,
    };
  }

  @Patch(':id')
  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a fund by ID (Admin)' })
  @ApiResponse({
    status: 200,
    description: 'Fund updated successfully.',
  })
  @ApiResponse({ status: 400, description: 'Validation failed.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Fund not found.' })
  @ApiResponse({ status: 409, description: 'Fund name conflict.' })
  async update(@Param('id') id: string, @Body() dto: UpdateFundDto) {
    const data = await this.fundsService.update(id, dto);
    return {
      message: 'Fund updated successfully',
      data,
    };
  }

  @Delete(':id')
  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a fund by ID (Admin)' })
  @ApiResponse({
    status: 200,
    description: 'Fund deleted successfully.',
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot delete fund with existing contributions or expenses.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Fund not found.' })
  async remove(@Param('id') id: string) {
    const data = await this.fundsService.remove(id);
    return {
      message: 'Fund deleted successfully',
      data,
    };
  }
}
