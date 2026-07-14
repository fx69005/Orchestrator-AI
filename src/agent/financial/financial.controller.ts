import { BadRequestException, Body, Controller, Post } from '@nestjs/common';
import { FinancialAgentService } from './financial.service';

type InvokeFinancialAgentBody = {
  message?: unknown;
  threadId?: unknown;
};

@Controller('agent/financial')
export class FinancialAgentController {
  constructor(private readonly financialAgentService: FinancialAgentService) {}

  @Post('invoke')
  invoke(@Body() body: InvokeFinancialAgentBody) {
    if (typeof body?.message !== 'string' || !body.message.trim()) {
      throw new BadRequestException('message is required.');
    }

    if (typeof body.threadId !== 'string' || !body.threadId.trim()) {
      throw new BadRequestException('threadId is required.');
    }

    return this.financialAgentService.invoke(body.message, body.threadId);
  }
}
