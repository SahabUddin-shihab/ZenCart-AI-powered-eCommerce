import { IsOptional, IsInt, Min, Max, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class PaginationDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';

  get skip(): number { return ((this.page || 1) - 1) * (this.limit || 20); }
  get take(): number { return this.limit || 20; }
}

export function paginate<T>(data: T[], total: number, dto: PaginationDto) {
  return {
    data,
    meta: {
      total,
      page: dto.page || 1,
      limit: dto.limit || 20,
      totalPages: Math.ceil(total / (dto.limit || 20)),
    },
  };
}
