import { createMiddleware } from 'langchain';
import { z } from 'zod';
import { extractMessageText, routeRequest } from './request-router';

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
});
