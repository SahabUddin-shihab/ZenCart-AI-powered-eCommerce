import { Controller, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RealtimeService } from './realtime.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Realtime')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'ADMIN')
@Controller({ path: 'realtime', version: '1' })
export class RealtimeController {
  constructor(private readonly service: RealtimeService) {}

  @Post('broadcast')
  @ApiOperation({ summary: 'Broadcast event to all connected users' })
  broadcast(@Body('event') event: string, @Body('data') data: any) {
    this.service.broadcast(event, data);
    return { message: 'Broadcast sent' };
  }

  @Post('user/:userId')
  @ApiOperation({ summary: 'Send event to specific user' })
  emitToUser(@Param('userId') id: string, @Body('event') event: string, @Body('data') data: any) {
    this.service.emitToUser(id, event, data);
    return { message: 'Event sent' };
  }
}
