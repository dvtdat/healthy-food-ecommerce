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
import { Order, OrderStatus, UserRole } from 'src/entities';
import { OrderService } from './order.service';
import { CreateOrderDto, UpdateOrderStatusDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth/jwt-auth.guard';
import { RoleGuard } from 'src/common/guards/role.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import {
  CurrentUser,
  CurrentUserData,
} from 'src/common/decorators/current-user.decorator';

@ApiTags('orders')
@ApiBearerAuth()
@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  @ApiOperation({ summary: 'Create order from current cart' })
  @ApiCreatedResponse({ type: Order })
  create(
    @Body() createOrderDto: CreateOrderDto,
    @CurrentUser() currentUser: CurrentUserData,
  ) {
    return this.orderService.create(createOrderDto, currentUser);
  }

  @Roles(UserRole.ADMIN)
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Get()
  @ApiOperation({ summary: 'List all orders (admin)' })
  @ApiOkResponse({
    schema: {
      properties: {
        data: { type: 'array', items: { $ref: getSchemaPath(Order) } },
        total: { type: 'number' },
        pageSize: { type: 'number' },
        pageNumber: { type: 'number' },
        totalPages: { type: 'number' },
      },
    },
  })
  findAll(
    @Query('pageSize', new ParseIntPipe({ optional: true })) pageSize = 10,
    @Query('pageNumber', new ParseIntPipe({ optional: true })) pageNumber = 1,
    @Query('status') status?: OrderStatus,
    @Query('userId') userId?: string,
  ) {
    return this.orderService.findAll(pageSize, pageNumber, status, userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiOperation({ summary: "List current user's orders" })
  @ApiOkResponse({
    schema: {
      properties: {
        data: { type: 'array', items: { $ref: getSchemaPath(Order) } },
        total: { type: 'number' },
        pageSize: { type: 'number' },
        pageNumber: { type: 'number' },
        totalPages: { type: 'number' },
      },
    },
  })
  findMyOrders(
    @CurrentUser() currentUser: CurrentUserData,
    @Query('pageSize', new ParseIntPipe({ optional: true })) pageSize = 10,
    @Query('pageNumber', new ParseIntPipe({ optional: true })) pageNumber = 1,
  ) {
    return this.orderService.findMyOrders(currentUser, pageSize, pageNumber);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/payment-qr')
  @ApiOperation({ summary: 'Get VietQR payment details for a pending order' })
  @ApiOkResponse({
    schema: {
      properties: {
        bankId: { type: 'string', example: '970448' },
        accountNumber: { type: 'string', example: 'CASSDVTDAT' },
        accountName: { type: 'string', example: 'DOAN VIET TIEN DAT' },
        amount: { type: 'number', example: 150000 },
        memo: { type: 'string', example: 'THANHTOAN 507f1f77bcf86cd799439011' },
        qrUrl: {
          type: 'string',
          example:
            'https://img.vietqr.io/image/970448-CASSDVTDAT-compact2.png?...',
        },
      },
    },
  })
  getPaymentQr(
    @Param('id') id: string,
    @CurrentUser() currentUser: CurrentUserData,
  ) {
    return this.orderService.getPaymentQr(id, currentUser);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  @ApiOperation({ summary: 'Get order by ID' })
  @ApiOkResponse({ type: Order })
  findOne(
    @Param('id') id: string,
    @CurrentUser() currentUser: CurrentUserData,
  ) {
    return this.orderService.findById(id, currentUser);
  }

  @Roles(UserRole.ADMIN)
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Patch(':id/status')
  @ApiOperation({ summary: 'Update order status (admin)' })
  @ApiOkResponse({ type: Order })
  updateStatus(
    @Param('id') id: string,
    @Body() updateOrderStatusDto: UpdateOrderStatusDto,
  ) {
    return this.orderService.updateStatus(id, updateOrderStatusDto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @ApiOperation({ summary: 'Cancel an order' })
  @ApiOkResponse({ type: Order })
  cancel(@Param('id') id: string, @CurrentUser() currentUser: CurrentUserData) {
    return this.orderService.cancel(id, currentUser);
  }
}
