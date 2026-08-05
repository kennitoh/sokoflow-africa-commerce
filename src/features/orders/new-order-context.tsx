import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

import { NewOrderSheet } from "@/features/orders/new-order-sheet";

type NewOrderContextValue = { openNewOrder: () => void };

const NewOrderContext = createContext<NewOrderContextValue>({ openNewOrder: () => {} });

export function NewOrderProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const value = useMemo(() => ({ openNewOrder: () => setOpen(true) }), []);

  return (
    <NewOrderContext.Provider value={value}>
      {children}
      <NewOrderSheet open={open} onOpenChange={setOpen} />
    </NewOrderContext.Provider>
  );
}

export function useNewOrder() {
  return useContext(NewOrderContext);
}
