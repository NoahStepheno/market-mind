import { PRESET_TEMPLATES } from "@market/utils";
import { TemplateCard } from "./template-card";

const TEMPLATE_DISPLAY: Record<string, { title: string; description: string }> = {
  "price-breakout": { title: "价格突破", description: "价格突破目标时提醒" },
  "volume-surge": { title: "放量提醒", description: "成交量异常放大时提醒" },
  "large-move": { title: "大涨大跌", description: "涨跌幅超过阈值时提醒" },
};

export function TemplateCards({ onTemplateClick }: { onTemplateClick: (nlText: string) => void }) {
  return (
    <div className="flex flex-col gap-apple-sm md:flex-row md:gap-apple-md">
      {PRESET_TEMPLATES.map((t) => {
        const display = TEMPLATE_DISPLAY[t.id];
        return (
          <TemplateCard
            key={t.id}
            icon={t.icon}
            title={display?.title ?? t.title}
            description={display?.description ?? t.description}
            nlText={t.nlText}
            onClick={onTemplateClick}
          />
        );
      })}
    </div>
  );
}
