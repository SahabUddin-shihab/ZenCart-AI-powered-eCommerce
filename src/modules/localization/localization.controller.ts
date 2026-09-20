import {
  Controller, Get, Post, Put, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { LocalizationService } from './localization.service';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Localization')
@Controller({ path: 'localization', version: '1' })
export class LocalizationController {
  constructor(private readonly localizationService: LocalizationService) {}

  @Public() @Get('languages') getLanguages() { return this.localizationService.getLanguages(); }
  @Public() @Get('currencies') getCurrencies() { return this.localizationService.getCurrencies(); }
  @Public() @Get('translations/:locale') getTranslations(@Param('locale') locale: string) {
    return this.localizationService.getTranslations(locale);
  }
  @Public() @Get('convert') convert(
    @Query('amount') amount: number,
    @Query('from') from: string,
    @Query('to') to: string,
  ) { return this.localizationService.convertCurrency(amount, from, to); }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Post('translations') upsert(@Body() data: any) {
    return this.localizationService.upsertTranslation(data.key, data.locale, data.value);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Post('translations/bulk') bulkUpsert(@Body() data: any[]) {
    return this.localizationService.bulkUpsert(data);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Put('currencies/:code/rate') updateRate(@Param('code') code: string, @Body('rate') rate: number) {
    return this.localizationService.updateCurrencyRate(code, rate);
  }
}
