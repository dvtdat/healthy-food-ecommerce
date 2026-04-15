import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { VoucherType } from 'src/entities';

export class CreateVoucherDto {
  @ApiProperty({ example: 'SUMMER10' })
  @IsNotEmpty()
  @IsString()
  code!: string;

  @ApiProperty({ enum: VoucherType, example: VoucherType.PERCENT })
  @IsEnum(VoucherType)
  type!: VoucherType;

  @ApiProperty({
    example: 10,
    description: 'Percent value or fixed VND amount',
  })
  @IsNumber()
  @Min(0)
  value!: number;

  @ApiPropertyOptional({ example: 100000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minOrderAmount?: number;

  @ApiPropertyOptional({
    example: 50000,
    description: 'Max discount cap (percent type only)',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxDiscount?: number;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  usageLimit?: number;

  @ApiPropertyOptional({ example: 1, description: 'Max uses per user' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  perUserLimit?: number;

  @ApiProperty({ example: '2026-04-15T00:00:00.000Z' })
  @IsDateString()
  validFrom!: string;

  @ApiProperty({ example: '2026-12-31T23:59:59.000Z' })
  @IsDateString()
  validTo!: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
