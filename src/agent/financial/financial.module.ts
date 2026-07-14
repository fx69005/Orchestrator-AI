import { Module } from '@nestjs/common';
import { FinancialAgentController } from './financial.controller';
import { FinancialAgentService } from './financial.service';

@Module({
  controllers: [FinancialAgentController],
  providers: [FinancialAgentService],
  exports: [FinancialAgentService],
})
export class FinancialModule {}
