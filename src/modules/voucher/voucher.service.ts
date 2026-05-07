import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository, ObjectId } from '@mikro-orm/mongodb';
import {
  Cart,
  Order,
  OrderStatus,
  Product,
  User,
  Voucher,
  VoucherClaim,
  VoucherType,
  VoucherUsage,
} from 'src/entities';
import {
  CartItemRefDto,
  CreateVoucherDto,
  SuggestVoucherDto,
  UpdateVoucherDto,
} from './dto';

export interface ResolvedVoucher {
  voucher: Voucher;
  discountAmount: number;
  freeShippingApplied: boolean;
}

export interface VoucherIneligibility {
  reason: string;
  code: string;
}

@Injectable()
export class VoucherService {
  constructor(
    @InjectRepository(Voucher)
    private readonly voucherRepository: EntityRepository<Voucher>,
    @InjectRepository(VoucherUsage)
    private readonly voucherUsageRepository: EntityRepository<VoucherUsage>,
    @InjectRepository(VoucherClaim)
    private readonly voucherClaimRepository: EntityRepository<VoucherClaim>,
    @InjectRepository(Order)
    private readonly orderRepository: EntityRepository<Order>,
    @InjectRepository(Product)
    private readonly productRepository: EntityRepository<Product>,
    @InjectRepository(User)
    private readonly userRepository: EntityRepository<User>,
    @InjectRepository(Cart)
    private readonly cartRepository: EntityRepository<Cart>,
  ) {}

  private async loadCartItems(userId: string): Promise<CartItemRefDto[]> {
    const cart = await this.cartRepository.findOne(
      { user: new ObjectId(userId), deletedAt: null },
      { populate: ['items', 'items.product', 'items.product.category'] },
    );
    if (!cart) return [];
    return cart.items.getItems().map((it) => ({
      productId: it.product._id.toString(),
      categoryId: it.product.category?._id.toString(),
      quantity: it.quantity,
      price: it.product.price,
    }));
  }

  // ── Admin CRUD ────────────────────────────────────────────────────

  async create(dto: CreateVoucherDto) {
    const code = dto.code.toUpperCase();
    const existing = await this.voucherRepository.findOne({
      code,
      deletedAt: null,
    });
    if (existing) {
      throw new ConflictException(`Voucher code "${dto.code}" already exists`);
    }

    this.validateValueByType(dto.type, dto.value);

    const voucher = new Voucher(
      code,
      dto.name,
      dto.type,
      dto.value,
      new Date(dto.validFrom),
      new Date(dto.validTo),
      {
        description: dto.description,
        bannerImage: dto.bannerImage,
        minOrderAmount: dto.minOrderAmount,
        maxDiscount: dto.maxDiscount,
        usageLimit: dto.usageLimit,
        perUserLimit: dto.perUserLimit,
        firstOrderOnly: dto.firstOrderOnly,
        applicableProductIds: dto.applicableProductIds,
        applicableCategoryIds: dto.applicableCategoryIds,
        excludedProductIds: dto.excludedProductIds,
        priority: dto.priority,
        isClaimable: dto.isClaimable,
        isStackableWithShipping: dto.isStackableWithShipping,
      },
    );

    if (dto.isActive !== undefined) voucher.isActive = dto.isActive;

    if (voucher.validFrom >= voucher.validTo) {
      throw new BadRequestException('validFrom must be before validTo');
    }

    await this.voucherRepository.getEntityManager().persistAndFlush(voucher);
    return this.serialize(voucher);
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
    return this.paginate(data, total, pageSize, pageNumber);
  }

  async findAvailable(pageSize = 10, pageNumber = 1) {
    const now = new Date();
    const [data, total] = await this.voucherRepository.findAndCount(
      {
        deletedAt: null,
        isActive: true,
        isClaimable: false,
        validFrom: { $lte: now },
        validTo: { $gte: now },
      },
      {
        limit: pageSize,
        offset: (pageNumber - 1) * pageSize,
        orderBy: { priority: 'desc', validTo: 'asc' },
      },
    );
    const filtered = data.filter(
      (v) => v.usageLimit === undefined || v.usedCount < v.usageLimit,
    );
    return this.paginate(filtered, total, pageSize, pageNumber);
  }

