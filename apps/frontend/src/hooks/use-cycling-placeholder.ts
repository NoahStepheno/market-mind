import { useState, useEffect, useCallback } from "react";

const PLACEHOLDER_TEXTS = [
  "翠微股份跌停打开的时候提醒我，放量3倍以上",
  "茅台跌破1800时提醒我",
  "中科曙光涨停打开立刻通知我",
  "宁德时代涨到220告诉我",
];

export function useCyclingPlaceholder(intervalMs = 4000): {
  placeholder: string;
  onFocus: () => void;
  onBlur: () => void;
} {
  const [index, setIndex] = useState(0);
  const [frozen, setFrozen] = useState(false);

  useEffect(() => {
    if (frozen) return;
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % PLACEHOLDER_TEXTS.length);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs, frozen]);

  const onFocus = useCallback(() => setFrozen(true), []);
  const onBlur = useCallback(() => setFrozen(false), []);

  return { placeholder: PLACEHOLDER_TEXTS[index], onFocus, onBlur };
}
