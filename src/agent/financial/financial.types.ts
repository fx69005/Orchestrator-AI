export type SafeFinancialIntent =
  'account' | 'budget' | 'investment' | 'out_of_scope';

export type FinancialIntent = SafeFinancialIntent | 'unsafe';

export type SafetyDecision = 'safe' | 'unsafe' | 'uncertain';

export type SelectedAgent =
  'account' | 'budget' | 'investment' | 'safety' | 'none';

export type DelegatedAgent = Exclude<SelectedAgent, 'safety' | 'none'>;

export type FinancialMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export type FinancialInvokeResponse = {
  intent: FinancialIntent;
  safe: boolean;
  safetyDecision: SafetyDecision;
  selectedAgent: SelectedAgent;
  delegatedAgents: DelegatedAgent[];
  response: string;
  messages: FinancialMessage[];
};
