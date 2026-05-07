import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class CartItemRefDto {
  @ApiProperty({ example: '67d3f0a1b2c3d4e5f6789012' })
  @IsNotEmpty()
  @IsString()
  productId!: string;

  @ApiPropertyOptional({ example: '67c1a2b3c4d5e6f789012345' })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiProperty({ example: 50000 })
  @IsNumber()
  @Min(0)
  price!: number;
}

export class SuggestVoucherDto {
  @ApiProperty({ example: 200000 })
  @IsNumber()
  @Min(0)
  subtotal!: number;

  @ApiPropertyOptional({ type: [CartItemRefDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => CartItemRefDto)
  items?: CartItemRefDto[];
}
