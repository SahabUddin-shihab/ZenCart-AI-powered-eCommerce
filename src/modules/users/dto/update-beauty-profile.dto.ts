import { IsString, IsOptional, IsArray } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateBeautyProfileDto {
  @ApiPropertyOptional({ description: 'AI beauty profile JSON' })
  @IsOptional()
  profile?: Record<string, any>;

  @ApiPropertyOptional({ enum: ['oily', 'dry', 'combination', 'sensitive', 'normal'] })
  @IsOptional() @IsString()
  skinType?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional() @IsArray() @IsString({ each: true })
  skinConcerns?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional() @IsArray() @IsString({ each: true })
  preferredShades?: string[];
}
