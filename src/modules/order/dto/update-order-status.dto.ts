import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { OrderStatus } from 'src/entities';

export class UpdateOrderStatusDto {
  @ApiProperty({ enum: OrderStatus, example: OrderStatus.SHIPPED })
  @IsEnum(OrderStatus)
  status!: OrderStatus;

  @ApiPropertyOptional({ example: 'VN123456789' })
  @IsString()
  @IsOptional()
  trackingNumber?: string;

  @ApiPropertyOptional({ example: 'Giao Hang Nhanh' })
  @IsString()
  @IsOptional()
  courierName?: string;

  @ApiPropertyOptional({ example: '2026-04-05T00:00:00.000Z' })
  @IsDateString()
  @IsOptional()
  estimatedDeliveryDate?: string;

  @ApiPropertyOptional({ example: 'Order confirmed and ready to ship' })
  @IsString()
  @IsOptional()
  note?: string;
}