  async findById(id: string) {
    const voucher = await this.voucherRepository.findOne({
      _id: new ObjectId(id),
      deletedAt: null,
    });
    if (!voucher) throw new NotFoundException('Voucher not found');
    return voucher;
  }

  async findByIdSerialized(id: string) {
    return this.serialize(await this.findById(id));
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

    if (dto.type !== undefined && dto.value !== undefined) {
      this.validateValueByType(dto.type, dto.value);
    } else if (dto.value !== undefined) {
      this.validateValueByType(voucher.type, dto.value);
    }

    const { validFrom, validTo, ...rest } = dto;
    Object.assign(voucher, rest);
    if (validFrom) voucher.validFrom = new Date(validFrom);
    if (validTo) voucher.validTo = new Date(validTo);

    if (voucher.validFrom >= voucher.validTo) {
      throw new BadRequestException('validFrom must be before validTo');
    }

    await this.voucherRepository.getEntityManager().persistAndFlush(voucher);
    return this.serialize(voucher);
  }

  async pause(id: string, paused: boolean) {
    const voucher = await this.findById(id);
    voucher.isActive = !paused;
    await this.voucherRepository.getEntityManager().persistAndFlush(voucher);
    return this.serialize(voucher);
  }

  async duplicate(id: string) {
    const source = await this.findById(id);
    const newCode = await this.generateUniqueCode(source.code);
    const copy = new Voucher(
      newCode,
      `${source.name} (Copy)`,
      source.type,
      source.value,
      source.validFrom,
      source.validTo,
      {
        description: source.description,
        bannerImage: source.bannerImage,
        minOrderAmount: source.minOrderAmount,
        maxDiscount: source.maxDiscount,
        usageLimit: source.usageLimit,
        perUserLimit: source.perUserLimit,
        firstOrderOnly: source.firstOrderOnly,
        applicableProductIds: source.applicableProductIds,
        applicableCategoryIds: source.applicableCategoryIds,
        excludedProductIds: source.excludedProductIds,
        priority: source.priority,
        isClaimable: source.isClaimable,
        isStackableWithShipping: source.isStackableWithShipping,
      },
    );
    copy.isActive = false; // duplicates start paused
    await this.voucherRepository.getEntityManager().persistAndFlush(copy);
    return this.serialize(copy);
  }

  async remove(id: string) {
    const voucher = await this.findById(id);
    voucher.deletedAt = new Date();
    await this.voucherRepository.getEntityManager().persistAndFlush(voucher);
    return { message: 'Voucher deleted successfully' };
  }

  // ── Public preview (no auth) ──────────────────────────────────────

  async previewVoucher(code: string, subtotal: number) {
    const voucher = await this.voucherRepository.findOne({
      code: code.toUpperCase(),
      deletedAt: null,
    });
    if (!voucher) throw new BadRequestException('Voucher not found');
    if (!voucher.isActive) throw new BadRequestException('Voucher is inactive');

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

    const discountAmount = this.calcDiscount(voucher, subtotal, 0);
    return {
      code: voucher.code,
      name: voucher.name,
      description: voucher.description,
      type: voucher.type,
      value: voucher.value,
      discountAmount,
      isFreeShipping: voucher.type === VoucherType.FREE_SHIPPING,
      minOrderAmount: voucher.minOrderAmount,
      maxDiscount: voucher.maxDiscount,
      validTo: voucher.validTo,
    };
  }

  // ── Authenticated validation (for checkout) ───────────────────────

  /**
   * Full validation. Throws BadRequestException with structured message on
   * ineligibility. Returns resolved voucher + discount amount.
   */
  async validateVoucher(
    code: string,
    userId: string,
    subtotal: number,
    items: CartItemRefDto[],
    deliveryFee: number,
  ): Promise<ResolvedVoucher> {
    const voucher = await this.voucherRepository.findOne({
      code: code.toUpperCase(),
      deletedAt: null,
    });
    if (!voucher) throw new BadRequestException('Voucher not found');

    await this.assertEligible(voucher, userId, subtotal, items);

    const discountAmount = this.calcDiscount(voucher, subtotal, deliveryFee);
    return {
      voucher,
      discountAmount,
      freeShippingApplied: voucher.type === VoucherType.FREE_SHIPPING,
    };
  }

