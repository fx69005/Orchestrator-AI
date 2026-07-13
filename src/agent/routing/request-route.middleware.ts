import { createMiddleware } from 'langchain';
import { z } from 'zod';
import { addNumbersTool } from '../tools/math.tool';
import { extractMessageText, routeRequest } from './request-router';

export function selectToolsForRoute(route: 'conversation' | 'calculation') {
  return route === 'calculation' ? [addNumbersTool] : [];
}

export const requestRouteMiddleware = createMiddleware({
  name: 'RequestRouter',
  stateSchema: z.object({
    requestRoute: z
      .enum(['conversation', 'calculation'])
      .default('conversation'),
  }),
  beforeAgent: (state) => {
    const lastMessage = state.messages.at(-1);
    const content = extractMessageText(lastMessage?.content);

    return {
      requestRoute: routeRequest(content),
    };
  },
  wrapModelCall: (request, handler) => {
    return handler({
      ...request,
      tools: selectToolsForRoute(request.state.requestRoute),
    });
  },
});
