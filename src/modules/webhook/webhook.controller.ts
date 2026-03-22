import { Body, Controller, Headers, HttpCode, Post } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { WebhookService } from './webhook.service';
import { CassoWebhookDto } from './dto/casso-webhook.dto';

@ApiTags('webhooks')
@Controller('webhooks')
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  @Post('casso')
  @HttpCode(200)
  @ApiOperation({ summary: 'Casso bank transfer webhook' })
  @ApiHeader({
    name: 'x-casso-signature',
    description: 'Casso V2 secure token header',
    required: false,
  })
  @ApiHeader({
    name: 'secure-token',
    description: 'Casso legacy secure token header',
    required: false,
  })
  async handleCasso(
    @Headers('x-casso-signature') signatureV2: string | undefined,
    @Headers('secure-token') signatureLegacy: string | undefined,
    @Body() payload: CassoWebhookDto,
  ) {
    this.webhookService.validateSignature(signatureV2 ?? signatureLegacy);
    return this.webhookService.handleTransaction(payload);
  }
}
