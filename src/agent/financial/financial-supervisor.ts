import type { BaseMessage } from '@langchain/core/messages';
import { createAgent, tool } from 'langchain';
import { z } from 'zod';
import { extractFinalAssistantMessage } from './financial-messages';
import { createFinancialModel } from './financial-model';
import {
  runAccountSpecialist,
  runBudgetSpecialist,
  runInvestmentSpecialist,
} from './specialist-agents';
import type { DelegatedAgent } from './financial.types';

export type FinancialSupervisorResult = {
  response: string;
  delegatedAgents: DelegatedAgent[];
};

export type FinancialSupervisorRunner = (
  messages: BaseMessage[],
) => Promise<FinancialSupervisorResult>;

type SpecialistRunner = (query: string) => Promise<string>;

function createDelegationTool(
  agentName: DelegatedAgent,
  description: string,
  runSpecialist: SpecialistRunner,
  delegatedAgents: DelegatedAgent[],
  cachedResults: Map<DelegatedAgent, string>,
) {
  return tool(
    async ({ query }) => {
      const cachedResult = cachedResults.get(agentName);

      if (cachedResult) {
        return cachedResult;
      }

      delegatedAgents.push(agentName);

      try {
        const result = await runSpecialist(query);
        cachedResults.set(agentName, result);
        return result;
      } catch {
        const failure = `Le sous-agent ${agentName} n’a pas pu récupérer ses données simulées. N’invente aucune donnée et signale cette indisponibilité.`;
        cachedResults.set(agentName, failure);
        return failure;
      }
    },
    {
      name: `call_${agentName}_agent`,
      description,
      schema: z.object({
        query: z
          .string()
          .min(1)
          .describe('Question ciblée pour le sous-agent.'),
      }),
    },
  );
}

export const runFinancialSupervisor: FinancialSupervisorRunner = async (
  messages,
) => {
  const delegatedAgents: DelegatedAgent[] = [];
  const cachedResults = new Map<DelegatedAgent, string>();
  const supervisor = createAgent({
    model: createFinancialModel(),
    tools: [
      createDelegationTool(
        'account',
        'Consulte les comptes simulés pour répondre à une question sur les soldes ou comptes.',
        runAccountSpecialist,
        delegatedAgents,
        cachedResults,
      ),
      createDelegationTool(
        'budget',
        'Analyse le budget alimentation simulé pour répondre à une question de budget ou dépenses.',
        runBudgetSpecialist,
        delegatedAgents,
        cachedResults,
      ),
      createDelegationTool(
        'investment',
        'Analyse la performance PEA simulée pour répondre à une question d’investissement.',
        runInvestmentSpecialist,
        delegatedAgents,
        cachedResults,
      ),
    ],
    checkpointer: false,
    systemPrompt:
      'Tu es le Financial Supervisor. Délègue aux sous-agents nécessaires, au plus une fois par domaine. Tu peux appeler plusieurs domaines lorsque la demande le justifie. N’invente jamais de montant, de performance ou de donnée financière : utilise uniquement les résultats des tools et précise qu’il s’agit de données simulées. Si la demande est hors périmètre financier, réponds brièvement sans appeler de sous-agent. Si un sous-agent est indisponible, explique la limite sans inventer de données.',
  });

  const result = await supervisor.invoke({ messages });
  const response = extractFinalAssistantMessage(result.messages);

  if (!response) {
    throw new Error(
      'The financial supervisor did not return a final response.',
    );
  }

  return { response, delegatedAgents };
};
