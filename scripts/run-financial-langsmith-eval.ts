import { Client } from 'langsmith';
import { evaluate } from 'langsmith/evaluation';
import {
  FinancialEvaluationExpectation,
  evaluateFinancialAgentRun,
} from '../src/agent/evaluation/financial-agent-evaluator';

type EvaluationInput = {
  message: string;
  threadId: string;
};

const datasetName =
  process.env.LANGSMITH_FINANCIAL_DATASET_NAME ??
  'orchestrator-ai-financial-v2';
const datasetSplit = process.env.LANGSMITH_FINANCIAL_DATASET_SPLIT ?? 'test';
const baseUrl =
  process.env.FINANCIAL_AGENT_EVAL_BASE_URL ?? 'http://localhost:3000';

async function target(inputs: EvaluationInput) {
  const response = await fetch(`${baseUrl}/agent/financial/invoke`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(inputs),
  });

  if (!response.ok) {
    throw new Error(
      `Financial agent endpoint returned ${response.status}: ${await response.text()}`,
    );
  }

  return (await response.json()) as Record<string, unknown>;
}

function financialContractEvaluator({
  outputs,
  referenceOutputs,
}: {
  outputs: Record<string, unknown>;
  referenceOutputs?: Record<string, unknown>;
}) {
  if (!referenceOutputs) {
    return {
      key: 'financial_contract',
      score: 0,
      comment: 'Reference output is missing.',
    };
  }

  const result = evaluateFinancialAgentRun(
    outputs,
    referenceOutputs as FinancialEvaluationExpectation,
  );

  return {
    key: 'financial_contract',
    score: result.passed ? 1 : 0,
    comment: JSON.stringify(result),
  };
}

async function main() {
  const client = new Client();
  const examples = [];

  for await (const example of client.listExamples({
    datasetName,
    splits: [datasetSplit],
  })) {
    examples.push(example);
  }

  if (examples.length === 0) {
    throw new Error(
      `No examples found in dataset "${datasetName}" with split "${datasetSplit}".`,
    );
  }

  const experiment = await evaluate(target, {
    data: examples,
    evaluators: [financialContractEvaluator],
    experimentPrefix: 'orchestrator-ai-financial-v2',
    description:
      'Evaluation du contrat safety-supervisor-sous-agents financier.',
    maxConcurrency: 1,
    client,
  });

  console.log(
    `Financial experiment completed for dataset: ${datasetName} (${datasetSplit})`,
  );
  console.log(experiment);
}

void main();
