import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateProductDto {
  @ApiProperty({ example: 'Organic Broccoli' })
  @IsNotEmpty()
  @IsString()
  name!: string;

  @ApiProperty({ example: 'organic-broccoli' })
  @IsNotEmpty()
  @IsString()
  slug!: string;

  @ApiPropertyOptional({ example: 'Fresh organic broccoli from local farms' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 29000, minimum: 0 })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  price!: number;

  @ApiProperty({ example: 100, minimum: 0 })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  stock!: number;

  @ApiPropertyOptional({ example: 'https://example.com/broccoli.jpg' })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  @IsNotEmpty()
  @IsString()
  categoryId!: string;
}
