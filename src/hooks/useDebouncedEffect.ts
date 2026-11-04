import { useEffect, useRef } from "react";

/**
 * Runs `effect` after the dependency list stops changing for `delay` ms.
 * The latest callback is kept in a ref so inline closures never restart the
 * timer by themselves.
 */
export function useDebouncedEffect(
  effect: () => void | Promise<void>,
  deps: readonly unknown[],
  delay = 30
): void {
  const callback = useRef(effect);
  callback.current = effect;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void callback.current();
    }, delay);

    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, delay]);
}
