import {
  AIMessage,
  AIMessageChunk,
  type BaseMessage,
} from '@langchain/core/messages';
import { createAgent } from 'langchain';
import { extractFinalAssistantMessage } from './financial-messages';
import { createFinancialModel } from './financial-model';
import {
  getAccountSnapshotTool,
  getFoodBudgetTool,
  getPeaPerformanceTool,
} from './mock-financial.tools';

const accountAgent = createAgent({
  model: createFinancialModel(),
  tools: [getAccountSnapshotTool],
  checkpointer: false,
  systemPrompt:
    'Tu es le spécialiste Compte. Utilise toujours get_account_snapshot avant de répondre. Utilise uniquement les données retournées, indique qu’elles sont simulées et ne donne aucun conseil financier.',
});

const budgetAgent = createAgent({
  model: createFinancialModel(),
  tools: [getFoodBudgetTool],
  checkpointer: false,
  systemPrompt:
    'Tu es le spécialiste Budget. Utilise toujours get_food_budget avant de répondre. Utilise uniquement les données retournées, indique qu’elles sont simulées et ne donne aucun conseil financier.',
});

const investmentAgent = createAgent({
  model: createFinancialModel(),
  tools: [getPeaPerformanceTool],
  checkpointer: false,
  systemPrompt:
    'Tu es le spécialiste Investissement. Utilise toujours get_pea_performance avant de répondre. Utilise uniquement les données retournées, indique qu’elles sont simulées et ne donne aucun conseil financier.',
});

/**
 * Agent Server can execute a graph in streaming mode for Studio. In that case
 * tool calls may be represented by AIMessageChunk instead of AIMessage.
 */
export function usedExpectedTool(
  messages: BaseMessage[],
  expectedToolName: string,
) {
  return messages.some(
    (message) =>
      (message instanceof AIMessage || message instanceof AIMessageChunk) &&
      (message.tool_calls ?? []).some(
        (toolCall) => toolCall.name === expectedToolName,
      ),
  );
}

function extractSpecialistResponse(
  messages: BaseMessage[],
  expectedToolName: string,
): string {
  if (!usedExpectedTool(messages, expectedToolName)) {
    throw new Error(`${expectedToolName} was not called by the specialist.`);
  }

  const response = extractFinalAssistantMessage(messages);

  if (!response) {
    throw new Error('The specialist did not return a final response.');
  }

  return response;
}

export async function runAccountSpecialist(query: string): Promise<string> {
  const result = await accountAgent.invoke({
    messages: [{ role: 'user', content: query }],
  });

  return extractSpecialistResponse(result.messages, 'get_account_snapshot');
}

export async function runBudgetSpecialist(query: string): Promise<string> {
  const result = await budgetAgent.invoke({
    messages: [{ role: 'user', content: query }],
  });

  return extractSpecialistResponse(result.messages, 'get_food_budget');
}

export async function runInvestmentSpecialist(query: string): Promise<string> {
  const result = await investmentAgent.invoke({
    messages: [{ role: 'user', content: query }],
  });

  return extractSpecialistResponse(result.messages, 'get_pea_performance');
}
