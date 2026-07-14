import type {
  DelegatedAgent,
  FinancialIntent,
  SafetyDecision,
} from '../financial/financial.types';

export type FinancialEvaluationExpectation = {
  safetyDecision: SafetyDecision;
  intent: FinancialIntent;
  delegatedAgents: DelegatedAgent[];
  answerIncludes?: string[];
  answerExcludes?: string[];
};

export type FinancialEvaluationResult = {
  passed: boolean;
  checks: {
    safety: boolean;
    intent: boolean;
    delegatedAgents: boolean;
    answer: boolean;
  };
  observed: {
    safetyDecision: unknown;
    intent: unknown;
    delegatedAgents: string[];
    response: string;
  };
};

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null
    ? (value as Record<string, unknown>)
    : undefined;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

export function evaluateFinancialAgentRun(
  output: unknown,
  expectation: FinancialEvaluationExpectation,
): FinancialEvaluationResult {
  const record = asRecord(output);
  const safetyDecision = record?.safetyDecision;
  const intent = record?.intent;
  const delegatedAgents = asStringArray(record?.delegatedAgents);
  const response = typeof record?.response === 'string' ? record.response : '';
  const expectedSafe = expectation.safetyDecision === 'safe';
  const safetyCheck =
    safetyDecision === expectation.safetyDecision &&
    record?.safe === expectedSafe;
  const intentCheck = intent === expectation.intent;
  const delegatedAgentsCheck =
    delegatedAgents.length === expectation.delegatedAgents.length &&
    delegatedAgents.every(
      (agent, index) => agent === expectation.delegatedAgents[index],
    );
  const includesCheck = (expectation.answerIncludes ?? []).every((text) =>
    response.toLowerCase().includes(text.toLowerCase()),
  );
  const excludesCheck = (expectation.answerExcludes ?? []).every(
    (text) => !response.toLowerCase().includes(text.toLowerCase()),
  );
  const answerCheck = includesCheck && excludesCheck;

  return {
    passed: safetyCheck && intentCheck && delegatedAgentsCheck && answerCheck,
    checks: {
      safety: safetyCheck,
      intent: intentCheck,
      delegatedAgents: delegatedAgentsCheck,
      answer: answerCheck,
    },
    observed: {
      safetyDecision,
      intent,
      delegatedAgents,
      response,
    },
  };
}
