import { Injectable } from '@nestjs/common';
import { HumanMessage } from '@langchain/core/messages';
import { financialGraph } from './financial.graph';
import { toFinancialMessages } from './financial-messages';
import type { FinancialGraphState } from './financial-state';
import type { FinancialInvokeResponse } from './financial.types';

function toFinancialInvokeResponse(
  state: FinancialGraphState,
): FinancialInvokeResponse {
  return {
    intent: state.intent,
    safe: state.safetyDecision === 'safe',
    safetyDecision: state.safetyDecision,
    selectedAgent: state.selectedAgent,
    delegatedAgents: state.delegatedAgents,
    response: state.response,
    messages: toFinancialMessages(state.messages),
  };
}

@Injectable()
export class FinancialAgentService {
  async invoke(
    message: string,
    threadId: string,
  ): Promise<FinancialInvokeResponse> {
    if (!threadId.trim()) {
      throw new Error('threadId is required to preserve conversation memory.');
    }

    const result = await financialGraph.invoke(
      {
        messages: [new HumanMessage(message)],
      },
      {
        configurable: {
          thread_id: threadId,
        },
      },
    );

    return toFinancialInvokeResponse(result);
  }
}
