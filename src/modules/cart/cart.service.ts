import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository, ObjectId } from '@mikro-orm/mongodb';
import { Cart, CartItem, Product, User } from 'src/entities';
import type { CurrentUserData } from 'src/common/decorators/current-user.decorator';
import type { AddCartItemDto, UpdateCartItemDto } from './dto';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(Cart)
    private readonly cartRepository: EntityRepository<Cart>,
    @InjectRepository(CartItem)
    private readonly cartItemRepository: EntityRepository<CartItem>,
    @InjectRepository(Product)
    private readonly productRepository: EntityRepository<Product>,
    @InjectRepository(User)
    private readonly userRepository: EntityRepository<User>,
  ) {}

  private async getOrCreateCart(currentUser: CurrentUserData): Promise<Cart> {
    const existing = await this.cartRepository.findOne(
      { user: new ObjectId(currentUser._id), deletedAt: null },
      { populate: ['items', 'items.product'] },
    );

    if (existing) {
      return existing;
    }

    const user = await this.userRepository.findOne({
      _id: new ObjectId(currentUser._id),
      deletedAt: null,
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const cart = new Cart(user);
    const em = this.cartRepository.getEntityManager();
    em.persist(cart);
    await em.flush();

    return this.cartRepository.findOneOrFail(
      { _id: cart._id },
      { populate: ['items', 'items.product'] },
    );
  }

  async getCart(currentUser: CurrentUserData) {
    return this.getOrCreateCart(currentUser);
  }

  async addItem(dto: AddCartItemDto, currentUser: CurrentUserData) {
    const product = await this.productRepository.findOne({
      _id: new ObjectId(dto.productId),
      deletedAt: null,
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const cart = await this.getOrCreateCart(currentUser);
    const em = this.cartRepository.getEntityManager();

    const existingItem = cart.items
      .getItems()
      .find((item) => item.product._id.equals(product._id));

    if (existingItem) {
      const newQuantity = existingItem.quantity + dto.quantity;
      if (product.stock < newQuantity) {
        throw new BadRequestException(
          `Insufficient stock: available ${product.stock}, requested ${newQuantity}`,
        );
      }
      existingItem.quantity = newQuantity;
      em.persist(existingItem);
    } else {
      if (product.stock < dto.quantity) {
        throw new BadRequestException(
          `Insufficient stock: available ${product.stock}, requested ${dto.quantity}`,
        );
      }
      const cartItem = new CartItem(cart, product, dto.quantity);
      em.persist(cartItem);
    }

    await em.flush();
    return this.getCart(currentUser);
  }

  async updateItem(
    productId: string,
    dto: UpdateCartItemDto,
    currentUser: CurrentUserData,
  ) {
    const cart = await this.getOrCreateCart(currentUser);

    const item = cart.items
      .getItems()
      .find((i) => i.product._id.equals(new ObjectId(productId)));

    if (!item) {
      throw new NotFoundException('Item not found in cart');
    }

    if (item.product.stock < dto.quantity) {
      throw new BadRequestException(
        `Insufficient stock: available ${item.product.stock}, requested ${dto.quantity}`,
      );
    }

    item.quantity = dto.quantity;
    await this.cartRepository.getEntityManager().persistAndFlush(item);
    return this.getCart(currentUser);
  }

  async removeItem(productId: string, currentUser: CurrentUserData) {
    const cart = await this.getOrCreateCart(currentUser);

    const item = cart.items
      .getItems()
      .find((i) => i.product._id.equals(new ObjectId(productId)));

    if (!item) {
      throw new NotFoundException('Item not found in cart');
    }

    const em = this.cartRepository.getEntityManager();
    em.remove(item);
    await em.flush();

    return this.getCart(currentUser);
  }

  async clearCart(currentUser: CurrentUserData) {
    const cart = await this.getOrCreateCart(currentUser);
    const em = this.cartRepository.getEntityManager();

    for (const item of cart.items.getItems()) {
      em.remove(item);
    }

    await em.flush();
    return this.getCart(currentUser);
  }
}
