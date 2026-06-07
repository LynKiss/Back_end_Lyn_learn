import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { extname } from 'path';
import { diskStorage } from 'multer';
import { unlinkSync } from 'fs';
import { Auth } from '../../common/decorators/auth.decorator';

const ALLOWED_PREFIXES = ['audio/', 'image/'];

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
      storage: diskStorage({
        destination: process.env.UPLOAD_DIR ?? 'uploads',
        filename: (_req, file, cb) => {
          const ext = extname(file.originalname || '');
          cb(null, `${Date.now()}-${randomUUID()}${ext}`);
        },
      }),
      limits: {
        fileSize: parseInt(process.env.UPLOAD_MAX_BYTES ?? '26214400', 10),
      },
    }),
  )
  upload(@UploadedFile() file: any) {
    if (!file) throw new BadRequestException('Không có file upload');
    const allowed = ALLOWED_PREFIXES.some((prefix) =>
      String(file.mimetype).startsWith(prefix),
    );
    if (!allowed) {
      try {
        unlinkSync(file.path);
      } catch {
        // ignore cleanup failure
      }
      throw new BadRequestException('Chỉ hỗ trợ file audio hoặc image');
    }

    return {
      url: `/uploads/${file.filename}`,
      mimeType: file.mimetype,
      size: file.size,
      kind: String(file.mimetype).startsWith('audio/') ? 'audio' : 'image',
    };
  }
}