  /**
   * Convenience: validate against the user's current cart. Loads cart server-side.
   */
  async checkVoucherForCart(
    code: string,
    userId: string,
    subtotal: number,
    deliveryFee: number,
  ) {
    const items = await this.loadCartItems(userId);
    const effectiveSubtotal =
      subtotal > 0
        ? subtotal
        : items.reduce((sum, it) => sum + it.price * it.quantity, 0);
    return this.checkVoucher(
      code,
      userId,
      effectiveSubtotal,
      items,
      deliveryFee,
    );
  }

  /**
   * Like validateVoucher but returns structured ineligibility instead of throwing.
   */
  async checkVoucher(
    code: string,
    userId: string,
    subtotal: number,
    items: CartItemRefDto[],
    deliveryFee: number,
  ): Promise<
    | (ResolvedVoucher & { eligible: true })
    | { eligible: false; ineligibility: VoucherIneligibility }
  > {
    try {
      const resolved = await this.validateVoucher(
        code,
        userId,
        subtotal,
        items,
        deliveryFee,
      );
      return { ...resolved, eligible: true };
    } catch (err) {
      const reason =
        err instanceof BadRequestException
          ? ((err.getResponse() as { message?: string }).message ?? err.message)
          : 'Unknown error';
      return {
        eligible: false,
        ineligibility: { reason, code: 'INELIGIBLE' },
      };
    }
  }

  /**
   * Atomically increment usedCount with a guard against exceeding usageLimit,
   * then record VoucherUsage. Caller passes an active EntityManager to share tx.
   */
  async applyVoucher(voucher: Voucher, user: User, order: Order) {
    const em = this.voucherRepository.getEntityManager();
    // Atomic guarded increment via raw Mongo update — prevents race.
    const collection = em.getDriver().getConnection().getCollection('voucher');
    const filter: Record<string, unknown> = {
      _id: voucher._id,
      deletedAt: null,
    };
    if (voucher.usageLimit !== undefined) {
      filter.$expr = { $lt: ['$usedCount', '$usageLimit'] };
    }
    const result = await collection.updateOne(filter, {
      $inc: { usedCount: 1 },
    });
    if (result.matchedCount === 0) {
      throw new BadRequestException('Voucher usage limit reached');
    }
    voucher.usedCount += 1;

    const usage = new VoucherUsage(voucher, user, order);
    em.persist(usage);

    // If user had claimed this voucher, mark claim as used.
    const claim = await this.voucherClaimRepository.findOne({
      voucher: voucher._id,
      user: user._id,
      usedAt: null,
      deletedAt: null,
    });
    if (claim) {
      claim.usedAt = new Date();
      em.persist(claim);
    }
  }

  // ── Wallet / claim ────────────────────────────────────────────────

  async claimVoucher(userId: string, code: string) {
    const voucher = await this.voucherRepository.findOne({
      code: code.toUpperCase(),
      deletedAt: null,
    });
    if (!voucher) throw new NotFoundException('Voucher not found');
    if (!voucher.isClaimable) {
      throw new BadRequestException('This voucher does not need to be claimed');
    }
    if (!voucher.isActive) throw new BadRequestException('Voucher is inactive');

    const now = new Date();
    if (now > voucher.validTo)
      throw new BadRequestException('Voucher has expired');
    if (
      voucher.usageLimit !== undefined &&
      voucher.usedCount >= voucher.usageLimit
    ) {
      throw new BadRequestException('Voucher usage limit reached');
    }

    const existing = await this.voucherClaimRepository.findOne({
      voucher: voucher._id,
      user: new ObjectId(userId),
      deletedAt: null,
    });
    if (existing) {
      throw new ConflictException('You have already claimed this voucher');
    }

    const user = await this.userRepository.findOne({
      _id: new ObjectId(userId),
      deletedAt: null,
    });
    if (!user) throw new NotFoundException('User not found');

    const claim = new VoucherClaim(voucher, user);
    await this.voucherClaimRepository.getEntityManager().persistAndFlush(claim);
    return { message: 'Voucher claimed', voucher: this.serialize(voucher) };
  }

