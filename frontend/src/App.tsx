import React, { useState } from "react";
import FileUpload from "./components/FileUpload";
import CodeViewer from "./components/CodeViewer";
import OutputConsole from "./components/OutputConsole";
import { convertRun, processProject } from "./services/api";

function App() {
  const [fileContent, setFileContent] = useState<string>("");
  const [convertedCode, setConvertedCode] = useState<string>("");
  const [output, setOutput] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [status, setStatus] = useState<string>("");
  const [attempts, setAttempts] = useState<number>(0);
  const [healed, setHealed] = useState<boolean>(false);
  const [explanation, setExplanation] = useState<string>("");

  const onProcessComplete = async (data: any) => {
    // if (!data || !data.tests || data.tests.length === 0) {
    //   setStatus("❌ No test files found");
    //   return;
    // }

    try {
      setLoading(true);
      setStatus("🔍 Analyzing...");

      // ✅ Step 1: Pick main test file
      // const mainTest = data.tests[0];

      // setFileContent(mainTest.content); // show in UI

      // setStatus("🔄 Converting...");
      // setTimeout(() => setStatus("⚙️ Running test..."), 1500);
      // setTimeout(() => setStatus("🛠 Fixing issues..."), 3000);

      const res = await processProject({dependencyGraph: data.dependencyGraph});

      // // ✅ Step 2: Call convert-run
      // const res = await convertRun({
      //   test: mainTest.content,
      //   mappedPOMs: mainTest.mappedPOMs
      // });

      // setConvertedCode(res.playwrightCode || "");

      // const rawOutput = res.logs || res.error || "";

      // const cleanLogs = rawOutput
      //   .split("\n")
      //   .filter(line => line.trim() !== "")
      //   .slice(-10)
      //   .join("\n");

      // setOutput(cleanLogs);

      // setAttempts(res.attempts || 1);
      // setHealed(res.healed || false);
      // setExplanation(res.explanation || "");

      // if (res.success) {
      //   if (res.healed) {
      //     setStatus(`🛠 Auto-healed in ${res.attempts} attempts`);
      //   } else {
      //     setStatus("✅ Converted & Passed");
      //   }
      // } else {
      //   setStatus("❌ Failed after retries");
      // }

    } catch (err) {
      console.error(err);
      setStatus("❌ Something went wrong");
      setOutput("Server error");
    } finally {
      setLoading(false);
    }
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

  return (
    <div style={{ padding: 20 }}>
      <h2>⚡ SwiftMigrate</h2>

      <FileUpload onProcessComplete={onProcessComplete} />

      <p><strong>Status:</strong> {status}</p>

      <div style={{
          display: "flex",
          gap: "20px",
          marginTop: 20,
          alignItems: "stretch", // ✅ key fix
        }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          <h3>Selenium Code</h3>
          <CodeViewer code={fileContent} />
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0  }}>
          <h3>Playwright Code</h3>
          <CodeViewer code={convertedCode} onDownload={handleDownload} />
        </div>
      </div>

      <div style={{ marginTop: 20 }}>
        <h3>Execution Output</h3>
        <OutputConsole output={output} />
      </div>
      {explanation && (
        <div style={{ marginTop: 20 }}>
          <h3>🧠 What SwiftMigrate Did</h3>
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
    </div>
  );
}

export default App;