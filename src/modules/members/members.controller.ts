import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role, UserStatus } from '@prisma/client';
import { AuthGuard, type JwtPayload } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { MembersService } from './members.service';
import { QueryMemberDto, UpdateMemberDto, UpdateProfileDto } from './dto';

@ApiTags('Members')
@UseGuards(AuthGuard)
@Controller('members')
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @Get('profile')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get authenticated member profile (My Profile)' })
  @ApiResponse({
    status: 200,
    description: 'Member profile retrieved successfully.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Member not found.' })
  async getMyProfile(@CurrentUser() user: JwtPayload) {
    const data = await this.membersService.getProfile(user.id);
    return {
      message: 'Profile retrieved successfully',
      data,
    };
  }

  @Patch('update-profile')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update authenticated member profile' })
  @ApiResponse({
    status: 200,
    description: 'Member profile updated successfully.',
  })
  @ApiResponse({ status: 400, description: 'Validation failed.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Member not found.' })
  async updateMyProfile(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateProfileDto,
  ) {
    const data = await this.membersService.updateProfile(user.id, dto);
    return {
      message: 'Profile updated successfully',
      data,
    };
  }

  @Public()
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Get all members with optional filters, pagination, and sorting (Public)',
  })
  @ApiResponse({
    status: 200,
    description: 'Members list retrieved successfully.',
  })
  async findAll(@Query() query: QueryMemberDto) {
    const data = await this.membersService.findAll(query);
    return {
      message: 'Members retrieved successfully',
      data,
    };
  }

  @Get(':id')
  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a single member by MongoDB ObjectId' })
  @ApiResponse({
    status: 200,
    description: 'Member retrieved successfully.',
  })
  @ApiResponse({ status: 400, description: 'Invalid member ID format.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Member not found.' })
  async findOne(@Param('id') id: string) {
    const data = await this.membersService.findOne(id);
    return {
      message: 'Member retrieved successfully',
      data,
    };
  }

  @Patch(':id/toggle-block')
  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Toggle member block/unblock status (SUSPENDED <-> ACTIVE)',
  })
  @ApiResponse({
    status: 200,
    description: 'Member block status toggled successfully.',
  })
  @ApiResponse({ status: 400, description: 'Invalid request or self-action.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Member not found.' })
  async toggleBlock(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    const data = await this.membersService.toggleBlockMember(id, user.id);
    return {
      message:
        data.status === UserStatus.SUSPENDED
          ? 'Member blocked successfully'
          : 'Member unblocked successfully',
      data,
    };
  }

  @Patch(':id')
  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a member by MongoDB ObjectId (Admin)' })
  @ApiResponse({
    status: 200,
    description: 'Member updated successfully.',
  })
  @ApiResponse({ status: 400, description: 'Validation failed.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Member not found.' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateMemberDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const data = await this.membersService.updateMember(id, dto, user.id);
    return {
      message: 'Member updated successfully',
      data,
    };
  }

  @Delete(':id')
  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a member by MongoDB ObjectId (Admin)' })
  @ApiResponse({
    status: 200,
    description: 'Member deleted successfully.',
  })
  @ApiResponse({ status: 400, description: 'Invalid request or self-action.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Member not found.' })
  async remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    const data = await this.membersService.deleteMember(id, user.id);
    return {
      message: 'Member deleted successfully',
      data,
    };
  }
}
