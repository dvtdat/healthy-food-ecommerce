import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth/jwt-auth.guard';
import { GeneratePresignDto } from './dto/generate-presign.dto';
import { UploadService } from './upload.service';

@ApiTags('uploads')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('uploads')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('presign')
  @ApiOperation({
    summary: 'Generate a presigned S3 URL for direct browser upload',
    description:
      'Returns a short-lived PUT URL (5 min). The client PUTs the file directly to S3 using that URL, then stores the returned `fileUrl` on the resource.',
  })
  @ApiCreatedResponse({
    schema: {
      properties: {
        uploadUrl: {
          type: 'string',
          example:
            'https://bucket.s3.ap-southeast-1.amazonaws.com/products/uuid.jpg?X-Amz-Signature=...',
        },
        fileUrl: {
          type: 'string',
          example:
            'https://bucket.s3.ap-southeast-1.amazonaws.com/products/uuid.jpg',
        },
      },
    },
  })
  generatePresignedUrl(@Body() dto: GeneratePresignDto) {
    return this.uploadService.generatePresignedUrl(dto);
  }
}
