import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class IdDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  id?: string;
}
