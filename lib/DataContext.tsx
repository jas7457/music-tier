"use client";

import { useRouter } from "next/navigation";
import { createContext, useContext, useMemo, useRef } from "react";

type DataContextType = {
  refreshData: () => void;
};

const DataContext = createContext<DataContextType>({
  refreshData: () => {},
});

export function DataProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const routerRef = useRef(router);
  routerRef.current = router;
  const contextValue: DataContextType = useMemo(() => {
    return {
      refreshData: () => {
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
