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
import { AuthGuard, type JwtPayload } from '../../common/guards/auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { ContributionsService } from './contributions.service';
import {
  CreateContributionDto,
  QueryContributionDto,
  UpdateContributionDto,
} from './dto';

@ApiTags('Contributions')
@UseGuards(AuthGuard)
@Controller('contributions')
export class ContributionsController {
  constructor(private readonly contributionsService: ContributionsService) {}

  @Post()
  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.MODERATOR)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Record a new contribution / donation' })
  @ApiResponse({
    status: 201,
    description: 'Contribution created successfully.',
  })
  @ApiResponse({ status: 400, description: 'Validation failed.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Fund or Member not found.' })
  async create(
    @Body() dto: CreateContributionDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const data = await this.contributionsService.create(dto, user.id);
    return {
      message: 'Contribution recorded successfully',
      data,
    };
  }

  @Public()
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Get all contributions with filters, date range, pagination, and total sum (Public)',
  })
  @ApiResponse({
    status: 200,
    description: 'Contributions list retrieved successfully.',
  })
  async findAll(@Query() query: QueryContributionDto) {
    const data = await this.contributionsService.findAll(query);
    return {
      message: 'Contributions retrieved successfully',
      data,
    };
  }

  @Public()
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a single contribution by ID (Public)' })
  @ApiResponse({
    status: 200,
    description: 'Contribution retrieved successfully.',
  })
  @ApiResponse({ status: 400, description: 'Invalid contribution ID format.' })
  @ApiResponse({ status: 404, description: 'Contribution not found.' })
  async findOne(@Param('id') id: string) {
    const data = await this.contributionsService.findOne(id);
    return {
      message: 'Contribution retrieved successfully',
      data,
    };
  }

  @Patch(':id')
  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a contribution by ID (Admin)' })
  @ApiResponse({
    status: 200,
    description: 'Contribution updated successfully.',
  })
  @ApiResponse({ status: 400, description: 'Validation failed.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({
    status: 404,
    description: 'Contribution, Fund, or Member not found.',
  })
  async update(@Param('id') id: string, @Body() dto: UpdateContributionDto) {
    const data = await this.contributionsService.update(id, dto);
    return {
      message: 'Contribution updated successfully',
      data,
    };
  }

  @Delete(':id')
  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a contribution by ID (Admin)' })
  @ApiResponse({
    status: 200,
    description: 'Contribution deleted successfully.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Contribution not found.' })
  async remove(@Param('id') id: string) {
    const data = await this.contributionsService.remove(id);
    return {
      message: 'Contribution deleted successfully',
      data,
    };
  }
}
