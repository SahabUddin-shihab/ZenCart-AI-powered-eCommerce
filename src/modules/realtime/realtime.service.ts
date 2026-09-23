import { Injectable } from '@nestjs/common';
import { RealtimeGateway } from '../../infrastructure/websocket/realtime.gateway';
import { PaginationDto, paginate } from '../../common/dto/pagination.dto';

@Injectable()
export class RealtimeService {
  constructor(private gateway: RealtimeGateway) {}

  emitToUser(userId: string, event: string, data: any) { this.gateway.emit(userId, event, data); }
  emitToVendor(vendorId: string, event: string, data: any) { this.gateway.emitToVendor(vendorId, event, data); }
  broadcast(event: string, data: any) { this.gateway.broadcast(event, data); }

  async findAll(dto: PaginationDto) { return paginate([], 0, dto); }
  async create(data: any) { return data; }
  async findById(id: string) { return { id }; }
  async update(id: string, data: any) { return { id, ...data }; }
  async delete(id: string) { return { message: 'Deleted' }; }
  async getStats() { return { connections: 0 }; }
}
