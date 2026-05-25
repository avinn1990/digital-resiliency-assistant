import { RefObject, useEffect } from "react";

export function useAutoScroll(
  containerRef: RefObject<HTMLElement | null>,
  dependency: unknown
) {
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [containerRef, dependency]);
}