  async findMyVouchers(
    userId: string,
    filter: 'all' | 'usable' | 'used' | 'expired' = 'usable',
  ) {
    const claims = await this.voucherClaimRepository.find(
      { user: new ObjectId(userId), deletedAt: null },
      { populate: ['voucher'], orderBy: { claimedAt: 'desc' } },
    );

    const now = new Date();
    const enriched = claims.map((c) => {
      const v = c.voucher;
      const status = v.computedStatus(now);
      const used = !!c.usedAt;
      return {
        claim: {
          _id: c._id.toString(),
          claimedAt: c.claimedAt,
          usedAt: c.usedAt,
        },
        voucher: this.serialize(v),
        status: used ? 'used' : status,
      };
    });

    if (filter === 'all') return enriched;
    return enriched.filter((e) => {
      if (filter === 'used') return e.status === 'used';
      // Compare via the underlying string values — `e.status` includes the
      // literal 'used' alongside VoucherStatus, so direct enum comparison
      // trips @typescript-eslint/no-unsafe-enum-comparison.
      if (filter === 'expired') {
        return e.status === 'expired' || e.status === 'exhausted';
      }
      return e.status === 'active';
    });
  }

  async findClaimableVouchers(userId: string) {
    const now = new Date();
    const vouchers = await this.voucherRepository.find(
      {
        deletedAt: null,
        isActive: true,
        isClaimable: true,
        validFrom: { $lte: now },
        validTo: { $gte: now },
      },
      { orderBy: { priority: 'desc', validTo: 'asc' } },
    );

    const claims = await this.voucherClaimRepository.find({
      user: new ObjectId(userId),
      deletedAt: null,
    });
    const claimedIds = new Set(claims.map((c) => c.voucher._id.toString()));

    return vouchers
      .filter((v) => v.usageLimit === undefined || v.usedCount < v.usageLimit)
      .map((v) => ({
        ...this.serialize(v),
        alreadyClaimed: claimedIds.has(v._id.toString()),
      }));
  }

  // ── Suggest best voucher ──────────────────────────────────────────

  async suggestBest(userId: string, dto: SuggestVoucherDto, deliveryFee = 0) {
    const now = new Date();
    const candidates = await this.voucherRepository.find(
      {
        deletedAt: null,
        isActive: true,
        validFrom: { $lte: now },
        validTo: { $gte: now },
      },
      { orderBy: { priority: 'desc' } },
    );

    // Load cart server-side if FE didn't supply items.
    const dtoItems =
      dto.items && dto.items.length > 0
        ? dto.items
        : await this.loadCartItems(userId);
    const items = await this.hydrateItems(dtoItems);

    let best: ResolvedVoucher | null = null;
    for (const v of candidates) {
      try {
        await this.assertEligible(v, userId, dto.subtotal, items);
        const discount = this.calcDiscount(v, dto.subtotal, deliveryFee);
        if (!best || discount > best.discountAmount) {
          best = {
            voucher: v,
            discountAmount: discount,
            freeShippingApplied: v.type === VoucherType.FREE_SHIPPING,
          };
        }
      } catch {
        // ineligible — skip
      }
    }
    if (!best) return null;
    return {
      voucher: this.serialize(best.voucher),
      discountAmount: best.discountAmount,
      freeShippingApplied: best.freeShippingApplied,
    };
  }

  // ── Internal ──────────────────────────────────────────────────────

  private async assertEligible(
    voucher: Voucher,
    userId: string,
    subtotal: number,
    items: CartItemRefDto[],
  ) {
    if (!voucher.isActive) throw new BadRequestException('Voucher is inactive');

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
      const used = await this.voucherUsageRepository.count({
        voucher: voucher._id,
        user: new ObjectId(userId),
      });
      if (used >= voucher.perUserLimit) {
        throw new BadRequestException(
          'You have already used this voucher the maximum number of times',
        );
      }
    }
    if (voucher.firstOrderOnly) {
      const prior = await this.orderRepository.count({
        user: new ObjectId(userId),
        deletedAt: null,
        status: { $ne: OrderStatus.CANCELLED },
      });
      if (prior > 0) {
        throw new BadRequestException(
          'This voucher is only valid for your first order',
        );
      }
    }
    if (voucher.isClaimable) {
      const claim = await this.voucherClaimRepository.findOne({
        voucher: voucher._id,
        user: new ObjectId(userId),
        usedAt: null,
        deletedAt: null,
      });
      if (!claim) {
        throw new BadRequestException(
          'You must claim this voucher before using it',
        );
      }
    }

