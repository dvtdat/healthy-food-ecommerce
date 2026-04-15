import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
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

  @ApiPropertyOptional({ example: ['High protein', 'Omega-3 rich', 'Low GI'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keyCharacteristics?: string[];

  @ApiPropertyOptional({ example: 330 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  weight?: number;

  @ApiPropertyOptional({ example: 'g' })
  @IsOptional()
  @IsString()
  weightUnit?: string;

  @ApiPropertyOptional({ example: 280 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  calories?: number;

  @ApiPropertyOptional({ example: 8.8 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10)
  healthScore?: number;

  @ApiPropertyOptional({ example: '1 day (refrigerated)' })
  @IsOptional()
  @IsString()
  shelfLife?: string;

  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  @IsNotEmpty()
  @IsString()
  categoryId!: string;
}
