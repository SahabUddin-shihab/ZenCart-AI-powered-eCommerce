import { Injectable } from '@nestjs/common';
import { PaginationDto, paginate } from '../../common/dto/pagination.dto';

@Injectable()
export class WorkflowsService {
  async findAll(dto: PaginationDto) { return paginate([], 0, dto); }
  async create(data: any) { return { ...data, id: Date.now().toString() }; }
  async findById(id: string) { return { id }; }
  async update(id: string, data: any) { return { id, ...data }; }
  async delete(id: string) { return { message: 'Deleted' }; }
  async getStats() { return { total: 0 }; }
}
