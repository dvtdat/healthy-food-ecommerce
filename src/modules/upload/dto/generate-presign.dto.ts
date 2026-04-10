import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsIn, IsString } from 'class-validator';

export enum UploadFolder {
  PRODUCTS = 'products',
  CATEGORIES = 'categories',
  USERS = 'users',
  REVIEWS = 'reviews',
}

export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;
export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

export class GeneratePresignDto {
  @ApiProperty({ enum: UploadFolder, example: UploadFolder.PRODUCTS })
  @IsEnum(UploadFolder)
  folder!: UploadFolder;

  @ApiProperty({
    example: 'image/jpeg',
    enum: ALLOWED_MIME_TYPES,
  })
  @IsString()
  @IsIn(ALLOWED_MIME_TYPES)
  contentType!: AllowedMimeType;
}
