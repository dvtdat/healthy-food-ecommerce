import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository, ObjectId } from '@mikro-orm/mongodb';
import { QueryOrder, wrap } from '@mikro-orm/core';
import { Category, Product, Review } from 'src/entities';
import { CreateProductDto, UpdateProductDto } from './dto';

export enum ProductSortOption {
  NEWEST = 'newest',
  PRICE_ASC = 'price_asc',
  PRICE_DESC = 'price_desc',
  TOP_RATED = 'top_rated',
  MOST_VIEWED = 'most_viewed',
}

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
      throw new ConflictException('Product with this slug already exists');
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
    sort: ProductSortOption = ProductSortOption.NEWEST,
  ): Promise<any> {
    const where: Record<string, unknown> = { deletedAt: null };

    if (categoryId) {
      where.category = new ObjectId(categoryId);
    }

    // top_rated requires in-memory sort since averageRating is computed
    if (sort === ProductSortOption.TOP_RATED) {
      const allProducts = await this.productRepository.find(where, {
        populate: ['category'],
      });

      const stats = await this.getReviewStats(allProducts.map((p) => p._id));

      const sorted = allProducts
        .map((p) => {
          const { averageRating = 0, reviewCount = 0 } =
            stats.get(p._id.toHexString()) ?? {};
          return { ...wrap(p).toPOJO(), averageRating, reviewCount };
        })
        .sort((a, b) => b.averageRating - a.averageRating);

      const total = sorted.length;
      const data = sorted.slice(
        (pageNumber - 1) * pageSize,
        pageNumber * pageSize,
      );

      return {
        data,
        total,
        pageSize,
        pageNumber,
        totalPages: Math.ceil(total / pageSize),
      };
    }

    const orderByMap: Record<ProductSortOption, Record<string, QueryOrder>> = {
      [ProductSortOption.NEWEST]: { createdAt: QueryOrder.DESC },
      [ProductSortOption.PRICE_ASC]: { price: QueryOrder.ASC },
      [ProductSortOption.PRICE_DESC]: { price: QueryOrder.DESC },
      [ProductSortOption.MOST_VIEWED]: { viewCount: QueryOrder.DESC },
      [ProductSortOption.TOP_RATED]: { createdAt: QueryOrder.DESC }, // unreachable, fallback
    };

    const [products, total] = await this.productRepository.findAndCount(where, {
      limit: pageSize,
      offset: (pageNumber - 1) * pageSize,
      orderBy: orderByMap[sort],
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

    product.viewCount += 1;
    void this.productRepository
      .getEntityManager()
      .flush()
      .catch(() => {
        /* empty */
      });

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
