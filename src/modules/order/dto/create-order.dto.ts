import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateOrderDto {
  @IsNotEmpty()
  @IsString()
  shippingAddress!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
