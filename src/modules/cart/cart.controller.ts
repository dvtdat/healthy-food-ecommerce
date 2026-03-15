import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CartService } from './cart.service';
import { AddCartItemDto, UpdateCartItemDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth/jwt-auth.guard';
import {
  CurrentUser,
  CurrentUserData,
} from 'src/common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('carts')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get('me')
  getCart(@CurrentUser() currentUser: CurrentUserData) {
    return this.cartService.getCart(currentUser);
  }

  @Post('items')
  addItem(
    @Body() addCartItemDto: AddCartItemDto,
    @CurrentUser() currentUser: CurrentUserData,
  ) {
    return this.cartService.addItem(addCartItemDto, currentUser);
  }

  @Patch('items/:productId')
  updateItem(
    @Param('productId') productId: string,
    @Body() updateCartItemDto: UpdateCartItemDto,
    @CurrentUser() currentUser: CurrentUserData,
  ) {
    return this.cartService.updateItem(
      productId,
      updateCartItemDto,
      currentUser,
    );
  }

  @Delete('items/:productId')
  removeItem(
    @Param('productId') productId: string,
    @CurrentUser() currentUser: CurrentUserData,
  ) {
    return this.cartService.removeItem(productId, currentUser);
  }

  @Delete()
  clearCart(@CurrentUser() currentUser: CurrentUserData) {
    return this.cartService.clearCart(currentUser);
  }
}
