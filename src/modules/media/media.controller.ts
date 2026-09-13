import {
  Controller, Post, Delete, Get, Body, Param, Query,
  UseInterceptors, UploadedFile, UploadedFiles, UseGuards,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { MediaService } from './media.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Media')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller({ path: 'media', version: '1' })
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload single file' })
  upload(@UploadedFile() file: Express.Multer.File, @Body('folder') folder: string) {
    return this.mediaService.upload(file, folder || 'general');
  }

  @Post('upload-multiple')
  @UseInterceptors(FilesInterceptor('files', 10))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload multiple files' })
  uploadMultiple(@UploadedFiles() files: Express.Multer.File[], @Body('folder') folder: string) {
    return this.mediaService.uploadMultiple(files, folder || 'general');
  }

  @Delete(':publicId')
  @ApiOperation({ summary: 'Delete media by public ID' })
  delete(@Param('publicId') publicId: string) {
    return this.mediaService.delete(decodeURIComponent(publicId));
  }

  @Get('optimize/:publicId')
  @ApiOperation({ summary: 'Get optimized URL for media' })
  getOptimized(@Param('publicId') id: string, @Query('w') w: number, @Query('h') h: number) {
    return this.mediaService.getOptimizedUrl(decodeURIComponent(id), w, h);
  }

  @Post('remove-background/:publicId')
  @ApiOperation({ summary: 'AI background removal' })
  removeBackground(@Param('publicId') id: string) {
    return this.mediaService.removeBackground(decodeURIComponent(id));
  }
}
