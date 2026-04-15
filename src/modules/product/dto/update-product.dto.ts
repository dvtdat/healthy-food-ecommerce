import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class UpdateProductDto {
  @ApiPropertyOptional({ example: 'Organic Broccoli' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'organic-broccoli' })
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiPropertyOptional({ example: 'Fresh organic broccoli from local farms' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 29000, minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({ example: 100, minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  stock?: number;

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

  @ApiPropertyOptional({ example: '507f1f77bcf86cd799439011' })
  @IsOptional()
  @IsString()
  categoryId?: string;
}
