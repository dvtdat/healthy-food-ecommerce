import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { CategoryController } from './category.controller';
import { CategoryService } from './category.service';
import { Category } from 'src/entities';

@Module({
  imports: [MikroOrmModule.forFeature([Category])],
  controllers: [CategoryController],
  providers: [CategoryService],
  exports: [CategoryService],
})
export class CategoryModule {}
