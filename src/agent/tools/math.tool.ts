import { tool } from 'langchain';
import { z } from 'zod';

/**
 * First deterministic tool.
 *
 * The schema describes the arguments the model is allowed to provide, while
 * the implementation performs the actual operation in TypeScript.
 */
export const addNumbersTool = tool(
  ({ left, right }) => `${left} + ${right} = ${left + right}`,
  {
    name: 'add_numbers',
    description: 'Additionne deux nombres et retourne le résultat exact.',
    schema: z.object({
      left: z.number().describe('Le premier nombre.'),
      right: z.number().describe('Le deuxième nombre.'),
    }),
  },
);
