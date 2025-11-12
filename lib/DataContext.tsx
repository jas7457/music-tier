"use client";

import { useRouter } from "next/navigation";
import { createContext, useContext, useMemo, useRef } from "react";
import { assertNever } from "./utils/never";

type DataContextType = {
  refreshData: (refreshReason: "manual" | "pusherUpdate") => void;
};

const DataContext = createContext<DataContextType>({
  refreshData: () => {},
});

const TIME_BETWEEN_REFRESH_MS = 2000;

export function DataProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const routerRef = useRef(router);
  routerRef.current = router;
  const lastUpdateTimeRef = useRef(0);
  const contextValue: DataContextType = useMemo(() => {
    return {
      refreshData: (reason) => {
        const forceUpdate = (() => {
          switch (reason) {
            case "manual":
              return true;
            case "pusherUpdate":
              return false;
            default: {
              assertNever(reason);
            }
          }
        })();

        const now = Date.now();
        if (
          !forceUpdate &&
          now - lastUpdateTimeRef.current < TIME_BETWEEN_REFRESH_MS
        ) {
          return;
        }

        lastUpdateTimeRef.current = now;
        routerRef.current.refresh();
      },
    };
  }, []);

  return (
    <DataContext.Provider value={contextValue}>{children}</DataContext.Provider>
  );
}

export function useData() {
  return useContext(DataContext);
}
