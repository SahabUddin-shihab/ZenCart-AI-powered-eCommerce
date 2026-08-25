import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { Readable } from 'stream';

export interface UploadResult {
  publicId: string;
  url: string;
  secureUrl: string;
  width?: number;
  height?: number;
  format: string;
  resourceType: string;
  bytes: number;
}

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);
  private readonly folder: string;

  constructor(private readonly config: ConfigService) {
    cloudinary.config({
      cloud_name: config.get('CLOUDINARY_CLOUD_NAME'),
      api_key: config.get('CLOUDINARY_API_KEY'),
      api_secret: config.get('CLOUDINARY_API_SECRET'),
    });
    this.folder = config.get('CLOUDINARY_FOLDER', 'aiecom');
  }

  async uploadBuffer(
    buffer: Buffer,
    options?: {
      folder?: string;
      publicId?: string;
      transformation?: any[];
      resourceType?: 'image' | 'video' | 'raw' | 'auto';
      tags?: string[];
    },
  ): Promise<UploadResult> {
    return new Promise((resolve, reject) => {
      const uploadOptions = {
        folder: `${this.folder}/${options?.folder || 'general'}`,
        public_id: options?.publicId,
        resource_type: options?.resourceType || 'auto' as any,
        transformation: options?.transformation,
        tags: options?.tags,
        quality: 'auto',
        fetch_format: 'auto',
      };
      const uploadStream = cloudinary.uploader.upload_stream(
        uploadOptions,
        (error, result) => {
          if (error) reject(error);
          else resolve(this.mapResult(result!));
        },
      );
      Readable.from(buffer).pipe(uploadStream);
    });
  }

  async uploadUrl(imageUrl: string, options?: any): Promise<UploadResult> {
    const result = await cloudinary.uploader.upload(imageUrl, {
      folder: `${this.folder}/${options?.folder || 'general'}`,
      ...options,
    });
    return this.mapResult(result);
  }

  async delete(publicId: string): Promise<void> {
    await cloudinary.uploader.destroy(publicId);
  }

  async deleteMany(publicIds: string[]): Promise<void> {
    await cloudinary.api.delete_resources(publicIds);
  }

  getOptimizedUrl(publicId: string, transformations?: object): string {
    return cloudinary.url(publicId, {
      quality: 'auto',
      fetch_format: 'auto',
      ...transformations,
    });
  }

  getThumbnailUrl(publicId: string, width = 300, height = 300): string {
    return cloudinary.url(publicId, {
      width,
      height,
      crop: 'fill',
      quality: 'auto',
      fetch_format: 'auto',
    });
  }

  async removeBackground(publicId: string): Promise<UploadResult> {
    const result = await cloudinary.uploader.upload(publicId, {
      effect: 'background_removal',
      folder: `${this.folder}/nobg`,
    });
    return this.mapResult(result);
  }

  private mapResult(result: UploadApiResponse): UploadResult {
    return {
      publicId: result.public_id,
      url: result.url,
      secureUrl: result.secure_url,
      width: result.width,
      height: result.height,
      format: result.format,
      resourceType: result.resource_type,
      bytes: result.bytes,
    };
  }
}
