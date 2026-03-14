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
import { ReviewService } from './review.service';
import { CreateReviewDto, UpdateReviewDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth/jwt-auth.guard';
import {
  CurrentUser,
  CurrentUserData,
} from 'src/common/decorators/current-user.decorator';

@Controller('reviews')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(
    @Body() createReviewDto: CreateReviewDto,
    @CurrentUser() currentUser: CurrentUserData,
  ) {
    return this.reviewService.create(createReviewDto, currentUser);
  }

  @Get()
  findByProduct(
    @Query('productId') productId: string,
    @Query('pageSize', new ParseIntPipe({ optional: true })) pageSize = 10,
    @Query('pageNumber', new ParseIntPipe({ optional: true })) pageNumber = 1,
  ) {
    return this.reviewService.findByProduct(productId, pageSize, pageNumber);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateReviewDto: UpdateReviewDto,
    @CurrentUser() currentUser: CurrentUserData,
  ) {
    return this.reviewService.update(id, updateReviewDto, currentUser);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() currentUser: CurrentUserData) {
    return this.reviewService.remove(id, currentUser);
  }
}
