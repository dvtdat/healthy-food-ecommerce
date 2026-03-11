import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateUserDto, UpdateUserDto } from './dto';
import { EntityRepository, ObjectId } from '@mikro-orm/mongodb';
import { User } from 'src/entities';
import { InjectRepository } from '@mikro-orm/nestjs';
import { utils } from 'src/common/utils';

@Injectable()
export class UserService {
  private userRepository: EntityRepository<User>;

  constructor(@InjectRepository(User) userRepository: EntityRepository<User>) {
    this.userRepository = userRepository;
  }

  async create(createUserDto: CreateUserDto) {
    const existingUser = await this.userRepository.findOne({
      email: createUserDto.email,
    });

    if (existingUser) {
      throw new Error('User with this email already exists');
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

  async findAll(pageSize = 10, pageNumber = 1) {
    const [users, total] = await this.userRepository.findAndCount(
      { deletedAt: null },
      {
        limit: pageSize,
        offset: (pageNumber - 1) * pageSize,
        orderBy: { _id: 'asc' },
      },
    );

    return {
      data: users,
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

  async update(id: string, updateUserDto: UpdateUserDto) {
    const user = await this.userRepository.findOne({
      _id: new ObjectId(id),
      deletedAt: null,
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (updateUserDto.password) {
      updateUserDto.password = await utils.hashPassword(updateUserDto.password);
    }

    user.updatedAt = new Date();
    Object.assign(user, updateUserDto);

    await this.userRepository.getEntityManager().persistAndFlush(user);
    return user;
  }

  async remove(id: string) {
    const user = await this.userRepository.findOne({
      _id: new ObjectId(id),
      deletedAt: null,
    });

    if (!user) {
      throw new Error('User not found');
    }

    user.deletedAt = new Date();
    await this.userRepository.getEntityManager().persistAndFlush(user);

    return { message: 'User deleted successfully' };
  }
}
