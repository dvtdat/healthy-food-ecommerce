# AWS S3 Integration Plan

## Architecture: Presigned URL Upload

Rather than proxying files through the NestJS server, use **presigned URLs** — the backend generates a temporary signed S3 URL, and the frontend uploads directly to S3.

```
Frontend                    Backend (NestJS)              AWS S3
   |                              |                          |
   |-- POST /uploads/presign -->  |                          |
   |                              |-- generate presigned --> |
   |<-- { uploadUrl, fileUrl } -- |                          |
   |                              |                          |
   |-- PUT file directly -------> S3 (no backend involved)  |
   |                              |                          |
   |-- PATCH /products/:id -----> |                          |
   |   { imageUrl: fileUrl }      | stores URL in DB         |
```

---

## Backend Implementation

### 1. Install dependencies

```bash
yarn add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

### 2. Environment variables

Add to `.env`:

```env
AWS_REGION=ap-southeast-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=healthy-food-images
```

Register in `src/config/` or directly in `UploadModule` via `ConfigService`.

### 3. File structure

```
src/modules/upload/
├── upload.module.ts
├── upload.controller.ts
├── upload.service.ts        # S3 presigned URL logic
└── dto/
    └── generate-presign.dto.ts
```

### 4. `generate-presign.dto.ts`

```typescript
import { IsEnum, IsString } from 'class-validator';

export enum UploadFolder {
  PRODUCTS = 'products',
  CATEGORIES = 'categories',
  USERS = 'users',
  REVIEWS = 'reviews',
}

export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export class GeneratePresignDto {
  @IsEnum(UploadFolder)
  folder: UploadFolder;

  @IsString()
  contentType: string; // validated against ALLOWED_MIME_TYPES in service
}
```

### 5. `upload.service.ts`

```typescript
import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import {
  GeneratePresignDto,
  ALLOWED_MIME_TYPES,
} from './dto/generate-presign.dto';

@Injectable()
export class UploadService {
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly region: string;

  constructor(private readonly config: ConfigService) {
    this.region = config.get<string>('AWS_REGION');
    this.bucket = config.get<string>('AWS_S3_BUCKET');
    this.s3 = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: config.get<string>('AWS_ACCESS_KEY_ID'),
        secretAccessKey: config.get<string>('AWS_SECRET_ACCESS_KEY'),
      },
    });
  }

  async generatePresignedUrl(
    dto: GeneratePresignDto,
  ): Promise<{ uploadUrl: string; fileUrl: string }> {
    if (!ALLOWED_MIME_TYPES.includes(dto.contentType)) {
      throw new BadRequestException(
        `Unsupported content type. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`,
      );
    }

    const ext = dto.contentType.split('/')[1]; // e.g. "jpeg", "png", "webp"
    const key = `${dto.folder}/${uuidv4()}.${ext}`;

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: dto.contentType,
    });

    const uploadUrl = await getSignedUrl(this.s3, command, { expiresIn: 300 }); // 5 minutes
    const fileUrl = `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;

    return { uploadUrl, fileUrl };
  }
}
```

> If using CloudFront, replace `fileUrl` with `https://<CF_DISTRIBUTION>/${key}`.

### 6. `upload.controller.ts`

```typescript
import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UploadService } from './upload.service';
import { GeneratePresignDto } from './dto/generate-presign.dto';

@ApiTags('uploads')
@ApiBearerAuth()
@Controller('uploads')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('presign')
  generatePresignedUrl(@Body() dto: GeneratePresignDto) {
    return this.uploadService.generatePresignedUrl(dto);
  }
}
```

### 7. `upload.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';

