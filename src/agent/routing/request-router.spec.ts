import { extractMessageText, routeRequest } from './request-router';
import { selectToolsForRoute } from './request-route.middleware';

describe('routeRequest', () => {
  it.each([
    ['Bonjour, explique-moi ton rôle.', 'conversation'],
    ['Calcule 12 + 30.', 'calculation'],
    ['Combien font 12 + 30 ?', 'calculation'],
    ['Quel est le résultat de 12 plus 30 ?', 'calculation'],
    ['Pourquoi utilise-t-on une mémoire par thread ?', 'conversation'],
    ['Additionne 8 et 5 avec l’outil.', 'calculation'],
  ])('classe "%s" sur la route %s', (message, expectedRoute) => {
    expect(routeRequest(message)).toBe(expectedRoute);
  });

  it('extrait le texte des blocs de contenu utilisés par Studio', () => {
    const content = [{ type: 'text', text: 'Calcule 12 + 30.' }];

    expect(extractMessageText(content)).toBe('Calcule 12 + 30.');
    expect(routeRequest(extractMessageText(content))).toBe('calculation');
  });

  it('expose uniquement l outil de calcul sur la route calculation', () => {
    expect(selectToolsForRoute('conversation')).toEqual([]);
    expect(selectToolsForRoute('calculation').map((tool) => tool.name)).toEqual(
      ['add_numbers'],
    );
  });
});
