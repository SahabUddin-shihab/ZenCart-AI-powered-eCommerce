import {
  Controller, Get, Post, Put, Patch, Delete, Body, Param, Query,
  UseGuards, UseInterceptors, UploadedFiles, HttpCode, HttpStatus,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductFilterDto } from './dto/product-filter.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Products')
@Controller({ path: 'products', version: '1' })
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List products with filters' })
  findAll(@Query() dto: ProductFilterDto) {
    return this.productsService.findAll(dto);
  }

  @Public()
  @Get('featured')
  @ApiOperation({ summary: 'Featured products' })
  getFeatured(@Query('limit') limit: number) {
    return this.productsService.getFeatured(limit || 12);
  }

  @Public()
  @Get('bestsellers')
  @ApiOperation({ summary: 'Bestseller products' })
  getBestsellers(@Query('limit') limit: number) {
    return this.productsService.getBestsellers(limit || 12);
  }

  @Public()
  @Get('search')
  @ApiOperation({ summary: 'Full-text product search' })
  search(@Query('q') q: string) {
    return this.productsService.search(q);
  }

  @Public()
  @Get('slug/:slug')
  @ApiOperation({ summary: 'Get product by slug' })
  findBySlug(@Param('slug') slug: string) {
    return this.productsService.findBySlug(slug);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get product by ID' })
  findOne(@Param('id') id: string) {
    return this.productsService.findById(id);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('VENDOR', 'ADMIN', 'SUPER_ADMIN')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create product (Vendor)' })
  create(@CurrentUser() user: any, @Body() dto: CreateProductDto) {
    return this.productsService.create(user.vendor.id, dto);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('VENDOR', 'ADMIN', 'SUPER_ADMIN')
  @Get('my/list')
  @ApiOperation({ summary: 'My products (Vendor)' })
  getMyProducts(@CurrentUser() user: any, @Query() dto: PaginationDto) {
    return this.productsService.getVendorProducts(user.vendor.id, dto);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('VENDOR', 'ADMIN', 'SUPER_ADMIN')
  @Put(':id')
  @ApiOperation({ summary: 'Update product' })
  update(@Param('id') id: string, @CurrentUser() user: any, @Body() dto: UpdateProductDto) {
    return this.productsService.update(id, user.vendor.id, dto);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('VENDOR', 'ADMIN', 'SUPER_ADMIN')
  @Post(':id/images')
  @UseInterceptors(FilesInterceptor('files', 10))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload product images' })
  uploadImages(@Param('id') id: string, @UploadedFiles() files: Express.Multer.File[]) {
    return this.productsService.uploadImages(id, files);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('VENDOR', 'ADMIN', 'SUPER_ADMIN')
  @Post(':id/variants')
  @ApiOperation({ summary: 'Add product variant' })
  addVariant(@Param('id') id: string, @Body() variantData: any) {
    return this.productsService.addVariant(id, variantData);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('VENDOR', 'ADMIN', 'SUPER_ADMIN')
  @Patch(':id/publish')
  @ApiOperation({ summary: 'Publish product' })
  publish(@Param('id') id: string) {
    return this.productsService.publish(id);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('VENDOR', 'ADMIN', 'SUPER_ADMIN')
  @Patch(':id/unpublish')
  @ApiOperation({ summary: 'Unpublish product' })
  unpublish(@Param('id') id: string) {
    return this.productsService.unpublish(id);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('VENDOR', 'ADMIN', 'SUPER_ADMIN')
  @Delete(':id')
  @ApiOperation({ summary: 'Delete product' })
  delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.productsService.softDelete(id, user.vendor?.id || user.id);
  }
}
