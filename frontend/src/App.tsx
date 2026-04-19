import { useState } from "react";
import FileUpload from "./components/FileUpload";
import CodeViewer from "./components/CodeViewer";
import OutputConsole from "./components/OutputConsole";
import MigrationReport, { type MigrationRunSummary } from "./components/MigrationReport";
import { convertRun } from "./services/api";
import type { SourceFile } from "./utils/mergeSources";

function App() {
  const [sourceFiles, setSourceFiles] = useState<SourceFile[]>([]);
  const [fileContent, setFileContent] = useState<string>("");
  const [convertedCode, setConvertedCode] = useState<string>("");
  const [output, setOutput] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [status, setStatus] = useState<string>("");
  const [explanation, setExplanation] = useState<string>("");
  const [migrationRun, setMigrationRun] = useState<MigrationRunSummary | null>(null);

  const handleSourcesChange = (sources: SourceFile[], mergedContent: string) => {
    setSourceFiles(sources);
    setFileContent(mergedContent);
    setConvertedCode("");
    setOutput("");
    setExplanation("");
    setMigrationRun(null);
    setStatus("");
  };

  const handleConvertRun = async () => {
    setLoading(true);
    setStatus("🔄 Converting...");
    setTimeout(() => setStatus("⚙️ Running test..."), 800);
    setTimeout(() => setStatus("🛠 Fixing issues..."), 1600);

    try {
      const res = await convertRun(fileContent);

      setConvertedCode(res.playwrightCode || "");

      const rawOutput = res.logs || res.error || "";

      const cleanLogs = rawOutput
        .split("\n")
        .filter((line) => line.trim() !== "")
        .slice(-10)
        .join("\n");

      setOutput(cleanLogs);

      setExplanation(res.explanation || "");

      const pwLines = (res.playwrightCode || "").split("\n").length;
      let statusLabel = "";

      if (res.success) {
        if (res.healed) {
          setStatus(`🛠 Auto-healed in ${res.attempts} attempts`);
          statusLabel = `Completed after self-healing (${res.attempts} attempt(s)). Playwright test executed successfully.`;
        } else {
          setStatus("✅ Converted & Passed");
          statusLabel =
            "Converted on the first attempt and Playwright execution passed intent verification.";
        }
      } else {
        setStatus("❌ Failed after retries");
        statusLabel =
          "Playwright execution or intent verification did not succeed within the retry budget. Review execution output and preprocess findings below.";
      }

      setMigrationRun({
        success: !!res.success,
        attempts: res.attempts || 1,
        healed: !!res.healed,
        statusLabel,
        finishedAt: new Date().toISOString(),
        preprocessIssues: res.preprocessIssues ?? [],
        qualityScore:
          typeof res.qualityScore === "number" ? res.qualityScore : null,
        intentCategories: res.intentCategories ?? [],
        playwrightLineCount: pwLines,
      });
    } catch {
      setStatus("❌ Something went wrong");
      setOutput("Server error");
      setMigrationRun(null);
    }

    setLoading(false);
  };

  const handleDownload = () => {
    if (!convertedCode) return;

    const blob = new Blob([convertedCode], { type: "text/plain" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "test.spec.ts";
    a.click();

    URL.revokeObjectURL(url);
  };

  const seleniumTitle =
    sourceFiles.length > 1
      ? `Selenium (${sourceFiles.length} files)`
      : sourceFiles.length === 1
        ? `Selenium — ${sourceFiles[0].name}`
        : "Selenium";

  return (
    <div
      style={{
        padding: 24,
        minHeight: "100vh",
        background: "radial-gradient(1200px 600px at 10% -10%, #1f2937, #0b0f14)",
        color: "#e6edf3",
      }}
    >
      <h2 style={{ marginTop: 0, fontSize: 26, letterSpacing: 0.3 }}>⚡ SwiftMigrate</h2>

      <FileUpload onSourcesChange={handleSourcesChange} />

      <button onClick={handleConvertRun} disabled={!fileContent || loading}>
        {loading ? "Processing..." : "Convert & Run"}
      </button>

      <p>
        <strong>Status:</strong> {status}
      </p>

      <div
        style={{
          display: "flex",
          gap: "20px",
          marginTop: 20,
          alignItems: "stretch",
        }}
      >
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            minWidth: 0,
          }}
        >
          <h3>{seleniumTitle}</h3>
          <CodeViewer code={fileContent} title="Source" />
        </div>

        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            minWidth: 0,
          }}
        >
          <h3>Playwright</h3>
          <CodeViewer code={convertedCode} title="Generated" onDownload={handleDownload} />
        </div>
      </div>

      <div style={{ marginTop: 20 }}>
        <h3>Execution output</h3>
        <OutputConsole output={output} />
      </div>
      {explanation && (
        <div style={{ marginTop: 20 }}>
          <h3>🧠 What SwiftMigrate did</h3>
          <div
            style={{
              background: "#0d1117",
              color: "#c9d1d9",
              border: "1px solid #30363d",
              padding: 12,
              borderRadius: 8,
              whiteSpace: "pre-wrap",
              fontSize: 14,
            }}
          >
            <ul style={{ paddingLeft: 20, margin: 0 }}>
              {explanation
                .split("\n")
                .filter((line) => line.trim() !== "")
                .map((line, index) => (
                  <li key={index} style={{ marginBottom: 6 }}>
                    {line.replace(/^[-•]\s*/, "")}
                  </li>
                ))}
            </ul>
          </div>
        </div>
      )}

      <MigrationReport
        sourceFiles={sourceFiles}
        mergedPayloadChars={fileContent.length}
        run={migrationRun}
      />
    </div>
  );
}

export default App;
