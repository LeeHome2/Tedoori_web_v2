"use client";

import { createContext, useContext, useState, ReactNode, useCallback } from 'react';

interface AddActionContextType {
  addAction: (() => void) | null;
  setAddAction: (action: (() => void) | null) => void;
}

const AddActionContext = createContext<AddActionContextType | undefined>(undefined);

export function AddActionProvider({ children }: { children: ReactNode }) {
  const [addAction, setAddActionState] = useState<(() => void) | null>(null);

  const setAddAction = useCallback((action: (() => void) | null) => {
    setAddActionState(() => action);
  }, []);

  return (
    <AddActionContext.Provider value={{ addAction, setAddAction }}>
      {children}
    </AddActionContext.Provider>
  );
}

export function useAddAction() {
  const context = useContext(AddActionContext);
  if (context === undefined) {
    throw new Error('useAddAction must be used within an AddActionProvider');
  }
  return context;
}
