import { BadRequestException, Body, Controller, Post } from '@nestjs/common';
import { AgentService } from './agent.service';

type InvokeAgentBody = {
  message?: unknown;
  threadId?: unknown;
};

@Controller('agent')
export class AgentController {
  constructor(private readonly agentService: AgentService) {}

  @Post('invoke')
  invoke(@Body() body: InvokeAgentBody) {
    if (typeof body?.message !== 'string' || !body.message.trim()) {
      throw new BadRequestException('message is required.');
    }

    if (typeof body.threadId !== 'string' || !body.threadId.trim()) {
      throw new BadRequestException('threadId is required.');
    }

    return this.agentService.invoke(body.message, body.threadId);
  }
}
