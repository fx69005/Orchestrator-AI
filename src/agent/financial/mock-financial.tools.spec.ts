import {
  getAccountSnapshotTool,
  getFoodBudgetTool,
  getPeaPerformanceTool,
} from './mock-financial.tools';

describe('mock financial tools', () => {
  it.each([
    [getAccountSnapshotTool, 'Données simulées uniquement'],
    [getFoodBudgetTool, 'budget alimentation'],
    [getPeaPerformanceTool, 'performance'],
  ])('retourne une donnée simulée via %s', async (toolToInvoke, expected) => {
    await expect(toolToInvoke.invoke({})).resolves.toContain(expected);
  });
});
