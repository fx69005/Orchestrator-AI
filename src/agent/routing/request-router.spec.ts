import { extractMessageText, routeRequest } from './request-router';

describe('routeRequest', () => {
  it.each([
    ['Bonjour, explique-moi ton rôle.', 'conversation'],
    ['Calcule 12 + 30.', 'calculation'],
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
});
