export type SourceFile = {
  name: string;
  relativePath: string;
  content: string;
};

export function mergeJavaSources(files: SourceFile[]): string {
  if (!files.length) return "";
  const sorted = [...files].sort((a, b) =>
    a.relativePath.localeCompare(b.relativePath, undefined, { sensitivity: "base" })
  );
  return sorted
    .map(
      (f) =>
        `// ========== FILE: ${f.relativePath} ==========\n${f.content.replace(/\s+$/, "")}\n`
    )
    .join("\n");
}

export function summarizeSources(files: SourceFile[]) {
  return files.map((f) => {
    const lines = f.content.split(/\n/).length;
    return {
      name: f.name,
      path: f.relativePath,
      lineCount: lines,
      charCount: f.content.length,
    };
  });
}
