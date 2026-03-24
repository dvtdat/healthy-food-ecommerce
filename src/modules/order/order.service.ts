import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository, ObjectId } from '@mikro-orm/mongodb';
import {
  Order,
  OrderItem,
  OrderStatus,
  Product,
  User,
  UserRole,
} from 'src/entities';
import { CreateOrderDto, UpdateOrderStatusDto } from './dto';
import { CurrentUserData } from 'src/common/decorators/current-user.decorator';

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
  ) {}

  async create(dto: CreateOrderDto, currentUser: CurrentUserData) {
    const user = await this.userRepository.findOne({
      _id: new ObjectId(currentUser._id),
      deletedAt: null,
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const em = this.orderRepository.getEntityManager();

    const products = await Promise.all(
      dto.items.map(async (item) => {
        const product = await this.productRepository.findOne({
          _id: new ObjectId(item.productId),
          deletedAt: null,
        });

        if (!product) {
          throw new NotFoundException(`Product ${item.productId} not found`);
        }

        if (product.stock < item.quantity) {
          throw new Error(
            `Insufficient stock for product "${product.name}": available ${product.stock}, requested ${item.quantity}`,
          );
        }

        return { product, quantity: item.quantity };
      }),
    );

    const totalAmount = products.reduce(
      (sum, { product, quantity }) => sum + product.price * quantity,
      0,
    );

    const order = new Order(user, totalAmount, dto.shippingAddress, dto.notes);
    em.persist(order);

    for (const { product, quantity } of products) {
      const orderItem = new OrderItem(order, product, quantity, product.price);
      em.persist(orderItem);
      product.stock -= quantity;
      em.persist(product);
    }

    await em.flush();
    return order;
  }

  async findAll(pageSize = 10, pageNumber = 1) {
    const [data, total] = await this.orderRepository.findAndCount(
      { deletedAt: null },
      {
        limit: pageSize,
        offset: (pageNumber - 1) * pageSize,
        orderBy: { createdAt: 'desc' },
        populate: ['user'],
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

    order.status = dto.status;
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
}
