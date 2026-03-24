import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { OrderStatus } from 'src/entities';

export class UpdateOrderStatusDto {
  @IsEnum(OrderStatus)
  status!: OrderStatus;

  @IsString()
  @IsOptional()
  trackingNumber?: string;

  @IsString()
  @IsOptional()
  courierName?: string;

  @IsDateString()
  @IsOptional()
  estimatedDeliveryDate?: string;

  @IsString()
  @IsOptional()
  note?: string;
}
