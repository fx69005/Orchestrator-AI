import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { FinancialAgentController } from './financial.controller';
import { FinancialAgentService } from './financial.service';

describe('FinancialAgentController', () => {
  let controller: FinancialAgentController;
  const financialAgentService = {
    invoke: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FinancialAgentController],
      providers: [
        { provide: FinancialAgentService, useValue: financialAgentService },
      ],
    }).compile();

    controller = module.get(FinancialAgentController);
  });

  it('délègue une requête financière valide', () => {
    const expected = Promise.resolve({
      intent: 'budget',
      safe: true,
      safetyDecision: 'safe',
      selectedAgent: 'budget',
      delegatedAgents: ['budget'],
      response: 'Réponse.',
      messages: [],
    });
    financialAgentService.invoke.mockReturnValue(expected);

    expect(
      controller.invoke({
        message: 'Quel est mon budget alimentation ?',
        threadId: 'thread-financial',
      }),
    ).toBe(expected);
    expect(financialAgentService.invoke).toHaveBeenCalledWith(
      'Quel est mon budget alimentation ?',
      'thread-financial',
    );
  });

  it.each([
    [{ threadId: 'thread-financial' }, 'message is required.'],
    [{ message: 'Bonjour' }, 'threadId is required.'],
    [{ message: '   ', threadId: 'thread-financial' }, 'message is required.'],
  ])('rejette une requête invalide', (body, message) => {
    expect(() => controller.invoke(body)).toThrow(
      new BadRequestException(message),
    );
  });
});
