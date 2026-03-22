import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository, ObjectId } from '@mikro-orm/mongodb';
import { Order, OrderStatus } from 'src/entities';
import { CassoWebhookDto } from './dto/casso-webhook.dto';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(Order)
    private readonly orderRepository: EntityRepository<Order>,
  ) {}

  validateSignature(signature: string | undefined): void {
    const secureToken = this.configService.get<string>('CASSO_SECURE_TOKEN');

    if (!secureToken) {
      this.logger.warn('CASSO_SECURE_TOKEN is not configured');
      throw new UnauthorizedException('Webhook not configured');
    }

    if (!signature || signature !== secureToken) {
      throw new UnauthorizedException('Invalid Casso signature');
    }
  }

  async handleTransaction(
    payload: CassoWebhookDto,
  ): Promise<{ success: number }> {
    for (const data of payload.data) {
      await this.processTransaction(data);
    }
    return { success: 1 };
  }

  private async processTransaction(
    data: CassoWebhookDto['data'][number],
  ): Promise<void> {
    this.logger.log(
      `Casso transaction received: id=${data.id}, amount=${data.amount}, desc="${data.description}"`,
    );

    const orderId = this.extractOrderId(data.description);

    if (!orderId) {
      this.logger.warn(
        `No order ID found in description: "${data.description}"`,
      );
      return;
    }

    let order: Order | null;
    try {
      order = await this.orderRepository.findOne({
        _id: new ObjectId(orderId),
        deletedAt: null,
      });
    } catch {
      this.logger.warn(`Invalid order ID format: ${orderId}`);
      return;
    }

    if (!order) {
      this.logger.warn(`Order ${orderId} not found`);
      return;
    }

    if (order.status !== OrderStatus.PENDING) {
      this.logger.warn(
        `Order ${orderId} is already in status "${order.status}", skipping`,
      );
      return;
    }

    if (data.amount < order.totalAmount) {
      this.logger.warn(
        `Insufficient payment for order ${orderId}: expected ${order.totalAmount}, received ${data.amount}`,
      );
      return;
    }

    order.status = OrderStatus.CONFIRMED;
    await this.orderRepository.getEntityManager().persistAndFlush(order);

    this.logger.log(`Order ${orderId} confirmed via Casso payment`);
  }

  private extractOrderId(description: string): string | null {
    const match = /THANHTOAN\s+([a-fA-F0-9]{24})/i.exec(description);
    return match ? match[1] : null;
  }
}