    const targetingFails = this.checkTargeting(voucher, items);
    if (targetingFails) throw new BadRequestException(targetingFails);
  }

  private checkTargeting(
    voucher: Voucher,
    items: CartItemRefDto[],
  ): string | null {
    const hasProductTargeting =
      voucher.applicableProductIds && voucher.applicableProductIds.length > 0;
    const hasCategoryTargeting =
      voucher.applicableCategoryIds && voucher.applicableCategoryIds.length > 0;
    const hasExcludes =
      voucher.excludedProductIds && voucher.excludedProductIds.length > 0;

    if (!hasProductTargeting && !hasCategoryTargeting && !hasExcludes) {
      return null;
    }

    if (items.length === 0) {
      return 'Cart items are required to use this voucher';
    }

    if (hasExcludes) {
      const excludeSet = new Set(voucher.excludedProductIds);
      const hit = items.some((i) => excludeSet.has(i.productId));
      if (hit)
        return 'Voucher does not apply to one or more items in your cart';
    }

    if (hasProductTargeting || hasCategoryTargeting) {
      const productSet = new Set(voucher.applicableProductIds ?? []);
      const categorySet = new Set(voucher.applicableCategoryIds ?? []);
      const matches = items.some(
        (i) =>
          productSet.has(i.productId) ||
          (i.categoryId && categorySet.has(i.categoryId)),
      );
      if (!matches) {
        return 'No items in your cart are eligible for this voucher';
      }
    }
    return null;
  }

  private calcDiscount(
    voucher: Voucher,
    subtotal: number,
    deliveryFee: number,
  ): number {
    if (voucher.type === VoucherType.FREE_SHIPPING) {
      return deliveryFee;
    }
    if (voucher.type === VoucherType.FIXED) {
      return Math.min(voucher.value, subtotal);
    }
    const raw = Math.floor((subtotal * voucher.value) / 100);
    return voucher.maxDiscount !== undefined
      ? Math.min(raw, voucher.maxDiscount)
      : raw;
  }

  private validateValueByType(type: VoucherType, value: number) {
    if (type === VoucherType.PERCENT && (value <= 0 || value > 100)) {
      throw new BadRequestException('Percent value must be between 1 and 100');
    }
    if (type === VoucherType.FIXED && value <= 0) {
      throw new BadRequestException('Fixed value must be greater than 0');
    }
    // FREE_SHIPPING ignores value
  }

  private async hydrateItems(
    items: CartItemRefDto[],
  ): Promise<CartItemRefDto[]> {
    if (items.length === 0) return items;
    const missingCat = items
      .filter((i) => !i.categoryId)
      .map((i) => i.productId);
    if (missingCat.length === 0) return items;

    const products = await this.productRepository.find(
      {
        _id: { $in: missingCat.map((id) => new ObjectId(id)) },
        deletedAt: null,
      },
      { populate: ['category'] },
    );
    const map = new Map<string, string>();
    for (const p of products) {
      map.set(p._id.toString(), p.category._id.toString());
    }
    return items.map((i) => ({
      ...i,
      categoryId: i.categoryId ?? map.get(i.productId),
    }));
  }

  private async generateUniqueCode(base: string): Promise<string> {
    for (let i = 1; i < 100; i++) {
      const candidate = `${base}_COPY${i}`.slice(0, 40);
      const exists = await this.voucherRepository.findOne({
        code: candidate,
        deletedAt: null,
      });
      if (!exists) return candidate;
    }
    return `${base}_${Date.now()}`.slice(0, 40);
  }

  private serialize(v: Voucher) {
    return Object.assign(v, { status: v.computedStatus() });
  }

  private paginate<T>(
    data: T[],
    total: number,
    pageSize: number,
    pageNumber: number,
  ) {
    return {
      data,
      total,
      pageSize,
      pageNumber,
      totalPages: Math.ceil(total / pageSize),
    };
  }
}
