import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import {
  ALLOWED_MIME_TYPES,
  GeneratePresignDto,
} from './dto/generate-presign.dto';

export interface PresignedUrlResponse {
  uploadUrl: string;
  fileUrl: string;
}

@Injectable()
export class UploadService {
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly region: string;

  constructor(private readonly config: ConfigService) {
    this.region = this.config.getOrThrow<string>('AWS_REGION');
    this.bucket = this.config.getOrThrow<string>('AWS_S3_BUCKET');
    this.s3 = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: this.config.getOrThrow<string>('AWS_ACCESS_KEY_ID'),
        secretAccessKey: this.config.getOrThrow<string>(
          'AWS_SECRET_ACCESS_KEY',
        ),
      },
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
    });
  }

  async generatePresignedUrl(
    dto: GeneratePresignDto,
  ): Promise<PresignedUrlResponse> {
    if (!ALLOWED_MIME_TYPES.includes(dto.contentType)) {
      throw new BadRequestException(
        `Unsupported content type. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`,
      );
    }

    // e.g. "image/jpeg" → "jpeg"
    const ext = dto.contentType.split('/')[1];
    const key = `${dto.folder}/${randomUUID()}.${ext}`;

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: dto.contentType,
    });

    const uploadUrl = await getSignedUrl(this.s3, command, {
      expiresIn: 300, // 5 minutes
    });

    const fileUrl = `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;

    return { uploadUrl, fileUrl };
  }
}
