export interface ParserInput {
  userMessage: string;
  sessionId: string;
  recentMessages: ContextMessage[];
  contextBudget: number;
}

export interface ContextMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ParserOutput {
  textExplanation: string;
  draft: ParsedDraft | null;
  errorCode?: "infra_error";
}

export interface ParsedDraft {
  symbol: string;
  symbolName: string;
  conditionGroup: {
    operator: "AND" | "OR";
    conditions: {
      metric: string;
      operator: string;
      value: number;
    }[];
  };
  cooldownSeconds: number;
  notifyLabel: string | null;
  notifyTier: "standard" | "emphasis";
}

export interface AlarmParser {
  parse(input: ParserInput): Promise<ParserOutput>;
}
