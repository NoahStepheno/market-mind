// @vitest-environment happy-dom
import { describe, expect, test, vi, beforeEach, afterEach } from "vite-plus/test";
import { renderHook, act } from "@testing-library/react";
import { useCyclingPlaceholder } from "./use-cycling-placeholder";

describe("useCyclingPlaceholder", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("returns initial placeholder text", () => {
    const { result } = renderHook(() => useCyclingPlaceholder());
    expect(result.current.placeholder).toBe("翠微股份跌停打开的时候提醒我，放量3倍以上");
  });

  test("cycles to next placeholder after interval", () => {
    const { result } = renderHook(() => useCyclingPlaceholder(4000));

    act(() => {
      vi.advanceTimersByTime(4000);
    });

    expect(result.current.placeholder).toBe("茅台跌破1800时提醒我");
  });

  test("stops cycling when focused and resumes on blur", () => {
    const { result } = renderHook(() => useCyclingPlaceholder(4000));

    act(() => {
      result.current.onFocus();
    });

    act(() => {
      vi.advanceTimersByTime(8000);
    });

    expect(result.current.placeholder).toBe("翠微股份跌停打开的时候提醒我，放量3倍以上");

    act(() => {
      result.current.onBlur();
    });

    act(() => {
      vi.advanceTimersByTime(4000);
    });

    expect(result.current.placeholder).toBe("茅台跌破1800时提醒我");
  });

  test("cleans up interval on unmount", () => {
    const { unmount } = renderHook(() => useCyclingPlaceholder(4000));
    const spy = vi.spyOn(globalThis, "clearInterval");

    unmount();

    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
