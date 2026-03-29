import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Vegetables' })
  @IsNotEmpty()
  @IsString()
  name!: string;

  @ApiProperty({ example: 'vegetables' })
  @IsNotEmpty()
  @IsString()
  slug!: string;

  @ApiPropertyOptional({ example: 'Fresh organic vegetables' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'https://example.com/image.jpg' })
  @IsOptional()
  @IsString()
  imageUrl?: string;
}
