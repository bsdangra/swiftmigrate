export type FileItem = {
  name: string;
  type: "Test" | "POM" | "Base" | "Util";
  status: "done" | "healed" | "flagged";
  patterns: number;
  conf: number;
  ai: string;
};

export type ProjectData = {
  attempts: number;
  logs: string;
  zipPath: string;
  reportPath: string;
  ordered: string[];
  unordered: string[];
  convertedCount: number;
  files?: FileItem[];
};

export interface ClassificationSummary {
  framework: string;
  summary: {
    totalFiles: number;
    tests: number;
    pages: number;
    base: number;
    utils: number;
  };
  classified: {
    baseClasses: any[];
    ignored: any[];
    pageObjects: any[];
    testFiles: any[];
    utils: any[];
  },
  dependencyGraph: any;
  methodContentMap: any;
  startTime: number;
};
