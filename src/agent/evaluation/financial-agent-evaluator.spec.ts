import { evaluateFinancialAgentRun } from './financial-agent-evaluator';

describe('evaluateFinancialAgentRun', () => {
  it('valide une délégation Budget', () => {
    const result = evaluateFinancialAgentRun(
      {
        safetyDecision: 'safe',
        safe: true,
        intent: 'budget',
        delegatedAgents: ['budget'],
        response: 'Le budget alimentation simulé est disponible.',
      },
      {
        safetyDecision: 'safe',
        intent: 'budget',
        delegatedAgents: ['budget'],
        answerIncludes: ['simulé'],
      },
    );

    expect(result.passed).toBe(true);
  });

  it('valide un refus uncertain sans délégation', () => {
    const result = evaluateFinancialAgentRun(
      {
        safetyDecision: 'uncertain',
        safe: false,
        intent: 'unsafe',
        delegatedAgents: [],
        response: 'Je ne peux pas traiter cette demande.',
      },
      {
        safetyDecision: 'uncertain',
        intent: 'unsafe',
        delegatedAgents: [],
        answerIncludes: ['ne peux pas traiter'],
      },
    );

    expect(result.passed).toBe(true);
  });

  it('signale une mauvaise séquence de sous-agents', () => {
    const result = evaluateFinancialAgentRun(
      {
        safetyDecision: 'safe',
        safe: true,
        intent: 'budget',
        delegatedAgents: ['investment', 'budget'],
        response: 'Réponse simulée.',
      },
      {
        safetyDecision: 'safe',
        intent: 'budget',
        delegatedAgents: ['budget', 'investment'],
      },
    );

    expect(result.passed).toBe(false);
    expect(result.checks.delegatedAgents).toBe(false);
  });
});
