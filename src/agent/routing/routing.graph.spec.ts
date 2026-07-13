import { createRoutingGraph } from './routing.graph';

describe('routingGraph', () => {
  it.each([
    ['Bonjour, explique-moi ton rôle.', 'conversation'],
    ['Calcule 12 + 30.', 'calculation'],
  ])('dirige "%s" vers la branche %s', async (message, expectedRoute) => {
    const graph = createRoutingGraph({
      checkpointer: false,
      conversationRunner: () =>
        Promise.resolve([
          { role: 'assistant', content: 'Réponse conversationnelle.' },
        ]),
      calculationRunner: () =>
        Promise.resolve([{ role: 'assistant', content: 'Résultat calculé.' }]),
    });

    const result = await graph.invoke({
      messages: [{ role: 'user', content: message }],
    });

    expect(result.requestRoute).toBe(expectedRoute);
    expect(result.executedBranch).toBe(expectedRoute);
    expect(result.messages.at(-1)).toEqual({
      role: 'assistant',
      content:
        expectedRoute === 'calculation'
          ? 'Résultat calculé.'
          : 'Réponse conversationnelle.',
    });
  });
});
