import {
  Controller, Get, Post, Put, Delete, Body, Param, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CartService } from './cart.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Cart')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller({ path: 'cart', version: '1' })
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @ApiOperation({ summary: 'Get cart' })
  getCart(@CurrentUser('id') userId: string) {
    return this.cartService.getOrCreate(userId);
  }

  @Post('items')
  @ApiOperation({ summary: 'Add item to cart' })
  addItem(
    @CurrentUser('id') userId: string,
    @Body('productId') productId: string,
    @Body('quantity') quantity: number,
    @Body('variantId') variantId?: string,
  ) {
    return this.cartService.addItem(userId, productId, quantity, variantId);
  }

  @Put('items/:itemId')
  @ApiOperation({ summary: 'Update cart item quantity' })
  updateItem(
    @CurrentUser('id') userId: string,
    @Param('itemId') itemId: string,
    @Body('quantity') quantity: number,
  ) {
    return this.cartService.updateItem(userId, itemId, quantity);
  }

  @Delete('items/:itemId')
  @ApiOperation({ summary: 'Remove item from cart' })
  removeItem(@CurrentUser('id') userId: string, @Param('itemId') itemId: string) {
    return this.cartService.removeItem(userId, itemId);
  }

  @Delete()
  @ApiOperation({ summary: 'Clear cart' })
  clearCart(@CurrentUser('id') userId: string) {
    return this.cartService.clear(userId);
  }

  @Post('coupon')
  @ApiOperation({ summary: 'Apply coupon' })
  applyCoupon(@CurrentUser('id') userId: string, @Body('code') code: string) {
    return this.cartService.applyCoupon(userId, code);
  }

  @Delete('coupon')
  @ApiOperation({ summary: 'Remove coupon' })
  removeCoupon(@CurrentUser('id') userId: string) {
    return this.cartService.removeCoupon(userId);
  }
}
