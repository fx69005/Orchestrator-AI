import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { AgentService } from './../src/agent/agent.service';
import { FinancialAgentService } from './../src/agent/financial/financial.service';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  it('POST /agent/invoke delegates to AgentService', async () => {
    const agentService = {
      invoke: jest.fn().mockResolvedValue({ messages: [] }),
    };
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(AgentService)
      .useValue(agentService)
      .compile();
    const httpApp: INestApplication<App> =
      moduleFixture.createNestApplication();

    await httpApp.init();

    await request(httpApp.getHttpServer())
      .post('/agent/invoke')
      .send({ message: 'Bonjour', threadId: 'thread-a' })
      .expect(201)
      .expect({ messages: [] });

    expect(agentService.invoke).toHaveBeenCalledWith('Bonjour', 'thread-a');

    await httpApp.close();
  });

  it('POST /agent/financial/invoke delegates to FinancialAgentService', async () => {
    const financialAgentService = {
      invoke: jest.fn().mockResolvedValue({
        intent: 'budget',
        safe: true,
        safetyDecision: 'safe',
        selectedAgent: 'budget',
        delegatedAgents: ['budget'],
        response: 'Réponse budget.',
        messages: [],
      }),
    };
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(FinancialAgentService)
      .useValue(financialAgentService)
      .compile();
    const httpApp: INestApplication<App> =
      moduleFixture.createNestApplication();

    await httpApp.init();

    await request(httpApp.getHttpServer())
      .post('/agent/financial/invoke')
      .send({
        message: 'Quel est mon budget alimentation ?',
        threadId: 'thread-financial',
      })
      .expect(201)
      .expect({
        intent: 'budget',
        safe: true,
        safetyDecision: 'safe',
        selectedAgent: 'budget',
        delegatedAgents: ['budget'],
        response: 'Réponse budget.',
        messages: [],
      });

    expect(financialAgentService.invoke).toHaveBeenCalledWith(
      'Quel est mon budget alimentation ?',
      'thread-financial',
    );

    await httpApp.close();
  });

  afterEach(async () => {
    await app.close();
  });
});
