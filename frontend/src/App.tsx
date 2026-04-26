import React, { useState } from "react";
import FileUpload from "./components/FileUpload";
import { processProject } from "./services/api";

function App() {
  const [output, setOutput] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [status, setStatus] = useState<string>("");
  const [attempts, setAttempts] = useState<number>(0);
  const [classified, setClassified] = useState<any>(null);
  const [projectPath, setProjectPath] = useState<string>("");
  const [zipPath, setZipPath] = useState<string>("");
  const [reportPath, setReportPath] = useState<string>("");
  const [summary, setSummary] = useState<any>(null);
  const [ordered, setOrdered] = useState<any[]>([]);
  const [unordered, setUnordered] = useState<any[]>([]);
  const [convertedCount, setConvertedCount] = useState<number>(0);
  const [framework, setFramework] = useState<string>("");

  const resetState = () => {
    setOutput("");
    setLoading(false);
    setStatus("");
    setAttempts(0);
    setClassified(null);
    setProjectPath("");
    setZipPath("");
    setReportPath("");
    setSummary(null);
    setOrdered([]);
    setUnordered([]);
    setConvertedCount(0);
    setFramework("");
  };

  const onProcessComplete = async (data: any) => {
    if (!data || !data.classified) {
      setStatus("❌ No files found in upload");
      resetState();
      return;
    }

    try {
      setLoading(true);
      setStatus("📊 Analyzing files...");

      // Store classification data from upload endpoint
      setClassified(data.classified);
      setSummary(data.summary);
      setFramework(data.framework || "Unknown");

      console.log("📁 File Classification:", data.classified);
      console.log("📈 Summary:", data.summary);
      console.log("🏗️ Framework:", data.framework);

      setStatus("🔄 Processing project...");
      setTimeout(() => setStatus("⚙️ Running tests..."), 2000);
      setTimeout(() => setStatus("🛠 Auto-healing issues..."), 4000);

      // Call process-project endpoint with dependency graph
      const res = await processProject({dependencyGraph: data.dependencyGraph});

      if (res.success) {
        setStatus(`✅ Project built successfully in ${res.attempts} attempts`);
        setOutput(res.logs || "");
        setProjectPath(res.projectPath || "");
        setZipPath(res.zipPath || "");
        setReportPath(res.reportPath || "");
        setAttempts(res.attempts || 0);
        setOrdered(res.ordered || []);
        setUnordered(res.unordered || []);
        setConvertedCount(res.convertedCount || 0);
      } else {
        setStatus(`❌ Failed after ${res.attempts} attempts`);
        setOutput(res.error || "");
        setAttempts(res.attempts || 0);
      }

    } catch (err) {
      console.error(err);
      setStatus("❌ Something went wrong");
      setOutput(String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadZip = () => {
    if (!zipPath) return;
    window.location.href = `http://localhost:3000/download/${zipPath}`;
  };

  const handleOpenReport = () => {
    if (reportPath) {
      window.open(`http://localhost:3000${reportPath}/index.html`, "_blank");
    }
  };

  return (
    <div style={{ padding: 10, maxWidth: 1400, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
        <div>
          <h1 style={{ marginBottom: 2, fontSize: 28 }}>⚡ SwiftMigrate</h1>
          <p style={{ color: "#666", marginTop: 0, marginBottom: 8, fontSize: 13 }}>Convert Java Selenium Tests to Playwright</p>
        </div>
      </div>

      <FileUpload onProcessComplete={onProcessComplete} />

      { status && (
        <div style={{ marginTop: 8, padding: "6px 10px", background: "#f0f7ff", borderLeft: "4px solid #2196f3", borderRadius: 4 }}>
          <p style={{ margin: 0, fontSize: 13 }}><strong>Status:</strong> {status}</p>
        </div>
      )}

      {(summary || framework) && (
        <div style={{
          background: "#f5f5f5",
          padding: 10,
          borderRadius: 8,
          marginTop: 10,
          marginBottom: 10
        }}>
          <h3 style={{ marginBottom: 8, marginTop: 0, fontSize: 16 }}>📊 Summary</h3>
          <div style={{ display: "grid", gridTemplateColumns: framework ? "repeat(5, 1fr)" : "repeat(4, 1fr)", gap: 8 }}>
            {framework && (
              <div style={{ background: "white", padding: 12, borderRadius: 4, textAlign: "center" }}>
                <div style={{ fontSize: 14, fontWeight: "bold", color: "#ff9800", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {framework}
                </div>
                <div style={{ fontSize: 12, color: "#666" }}>🏗️ Framework</div>
              </div>
            )}
            <div style={{ background: "white", padding: 12, borderRadius: 4, textAlign: "center" }}>
              <div style={{ fontSize: 24, fontWeight: "bold", color: "#2196f3" }}>{summary.totalFiles}</div>
              <div style={{ fontSize: 12, color: "#666" }}>Total Files</div>
            </div>
            <div style={{ background: "white", padding: 12, borderRadius: 4, textAlign: "center" }}>
              <div style={{ fontSize: 24, fontWeight: "bold", color: "#4caf50" }}>{summary.tests}</div>
              <div style={{ fontSize: 12, color: "#666" }}>Test Files</div>
            </div>
            <div style={{ background: "white", padding: 12, borderRadius: 4, textAlign: "center" }}>
              <div style={{ fontSize: 24, fontWeight: "bold", color: "#ff9800" }}>{summary.pages}</div>
              <div style={{ fontSize: 12, color: "#666" }}>Page Objects</div>
            </div>
            <div style={{ background: "white", padding: 12, borderRadius: 4, textAlign: "center" }}>
              <div style={{ fontSize: 24, fontWeight: "bold", color: "#9c27b0" }}>{summary.base}</div>
              <div style={{ fontSize: 12, color: "#666" }}>Base Classes</div>
            </div>
          </div>
        </div>
      )}
      

      <div style={{ display: "grid", gridTemplateColumns: (ordered.length > 0 || unordered.length > 0 || convertedCount > 0) ? "1fr 1fr" : "1fr", gap: 10, marginTop: 10, marginBottom: 10 }}>
          {classified && (
            <div style={{
              background: "#f9f9f9",
              padding: 10,
              borderRadius: 8,
              border: "1px solid #ddd"
            }}>
              <h3 style={{ marginBottom: 8, marginTop: 0, fontSize: 16 }}>📁 File Classification</h3>
            
            {classified.testFiles && classified.testFiles.length > 0 && (
              <div style={{ marginBottom: 8 }}>
                <h4 style={{ color: "#4caf50", marginBottom: 4, marginTop: 0, fontSize: 13 }}>🧪 Test Files ({classified.testFiles.length})</h4>
                <ul style={{ fontSize: 12, color: "#555", margin: 0, paddingLeft: 20 }}>
                  {classified.testFiles.map((file: any, idx: number) => (
                    <li key={idx} style={{ marginBottom: 2 }}>{file.fileName}</li>
                  ))}
                </ul>
              </div>
            )}

            {classified.pageObjects && classified.pageObjects.length > 0 && (
              <div style={{ marginBottom: 8 }}>
                <h4 style={{ color: "#ff9800", marginBottom: 4, marginTop: 0, fontSize: 13 }}>📄 Page Objects ({classified.pageObjects.length})</h4>
                <ul style={{ fontSize: 12, color: "#555", margin: 0, paddingLeft: 20 }}>
                  {classified.pageObjects.map((file: any, idx: number) => (
                    <li key={idx} style={{ marginBottom: 2 }}>{file.fileName}</li>
                  ))}
                </ul>
              </div>
            )}

            {classified.baseClasses && classified.baseClasses.length > 0 && (
              <div style={{ marginBottom: 8 }}>
                <h4 style={{ color: "#9c27b0", marginBottom: 4, marginTop: 0, fontSize: 13 }}>🔧 Base Classes ({classified.baseClasses.length})</h4>
                <ul style={{ fontSize: 12, color: "#555", margin: 0, paddingLeft: 20 }}>
                  {classified.baseClasses.map((file: any, idx: number) => (
                    <li key={idx} style={{ marginBottom: 2 }}>{file.fileName}</li>
                  ))}
                </ul>
              </div>
            )}

            {classified.utilities && classified.utilities.length > 0 && (
              <div style={{ marginBottom: 0 }}>
                <h4 style={{ color: "#2196f3", marginBottom: 4, marginTop: 0, fontSize: 13 }}>🛠 Utilities ({classified.utilities.length})</h4>
                <ul style={{ fontSize: 12, color: "#555", margin: 0, paddingLeft: 20 }}>
                  {classified.utilities.map((file: any, idx: number) => (
                    <li key={idx} style={{ marginBottom: 2 }}>{file.fileName}</li>
                  ))}
                </ul>
              </div>
            )}
            </div>
          )}

          {(ordered.length > 0 || unordered.length > 0 || convertedCount > 0) && (
            <div style={{
              background: "#faf9f6",
              padding: 10,
              borderRadius: 8,
              border: "1px solid #e8e6e1"
            }}>
              <h3 style={{ marginBottom: 8, marginTop: 0, fontSize: 16 }}>🔄 Conversion Pipeline</h3>
              
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 8 }}>
                <div style={{ background: "white", padding: 10, borderRadius: 4, textAlign: "center", border: "1px solid #e8e6e1" }}>
                  <div style={{ fontSize: 20, fontWeight: "bold", color: "#4caf50" }}>{convertedCount}</div>
                  <div style={{ fontSize: 11, color: "#666" }}>📦 Converted</div>
                </div>
                <div style={{ background: "white", padding: 10, borderRadius: 4, textAlign: "center", border: "1px solid #e8e6e1" }}>
                  <div style={{ fontSize: 20, fontWeight: "bold", color: "#2196f3" }}>{ordered.length}</div>
                  <div style={{ fontSize: 11, color: "#666" }}>✅ Ordered</div>
                </div>
                <div style={{ background: "white", padding: 10, borderRadius: 4, textAlign: "center", border: "1px solid #e8e6e1" }}>
                  <div style={{ fontSize: 20, fontWeight: "bold", color: "#ff9800" }}>{unordered.length}</div>
                  <div style={{ fontSize: 11, color: "#666" }}>⚠️ Unordered</div>
                </div>
              </div>

              {ordered.length > 0 && (
                <div style={{ marginBottom: 8 }}>
                  <h4 style={{ marginBottom: 4, marginTop: 0, fontSize: 13 }}>✅ Processing Order</h4>
                  <ol style={{ fontSize: 11, margin: 0, paddingLeft: 20, color: "#555" }}>
                    {ordered.map((file: string, idx: number) => (
                      <li key={idx} style={{ marginBottom: 1 }}>{file}</li>
                    ))}
                  </ol>
                </div>
              )}

              {unordered.length > 0 && (
                <div>
                  <h4 style={{ marginBottom: 4, marginTop: 0, fontSize: 13 }}>⚠️ Without Dependencies</h4>
                  <ul style={{ fontSize: 11, margin: 0, paddingLeft: 20, color: "#666" }}>
                    {unordered.map((file: string, idx: number) => (
                      <li key={idx} style={{ marginBottom: 1 }}>{file}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
      </div>

      {projectPath && (
        <div style={{
          background: "#e8f5e9",
          padding: 10,
          borderRadius: 8,
          border: "1px solid #4caf50"
        }}>
          <h3 style={{ marginBottom: 6, marginTop: 0, fontSize: 16 }}>✅ Build Successful</h3>
          <p style={{ margin: "4px 0", fontSize: 13 }}><strong>Project Path:</strong> {projectPath}</p>
          <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
            {zipPath && (
              <button 
                onClick={handleDownloadZip}
                style={{
                  background: "#4caf50",
                  color: "white",
                  padding: "8px 16px",
                  border: "none",
                  borderRadius: 4,
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: "bold"
                }}
              >
                📦 Download Zip
              </button>
            )}
            {reportPath && (
              <button 
                onClick={handleOpenReport}
                style={{
                  background: "#2196f3",
                  color: "white",
                  padding: "8px 16px",
                  border: "none",
                  borderRadius: 4,
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: "bold"
                }}
              >
                📊 View Report
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;