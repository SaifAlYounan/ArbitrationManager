import { createContext, useContext, useState } from "react";

interface ImportContextValue {
  activeCaseId: number | null;
  setActiveCaseId: (id: number | null) => void;
  importOpen: boolean;
  openImport: () => void;
  closeImport: () => void;
}

const ImportContext = createContext<ImportContextValue>({
  activeCaseId: null,
  setActiveCaseId: () => {},
  importOpen: false,
  openImport: () => {},
  closeImport: () => {},
});

export function ImportProvider({ children }: { children: React.ReactNode }) {
  const [activeCaseId, setActiveCaseId] = useState<number | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  return (
    <ImportContext.Provider
      value={{
        activeCaseId,
        setActiveCaseId,
        importOpen,
        openImport: () => setImportOpen(true),
        closeImport: () => setImportOpen(false),
      }}
    >
      {children}
    </ImportContext.Provider>
  );
}

export function useImport() {
  return useContext(ImportContext);
}
