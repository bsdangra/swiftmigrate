import React, { useRef, useState } from "react";
import JSZip from "jszip";
import type { SourceFile } from "../utils/mergeSources";
import { mergeJavaSources } from "../utils/mergeSources";

type Props = {
  onSourcesChange: (sources: SourceFile[], mergedContent: string) => void;
};

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

async function javaFilesFromZip(file: File): Promise<SourceFile[]> {
  const zip = await JSZip.loadAsync(file);
  const out: SourceFile[] = [];

  const entries = Object.values(zip.files).filter((e) => !e.dir);
  for (const entry of entries) {
    const path = entry.name.replace(/\\/g, "/");
    if (!path.toLowerCase().endsWith(".java")) continue;
    const content = await entry.async("string");
    const name = path.split("/").pop() || path;
    out.push({ name, relativePath: path, content });
  }

  return out;
}

const FileUpload: React.FC<Props> = ({ onSourcesChange }) => {
  const [sources, setSources] = useState<SourceFile[]>([]);
  const [error, setError] = useState<string>("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  const pushMerged = (next: SourceFile[]) => {
    setSources(next);
    setError("");
    onSourcesChange(next, mergeJavaSources(next));
  };

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files;
    if (!list?.length) return;

    setError("");
    const collected: SourceFile[] = [];

    for (let i = 0; i < list.length; i++) {
      const file = list[i];
      const lower = file.name.toLowerCase();

      try {
        if (lower.endsWith(".zip")) {
          const fromZip = await javaFilesFromZip(file);
          if (!fromZip.length) {
            setError(`No .java entries found in ${file.name}.`);
          }
          collected.push(...fromZip);
        } else if (lower.endsWith(".java")) {
          const content = await readFileAsText(file);
          collected.push({
            name: file.name,
            relativePath: file.name,
            content,
          });
        }
      } catch {
        setError(`Could not read ${file.name}. Try another file or ZIP.`);
        e.target.value = "";
        return;
      }
    }

    if (!collected.length) {
      setError("Add at least one .java file or a ZIP that contains .java sources.");
      e.target.value = "";
      return;
    }

    const seen = new Set<string>();
    const deduped: SourceFile[] = [];
    for (const s of collected) {
      const key = s.relativePath;
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push(s);
    }

    pushMerged(deduped);
    e.target.value = "";
  };

  const handleClear = () => {
    setSources([]);
    setError("");
    onSourcesChange([], "");
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ marginBottom: 8, color: "#c9d1d9", fontSize: 14 }}>
        Upload one or more <strong>.java</strong> files and/or a <strong>.zip</strong> (Java sources
        inside the archive are merged in order for migration).
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".java,.zip,application/zip,application/x-zip-compressed"
        multiple
        onChange={handleFiles}
      />

      {error && (
        <p style={{ color: "#ff6b6b", marginTop: 10, marginBottom: 0 }}>{error}</p>
      )}

      {sources.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <p style={{ margin: 0, color: "#8b949e" }}>
              <strong style={{ color: "#c9d1d9" }}>{sources.length}</strong> file
              {sources.length === 1 ? "" : "s"} loaded
            </p>
            <button type="button" onClick={handleClear}>
              Clear all
            </button>
          </div>
          <ul
            style={{
              margin: "10px 0 0",
              paddingLeft: 20,
              color: "#c9d1d9",
              fontSize: 13,
              maxHeight: 140,
              overflowY: "auto",
            }}
          >
            {sources.map((s) => (
              <li key={s.relativePath} style={{ marginBottom: 4 }}>
                <span style={{ color: "#58a6ff" }}>{s.name}</span>
                {s.relativePath !== s.name && (
                  <span style={{ color: "#6e7681" }}> — {s.relativePath}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default FileUpload;
