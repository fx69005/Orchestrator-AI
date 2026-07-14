import { AIMessage } from '@langchain/core/messages';
import {
  END,
  MemorySaver,
  START,
  StateGraph,
  type BaseCheckpointSaver,
} from '@langchain/langgraph';
import { extractLatestUserMessage } from './financial-messages';
import { isBlockedByFinancialPolicy } from './financial-policy';
import {
  runFinancialSupervisor,
  type FinancialSupervisorRunner,
} from './financial-supervisor';
import {
  classifyFinancialSafety,
  type SafetyClassifier,
} from './safety-classifier';
import { financialState, type FinancialGraphState } from './financial-state';

function policyGateNode(state: FinancialGraphState) {
  const policyBlocked = isBlockedByFinancialPolicy(
    extractLatestUserMessage(state.messages),
  );

  return {
    policyBlocked,
    safetyDecision: policyBlocked ? ('unsafe' as const) : state.safetyDecision,
  };
}

function createSafetyClassifierNode(safetyClassifier: SafetyClassifier) {
  return async (state: FinancialGraphState) => {
    try {
      const safetyDecision = await safetyClassifier(
        extractLatestUserMessage(state.messages),
      );

      return { safetyDecision };
    } catch {
      return { safetyDecision: 'uncertain' as const };
    }
  };
}

function safetyRefusalNode(state: FinancialGraphState) {
  const response =
    state.safetyDecision === 'uncertain'
      ? 'Je ne peux pas traiter cette demande sans une reformulation financière claire.'
      : 'Je ne peux pas suivre cette demande. Je peux vous aider sur vos comptes, budgets et investissements simulés.';

  return {
    intent: 'unsafe' as const,
    selectedAgent: 'safety' as const,
    delegatedAgents: [],
    response,
  };
}

function createSupervisorNode(supervisorRunner: FinancialSupervisorRunner) {
  return async (state: FinancialGraphState) => {
    try {
      const result = await supervisorRunner(state.messages);
      const delegatedAgents = [...new Set(result.delegatedAgents)];
      const primaryAgent = delegatedAgents.at(0);

      return {
        intent: primaryAgent ?? ('out_of_scope' as const),
        selectedAgent: primaryAgent ?? ('none' as const),
        delegatedAgents,
        response: result.response,
      };
    } catch {
      return {
        intent: 'out_of_scope' as const,
        selectedAgent: 'none' as const,
        delegatedAgents: [],
        response:
          'Je ne peux pas récupérer les données financières simulées pour le moment.',
      };
    }
  };
}

function postResponseGuardNode(state: FinancialGraphState) {
  const response = state.response.trim()
    ? state.response
    : 'Je ne peux pas produire de réponse financière pour le moment.';

  return {
    response,
    messages: [new AIMessage(response)],
  };
}

type FinancialGraphOptions = {
  safetyClassifier?: SafetyClassifier;
  supervisorRunner?: FinancialSupervisorRunner;
  checkpointer?: BaseCheckpointSaver | false;
};

export function createFinancialGraph({
  safetyClassifier = classifyFinancialSafety,
  supervisorRunner = runFinancialSupervisor,
  checkpointer = new MemorySaver(),
}: FinancialGraphOptions = {}) {
  return new StateGraph(financialState)
    .addNode('policy_gate', policyGateNode)
    .addNode(
      'llm_safety_classifier',
      createSafetyClassifierNode(safetyClassifier),
    )
    .addNode('safety_refusal', safetyRefusalNode)
    .addNode('financial_supervisor', createSupervisorNode(supervisorRunner))
    .addNode('post_response_guard', postResponseGuardNode)
    .addEdge(START, 'policy_gate')
    .addConditionalEdges(
      'policy_gate',
      (state) =>
        state.policyBlocked ? 'safety_refusal' : 'llm_safety_classifier',
      {
        safety_refusal: 'safety_refusal',
        llm_safety_classifier: 'llm_safety_classifier',
      },
    )
    .addConditionalEdges(
      'llm_safety_classifier',
      (state) =>
        state.safetyDecision === 'safe'
          ? 'financial_supervisor'
          : 'safety_refusal',
      {
        financial_supervisor: 'financial_supervisor',
        safety_refusal: 'safety_refusal',
      },
    )
    .addEdge('safety_refusal', 'post_response_guard')
    .addEdge('financial_supervisor', 'post_response_guard')
    .addEdge('post_response_guard', END)
    .compile({ checkpointer, name: 'financial-supervisor-v2-graph' });
}

export const financialGraph = createFinancialGraph();
