import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository, ObjectId } from '@mikro-orm/mongodb';
import { Category } from 'src/entities';
import { CreateCategoryDto, UpdateCategoryDto } from './dto';

@Injectable()
export class CategoryService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: EntityRepository<Category>,
  ) {}

  async create(createCategoryDto: CreateCategoryDto) {
    const existing = await this.categoryRepository.findOne({
      slug: createCategoryDto.slug,
    });

    if (existing) {
      throw new ConflictException('Category with this slug already exists');
    }

    const category = new Category(
      createCategoryDto.name,
      createCategoryDto.slug,
      createCategoryDto.description,
      createCategoryDto.imageUrl,
    );

    await this.categoryRepository.getEntityManager().persistAndFlush(category);
    return category;
  }

  async findAll(pageSize = 10, pageNumber = 1) {
    const [data, total] = await this.categoryRepository.findAndCount(
      { deletedAt: null },
      {
        limit: pageSize,
        offset: (pageNumber - 1) * pageSize,
        orderBy: { name: 'asc' },
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

  async findById(id: string) {
    const category = await this.categoryRepository.findOne({
      _id: new ObjectId(id),
      deletedAt: null,
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  async findBySlug(slug: string) {
    const category = await this.categoryRepository.findOne({
      slug,
      deletedAt: null,
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  async update(id: string, updateCategoryDto: UpdateCategoryDto) {
    const category = await this.categoryRepository.findOne({
      _id: new ObjectId(id),
      deletedAt: null,
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    Object.assign(category, updateCategoryDto);
    await this.categoryRepository.getEntityManager().persistAndFlush(category);
    return category;
  }

  async remove(id: string) {
    const category = await this.categoryRepository.findOne({
      _id: new ObjectId(id),
      deletedAt: null,
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    category.deletedAt = new Date();
    await this.categoryRepository.getEntityManager().persistAndFlush(category);
    return { message: 'Category deleted successfully' };
  }
}
