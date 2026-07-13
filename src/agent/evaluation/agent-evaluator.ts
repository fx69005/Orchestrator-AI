import { extractMessageText } from '../routing/request-router';
import { RequestRoute } from '../routing/request-router';

export type AgentRunLike = {
  messages?: unknown;
  requestRoute?: unknown;
};

export type EvaluationExpectation = {
  route: RequestRoute;
  toolName?: string;
  answerIncludes?: string[];
  answerExcludes?: string[];
};

export type AgentEvaluationResult = {
  passed: boolean;
  checks: {
    route: boolean;
    tools: boolean;
    answer: boolean;
  };
  observed: {
    route: unknown;
    toolNames: string[];
    finalAnswer: string;
  };
};

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null
    ? (value as Record<string, unknown>)
    : undefined;
}

function messageRecord(message: unknown): Record<string, unknown> | undefined {
  const record = asRecord(message);
  const kwargs = asRecord(record?.kwargs);

  return kwargs ?? record;
}

function isAiMessage(message: unknown): boolean {
  const record = messageRecord(message);

  return record?.type === 'ai' || record?.role === 'assistant';
}

function extractToolNames(messages: unknown[]): string[] {
  return messages.flatMap((message) => {
    const record = messageRecord(message);
    const additionalKwargs = asRecord(record?.additional_kwargs);
    const toolCalls =
      (Array.isArray(record?.tool_calls) && record.tool_calls) ||
      (Array.isArray(additionalKwargs?.tool_calls) &&
        additionalKwargs.tool_calls) ||
      [];

    return toolCalls.flatMap((toolCall) => {
      const call = asRecord(toolCall);
      const functionCall = asRecord(call?.function);
      const name = call?.name ?? functionCall?.name;

      return typeof name === 'string' ? [name] : [];
    });
  });
}

function extractFinalAnswer(messages: unknown[]): string {
  const aiMessages = messages.filter(isAiMessage);
  const finalMessage = messageRecord(aiMessages.at(-1));

  return extractMessageText(finalMessage?.content);
}

export function evaluateAgentRun(
  run: AgentRunLike,
  expectation: EvaluationExpectation,
): AgentEvaluationResult {
  const messages = Array.isArray(run.messages) ? run.messages : [];
  const toolNames = extractToolNames(messages);
  const finalAnswer = extractFinalAnswer(messages);
  const routeCheck = run.requestRoute === expectation.route;
  const toolsCheck = expectation.toolName
    ? toolNames.includes(expectation.toolName)
    : toolNames.length === 0;
  const includesCheck = (expectation.answerIncludes ?? []).every((text) =>
    finalAnswer.toLowerCase().includes(text.toLowerCase()),
  );
  const excludesCheck = (expectation.answerExcludes ?? []).every(
    (text) => !finalAnswer.toLowerCase().includes(text.toLowerCase()),
  );
  const answerCheck = includesCheck && excludesCheck;

  return {
    passed: routeCheck && toolsCheck && answerCheck,
    checks: {
      route: routeCheck,
      tools: toolsCheck,
      answer: answerCheck,
    },
    observed: {
      route: run.requestRoute,
      toolNames,
      finalAnswer,
    },
  };
}
