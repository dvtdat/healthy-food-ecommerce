import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateOrderDto {
  @ApiProperty({ example: '123 Nguyen Hue, District 1, HCMC' })
  @IsNotEmpty()
  @IsString()
  shippingAddress!: string;

  @ApiPropertyOptional({ example: 'Please call before delivery' })
  @IsOptional()
  @IsString()
  notes?: string;
}
