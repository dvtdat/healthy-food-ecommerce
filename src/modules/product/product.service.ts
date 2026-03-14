import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository, ObjectId } from '@mikro-orm/mongodb';
import { Category, Product } from 'src/entities';
import { CreateProductDto, UpdateProductDto } from './dto';

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: EntityRepository<Product>,
    @InjectRepository(Category)
    private readonly categoryRepository: EntityRepository<Category>,
  ) {}

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

  async findAll(pageSize = 10, pageNumber = 1, categoryId?: string) {
    const where: Record<string, unknown> = { deletedAt: null };

    if (categoryId) {
      where.category = new ObjectId(categoryId);
    }

    const [data, total] = await this.productRepository.findAndCount(where, {
      limit: pageSize,
      offset: (pageNumber - 1) * pageSize,
      orderBy: { createdAt: 'desc' },
      populate: ['category'],
    });

    return {
      data,
      total,
      pageSize,
      pageNumber,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findById(id: string) {
    const product = await this.productRepository.findOne(
      { _id: new ObjectId(id), deletedAt: null },
      { populate: ['category'] },
    );

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async findBySlug(slug: string) {
    const product = await this.productRepository.findOne(
      { slug, deletedAt: null },
      { populate: ['category'] },
    );

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
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
