import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class OrderItemDto {
  @IsNotEmpty()
  @IsString()
  productId!: string;

  @IsInt()
  @Min(1)
  quantity!: number;
}

export class CreateOrderDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items!: OrderItemDto[];

  @IsNotEmpty()
  @IsString()
  shippingAddress!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
