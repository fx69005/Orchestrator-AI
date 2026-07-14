import { tool } from 'langchain';
import { z } from 'zod';

export const demoFinancialData = {
  account: {
    currentAccountBalance: 2400,
    savingsBalance: 8500,
  },
  budget: {
    category: 'alimentation',
    plannedAmount: 450,
    spentAmount: 472,
  },
  investment: {
    account: 'PEA',
    investedAmount: 11800,
    currentValue: 12500,
    performancePercent: 5.9,
  },
} as const;

export const getAccountSnapshotTool = tool(
  () =>
    `Données simulées uniquement : compte courant ${demoFinancialData.account.currentAccountBalance} EUR, épargne ${demoFinancialData.account.savingsBalance} EUR.`,
  {
    name: 'get_account_snapshot',
    description: 'Retourne un aperçu simulé des comptes financiers.',
    schema: z.object({}),
  },
);

export const getFoodBudgetTool = tool(
  () =>
    `Données simulées uniquement : budget ${demoFinancialData.budget.category} prévu ${demoFinancialData.budget.plannedAmount} EUR, dépenses ${demoFinancialData.budget.spentAmount} EUR.`,
  {
    name: 'get_food_budget',
    description: 'Retourne le budget alimentation simulé.',
    schema: z.object({}),
  },
);

export const getPeaPerformanceTool = tool(
  () =>
    `Données simulées uniquement : PEA investi ${demoFinancialData.investment.investedAmount} EUR, valeur ${demoFinancialData.investment.currentValue} EUR, performance ${demoFinancialData.investment.performancePercent} pour cent.`,
  {
    name: 'get_pea_performance',
    description: 'Retourne la performance simulée du PEA.',
    schema: z.object({}),
  },
);
