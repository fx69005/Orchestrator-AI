import { Annotation, END, START, StateGraph } from '@langchain/langgraph';
import {
  extractMessageText,
  routeRequest,
  RequestRoute,
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

function extractLastMessageText(messages: unknown[]): string {
  const lastMessage = messages.at(-1);

  if (typeof lastMessage === 'object' && lastMessage !== null) {
    const record = lastMessage as Record<string, unknown>;
    return extractMessageText(record.content);
  }

  return extractMessageText(lastMessage);
}

const routeRequestNode = (state: typeof routingState.State) => ({
  requestRoute: routeRequest(extractLastMessageText(state.messages)),
});

const conversationNode = () => ({
  executedBranch: 'conversation' as const,
});

const calculationNode = () => ({
  executedBranch: 'calculation' as const,
});

export const routingGraph = new StateGraph(routingState)
  .addNode('route_request', routeRequestNode)
  .addNode('conversation', conversationNode)
  .addNode('calculation', calculationNode)
  .addEdge(START, 'route_request')
  .addConditionalEdges('route_request', (state) => state.requestRoute, {
    conversation: 'conversation',
    calculation: 'calculation',
  })
  .addEdge('conversation', END)
  .addEdge('calculation', END)
  .compile({ name: 'explicit-routing-graph' });
