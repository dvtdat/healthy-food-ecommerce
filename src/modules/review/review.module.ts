import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { ReviewController } from './review.controller';
import { ReviewService } from './review.service';
import { Product, Review, User } from 'src/entities';

@Module({
  imports: [MikroOrmModule.forFeature([Review, Product, User])],
  controllers: [ReviewController],
  providers: [ReviewService],
  exports: [ReviewService],
})
export class ReviewModule {}
