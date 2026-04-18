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
  ApiQuery,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { VoucherService } from './voucher.service';
import { CreateVoucherDto, UpdateVoucherDto } from './dto';
import { Voucher, UserRole } from 'src/entities';
import { JwtAuthGuard } from '../auth/guards/jwt-auth/jwt-auth.guard';
import { RoleGuard } from 'src/common/guards/role.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import {
  CurrentUser,
  CurrentUserData,
} from 'src/common/decorators/current-user.decorator';

@ApiTags('vouchers')
@Controller('vouchers')
export class VoucherController {
  constructor(private readonly voucherService: VoucherService) {}

  @Roles(UserRole.ADMIN)
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create voucher (admin)' })
  @ApiCreatedResponse({ type: Voucher })
  create(@Body() dto: CreateVoucherDto) {
    return this.voucherService.create(dto);
  }

  @Roles(UserRole.ADMIN)
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all vouchers (admin)' })
  @ApiOkResponse({
    schema: {
      properties: {
        data: { type: 'array', items: { $ref: getSchemaPath(Voucher) } },
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
  ) {
    return this.voucherService.findAll(pageSize, pageNumber);
  }

  @UseGuards(JwtAuthGuard)
  @Get('available')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List available vouchers (authenticated)' })
  @ApiOkResponse({
    schema: {
      properties: {
        data: { type: 'array', items: { $ref: getSchemaPath(Voucher) } },
        total: { type: 'number' },
        pageSize: { type: 'number' },
        pageNumber: { type: 'number' },
        totalPages: { type: 'number' },
      },
    },
  })
  findAvailable(
    @Query('pageSize', new ParseIntPipe({ optional: true })) pageSize = 10,
    @Query('pageNumber', new ParseIntPipe({ optional: true })) pageNumber = 1,
  ) {
    return this.voucherService.findAvailable(pageSize, pageNumber);
  }

  @UseGuards(JwtAuthGuard)
  @Get('validate/:code')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Validate voucher and preview discount (authenticated)',
  })
  @ApiQuery({ name: 'subtotal', type: Number, required: true })
  @ApiOkResponse({
    schema: {
      properties: {
        code: { type: 'string' },
        type: { type: 'string' },
        value: { type: 'number' },
        discountAmount: { type: 'number' },
        minOrderAmount: { type: 'number', nullable: true },
        maxDiscount: { type: 'number', nullable: true },
        validTo: { type: 'string', format: 'date-time' },
      },
    },
  })
  validateVoucher(
    @Param('code') code: string,
    @Query('subtotal', ParseIntPipe) subtotal: number,
    @CurrentUser() _currentUser: CurrentUserData,
  ) {
    return this.voucherService.previewVoucher(code, subtotal);
  }

  @Roles(UserRole.ADMIN)
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Patch(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update voucher (admin)' })
  @ApiOkResponse({ type: Voucher })
  update(@Param('id') id: string, @Body() dto: UpdateVoucherDto) {
    return this.voucherService.update(id, dto);
  }

  @Roles(UserRole.ADMIN)
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Soft delete voucher (admin)' })
  @ApiOkResponse({ schema: { properties: { message: { type: 'string' } } } })
  remove(@Param('id') id: string) {
    return this.voucherService.remove(id);
  }
}
