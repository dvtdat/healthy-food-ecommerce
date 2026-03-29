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
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CartService } from './cart.service';
import { AddCartItemDto, UpdateCartItemDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth/jwt-auth.guard';
import {
  CurrentUser,
  CurrentUserData,
} from 'src/common/decorators/current-user.decorator';
import { Cart } from 'src/entities';

@ApiTags('carts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('carts')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get or create the current user cart' })
  @ApiOkResponse({ type: Cart })
  getCart(@CurrentUser() currentUser: CurrentUserData) {
    return this.cartService.getCart(currentUser);
  }

  @Post('items')
  @ApiOperation({ summary: 'Add item to cart (increments if already exists)' })
  @ApiOkResponse({ type: Cart })
  addItem(
    @Body() addCartItemDto: AddCartItemDto,
    @CurrentUser() currentUser: CurrentUserData,
  ) {
    return this.cartService.addItem(addCartItemDto, currentUser);
  }

  @Patch('items/:productId')
  @ApiOperation({ summary: 'Update cart item quantity' })
  @ApiOkResponse({ type: Cart })
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
  @ApiOperation({ summary: 'Remove a product from cart' })
  @ApiOkResponse({ type: Cart })
  removeItem(
    @Param('productId') productId: string,
    @CurrentUser() currentUser: CurrentUserData,
  ) {
    return this.cartService.removeItem(productId, currentUser);
  }

  @Delete()
  @ApiOperation({ summary: 'Clear all items from cart' })
  @ApiOkResponse({ type: Cart })
  clearCart(@CurrentUser() currentUser: CurrentUserData) {
    return this.cartService.clearCart(currentUser);
  }
}
