import { Injectable } from '@nestjs/common';
import { agent } from './agent';

@Injectable()
export class AgentService {
  invoke(message: string, threadId: string) {
    if (!threadId.trim()) {
      throw new Error('threadId is required to preserve conversation memory.');
    }

    return agent.invoke(
      {
        messages: [{ role: 'user', content: message }],
      },
      {
        configurable: {
          thread_id: threadId,
        },
      },
    );
  }
}
