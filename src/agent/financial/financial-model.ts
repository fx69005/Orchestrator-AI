import { ChatOpenAI } from '@langchain/openai';

export function createFinancialModel() {
  return new ChatOpenAI({
    model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
    temperature: 0,
  });
}
