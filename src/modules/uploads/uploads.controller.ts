import {
  BadRequestException,
  Controller,
  Post,
  ServiceUnavailableException,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { createHash, randomUUID } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import { extname, join } from 'path';
import { memoryStorage } from 'multer';
import { Auth } from '../../common/decorators/auth.decorator';

const ALLOWED_PREFIXES = ['audio/', 'image/', 'video/'];

type UploadKind = 'audio' | 'image' | 'video';

interface UploadedFileLike {
  originalname?: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@ApiTags('uploads')
@ApiBearerAuth()
@Auth()
@Controller('uploads')
export class UploadsController {
  constructor(private readonly config: ConfigService) {}

  @Post()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: {
        fileSize: parseInt(process.env.UPLOAD_MAX_BYTES ?? '26214400', 10),
      },
    }),
  )
  async upload(@UploadedFile() file: UploadedFileLike) {
    if (!file) throw new BadRequestException('No file uploaded');
    const allowed = ALLOWED_PREFIXES.some((prefix) =>
      String(file.mimetype).startsWith(prefix),
    );
    if (!allowed) {
      throw new BadRequestException('Only audio, image, or video files are supported');
    }

    const kind = this.kindFromMime(file.mimetype);
    if (this.hasCloudinaryConfig()) {
      return this.uploadToCloudinary(file, kind);
    }
    return this.saveLocal(file, kind);
  }

  private kindFromMime(mimeType: string): UploadKind {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    return 'audio';
  }

  private hasCloudinaryConfig() {
    return Boolean(
      this.config.get<string>('cloudinary.cloudName') &&
        this.config.get<string>('cloudinary.apiKey') &&
        this.config.get<string>('cloudinary.apiSecret'),
    );
  }

  private async uploadToCloudinary(file: UploadedFileLike, kind: UploadKind) {
    const cloudName = this.config.get<string>('cloudinary.cloudName', '');
    const apiKey = this.config.get<string>('cloudinary.apiKey', '');
    const apiSecret = this.config.get<string>('cloudinary.apiSecret', '');
    const folder = this.config.get<string>('cloudinary.folder', 'web_lyn');
    const timestamp = Math.floor(Date.now() / 1000);
    const resourceType = kind === 'image' ? 'image' : 'video';
    const signature = this.signCloudinaryParams({ folder, timestamp }, apiSecret);
    const bytes = Uint8Array.from(file.buffer);

    const form = new FormData();
    form.append('api_key', apiKey);
    form.append('timestamp', String(timestamp));
    form.append('folder', folder);
    form.append('signature', signature);
    form.append(
      'file',
      new Blob([bytes], { type: file.mimetype }),
      file.originalname || `upload-${Date.now()}`,
    );

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`,
      { method: 'POST', body: form },
    );
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new ServiceUnavailableException(
        data?.error?.message ?? 'Cloudinary upload failed',
      );
    }

    return {
      url: data.secure_url,
      mimeType: file.mimetype,
      size: Number(data.bytes ?? file.size),
      kind,
      provider: 'cloudinary',
      publicId: data.public_id,
      resourceType: data.resource_type,
    };
  }

  private signCloudinaryParams(
    params: Record<string, string | number>,
    apiSecret: string,
  ) {
    const payload = Object.keys(params)
      .sort()
      .map((key) => `${key}=${params[key]}`)
      .join('&');
    return createHash('sha1')
      .update(`${payload}${apiSecret}`)
      .digest('hex');
  }

  private async saveLocal(file: UploadedFileLike, kind: UploadKind) {
    const uploadDir = this.config.get<string>('uploads.dir', 'uploads');
    await mkdir(uploadDir, { recursive: true });
    const ext = extname(file.originalname || '');
    const filename = `${Date.now()}-${randomUUID()}${ext}`;
    await writeFile(join(uploadDir, filename), file.buffer);
    return {
      url: `/uploads/${filename}`,
      mimeType: file.mimetype,
      size: file.size,
      kind,
      provider: 'local',
    };
  }
}
