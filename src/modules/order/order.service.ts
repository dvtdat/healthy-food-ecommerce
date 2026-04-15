import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository, ObjectId } from '@mikro-orm/mongodb';
import {
  Cart,
  CartItem,
  Order,
  OrderItem,
  OrderStatus,
  Product,
  StatusHistoryEntry,
  User,
  UserRole,
  Voucher,
  VoucherType,
  VoucherUsage,
} from 'src/entities';
import { CreateOrderDto, UpdateOrderStatusDto } from './dto';
import { CurrentUserData } from 'src/common/decorators/current-user.decorator';
import { VietQRService } from 'src/common/services/vietqr.service';
import {
  DELIVERY_OPTIONS,
  getDeliveryFee,
} from 'src/common/config/delivery.config';

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: EntityRepository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: EntityRepository<OrderItem>,
    @InjectRepository(Product)
    private readonly productRepository: EntityRepository<Product>,
    @InjectRepository(User)
    private readonly userRepository: EntityRepository<User>,
    @InjectRepository(Cart)
    private readonly cartRepository: EntityRepository<Cart>,
    @InjectRepository(CartItem)
    private readonly cartItemRepository: EntityRepository<CartItem>,
    @InjectRepository(Voucher)
    private readonly voucherRepository: EntityRepository<Voucher>,
    @InjectRepository(VoucherUsage)
    private readonly voucherUsageRepository: EntityRepository<VoucherUsage>,
    private readonly vietQRService: VietQRService,
  ) {}

  getDeliveryOptions() {
    return DELIVERY_OPTIONS;
  }

  async create(dto: CreateOrderDto, currentUser: CurrentUserData) {
    const user = await this.userRepository.findOne({
      _id: new ObjectId(currentUser._id),
      deletedAt: null,
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const cart = await this.cartRepository.findOne(
      { user: new ObjectId(currentUser._id), deletedAt: null },
      { populate: ['items', 'items.product'] },
    );

    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    const cartItems = cart.items.getItems();

    for (const item of cartItems) {
      if (item.product.deletedAt) {
        throw new BadRequestException(
          `Product "${item.product.name}" is no longer available`,
        );
      }
      if (item.product.stock < item.quantity) {
        throw new BadRequestException(
          `Insufficient stock for "${item.product.name}": available ${item.product.stock}, requested ${item.quantity}`,
        );
      }
    }

    const subtotal = cartItems.reduce(
      (sum, item) => sum + item.product.price * item.quantity,
      0,
    );

    const deliveryFee = getDeliveryFee(dto.deliveryOption);

    let discountAmount = 0;
    let appliedVoucher: Voucher | null = null;

    if (dto.voucherCode) {
      const voucherResult = await this.resolveVoucher(
        dto.voucherCode,
        subtotal,
        currentUser._id,
      );
      discountAmount = voucherResult.discountAmount;
      appliedVoucher = voucherResult.voucher;
    }

    const em = this.orderRepository.getEntityManager();
    const order = new Order(
      user,
      subtotal,
      dto.deliveryOption,
      deliveryFee,
      dto.shippingAddress,
      discountAmount,
      appliedVoucher?.code,
      dto.notes,
    );
    em.persist(order);

    for (const item of cartItems) {
      const orderItem = new OrderItem(
        order,
        item.product,
        item.quantity,
        item.product.price,
      );
      em.persist(orderItem);
      item.product.stock -= item.quantity;
      em.persist(item.product);
      em.remove(item);
    }

    if (appliedVoucher) {
      appliedVoucher.usedCount += 1;
      em.persist(appliedVoucher);
      const usage = new VoucherUsage(appliedVoucher, user, order);
      em.persist(usage);
    }

    await em.flush();
    return order;
  }

  private async resolveVoucher(
    code: string,
    subtotal: number,
    userId: string,
  ): Promise<{ voucher: Voucher; discountAmount: number }> {
    const voucher = await this.voucherRepository.findOne({
      code: code.toUpperCase(),
      deletedAt: null,
    });

    if (!voucher) throw new BadRequestException('Voucher not found');
    if (!voucher.isActive) throw new BadRequestException('Voucher is inactive');

    const now = new Date();
    if (now < voucher.validFrom || now > voucher.validTo) {
      throw new BadRequestException('Voucher has expired or is not yet valid');
    }

    if (
      voucher.usageLimit !== undefined &&
      voucher.usedCount >= voucher.usageLimit
    ) {
      throw new BadRequestException('Voucher usage limit reached');
    }

    if (
      voucher.minOrderAmount !== undefined &&
      subtotal < voucher.minOrderAmount
    ) {
      throw new BadRequestException(
        `Minimum order amount of ${voucher.minOrderAmount} required for this voucher`,
      );
    }

    if (voucher.perUserLimit !== undefined) {
      const userUsageCount = await this.voucherUsageRepository.count({
        voucher: voucher._id,
        user: new ObjectId(userId),
      });
      if (userUsageCount >= voucher.perUserLimit) {
        throw new BadRequestException(
          'You have already used this voucher the maximum number of times',
        );
      }
    }

    const discountAmount = this.calcDiscount(voucher, subtotal);
    return { voucher, discountAmount };
  }

  private calcDiscount(voucher: Voucher, subtotal: number): number {
    if (voucher.type === VoucherType.FIXED) {
      return Math.min(voucher.value, subtotal);
    }
    const raw = Math.floor((subtotal * voucher.value) / 100);
    return voucher.maxDiscount !== undefined
      ? Math.min(raw, voucher.maxDiscount)
      : raw;
  }

  async findAll(
    pageSize = 10,
    pageNumber = 1,
    status?: OrderStatus,
    userId?: string,
  ) {
    const where: Record<string, unknown> = { deletedAt: null };

    if (status) {
      where.status = status;
    }

    if (userId) {
      where.user = new ObjectId(userId);
    }

    const [data, total] = await this.orderRepository.findAndCount(where, {
      limit: pageSize,
      offset: (pageNumber - 1) * pageSize,
      orderBy: { createdAt: 'desc' },
      populate: ['user'],
    });

    return {
      data,
      total,
      pageSize,
      pageNumber,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findMyOrders(
    currentUser: CurrentUserData,
    pageSize = 10,
    pageNumber = 1,
  ) {
    const [data, total] = await this.orderRepository.findAndCount(
      { user: new ObjectId(currentUser._id), deletedAt: null },
      {
        limit: pageSize,
        offset: (pageNumber - 1) * pageSize,
        orderBy: { createdAt: 'desc' },
      },
    );

    return {
      data,
      total,
      pageSize,
      pageNumber,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findById(id: string, currentUser: CurrentUserData) {
    const order = await this.orderRepository.findOne(
      { _id: new ObjectId(id), deletedAt: null },
      { populate: ['user', 'items', 'items.product', 'payment'] },
    );

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const isOwner = order.user._id.equals(new ObjectId(currentUser._id));
    const isAdmin = currentUser.role === UserRole.ADMIN;

    if (!isOwner && !isAdmin) {
      throw new ForbiddenException('Access denied');
    }

    return order;
  }

  async updateStatus(id: string, dto: UpdateOrderStatusDto) {
    const order = await this.orderRepository.findOne({
      _id: new ObjectId(id),
      deletedAt: null,
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (dto.status === OrderStatus.SHIPPED) {
      if (!dto.trackingNumber || !dto.courierName) {
        throw new BadRequestException(
          'trackingNumber and courierName are required when shipping an order',
        );
      }
      order.trackingNumber = dto.trackingNumber;
      order.courierName = dto.courierName;
      if (dto.estimatedDeliveryDate) {
        order.estimatedDeliveryDate = new Date(dto.estimatedDeliveryDate);
      }
    }

    if (dto.status === OrderStatus.DELIVERED) {
      order.actualDeliveryDate = new Date();
    }

    order.status = dto.status;
    order.statusHistory = [
      ...order.statusHistory,
      new StatusHistoryEntry(dto.status, dto.note),
    ];

    await this.orderRepository.getEntityManager().persistAndFlush(order);
    return order;
  }

  async cancel(id: string, currentUser: CurrentUserData) {
    const order = await this.orderRepository.findOne(
      { _id: new ObjectId(id), deletedAt: null },
      { populate: ['user', 'items', 'items.product'] },
    );

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const isOwner = order.user._id.equals(new ObjectId(currentUser._id));
    const isAdmin = currentUser.role === UserRole.ADMIN;

    if (!isOwner && !isAdmin) {
      throw new ForbiddenException('Access denied');
    }

    if (!isAdmin && order.status !== OrderStatus.PENDING) {
      throw new ForbiddenException('Only pending orders can be cancelled');
    }

    const em = this.orderRepository.getEntityManager();

    for (const item of order.items) {
      item.product.stock += item.quantity;
      em.persist(item.product);
    }

    order.status = OrderStatus.CANCELLED;
    em.persist(order);
    await em.flush();

    return order;
  }

  async getPaymentQr(id: string, currentUser: CurrentUserData) {
    const order = await this.orderRepository.findOne(
      { _id: new ObjectId(id), deletedAt: null },
      { populate: ['user'] },
    );

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const isOwner = order.user._id.equals(new ObjectId(currentUser._id));
    const isAdmin = currentUser.role === UserRole.ADMIN;

    if (!isOwner && !isAdmin) {
      throw new ForbiddenException('Access denied');
    }

    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException(
        'QR code is only available for pending orders',
      );
    }

    return this.vietQRService.getPaymentInfo(id, order.totalAmount);
  }
}
