import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository, ObjectId } from '@mikro-orm/mongodb';
import { Product, Review, User, UserRole } from 'src/entities';
import type { CurrentUserData } from 'src/common/decorators/current-user.decorator';
import type { CreateReviewDto, UpdateReviewDto } from './dto';

@Injectable()
export class ReviewService {
  constructor(
    @InjectRepository(Review)
    private readonly reviewRepository: EntityRepository<Review>,
    @InjectRepository(Product)
    private readonly productRepository: EntityRepository<Product>,
    @InjectRepository(User)
    private readonly userRepository: EntityRepository<User>,
  ) {}

  async create(dto: CreateReviewDto, currentUser: CurrentUserData) {
    const product = await this.productRepository.findOne({
      _id: new ObjectId(dto.productId),
      deletedAt: null,
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const existing = await this.reviewRepository.findOne({
      user: new ObjectId(currentUser._id),
      product: new ObjectId(dto.productId),
      deletedAt: null,
    });

    if (existing) {
      throw new ConflictException('You have already reviewed this product');
    }

    const user = await this.userRepository.findOne({
      _id: new ObjectId(currentUser._id),
      deletedAt: null,
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const review = new Review(user, product, dto.rating, dto.comment);
    await this.reviewRepository.getEntityManager().persistAndFlush(review);
    return review;
  }

  async findByProduct(productId: string, pageSize = 10, pageNumber = 1) {
    const product = await this.productRepository.findOne({
      _id: new ObjectId(productId),
      deletedAt: null,
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const [data, total] = await this.reviewRepository.findAndCount(
      { product: new ObjectId(productId), deletedAt: null },
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

  async update(id: string, dto: UpdateReviewDto, currentUser: CurrentUserData) {
    const review = await this.reviewRepository.findOne(
      { _id: new ObjectId(id), deletedAt: null },
      { populate: ['user'] },
    );

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    const isOwner = review.user._id.equals(new ObjectId(currentUser._id));

    if (!isOwner) {
      throw new ForbiddenException('Access denied');
    }

    if (dto.rating !== undefined) review.rating = dto.rating;
    if (dto.comment !== undefined) review.comment = dto.comment;

    await this.reviewRepository.getEntityManager().persistAndFlush(review);
    return review;
  }

  async remove(id: string, currentUser: CurrentUserData) {
    const review = await this.reviewRepository.findOne(
      { _id: new ObjectId(id), deletedAt: null },
      { populate: ['user'] },
    );

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    const isOwner = review.user._id.equals(new ObjectId(currentUser._id));
    const isAdmin = currentUser.role === UserRole.ADMIN;

    if (!isOwner && !isAdmin) {
      throw new ForbiddenException('Access denied');
    }

    review.deletedAt = new Date();
    await this.reviewRepository.getEntityManager().persistAndFlush(review);
    return { message: 'Review deleted successfully' };
  }
}
