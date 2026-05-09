import * as React from "react";

export function TemplateCard({
  icon,
  title,
  description,
  nlText,
  onClick,
}: {
  icon: string;
  title: string;
  description: string;
  nlText: string;
  onClick: (nlText: string) => void;
}) {
  return (
    <button
      type="button"
      className="flex min-h-[44px] min-w-[44px] cursor-pointer flex-col gap-apple-xs rounded-apple-md border border-apple-hairline bg-apple-canvas p-apple-md transition-transform hover:scale-[0.98] active:scale-[0.95] focus-visible:outline-2 focus-visible:outline-apple-focus-blue focus-visible:outline-offset-1"
      aria-label={`使用模板: ${title}`}
      onClick={() => onClick(nlText)}
    >
      <span aria-hidden="true">{icon}</span>
      <span className="text-body-strong text-apple-ink">{title}</span>
      <span className="text-caption text-apple-ink-muted-80">{description}</span>
    </button>
  );
}
