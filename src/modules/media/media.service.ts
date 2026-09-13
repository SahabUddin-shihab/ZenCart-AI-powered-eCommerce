import { Injectable, NotFoundException } from '@nestjs/common';
import { CloudinaryService } from '../../infrastructure/storage/cloudinary.service';
import { PaginationDto, paginate } from '../../common/dto/pagination.dto';

@Injectable()
export class MediaService {
  constructor(private cloudinary: CloudinaryService) {}

  async upload(file: Express.Multer.File, folder: string, options?: any) {
    return this.cloudinary.uploadBuffer(file.buffer, { folder, ...options });
  }

  async uploadMultiple(files: Express.Multer.File[], folder: string) {
    return Promise.all(files.map(f => this.upload(f, folder)));
  }

  async delete(publicId: string) {
    await this.cloudinary.delete(publicId);
    return { message: 'Media deleted', publicId };
  }

  async getOptimizedUrl(publicId: string, width?: number, height?: number) {
    if (width && height) {
      return { url: this.cloudinary.getThumbnailUrl(publicId, width, height) };
    }
    return { url: this.cloudinary.getOptimizedUrl(publicId) };
  }

  async removeBackground(publicId: string) {
    return this.cloudinary.removeBackground(publicId);
  }

  async findAll(dto: PaginationDto) { return paginate([], 0, dto); }
  async create(data: any) { return data; }
  async findById(id: string) { return { id }; }
  async update(id: string, data: any) { return { id, ...data }; }
  async getStats() { return {}; }
}
