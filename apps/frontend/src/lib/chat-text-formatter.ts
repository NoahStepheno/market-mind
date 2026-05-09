export function formatUnsupportedResponse(
  explanation: string,
  rawMetrics: unknown,
  rawTemplates: unknown,
): string {
  let text = explanation;
  const metrics = Array.isArray(rawMetrics)
    ? (rawMetrics as { value: string; label: string }[])
    : undefined;
  const templates = Array.isArray(rawTemplates)
    ? (rawTemplates as { id: string; title: string; nlText: string }[])
    : undefined;
  if (metrics && metrics.length > 0) {
    text += "\n\n可用指标：" + metrics.map((m) => m.label).join("、");
  }
  if (templates && templates.length > 0) {
    text +=
      "\n推荐模板：" +
      templates
        .map((t) => t.nlText ?? t.title ?? "")
        .filter(Boolean)
        .join("；");
  }
  return text;
}
