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
import {
  ClaimVoucherDto,
  CreateVoucherDto,
  PauseVoucherDto,
  SuggestVoucherDto,
  UpdateVoucherDto,
} from './dto';
import { Voucher, UserRole } from 'src/entities';
import { JwtAuthGuard } from '../auth/guards/jwt-auth/jwt-auth.guard';
import { RoleGuard } from 'src/common/guards/role.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Public } from 'src/common/decorators/public.decorator';
import {
  CurrentUser,
  CurrentUserData,
} from 'src/common/decorators/current-user.decorator';

@ApiTags('vouchers')
@Controller('vouchers')
export class VoucherController {
  constructor(private readonly voucherService: VoucherService) {}

  // ── Admin ────────────────────────────────────────────────────────

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
  @Patch(':id/pause')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Pause/resume voucher (admin)' })
  @ApiOkResponse({ type: Voucher })
  pause(@Param('id') id: string, @Body() body: PauseVoucherDto) {
    return this.voucherService.pause(id, body.paused);
  }

  @Roles(UserRole.ADMIN)
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Post(':id/duplicate')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Duplicate voucher (admin) — copy is paused' })
  @ApiCreatedResponse({ type: Voucher })
  duplicate(@Param('id') id: string) {
    return this.voucherService.duplicate(id);
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

  // ── User ─────────────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @Get('available')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List broadcast (non-claimable) active vouchers' })
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
  @Get('claimable')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Browse claimable vouchers' })
  @ApiOkResponse({
    schema: {
      type: 'array',
      items: {
        allOf: [
          { $ref: getSchemaPath(Voucher) },
          { properties: { alreadyClaimed: { type: 'boolean' } } },
        ],
      },
    },
  })
  findClaimable(@CurrentUser() user: CurrentUserData) {
    return this.voucherService.findClaimableVouchers(user._id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('claim')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Claim a voucher into my wallet' })
  @ApiOkResponse({
    schema: {
      properties: {
        message: { type: 'string' },
        voucher: { $ref: getSchemaPath(Voucher) },
      },
    },
  })
  claim(@Body() dto: ClaimVoucherDto, @CurrentUser() user: CurrentUserData) {
    return this.voucherService.claimVoucher(user._id, dto.code);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'My voucher wallet' })
  @ApiQuery({
    name: 'filter',
    enum: ['all', 'usable', 'used', 'expired'],
    required: false,
  })
  @ApiOkResponse({
    schema: {
      type: 'array',
      items: {
        properties: {
          claim: {
            properties: {
              _id: { type: 'string' },
              claimedAt: { type: 'string', format: 'date-time' },
              usedAt: { type: 'string', format: 'date-time', nullable: true },
            },
          },
          voucher: { $ref: getSchemaPath(Voucher) },
          status: { type: 'string' },
        },
      },
    },
  })
  findMine(
    @CurrentUser() user: CurrentUserData,
    @Query('filter') filter?: 'all' | 'usable' | 'used' | 'expired',
  ) {
    return this.voucherService.findMyVouchers(user._id, filter ?? 'usable');
  }

  @Public()
  @Get('preview/:code')
  @ApiOperation({ summary: 'Public preview — marketing display only' })
  @ApiQuery({ name: 'subtotal', type: Number, required: true })
  preview(
    @Param('code') code: string,
    @Query('subtotal', ParseIntPipe) subtotal: number,
  ) {
    return this.voucherService.previewVoucher(code, subtotal);
  }

  @UseGuards(JwtAuthGuard)
  @Get('validate/:code')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Validate voucher with full eligibility checks' })
  @ApiQuery({ name: 'subtotal', type: Number, required: true })
  @ApiQuery({ name: 'deliveryFee', type: Number, required: false })
  @ApiOkResponse({
    schema: {
      properties: {
        eligible: { type: 'boolean' },
        discountAmount: { type: 'number' },
        freeShippingApplied: { type: 'boolean' },
        voucher: { $ref: getSchemaPath(Voucher) },
        ineligibility: {
          properties: {
            reason: { type: 'string' },
            code: { type: 'string' },
          },
        },
      },
    },
  })
  validateVoucher(
    @Param('code') code: string,
    @Query('subtotal', ParseIntPipe) subtotal: number,
    @Query('deliveryFee', new ParseIntPipe({ optional: true })) deliveryFee = 0,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.voucherService.checkVoucherForCart(
      code,
      user._id,
      subtotal,
      deliveryFee,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('suggest')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Suggest the best voucher for a cart' })
  @ApiQuery({ name: 'deliveryFee', type: Number, required: false })
  @ApiOkResponse({
    schema: {
      nullable: true,
      properties: {
        voucher: { $ref: getSchemaPath(Voucher) },
        discountAmount: { type: 'number' },
        freeShippingApplied: { type: 'boolean' },
      },
    },
  })
  suggestBest(
    @Body() dto: SuggestVoucherDto,
    @CurrentUser() user: CurrentUserData,
    @Query('deliveryFee', new ParseIntPipe({ optional: true })) deliveryFee = 0,
  ) {
    return this.voucherService.suggestBest(user._id, dto, deliveryFee);
  }
}
