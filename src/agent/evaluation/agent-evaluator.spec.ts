import { evaluateAgentRun } from './agent-evaluator';

describe('evaluateAgentRun', () => {
  it('valide une conversation sans outil', () => {
    const result = evaluateAgentRun(
      {
        requestRoute: 'conversation',
        messages: [
          { type: 'human', content: 'Bonjour' },
          { type: 'ai', content: 'Bonjour, comment puis-je aider ?' },
        ],
      },
      {
        route: 'conversation',
        answerIncludes: ['comment puis-je aider'],
      },
    );

    expect(result.passed).toBe(true);
    expect(result.checks).toEqual({ route: true, tools: true, answer: true });
  });

  it('valide un calcul avec add_numbers et le résultat final', () => {
    const result = evaluateAgentRun(
      {
        requestRoute: 'calculation',
        messages: [
          { type: 'human', content: 'Calcule 12 + 30.' },
          {
            type: 'ai',
            content: '',
            tool_calls: [
              { name: 'add_numbers', args: { left: 12, right: 30 } },
            ],
          },
          { type: 'tool', content: '12 + 30 = 42' },
          { type: 'ai', content: 'Le résultat est 42.' },
        ],
      },
      {
        route: 'calculation',
        toolName: 'add_numbers',
        answerIncludes: ['42'],
      },
    );

    expect(result.passed).toBe(true);
    expect(result.observed.toolNames).toEqual(['add_numbers']);
  });

  it('signale une exécution qui retourne le bon texte mais le mauvais contrat', () => {
    const result = evaluateAgentRun(
      {
        requestRoute: 'conversation',
        messages: [
          { type: 'human', content: 'Combien font 12 + 30 ?' },
          { type: 'ai', content: '42' },
        ],
      },
      {
        route: 'calculation',
        toolName: 'add_numbers',
        answerIncludes: ['42'],
      },
    );

    expect(result.passed).toBe(false);
    expect(result.checks).toEqual({ route: false, tools: false, answer: true });
  });

  it('vérifie qu un nouveau thread ne révèle pas Alice', () => {
    const result = evaluateAgentRun(
      {
        requestRoute: 'conversation',
        messages: [
          { type: 'human', content: 'Quel est mon prénom ?' },
          { type: 'ai', content: 'Je ne connais pas votre prénom.' },
        ],
      },
      {
        route: 'conversation',
        answerExcludes: ['Alice'],
      },
    );

    expect(result.passed).toBe(true);
  });
});
