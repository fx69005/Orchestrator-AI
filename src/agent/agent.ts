import { ChatOpenAI } from '@langchain/openai';
import { createAgent } from 'langchain';
import { MemorySaver } from '@langchain/langgraph';

const model = new ChatOpenAI({
  model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
  temperature: 0,
});

/**
 * In-memory short-term memory.
 *
 * The thread_id supplied at invocation time identifies the conversation.
 * This memory is intentionally lost when the process restarts.
 */
export const internalMemory = new MemorySaver();

/**
 * First learning agent.
 *
 * The orchestration graph is created internally by LangChain. We will only
 * introduce explicit LangGraph nodes when we need finer control over the flow.
 */
export const agent = createAgent({
  model,
  tools: [],
  checkpointer: internalMemory,
  systemPrompt:
    'Tu es un agent orchestrateur pédagogique. Réponds clairement et explique ton raisonnement de façon concise.',
});
