import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { ProductController } from './product.controller';
import { ProductService } from './product.service';
import { Category, Product, Review } from 'src/entities';

@Module({
  imports: [MikroOrmModule.forFeature([Product, Category, Review])],
  controllers: [ProductController],
  providers: [ProductService],
  exports: [ProductService],
})
export class ProductModule {}
