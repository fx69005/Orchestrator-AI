import { ChatOpenAI } from '@langchain/openai';
import {
  Annotation,
  END,
  MemorySaver,
  START,
  StateGraph,
  type BaseCheckpointSaver,
} from '@langchain/langgraph';
import { createAgent } from 'langchain';
import { addNumbersTool } from '../tools/math.tool';
import {
  extractMessageText,
  RequestRoute,
  routeRequest,
} from './request-router';

export const routingState = Annotation.Root({
  messages: Annotation<unknown[]>({
    reducer: (left, right) => left.concat(right),
    default: () => [],
  }),
  requestRoute: Annotation<RequestRoute>({
    reducer: (_left, right) => right,
    default: () => 'conversation',
  }),
  executedBranch: Annotation<RequestRoute>({
    reducer: (_left, right) => right,
    default: () => 'conversation',
  }),
});

export type RoutingGraphState = typeof routingState.State;
export type BranchRunner = (state: RoutingGraphState) => Promise<unknown[]>;

function extractLastMessageText(messages: unknown[]): string {
  const lastMessage = messages.at(-1);

  if (typeof lastMessage === 'object' && lastMessage !== null) {
    const record = lastMessage as Record<string, unknown>;
    return extractMessageText(record.content);
  }

  return extractMessageText(lastMessage);
}

const routeRequestNode = (state: RoutingGraphState) => ({
  requestRoute: routeRequest(extractLastMessageText(state.messages)),
});

const model = new ChatOpenAI({
  model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
  temperature: 0,
});

const conversationAgent = createAgent({
  model,
  tools: [],
  checkpointer: false,
  systemPrompt:
    'Tu es un agent conversationnel pédagogique. Réponds clairement et simplement.',
});

const calculationAgent = createAgent({
  model,
  tools: [addNumbersTool],
  checkpointer: false,
  systemPrompt:
    'Tu es un agent de calcul pédagogique. Pour toute addition, utilise toujours l’outil add_numbers.',
});

const runConversationAgent: BranchRunner = async (state) => {
  const result = await conversationAgent.invoke({
    messages: state.messages,
  } as Parameters<typeof conversationAgent.invoke>[0]);

  return result.messages.slice(state.messages.length);
};

const runCalculationAgent: BranchRunner = async (state) => {
  const result = await calculationAgent.invoke({
    messages: state.messages,
  } as Parameters<typeof calculationAgent.invoke>[0]);

  return result.messages.slice(state.messages.length);
};

type RoutingGraphOptions = {
  conversationRunner?: BranchRunner;
  calculationRunner?: BranchRunner;
  checkpointer?: BaseCheckpointSaver | false;
};

export function createRoutingGraph({
  conversationRunner = runConversationAgent,
  calculationRunner = runCalculationAgent,
  checkpointer = new MemorySaver(),
}: RoutingGraphOptions = {}) {
  return new StateGraph(routingState)
    .addNode('route_request', routeRequestNode)
    .addNode('conversation', async (state) => ({
      messages: await conversationRunner(state),
      executedBranch: 'conversation' as const,
    }))
    .addNode('calculation', async (state) => ({
      messages: await calculationRunner(state),
      executedBranch: 'calculation' as const,
    }))
    .addEdge(START, 'route_request')
    .addConditionalEdges('route_request', (state) => state.requestRoute, {
      conversation: 'conversation',
      calculation: 'calculation',
    })
    .addEdge('conversation', END)
    .addEdge('calculation', END)
    .compile({ checkpointer, name: 'explicit-routing-graph' });
}

export const routingGraph = createRoutingGraph();
