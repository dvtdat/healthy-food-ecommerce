import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository, ObjectId } from '@mikro-orm/mongodb';
import { wrap } from '@mikro-orm/core';
import {
  Product,
  Category,
  Review,
  Voucher,
  VoucherType,
  ChatMessage,
  ChatRole,
} from 'src/entities';
import { DELIVERY_OPTIONS } from 'src/common/config/delivery.config';
import { ChatMessageDto } from './dto';
import { CurrentUserData } from 'src/common/decorators/current-user.decorator';
import { CartService } from '../cart/cart.service';

const MAX_HISTORY = 10;

interface GeminiCartResponse {
  needs_cart_action: true;
  items: { product_name: string; quantity: number }[];
  reply: string;
}

interface GeminiTextResponse {
  needs_cart_action: false;
  reply: string;
}

type GeminiResponse = GeminiCartResponse | GeminiTextResponse;

@Injectable()
export class ChatbotService {
  private readonly logger = new Logger(ChatbotService.name);
  private readonly geminiApiKey: string;
  private readonly geminiUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly cartService: CartService,
    @InjectRepository(Product)
    private readonly productRepository: EntityRepository<Product>,
    @InjectRepository(Category)
    private readonly categoryRepository: EntityRepository<Category>,
    @InjectRepository(Review)
    private readonly reviewRepository: EntityRepository<Review>,
    @InjectRepository(Voucher)
    private readonly voucherRepository: EntityRepository<Voucher>,
    @InjectRepository(ChatMessage)
    private readonly chatMessageRepository: EntityRepository<ChatMessage>,
  ) {
    this.geminiApiKey = this.configService.getOrThrow<string>('GEMINI_API_KEY');
    this.geminiUrl = `https://aiplatform.googleapis.com/v1/publishers/google/models/gemini-2.5-flash-lite:generateContent?key=${this.geminiApiKey}`;
  }

  async chat(
    dto: ChatMessageDto,
    currentUser: CurrentUserData,
  ): Promise<{ reply: string }> {
    const userId = new ObjectId(currentUser._id);
    const shopContext = await this.buildShopContext();

    const systemPrompt = `Bạn là trợ lý AI của cửa hàng HealthyFood — chuyên bán thực phẩm sạch, organic.
Hãy trả lời thân thiện bằng tiếng Việt.
Chỉ trả lời các câu hỏi liên quan đến shop (sản phẩm, giá, tồn kho, voucher, vận chuyển, thanh toán, đánh giá...).
Nếu câu hỏi không liên quan đến shop, hãy lịch sự từ chối.
Giá hiển thị theo VND.

QUAN TRỌNG — Bạn PHẢI luôn trả lời bằng JSON hợp lệ theo đúng một trong hai định dạng sau:

Khi khách hàng muốn thêm sản phẩm vào giỏ hàng / mua hàng:
{"needs_cart_action":true,"items":[{"product_name":"tên sản phẩm chính xác như trong danh sách","quantity":1}],"reply":"câu trả lời thân thiện bằng tiếng Việt"}

Khi chỉ trả lời câu hỏi thông thường:
{"needs_cart_action":false,"reply":"câu trả lời bằng tiếng Việt"}

Không được thêm bất kỳ text nào ngoài JSON. Không dùng markdown code block.

Dưới đây là dữ liệu hiện tại của shop:

${shopContext}`;

    const history = await this.chatMessageRepository.find(
      { userId },
      { orderBy: { createdAt: 'asc' }, limit: MAX_HISTORY },
    );

    const contents: { role: string; parts: { text: string }[] }[] = [];
    for (const msg of history) {
      contents.push({ role: msg.role, parts: [{ text: msg.text }] });
    }
    contents.push({ role: 'user', parts: [{ text: dto.message }] });

    const body = {
      systemInstruction: { role: 'user', parts: [{ text: systemPrompt }] },
      contents,
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 2048,
        responseMimeType: 'application/json',
      },
    };

    const response = await fetch(this.geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(`Gemini API error: ${response.status} ${errorText}`);
      return {
        reply: 'Xin lỗi, tôi đang gặp sự cố kết nối. Vui lòng thử lại sau nhé!',
      };
    }

    const data = await response.json();
    const rawText: string =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ??
      '{"needs_cart_action":false,"reply":"Xin lỗi, tôi không thể trả lời lúc này."}';

    let parsed: GeminiResponse;
    try {
      // Strip markdown code fences if model wraps JSON anyway
      const cleaned = rawText
        .replace(/^```(?:json)?\n?/i, '')
        .replace(/\n?```$/i, '')
        .trim();
      parsed = JSON.parse(cleaned) as GeminiResponse;
    } catch {
      this.logger.warn(`Gemini returned non-JSON: ${rawText}`);
      parsed = { needs_cart_action: false, reply: rawText };
    }

    let reply = parsed.reply;

    if (parsed.needs_cart_action) {
      const results = await Promise.all(
        parsed.items.map((item) =>
          this.executeAddToCart(item.product_name, item.quantity, currentUser),
        ),
      );
      const failed = results.filter((r) => r.startsWith('Không'));
      if (failed.length > 0) {
        reply += `\n\nLưu ý:\n${failed.join('\n')}`;
      }
    }

    // Persist and trim history
    const em = this.chatMessageRepository.getEntityManager();
    await em.persistAndFlush([
      new ChatMessage(userId, ChatRole.USER, dto.message),
      new ChatMessage(userId, ChatRole.MODEL, reply),
    ]);

    const total = await this.chatMessageRepository.count({ userId });
    if (total > MAX_HISTORY) {
      const oldest = await this.chatMessageRepository.find(
        { userId },
        { orderBy: { createdAt: 'asc' }, limit: total - MAX_HISTORY },
      );
      await em.removeAndFlush(oldest);
    }

    return { reply };
  }

  private async executeAddToCart(
    productName: string,
    quantity: number,
    currentUser: CurrentUserData,
  ): Promise<string> {
    // Fuzzy search: find product whose name contains the search term (case-insensitive)
    const products = await this.productRepository.find({ deletedAt: null });
    const searchLower = productName.toLowerCase();
    const match = products.find(
      (p) =>
        p.name.toLowerCase().includes(searchLower) ||
        searchLower.includes(p.name.toLowerCase()),
    );

    if (!match) {
      return `Không tìm thấy sản phẩm "${productName}" trong shop.`;
    }

    if (match.stock === 0) {
      return `Sản phẩm "${match.name}" hiện đã hết hàng.`;
    }

    if (match.stock < quantity) {
      return `Sản phẩm "${match.name}" chỉ còn ${match.stock} sản phẩm, không đủ số lượng yêu cầu (${quantity}).`;
    }

    try {
      await this.cartService.addItem(
        { productId: match._id.toHexString(), quantity },
        currentUser,
      );
      return `Đã thêm ${quantity} x "${match.name}" vào giỏ hàng thành công! Giá: ${match.price.toLocaleString('vi-VN')}đ/sản phẩm.`;
    } catch (err: any) {
      this.logger.error(`add_to_cart error: ${err?.message}`);
      return `Không thể thêm "${match.name}" vào giỏ hàng: ${err?.message ?? 'Lỗi không xác định'}.`;
    }
  }

  private async buildShopContext(): Promise<string> {
    const sections: string[] = [];

    // Products
    const products = await this.productRepository.find(
      { deletedAt: null },
      { populate: ['category'] },
    );

    const reviews = await this.reviewRepository.find({ deletedAt: null });
    const reviewMap = new Map<
      string,
      { totalRating: number; count: number; comments: string[] }
    >();
    for (const r of reviews) {
      const pid = r.product._id.toHexString();
      const entry = reviewMap.get(pid) ?? {
        totalRating: 0,
        count: 0,
        comments: [],
      };
      entry.totalRating += r.rating;
      entry.count += 1;
      if (r.comment) entry.comments.push(r.comment);
      reviewMap.set(pid, entry);
    }

    if (products.length > 0) {
      const productLines = products.map((p) => {
        const pojo = wrap(p).toPOJO();
        const pid = p._id.toHexString();
        const rv = reviewMap.get(pid);
        const avgRating = rv
          ? (rv.totalRating / rv.count).toFixed(1)
          : 'Chưa có';
        const reviewCount = rv?.count ?? 0;
        const topComments = rv?.comments.slice(0, 3).join('; ') ?? 'Chưa có';

        const status =
          p.stock > 0 ? `Còn hàng (${p.stock} sản phẩm)` : 'Hết hàng';

        return `- ${p.name} (${(pojo as any).category?.name ?? 'N/A'})
    Giá: ${p.price.toLocaleString('vi-VN')}đ | Trạng thái: ${status}
    Trọng lượng: ${p.weight ?? 'N/A'}${p.weightUnit ?? ''} | Calories: ${p.calories ?? 'N/A'} | Health Score: ${p.healthScore ?? 'N/A'}/10
    Hạn sử dụng: ${p.shelfLife ?? 'N/A'}
    Đặc điểm: ${p.keyCharacteristics?.join(', ') ?? 'N/A'}
    Đánh giá: ${avgRating}/5 (${reviewCount} đánh giá) | Nhận xét: ${topComments}`;
      });

      sections.push(
        `=== SẢN PHẨM (${products.length}) ===\n${productLines.join('\n')}`,
      );
    }

    // Categories
    const categories = await this.categoryRepository.find({ deletedAt: null });
    if (categories.length > 0) {
      const catLines = categories.map(
        (c) => `- ${c.name}: ${c.description ?? 'Không có mô tả'}`,
      );
      sections.push(`=== DANH MỤC ===\n${catLines.join('\n')}`);
    }

    // Vouchers
    const now = new Date();
    const vouchers = await this.voucherRepository.find({
      deletedAt: null,
      isActive: true,
      validFrom: { $lte: now },
      validTo: { $gte: now },
    });

    if (vouchers.length > 0) {
      const voucherLines = vouchers.map((v) => {
        const discount =
          v.type === VoucherType.PERCENT
            ? `Giảm ${v.value}%${v.maxDiscount ? ` (tối đa ${v.maxDiscount.toLocaleString('vi-VN')}đ)` : ''}`
            : `Giảm ${v.value.toLocaleString('vi-VN')}đ`;
        const minOrder = v.minOrderAmount
          ? `Đơn tối thiểu: ${v.minOrderAmount.toLocaleString('vi-VN')}đ`
          : 'Không yêu cầu đơn tối thiểu';
        const remaining =
          v.usageLimit !== undefined
            ? `Còn ${v.usageLimit - v.usedCount} lượt`
            : 'Không giới hạn';
        return `- Mã: ${v.code} | ${discount} | ${minOrder} | ${remaining} | HSD: ${v.validTo.toLocaleDateString('vi-VN')}`;
      });
      sections.push(
        `=== VOUCHER ĐANG HOẠT ĐỘNG ===\n${voucherLines.join('\n')}`,
      );
    } else {
      sections.push(
        '=== VOUCHER ===\nHiện không có voucher nào đang hoạt động.',
      );
    }

    // Delivery options
    const deliveryLines = Object.entries(DELIVERY_OPTIONS).map(
      ([key, info]) =>
        `- ${info.label} (${key}): ${info.description} | ${info.estimatedDays} | Phí: ${info.fee.toLocaleString('vi-VN')}đ`,
    );
    sections.push(`=== VẬN CHUYỂN ===\n${deliveryLines.join('\n')}`);

    // Payment
    sections.push(`=== THANH TOÁN ===
- Chuyển khoản ngân hàng qua mã QR VietQR (tự động xác nhận qua webhook Casso)
- Thanh toán khi nhận hàng (COD) — hiện chưa hỗ trợ`);

    return sections.join('\n\n');
  }
}
