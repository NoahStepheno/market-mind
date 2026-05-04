import type { Metric, Operator } from "./types.ts";

export const SUPPORTED_METRICS: { value: Metric; label: string }[] = [
  { value: "price", label: "Price" },
  { value: "pct_change", label: "% Change" },
  { value: "volume", label: "Volume" },
  { value: "turnover", label: "Turnover" },
  { value: "limit_up", label: "Limit Up" },
  { value: "limit_down", label: "Limit Down" },
  { value: "volume_ratio_5m", label: "5m Volume Ratio" },
  { value: "price_change_5m", label: "5m Price Change" },
];

export const OPERATORS: { value: Operator; label: string }[] = [
  { value: ">=", label: "≥" },
  { value: "<=", label: "≤" },
  { value: ">", label: ">" },
  { value: "<", label: "<" },
  { value: "==", label: "=" },
  { value: "!=", label: "≠" },
];

export const PRESET_TEMPLATES = [
  {
    id: "price-breakout",
    icon: "📈",
    title: "Price Breakout",
    description: "Alert when price breaks above a threshold",
    nlText: "当 {symbol} 价格突破 {value} 时提醒我",
  },
  {
    id: "volume-surge",
    icon: "📊",
    title: "Volume Surge",
    description: "Alert when volume surges above a threshold",
    nlText: "当 {symbol} 成交量超过 {value} 时提醒我",
  },
  {
    id: "large-move",
    icon: "⚡",
    title: "Large Move",
    description: "Alert when price moves significantly",
    nlText: "当 {symbol} 涨跌幅超过 {value}% 时提醒我",
  },
] as const;
