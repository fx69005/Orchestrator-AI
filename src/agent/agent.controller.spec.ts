import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AgentController } from './agent.controller';
import { AgentService } from './agent.service';

describe('AgentController', () => {
  let controller: AgentController;
  const agentService = {
    invoke: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AgentController],
      providers: [{ provide: AgentService, useValue: agentService }],
    }).compile();

    controller = module.get(AgentController);
  });

  it('delegates a valid request to AgentService', () => {
    const expected = Promise.resolve({ messages: [] });
    agentService.invoke.mockReturnValue(expected);

    expect(
      controller.invoke({ message: 'Bonjour', threadId: 'thread-a' }),
    ).toBe(expected);
    expect(agentService.invoke).toHaveBeenCalledWith('Bonjour', 'thread-a');
  });

  it.each([
    [{ threadId: 'thread-a' }, 'message is required.'],
    [{ message: 'Bonjour' }, 'threadId is required.'],
    [{ message: '   ', threadId: 'thread-a' }, 'message is required.'],
  ])('rejects an invalid request', (body, message) => {
    expect(() => controller.invoke(body)).toThrow(
      new BadRequestException(message),
    );
  });
});
