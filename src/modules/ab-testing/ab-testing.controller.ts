import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AbTestingService } from './ab-testing.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('AbTesting')
@Controller({ path: 'ab-testing', version: '1' })
export class AbTestingController {
  constructor(private readonly service: AbTestingService) {}

  @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard)
  @Get('variant/:key')
  getVariant(@Param('key') key: string, @CurrentUser('id') userId: string) {
    return this.service.getVariant(key, userId).then(variant => ({ experimentKey: key, variant }));
  }

  @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard)
  @Post('track')
  track(@CurrentUser('id') userId: string, @Body() body: any) {
    return this.service.trackConversion(body.experimentKey, userId, body.variant, body.value);
  }

  @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard, RolesGuard) @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @Get('results/:key')
  getResults(@Param('key') key: string) { return this.service.getResults(key); }
}
