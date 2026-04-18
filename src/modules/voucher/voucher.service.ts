import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository, ObjectId } from '@mikro-orm/mongodb';
import { Voucher, VoucherType, VoucherUsage } from 'src/entities';
import { CreateVoucherDto, UpdateVoucherDto } from './dto';

@Injectable()
export class VoucherService {
  constructor(
    @InjectRepository(Voucher)
    private readonly voucherRepository: EntityRepository<Voucher>,
    @InjectRepository(VoucherUsage)
    private readonly voucherUsageRepository: EntityRepository<VoucherUsage>,
  ) {}

  async create(dto: CreateVoucherDto) {
    const existing = await this.voucherRepository.findOne({
      code: dto.code.toUpperCase(),
      deletedAt: null,
    });

    if (existing) {
      throw new ConflictException(`Voucher code "${dto.code}" already exists`);
    }

    const voucher = new Voucher(
      dto.code.toUpperCase(),
      dto.type,
      dto.value,
      new Date(dto.validFrom),
      new Date(dto.validTo),
      {
        minOrderAmount: dto.minOrderAmount,
        maxDiscount: dto.maxDiscount,
        usageLimit: dto.usageLimit,
        perUserLimit: dto.perUserLimit,
      },
    );

    if (dto.isActive !== undefined) {
      voucher.isActive = dto.isActive;
    }

    await this.voucherRepository.getEntityManager().persistAndFlush(voucher);
    return voucher;
  }

  async findAll(pageSize = 10, pageNumber = 1) {
    const [data, total] = await this.voucherRepository.findAndCount(
      { deletedAt: null },
      {
        limit: pageSize,
        offset: (pageNumber - 1) * pageSize,
        orderBy: { createdAt: 'desc' },
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

  async findAvailable(pageSize = 10, pageNumber = 1) {
    const now = new Date();
    const [data, total] = await this.voucherRepository.findAndCount(
      {
        deletedAt: null,
        isActive: true,
        validFrom: { $lte: now },
        validTo: { $gte: now },
        $or: [
          { usageLimit: null },
          { $expr: { $lt: ['$usedCount', '$usageLimit'] } },
        ],
      } as any,
      {
        limit: pageSize,
        offset: (pageNumber - 1) * pageSize,
        orderBy: { validTo: 'asc' },
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
    const voucher = await this.voucherRepository.findOne({
      _id: new ObjectId(id),
      deletedAt: null,
    });

    if (!voucher) {
      throw new NotFoundException('Voucher not found');
    }

    return voucher;
  }

  async update(id: string, dto: UpdateVoucherDto) {
    const voucher = await this.findById(id);

    if (dto.code && dto.code.toUpperCase() !== voucher.code) {
      const existing = await this.voucherRepository.findOne({
        code: dto.code.toUpperCase(),
        deletedAt: null,
      });
      if (existing) {
        throw new ConflictException(
          `Voucher code "${dto.code}" already exists`,
        );
      }
      dto.code = dto.code.toUpperCase();
    }

    const { validFrom, validTo, ...rest } = dto;
    Object.assign(voucher, rest);
    if (validFrom) voucher.validFrom = new Date(validFrom);
    if (validTo) voucher.validTo = new Date(validTo);

    await this.voucherRepository.getEntityManager().persistAndFlush(voucher);
    return voucher;
  }

  async remove(id: string) {
    const voucher = await this.findById(id);
    voucher.deletedAt = new Date();
    await this.voucherRepository.getEntityManager().persistAndFlush(voucher);
    return { message: 'Voucher deleted successfully' };
  }

  /**
   * Validate a voucher code and calculate discount amount.
   * Does NOT mutate usedCount — call applyVoucher() after order is persisted.
   */
  async validateVoucher(
    code: string,
    subtotal: number,
    userId: string,
  ): Promise<{ voucher: Voucher; discountAmount: number }> {
    const voucher = await this.voucherRepository.findOne({
      code: code.toUpperCase(),
      deletedAt: null,
    });

    if (!voucher) {
      throw new BadRequestException('Voucher not found');
    }

    if (!voucher.isActive) {
      throw new BadRequestException('Voucher is inactive');
    }

    const now = new Date();
    if (now < voucher.validFrom || now > voucher.validTo) {
      throw new BadRequestException('Voucher has expired or is not yet valid');
    }

    if (
      voucher.usageLimit !== undefined &&
      voucher.usedCount >= voucher.usageLimit
    ) {
      throw new BadRequestException('Voucher usage limit reached');
    }

    if (
      voucher.minOrderAmount !== undefined &&
      subtotal < voucher.minOrderAmount
    ) {
      throw new BadRequestException(
        `Minimum order amount of ${voucher.minOrderAmount} required for this voucher`,
      );
    }

    if (voucher.perUserLimit !== undefined) {
      const userUsageCount = await this.voucherUsageRepository.count({
        voucher: voucher._id,
        user: new ObjectId(userId),
      });

      if (userUsageCount >= voucher.perUserLimit) {
        throw new BadRequestException(
          'You have already used this voucher the maximum number of times',
        );
      }
    }

    const discountAmount = this.calcDiscount(voucher, subtotal);

    return { voucher, discountAmount };
  }

  /**
   * Preview voucher without auth context (public endpoint).
   */
  async previewVoucher(code: string, subtotal: number) {
    const voucher = await this.voucherRepository.findOne({
      code: code.toUpperCase(),
      deletedAt: null,
    });

    if (!voucher) {
      throw new BadRequestException('Voucher not found');
    }

    if (!voucher.isActive) {
      throw new BadRequestException('Voucher is inactive');
    }

    const now = new Date();
    if (now < voucher.validFrom || now > voucher.validTo) {
      throw new BadRequestException('Voucher has expired or is not yet valid');
    }

    if (
      voucher.usageLimit !== undefined &&
      voucher.usedCount >= voucher.usageLimit
    ) {
      throw new BadRequestException('Voucher usage limit reached');
    }

    if (
      voucher.minOrderAmount !== undefined &&
      subtotal < voucher.minOrderAmount
    ) {
      throw new BadRequestException(
        `Minimum order amount of ${voucher.minOrderAmount} required`,
      );
    }

    const discountAmount = this.calcDiscount(voucher, subtotal);

    return {
      code: voucher.code,
      type: voucher.type,
      value: voucher.value,
      discountAmount,
      minOrderAmount: voucher.minOrderAmount,
      maxDiscount: voucher.maxDiscount,
      validTo: voucher.validTo,
    };
  }

  private calcDiscount(voucher: Voucher, subtotal: number): number {
    if (voucher.type === VoucherType.FIXED) {
      return Math.min(voucher.value, subtotal);
    }

    // PERCENT
    const raw = Math.floor((subtotal * voucher.value) / 100);
    return voucher.maxDiscount !== undefined
      ? Math.min(raw, voucher.maxDiscount)
      : raw;
  }
}
