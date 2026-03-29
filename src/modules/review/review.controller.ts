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
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { ReviewService } from './review.service';
import { CreateReviewDto, UpdateReviewDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth/jwt-auth.guard';
import {
  CurrentUser,
  CurrentUserData,
} from 'src/common/decorators/current-user.decorator';
import { Review } from 'src/entities';

@ApiTags('reviews')
@Controller('reviews')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a review (one per user per product)' })
  @ApiCreatedResponse({ type: Review })
  create(
    @Body() createReviewDto: CreateReviewDto,
    @CurrentUser() currentUser: CurrentUserData,
  ) {
    return this.reviewService.create(createReviewDto, currentUser);
  }

  @Get()
  @ApiOperation({ summary: 'List reviews for a product' })
  @ApiOkResponse({
    schema: {
      properties: {
        data: { type: 'array', items: { $ref: getSchemaPath(Review) } },
        total: { type: 'number' },
        pageSize: { type: 'number' },
        pageNumber: { type: 'number' },
        totalPages: { type: 'number' },
      },
    },
  })
  findByProduct(
    @Query('productId') productId: string,
    @Query('pageSize', new ParseIntPipe({ optional: true })) pageSize = 10,
    @Query('pageNumber', new ParseIntPipe({ optional: true })) pageNumber = 1,
  ) {
    return this.reviewService.findByProduct(productId, pageSize, pageNumber);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update your review' })
  @ApiOkResponse({ type: Review })
  update(
    @Param('id') id: string,
    @Body() updateReviewDto: UpdateReviewDto,
    @CurrentUser() currentUser: CurrentUserData,
  ) {
    return this.reviewService.update(id, updateReviewDto, currentUser);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete your review' })
  @ApiOkResponse({ type: Review })
  remove(@Param('id') id: string, @CurrentUser() currentUser: CurrentUserData) {
    return this.reviewService.remove(id, currentUser);
  }
}
