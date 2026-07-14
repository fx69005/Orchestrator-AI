import { MessagesValue, StateSchema } from '@langchain/langgraph';
import { z } from 'zod';

export const financialState = new StateSchema({
  // MessagesValue exposes LangGraph's `langgraph_type: "messages"` metadata.
  // LangSmith Studio needs it to enable its Chat mode for this graph.
  messages: MessagesValue,
  policyBlocked: z.boolean().default(false),
  safetyDecision: z.enum(['safe', 'unsafe', 'uncertain']).default('uncertain'),
  intent: z
    .enum(['account', 'budget', 'investment', 'out_of_scope', 'unsafe'])
    .default('out_of_scope'),
  selectedAgent: z
    .enum(['account', 'budget', 'investment', 'safety', 'none'])
    .default('none'),
  delegatedAgents: z
    .array(z.enum(['account', 'budget', 'investment']))
    .default(() => []),
  response: z.string().default(''),
});

export type FinancialGraphState = typeof financialState.State;
