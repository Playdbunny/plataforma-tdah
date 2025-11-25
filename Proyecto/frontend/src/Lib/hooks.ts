import { useEffect, useRef } from "react";

export function useOnceWhen(cond: boolean, fn: () => void, deps: any[]) {
  const ranRef = useRef(false);

  useEffect(() => {
    if (cond && !ranRef.current) {
      ranRef.current = true;
      fn();
    }
    if (!cond && ranRef.current) ranRef.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

export function useBusyFlag() {
  const ref = useRef(false);
  return {
    isBusy: () => ref.current,
    async run<T>(p: Promise<T>) {
      ref.current = true;
      try {
        return await p;
      } finally {
        ref.current = false;
      }
    },
    set(v: boolean) {
      ref.current = v;
    },
  };
}