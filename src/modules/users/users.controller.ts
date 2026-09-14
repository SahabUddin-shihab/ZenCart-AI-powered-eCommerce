import {
  Controller, Get, Post, Put, Patch, Delete, Body, Param, Query,
  UseGuards, UploadedFile, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateBeautyProfileDto } from './dto/update-beauty-profile.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Users')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller({ path: 'users', version: '1' })
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // ── Admin endpoints ──────────────────────────────────────────────────────

  @Get()
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'List all users (Admin)' })
  findAll(@Query() dto: PaginationDto) {
    return this.usersService.findAll(dto);
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Get user by ID (Admin)' })
  findOne(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Patch(':id/suspend')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Suspend user' })
  suspend(@Param('id') id: string) {
    return this.usersService.suspend(id);
  }

  @Patch(':id/activate')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Activate user' })
  activate(@Param('id') id: string) {
    return this.usersService.activate(id);
  }

  // ── Profile endpoints ────────────────────────────────────────────────────

  @Get('profile/me')
  @ApiOperation({ summary: 'Get my profile' })
  getProfile(@CurrentUser('id') userId: string) {
    return this.usersService.findById(userId);
  }

  @Put('profile/me')
  @ApiOperation({ summary: 'Update my profile' })
  updateProfile(@CurrentUser('id') userId: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(userId, dto);
  }

  @Put('profile/beauty')
  @ApiOperation({ summary: 'Update AI beauty profile' })
  updateBeautyProfile(@CurrentUser('id') userId: string, @Body() dto: UpdateBeautyProfileDto) {
    return this.usersService.updateBeautyProfile(userId, dto);
  }

  @Post('profile/avatar')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload avatar' })
  uploadAvatar(@CurrentUser('id') userId: string, @UploadedFile() file: Express.Multer.File) {
    return this.usersService.uploadAvatar(userId, file.buffer);
  }

  @Patch('profile/change-password')
  @ApiOperation({ summary: 'Change password' })
  changePassword(
    @CurrentUser('id') userId: string,
    @Body('currentPassword') current: string,
    @Body('newPassword') newPwd: string,
  ) {
    return this.usersService.changePassword(userId, current, newPwd);
  }

  // ── Address ──────────────────────────────────────────────────────────────

  @Get('addresses/me')
  @ApiOperation({ summary: 'Get my addresses' })
  getAddresses(@CurrentUser('id') userId: string) {
    return this.usersService.getAddresses(userId);
  }

  @Post('addresses/me')
  @ApiOperation({ summary: 'Add address' })
  addAddress(@CurrentUser('id') userId: string, @Body() data: any) {
    return this.usersService.addAddress(userId, data);
  }

  @Delete('addresses/:id')
  @ApiOperation({ summary: 'Delete address' })
  deleteAddress(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.usersService.deleteAddress(id, userId);
  }

  // ── Orders ───────────────────────────────────────────────────────────────

  @Get('orders/me')
  @ApiOperation({ summary: 'My order history' })
  getOrders(@CurrentUser('id') userId: string, @Query() dto: PaginationDto) {
    return this.usersService.getOrderHistory(userId, dto);
  }

  // ── Wishlist ─────────────────────────────────────────────────────────────

  @Get('wishlist/me')
  @ApiOperation({ summary: 'My wishlist' })
  getWishlist(@CurrentUser('id') userId: string) {
    return this.usersService.getWishlist(userId);
  }

  // ── Loyalty ──────────────────────────────────────────────────────────────

  @Get('loyalty/me')
  @ApiOperation({ summary: 'My loyalty points' })
  getLoyalty(@CurrentUser('id') userId: string) {
    return this.usersService.getLoyaltyPoints(userId);
  }
}
