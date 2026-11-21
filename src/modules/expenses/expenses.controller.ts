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
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto, QueryExpenseDto, UpdateExpenseDto } from './dto';

@ApiTags('Expenses')
@UseGuards(AuthGuard)
@Controller('expenses')
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Post()
  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Record a new fund expense (Admin)' })
  @ApiResponse({
    status: 201,
    description: 'Expense created successfully.',
  })
  @ApiResponse({ status: 400, description: 'Validation failed.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Fund or Member not found.' })
  async create(@Body() dto: CreateExpenseDto, @CurrentUser() user: JwtPayload) {
    const data = await this.expensesService.create(dto, user.id);
    return {
      message: 'Expense recorded successfully',
      data,
    };
  }

  @Public()
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Get all expenses with filters, date range, pagination, and total sum (Public)',
  })
  @ApiResponse({
    status: 200,
    description: 'Expenses list retrieved successfully.',
  })
  async findAll(@Query() query: QueryExpenseDto) {
    const data = await this.expensesService.findAll(query);
    return {
      message: 'Expenses retrieved successfully',
      data,
    };
  }

  @Public()
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a single expense by ID (Public)' })
  @ApiResponse({
    status: 200,
    description: 'Expense retrieved successfully.',
  })
  @ApiResponse({ status: 400, description: 'Invalid expense ID format.' })
  @ApiResponse({ status: 404, description: 'Expense not found.' })
  async findOne(@Param('id') id: string) {
    const data = await this.expensesService.findOne(id);
    return {
      message: 'Expense retrieved successfully',
      data,
    };
  }

  @Patch(':id')
  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update an expense by ID (Admin)' })
  @ApiResponse({
    status: 200,
    description: 'Expense updated successfully.',
  })
  @ApiResponse({ status: 400, description: 'Validation failed.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({
    status: 404,
    description: 'Expense, Fund, or Member not found.',
  })
  async update(@Param('id') id: string, @Body() dto: UpdateExpenseDto) {
    const data = await this.expensesService.update(id, dto);
    return {
      message: 'Expense updated successfully',
      data,
    };
  }

  @Delete(':id')
  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete an expense by ID (Admin)' })
  @ApiResponse({
    status: 200,
    description: 'Expense deleted successfully.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Expense not found.' })
  async remove(@Param('id') id: string) {
    const data = await this.expensesService.remove(id);
    return {
      message: 'Expense deleted successfully',
      data,
    };
  }
}
