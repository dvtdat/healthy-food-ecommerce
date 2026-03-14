import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';
import { Cart, CartItem, Product, User } from 'src/entities';

@Module({
  imports: [MikroOrmModule.forFeature([Cart, CartItem, Product, User])],
  controllers: [CartController],
  providers: [CartService],
  exports: [CartService],
})
export class CartModule {}
