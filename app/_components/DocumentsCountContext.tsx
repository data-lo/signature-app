'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';

interface DocumentsCountContextValue {
  documentsCount: number | null;
  setDocumentsCount: (count: number) => void;
}

const DocumentsCountContext = createContext<DocumentsCountContextValue | null>(
  null,
);

export function DocumentsCountProvider({ children }: { children: ReactNode }) {
  const [documentsCount, setDocumentsCount] = useState<number | null>(null);

  return (
    <DocumentsCountContext.Provider
      value={{ documentsCount, setDocumentsCount }}
    >
      {children}
    </DocumentsCountContext.Provider>
  );
}

export function useDocumentsCount() {
  const context = useContext(DocumentsCountContext);
  if (!context) {
    throw new Error(
      'useDocumentsCount debe usarse dentro de DocumentsCountProvider',
    );
  }
  return context;
}
