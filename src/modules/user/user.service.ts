import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateUserDto, UpdateUserDto, UpdateUserStatusDto } from './dto';
import { EntityRepository, ObjectId } from '@mikro-orm/mongodb';
import { Order, User, UserRole } from 'src/entities';
import { InjectRepository } from '@mikro-orm/nestjs';
import { utils } from 'src/common/utils';
import { CurrentUserData } from 'src/common/decorators/current-user.decorator';

@Injectable()
export class UserService {
  private userRepository: EntityRepository<User>;

  constructor(
    @InjectRepository(User) userRepository: EntityRepository<User>,
    @InjectRepository(Order)
    private readonly orderRepository: EntityRepository<Order>,
  ) {
    this.userRepository = userRepository;
  }

  async create(createUserDto: CreateUserDto) {
    const existingUser = await this.userRepository.findOne({
      email: createUserDto.email,
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const hashedPassword = await utils.hashPassword(createUserDto.password);
    const user = new User(
      createUserDto.email,
      createUserDto.firstName,
      createUserDto.lastName,
      hashedPassword,
    );
    await this.userRepository.getEntityManager().persistAndFlush(user);
    return user;
  }

  async findAll(pageSize = 10, pageNumber = 1): Promise<any> {
    const [users, total] = await this.userRepository.findAndCount(
      { deletedAt: null },
      {
        limit: pageSize,
        offset: (pageNumber - 1) * pageSize,
        orderBy: { _id: 'asc' },
      },
    );

    const orders = await this.orderRepository.find({
      user: { $in: users.map((u) => u._id) } as any,
      deletedAt: null,
    });

    const statsMap = new Map<
      string,
      { orderCount: number; totalSpent: number }
    >();
    for (const order of orders) {
      const key = order.user._id.toHexString();
      const entry = statsMap.get(key) ?? { orderCount: 0, totalSpent: 0 };
      statsMap.set(key, {
        orderCount: entry.orderCount + 1,
        totalSpent: entry.totalSpent + order.totalAmount,
      });
    }

    const data = users.map((user) => {
      const { orderCount = 0, totalSpent = 0 } =
        statsMap.get(user._id.toHexString()) ?? {};
      return { ...user, orderCount, totalSpent };
    });

    return {
      data,
      total,
      pageSize,
      pageNumber,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findUserOrders(
    userId: string,
    pageSize = 10,
    pageNumber = 1,
  ): Promise<any> {
    const user = await this.userRepository.findOne({
      _id: new ObjectId(userId),
      deletedAt: null,
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const [data, total] = await this.orderRepository.findAndCount(
      { user: new ObjectId(userId), deletedAt: null },
      {
        limit: pageSize,
        offset: (pageNumber - 1) * pageSize,
        orderBy: { createdAt: 'desc' },
        populate: ['items', 'items.product', 'payment'] as any,
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

  async findByEmail(email: string) {
    const user = await this.userRepository.findOne({
      email,
      deletedAt: null,
    });

    return user;
  }

  async findByEmailPublic(email: string) {
    const user = await this.findByEmail(email);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const { password: _password, ...safe } = user as User & {
      password?: string;
    };
    return safe;
  }

  async findById(id: string) {
    const user = await this.userRepository.findOne({
      _id: new ObjectId(id),
      deletedAt: null,
    });

    return user;
  }

  async getMe(userId: string): Promise<Omit<User, 'password'>> {
    const user = await this.userRepository.findOne({
      _id: new ObjectId(userId),
      deletedAt: null,
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
    currentUser: CurrentUserData,
  ) {
    const isOwner = currentUser._id === id;
    const isAdmin = currentUser.role === UserRole.ADMIN;

    if (!isOwner && !isAdmin) {
      throw new ForbiddenException('Access denied');
    }

    const user = await this.userRepository.findOne({
      _id: new ObjectId(id),
      deletedAt: null,
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (updateUserDto.role && !isAdmin) {
      throw new ForbiddenException('Only admins can change user roles');
    }

    if (updateUserDto.password) {
      updateUserDto.password = await utils.hashPassword(updateUserDto.password);
    }

    user.updatedAt = new Date();
    Object.assign(user, updateUserDto);

    await this.userRepository.getEntityManager().persistAndFlush(user);
    return user;
  }

  async updateStatus(id: string, dto: UpdateUserStatusDto) {
    const user = await this.userRepository.findOne({
      _id: new ObjectId(id),
      deletedAt: null,
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.isActive = dto.isActive;
    user.updatedAt = new Date();
    await this.userRepository.getEntityManager().persistAndFlush(user);

    return {
      message: `User ${dto.isActive ? 'activated' : 'deactivated'} successfully`,
    };
  }

  async remove(id: string) {
    const user = await this.userRepository.findOne({
      _id: new ObjectId(id),
      deletedAt: null,
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.deletedAt = new Date();
    await this.userRepository.getEntityManager().persistAndFlush(user);

    return { message: 'User deleted successfully' };
  }
}
