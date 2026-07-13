import { addNumbersTool } from './math.tool';

describe('addNumbersTool', () => {
  it('additionne deux nombres sans appeler de service externe', async () => {
    await expect(addNumbersTool.invoke({ left: 12, right: 30 })).resolves.toBe(
      '12 + 30 = 42',
    );
  });
});
