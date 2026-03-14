import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CategoryService } from './category.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth/jwt-auth.guard';
import { RoleGuard } from 'src/common/guards/role.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/entities';

@Controller('categories')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Roles(UserRole.ADMIN)
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Post()
  create(@Body() createCategoryDto: CreateCategoryDto) {
    return this.categoryService.create(createCategoryDto);
  }

  @Get()
  findAll(
    @Query('pageSize', new ParseIntPipe({ optional: true })) pageSize = 10,
    @Query('pageNumber', new ParseIntPipe({ optional: true })) pageNumber = 1,
  ) {
    return this.categoryService.findAll(pageSize, pageNumber);
  }

  @Get('slug/:slug')
  findBySlug(@Param('slug') slug: string) {
    return this.categoryService.findBySlug(slug);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.categoryService.findById(id);
  }

  @Roles(UserRole.ADMIN)
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ) {
    return this.categoryService.update(id, updateCategoryDto);
  }

  @Roles(UserRole.ADMIN)
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.categoryService.remove(id);
  }
}
