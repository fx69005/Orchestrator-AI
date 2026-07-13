import { Client } from 'langsmith';
import { evaluate } from 'langsmith/evaluation';
import {
  AgentRunLike,
  EvaluationExpectation,
  evaluateAgentRun,
} from '../src/agent/evaluation/agent-evaluator';

type EvaluationInput = {
  message: string;
  threadId: string;
};

const datasetName =
  process.env.LANGSMITH_DATASET_NAME ?? 'orchestrator-ai-contract-v1';
const datasetSplit = process.env.LANGSMITH_DATASET_SPLIT ?? 'test';
const baseUrl = process.env.AGENT_EVAL_BASE_URL ?? 'http://localhost:3000';

async function target(inputs: EvaluationInput) {
  const response = await fetch(`${baseUrl}/agent/invoke`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(inputs),
  });

  if (!response.ok) {
    throw new Error(
      `Agent endpoint returned ${response.status}: ${await response.text()}`,
    );
  }

  return (await response.json()) as Record<string, unknown>;
}

function contractEvaluator({
  outputs,
  referenceOutputs,
}: {
  outputs: Record<string, unknown>;
  referenceOutputs?: Record<string, unknown>;
}) {
  if (!referenceOutputs) {
    return {
      key: 'contract',
      score: 0,
      comment: 'Reference output is missing.',
    };
  }

  const result = evaluateAgentRun(
    outputs as AgentRunLike,
    referenceOutputs as EvaluationExpectation,
  );

  return {
    key: 'contract',
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
    evaluators: [contractEvaluator],
    experimentPrefix: 'orchestrator-ai-contract',
    description: 'Evaluation du contrat route-outil-réponse de l’agent.',
    maxConcurrency: 1,
    client,
  });

  console.log(
    `Experiment completed for dataset: ${datasetName} (${datasetSplit})`,
  );
  console.log(experiment);
}

void main();
