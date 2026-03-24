import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository, ObjectId } from '@mikro-orm/mongodb';
import { wrap } from '@mikro-orm/core';
import { Category, Product, Review } from 'src/entities';
import { CreateProductDto, UpdateProductDto } from './dto';

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: EntityRepository<Product>,
    @InjectRepository(Category)
    private readonly categoryRepository: EntityRepository<Category>,
    @InjectRepository(Review)
    private readonly reviewRepository: EntityRepository<Review>,
  ) {}

  private async getReviewStats(
    productIds: ObjectId[],
  ): Promise<Map<string, { averageRating: number; reviewCount: number }>> {
    const reviews = await this.reviewRepository.find({
      product: { $in: productIds } as any,
      deletedAt: null,
    });

    const totals = new Map<string, { sum: number; count: number }>();
    for (const review of reviews) {
      const key = review.product._id.toHexString();
      const entry = totals.get(key) ?? { sum: 0, count: 0 };
      totals.set(key, {
        sum: entry.sum + review.rating,
        count: entry.count + 1,
      });
    }

    const stats = new Map<
      string,
      { averageRating: number; reviewCount: number }
    >();
    for (const [key, { sum, count }] of totals) {
      stats.set(key, {
        averageRating: Math.round((sum / count) * 10) / 10,
        reviewCount: count,
      });
    }
    return stats;
  }

  async create(createProductDto: CreateProductDto) {
    const existing = await this.productRepository.findOne({
      slug: createProductDto.slug,
    });

    if (existing) {
      throw new Error('Product with this slug already exists');
    }

    const category = await this.categoryRepository.findOne({
      _id: new ObjectId(createProductDto.categoryId),
      deletedAt: null,
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const product = new Product(
      createProductDto.name,
      createProductDto.slug,
      createProductDto.price,
      createProductDto.stock,
      category,
      createProductDto.description,
      createProductDto.imageUrl,
    );

    await this.productRepository.getEntityManager().persistAndFlush(product);
    return product;
  }

  async findAll(
    pageSize = 10,
    pageNumber = 1,
    categoryId?: string,
  ): Promise<any> {
    const where: Record<string, unknown> = { deletedAt: null };

    if (categoryId) {
      where.category = new ObjectId(categoryId);
    }

    const [products, total] = await this.productRepository.findAndCount(where, {
      limit: pageSize,
      offset: (pageNumber - 1) * pageSize,
      orderBy: { createdAt: 'desc' },
      populate: ['category'],
    });

    const stats = await this.getReviewStats(products.map((p) => p._id));

    const data = products.map((product) => {
      const { averageRating = 0, reviewCount = 0 } =
        stats.get(product._id.toHexString()) ?? {};
      return { ...wrap(product).toPOJO(), averageRating, reviewCount };
    });

    return {
      data,
      total,
      pageSize,
      pageNumber,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findById(id: string): Promise<any> {
    const product = await this.productRepository.findOne(
      { _id: new ObjectId(id), deletedAt: null },
      { populate: ['category'] },
    );

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const stats = await this.getReviewStats([product._id]);
    const { averageRating = 0, reviewCount = 0 } =
      stats.get(product._id.toHexString()) ?? {};
    return { ...wrap(product).toPOJO(), averageRating, reviewCount };
  }

  async findBySlug(slug: string): Promise<any> {
    const product = await this.productRepository.findOne(
      { slug, deletedAt: null },
      { populate: ['category'] },
    );

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const stats = await this.getReviewStats([product._id]);
    const { averageRating = 0, reviewCount = 0 } =
      stats.get(product._id.toHexString()) ?? {};
    return { ...wrap(product).toPOJO(), averageRating, reviewCount };
  }

  async update(id: string, updateProductDto: UpdateProductDto) {
    const product = await this.productRepository.findOne({
      _id: new ObjectId(id),
      deletedAt: null,
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (updateProductDto.categoryId) {
      const category = await this.categoryRepository.findOne({
        _id: new ObjectId(updateProductDto.categoryId),
        deletedAt: null,
      });

      if (!category) {
        throw new NotFoundException('Category not found');
      }

      product.category = category;
    }

    const { categoryId: _, ...rest } = updateProductDto;
    Object.assign(product, rest);

    await this.productRepository.getEntityManager().persistAndFlush(product);
    return product;
  }

  async remove(id: string) {
    const product = await this.productRepository.findOne({
      _id: new ObjectId(id),
      deletedAt: null,
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    product.deletedAt = new Date();
    await this.productRepository.getEntityManager().persistAndFlush(product);
    return { message: 'Product deleted successfully' };
  }
}
