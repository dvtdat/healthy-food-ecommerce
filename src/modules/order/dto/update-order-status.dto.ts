import { IsEnum } from 'class-validator';
import { OrderStatus } from 'src/entities';

export class UpdateOrderStatusDto {
  @IsEnum(OrderStatus)
  status!: OrderStatus;
}
