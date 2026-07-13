import { Injectable } from '@nestjs/common';
import { agent } from './agent';

@Injectable()
export class AgentService {
  invoke(message: string) {
    return agent.invoke({
      messages: [{ role: 'user', content: message }],
    });
  }
}
