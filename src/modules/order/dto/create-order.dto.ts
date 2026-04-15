import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { DeliveryOption } from 'src/common/config/delivery.config';

export class CreateOrderDto {
  @ApiProperty({ example: '123 Nguyen Hue, District 1, HCMC' })
  @IsNotEmpty()
  @IsString()
  shippingAddress!: string;

  @ApiProperty({ enum: DeliveryOption, example: DeliveryOption.STANDARD })
  @IsNotEmpty()
  @IsEnum(DeliveryOption)
  deliveryOption!: DeliveryOption;

  @ApiPropertyOptional({ example: 'SUMMER10' })
  @IsOptional()
  @IsString()
  voucherCode?: string;

  @ApiPropertyOptional({ example: 'Please call before delivery' })
  @IsOptional()
  @IsString()
  notes?: string;
}
