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
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ExecutivesService } from './executives.service';
import {
  CreateExecutiveDto,
  QueryExecutiveDto,
  UpdateExecutiveDto,
} from './dto';

@ApiTags('Executives')
@Controller('executives')
export class ExecutivesController {
  constructor(private readonly executivesService: ExecutivesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a new executive' })
  @ApiResponse({
    status: 201,
    description: 'Executive created successfully.',
  })
  @ApiResponse({ status: 400, description: 'Validation failed.' })
  @ApiResponse({ status: 409, description: 'Executive slug already in use.' })
  async create(@Body() dto: CreateExecutiveDto) {
    const data = await this.executivesService.create(dto);
    return {
      message: 'Executive created successfully',
      data,
    };
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Get all executives with optional filters, pagination, and sorting',
  })
  @ApiResponse({
    status: 200,
    description: 'Executives list retrieved successfully.',
  })
  async findAll(@Query() query: QueryExecutiveDto) {
    const data = await this.executivesService.findAll(query);
    return {
      message: 'Executives retrieved successfully',
      data,
    };
  }

  @Get(':identifier')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get a single executive by MongoDB ObjectId or unique slug',
  })
  @ApiResponse({
    status: 200,
    description: 'Executive details retrieved successfully.',
  })
  @ApiResponse({ status: 404, description: 'Executive not found.' })
  async findOne(@Param('identifier') identifier: string) {
    const data = await this.executivesService.findOne(identifier);
    return {
      message: 'Executive retrieved successfully',
      data,
    };
  }

  @Patch(':identifier')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update an existing executive by MongoDB ObjectId or unique slug',
  })
  @ApiResponse({
    status: 200,
    description: 'Executive updated successfully.',
  })
  @ApiResponse({ status: 400, description: 'Validation failed.' })
  @ApiResponse({ status: 404, description: 'Executive not found.' })
  @ApiResponse({
    status: 409,
    description: 'New slug conflicts with an existing executive.',
  })
  async update(
    @Param('identifier') identifier: string,
    @Body() dto: UpdateExecutiveDto,
  ) {
    const data = await this.executivesService.update(identifier, dto);
    return {
      message: 'Executive updated successfully',
      data,
    };
  }

  @Delete(':identifier')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete an executive by MongoDB ObjectId or unique slug',
  })
  @ApiResponse({
    status: 200,
    description: 'Executive deleted successfully.',
  })
  @ApiResponse({ status: 404, description: 'Executive not found.' })
  async delete(@Param('identifier') identifier: string) {
    const data = await this.executivesService.delete(identifier);
    return {
      message: 'Executive deleted successfully',
      data,
    };
  }
}
