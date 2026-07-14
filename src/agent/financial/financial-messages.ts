import type { BaseMessage } from '@langchain/core/messages';
import type { FinancialMessage } from './financial.types';

export function extractMessageText(content: unknown): string {
  if (typeof content === 'string') {
    return content;
  }

  if (!Array.isArray(content)) {
    return '';
  }

  return content
    .map((block) => {
      if (typeof block === 'string') {
        return block;
      }

      if (typeof block === 'object' && block !== null) {
        const record = block as Record<string, unknown>;
        return typeof record.text === 'string' ? record.text : '';
      }

      return '';
    })
    .filter(Boolean)
    .join(' ');
}

export function extractLatestUserMessage(messages: BaseMessage[]): string {
  const lastHumanMessage = [...messages]
    .reverse()
    .find((message) => message.getType() === 'human');

  return extractMessageText(lastHumanMessage?.content);
}

export function extractFinalAssistantMessage(messages: BaseMessage[]): string {
  const lastAssistantMessage = [...messages]
    .reverse()
    .find((message) => message.getType() === 'ai');

  return extractMessageText(lastAssistantMessage?.content);
}

export function toFinancialMessages(
  messages: BaseMessage[],
): FinancialMessage[] {
  return messages.flatMap((message) => {
    const role = message.getType();

    if (role !== 'human' && role !== 'ai') {
      return [];
    }

    return [
      {
        role: role === 'human' ? 'user' : 'assistant',
        content: extractMessageText(message.content),
      },
    ];
  });
}
