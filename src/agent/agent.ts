import { ChatOpenAI } from '@langchain/openai';
import { createAgent } from 'langchain';

const model = new ChatOpenAI({
  model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
  temperature: 0,
});

/**
 * First learning agent.
 *
 * The orchestration graph is created internally by LangChain. We will only
 * introduce explicit LangGraph nodes when we need finer control over the flow.
 */
export const agent = createAgent({
  model,
  tools: [],
  systemPrompt:
    'Tu es un agent orchestrateur pédagogique. Réponds clairement et explique ton raisonnement de façon concise.',
});
