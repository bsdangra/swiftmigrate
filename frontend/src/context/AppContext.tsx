import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";
import type { ClassificationSummary, ProjectData } from "../types";

type AppContextType = {
  projectData: ProjectData | null;
  setProjectData: React.Dispatch<
    React.SetStateAction<ProjectData | null>
  >;
  classificationSummary: ClassificationSummary | null;
  setClassificationSummary: React.Dispatch<
    React.SetStateAction<ClassificationSummary | null>
  >;
};

const AppContext = createContext<AppContextType | undefined>(undefined);

type AppProviderProps = {
  children: ReactNode;
};

export function AppProvider({ children }: AppProviderProps) {
  const [projectData, setProjectData] = useState<ProjectData | null>(null);
  const [classificationSummary, setClassificationSummary] = useState<ClassificationSummary | null>(null);

  return (
    <AppContext.Provider value={{ 
      projectData, 
      setProjectData,
      classificationSummary,
      setClassificationSummary, }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);

  if (!context) {
    throw new Error("useApp must be used inside AppProvider");
  }

  return context;
}