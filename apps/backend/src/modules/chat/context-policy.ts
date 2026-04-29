import type { MessageDto } from "./types.ts";

export type BuildContextInput = {
  systemPrompt: string;
  userLatest: string;
  draftCurrent?: Record<string, unknown> | null;
  recentMessages: MessageDto[];
  contextBudget: number;
};

export type BuildContextOutput = {
  segments: string[];
  truncated: boolean;
};

type ContextBlock = MessageDto["blocks"][number];

function trySelectRecentSegments(input: {
  recentMessages: MessageDto[];
  budgetLeft: number;
  draftCurrent?: Record<string, unknown> | null;
  degradeFrozenUiBlocks: boolean;
}) {
  const selected: string[] = [];
  let used = 0;
  for (const message of input.recentMessages) {
    const blocks = input.degradeFrozenUiBlocks
      ? message.blocks.map((block) => toContextBlock(block, input.draftCurrent))
      : message.blocks;
    const text = JSON.stringify(blocks);
    const segment = `${message.role}:${text}`;
    if (used + segment.length > input.budgetLeft) {
      return { selected, truncated: true };
    }
    selected.push(segment);
    used += segment.length;
  }
  return { selected, truncated: false };
}

function toContextBlock(
  block: ContextBlock,
  draftCurrent?: Record<string, unknown> | null,
): Record<string, unknown> {
  if (block.type !== "ui" || block.component !== "alarm_editor") {
    return block;
  }

  if (isCurrentDraftBlock(block, draftCurrent)) {
    return block;
  }

  return {
    type: "ui",
    component: "alarm_editor",
    props: { placeholder: true, frozen: true },
  };
}

function isCurrentDraftBlock(block: ContextBlock, draftCurrent?: Record<string, unknown> | null) {
  if (block.type !== "ui" || block.component !== "alarm_editor" || !draftCurrent) {
    return false;
  }
  try {
    return JSON.stringify(block.props) === JSON.stringify(draftCurrent);
  } catch {
    return false;
  }
}

export function buildChatContext(input: BuildContextInput): BuildContextOutput {
  const draft = input.draftCurrent ? JSON.stringify(input.draftCurrent) : "";
  const baseSegments = [
    `system:${input.systemPrompt}`,
    draft ? `draft_current:${draft}` : "",
    `user_latest:${input.userLatest}`,
  ].filter(Boolean);
  const baseLength = baseSegments.join("\n").length;
  if (baseLength >= input.contextBudget) {
    return { segments: baseSegments, truncated: true };
  }

  const budgetLeft = input.contextBudget - baseLength;
  const full = trySelectRecentSegments({
    recentMessages: input.recentMessages,
    budgetLeft,
    draftCurrent: input.draftCurrent,
    degradeFrozenUiBlocks: false,
  });
  if (!full.truncated) {
    return { segments: [...baseSegments, ...full.selected], truncated: false };
  }

  const degraded = trySelectRecentSegments({
    recentMessages: input.recentMessages,
    budgetLeft,
    draftCurrent: input.draftCurrent,
    degradeFrozenUiBlocks: true,
  });
  return { segments: [...baseSegments, ...degraded.selected], truncated: degraded.truncated };
}
