import { AIMessage, AIMessageChunk } from '@langchain/core/messages';
import { usedExpectedTool } from './specialist-agents';

describe('usedExpectedTool', () => {
  it('reconnaît un tool appelé dans un AIMessage standard', () => {
    const message = new AIMessage({
      content: '',
      tool_calls: [
        {
          id: 'call-budget',
          name: 'get_food_budget',
          args: {},
          type: 'tool_call',
        },
      ],
    });

    expect(usedExpectedTool([message], 'get_food_budget')).toBe(true);
  });

  it('reconnaît un tool appelé dans un AIMessageChunk transmis par Studio', () => {
    const message = new AIMessageChunk({
      content: '',
      tool_calls: [
        {
          id: 'call-budget',
          name: 'get_food_budget',
          args: {},
          type: 'tool_call',
        },
      ],
    });

    expect(usedExpectedTool([message], 'get_food_budget')).toBe(true);
  });
});