@Module({
  imports: [ConfigModule],
  controllers: [UploadController],
  providers: [UploadService],
  exports: [UploadService],
})
export class UploadModule {}
```

Register `UploadModule` in `app.module.ts`.

### 8. Entity & DTO changes

| Entity     | New fields                                  |
| ---------- | ------------------------------------------- |
| `Product`  | `imageUrl?: string`, `imageUrls?: string[]` |
| `Category` | `imageUrl?: string`                         |
| `User`     | `avatarUrl?: string`                        |
| `Review`   | `imageUrls?: string[]`                      |

In each entity:

```typescript
@Property({ nullable: true })
imageUrl?: string;
```

In each DTO, add with `@IsOptional() @IsUrl()`:

```typescript
@IsOptional()
@IsUrl()
imageUrl?: string;
```

---

## Frontend Implementation

### Upload flow (two-step)

```typescript
async function uploadImage(file: File, folder: string): Promise<string> {
  // Step 1: request presigned URL from backend
  const { uploadUrl, fileUrl } = await api.post('/uploads/presign', {
    folder,
    contentType: file.type,
  });

  // Step 2: PUT file directly to S3 (no Authorization header)
  await fetch(uploadUrl, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': file.type },
  });

  // Step 3: return the permanent S3 URL to store in the form
  return fileUrl;
}
```

### Upload with progress tracking

Use `XMLHttpRequest` instead of `fetch` to get progress events:

```typescript
function uploadWithProgress(
  uploadUrl: string,
  file: File,
  onProgress: (pct: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable)
        onProgress(Math.round((e.loaded / e.total) * 100));
    });
    xhr.addEventListener('load', () =>
      xhr.status < 400 ? resolve() : reject(xhr.status),
    );
    xhr.addEventListener('error', reject);
    xhr.open('PUT', uploadUrl);
    xhr.setRequestHeader('Content-Type', file.type);
    xhr.send(file);
  });
}
```

### Client-side validation (before requesting presign)

```typescript
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function validateImageFile(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type))
    return 'Only JPEG, PNG, and WebP images are allowed.';
  if (file.size > MAX_SIZE_BYTES) return 'File must be under 5 MB.';
  return null;
}
```

### Immediate preview before upload completes

```typescript
const previewUrl = URL.createObjectURL(file); // show this in <img> right away
// revoke after upload or on component unmount:
URL.revokeObjectURL(previewUrl);
```

### Usage in a form component (React example)

```tsx
const [imageUrl, setImageUrl] = useState('');
const [uploading, setUploading] = useState(false);

async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
  const file = e.target.files?.[0];
  if (!file) return;

  const error = validateImageFile(file);
  if (error) return showToast(error);

  setUploading(true);
  try {
    const url = await uploadImage(file, 'products');
    setImageUrl(url); // store in form state — submit this URL with the product form
  } finally {
    setUploading(false);
  }
}

// Disable submit button while uploading:
<button type="submit" disabled={uploading}>
  Save Product
</button>;
```

---

## AWS Setup

### S3 Bucket policy (public read, private write)

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicRead",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::healthy-food-images/*"
    }
  ]
}
```

### IAM policy for the backend user (least privilege)

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:PutObject"],
      "Resource": "arn:aws:s3:::healthy-food-images/*"
    }
  ]
}
```

### S3 CORS configuration

```json
[
  {
    "AllowedHeaders": ["Content-Type"],
    "AllowedMethods": ["PUT"],
    "AllowedOrigins": ["http://localhost:3000", "https://yourdomain.com"],
    "ExposeHeaders": [],
    "MaxAgeSeconds": 3000
  }
]
```

---

## Optional: CloudFront CDN

1. Create a CloudFront distribution pointing to the S3 bucket (Origin Access Control)
2. Remove the public bucket policy — CloudFront reads S3 privately
3. Replace `fileUrl` in `upload.service.ts` with `https://<CF_DOMAIN>/${key}`
4. Add `AWS_CLOUDFRONT_DOMAIN` env var

Benefits: lower latency globally, HTTPS by default, caching at edge.

---

## Implementation Order

| #   | Task                                                                          | Owner          |
| --- | ----------------------------------------------------------------------------- | -------------- |
| 1   | Create S3 bucket, IAM user, configure CORS and bucket policy                  | DevOps/Backend |
| 2   | Add AWS env vars to `.env` and register in `ConfigModule`                     | Backend        |
| 3   | Implement `UploadModule` (service + controller + DTO)                         | Backend        |
| 4   | Register `UploadModule` in `app.module.ts`                                    | Backend        |
| 5   | Add `imageUrl`/`imageUrls` fields to Product, Category, User, Review entities | Backend        |
| 6   | Update CreateDto/UpdateDto for each entity with `@IsOptional() @IsUrl()`      | Backend        |
| 7   | Build reusable `ImageUpload` component in Frontend                            | Frontend       |
| 8   | Wire upload component into Product and Category admin forms                   | Frontend       |
| 9   | (Optional) Set up CloudFront distribution                                     | DevOps         |
