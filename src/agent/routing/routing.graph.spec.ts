import { routingGraph } from './routing.graph';

describe('routingGraph', () => {
  it.each([
    ['Bonjour, explique-moi ton rôle.', 'conversation'],
    ['Calcule 12 + 30.', 'calculation'],
  ])('dirige "%s" vers la branche %s', async (message, expectedRoute) => {
    const result = await routingGraph.invoke({
      messages: [{ role: 'user', content: message }],
    });

    expect(result.requestRoute).toBe(expectedRoute);
    expect(result.executedBranch).toBe(expectedRoute);
  });
});
