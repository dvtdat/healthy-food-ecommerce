import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  MaxLength,
  IsOptional,
  IsIn,
} from 'class-validator';

const SUPPORTED_LOCALES = ['vi', 'en', 'de'] as const;

export class ChatMessageDto {
  @ApiProperty({ example: 'Cho tôi xem các sản phẩm đang còn hàng' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  message!: string;

  @ApiPropertyOptional({ enum: SUPPORTED_LOCALES, example: 'en' })
  @IsOptional()
  @IsIn(SUPPORTED_LOCALES as unknown as string[])
  locale?: (typeof SUPPORTED_LOCALES)[number];
}
