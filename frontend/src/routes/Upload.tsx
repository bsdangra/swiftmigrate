import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";

export default function Upload() {
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [githubUrl, setGithubUrl] = useState("");

  const navigate = useNavigate();
  const { setClassificationSummary } = useApp();

  // 📂 File select
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    setFiles(Array.from(e.target.files));
  };

  // 📥 Drag drop
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files);
    setFiles(droppedFiles);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  // 🚀 Upload API
  const handleUpload = async () => {
    if (files.length === 0 && !githubUrl) return;

    try {
      setLoading(true);

      let data;

      if (githubUrl) {
        const res = await fetch("http://localhost:3000/github", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: githubUrl }),
        });
        data = await res.json();
      } else {
        const formData = new FormData();
        files.forEach((file) => formData.append("files", file));

        const res = await fetch("http://localhost:3000/upload", {
          method: "POST",
          body: formData,
        });

        data = await res.json();
      }

      setClassificationSummary(data);

      navigate("/app");
    } catch (err) {
      console.error("❌ Upload failed", err);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setFiles([]);
    setGithubUrl("");
  };

  return (
    <div id="pg-upload" className="page active">
      <div
        style={{
          padding: "2rem",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          flex: 1,
        }}
      >
        <div className="upload-card">
          {/* HEADER */}
          <div className="upload-header">
            <h2>Upload your Selenium project</h2>
            <p>
              Supports full Java projects — uploads and processes 50+ files
              automatically
            </p>
          </div>

          {/* DROP ZONE */}
          <div
            className="drop-zone"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            <div className="drop-icon">⬆</div>
            <div className="drop-title">
              Drop your project folder or ZIP here
            </div>
            <div className="drop-sub">
              Drag & drop, or{" "}
              <label style={{ color: "var(--green)", cursor: "pointer" }}>
                browse files
                <input
                  type="file"
                  multiple
                  accept=".java,.zip"
                  onChange={handleFileChange}
                  hidden
                />
              </label>
            </div>
          </div>

          {/* SELECTED FILE */}
          {files.length > 0 && (
            <div className="selected-file show">
              <span className="file-name">{files[0].name}</span>
              <button className="file-remove" onClick={handleClear}>
                ✕
              </button>
            </div>
          )}

          {/* DIVIDER */}
          <div className="upload-divider">or import from GitHub</div>

          {/* GITHUB INPUT */}
          <div className="url-input-row">
            <input
              className="url-input"
              placeholder="https://github.com/org/selenium-tests"
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
            />
            <button
              className="btn-outline"
              onClick={() =>
                setGithubUrl(
                  "https://github.com/shishurajpandey/OrangeHRM_UIAutomation"
                )
              }
            >
              Import
            </button>
          </div>

          {/* FOOTER */}
          <div className="upload-footer">
            <button
              className="btn-primary"
              onClick={handleUpload}
              disabled={loading}
              style={{ padding: "10px 24px", fontSize: 13 }}
            >
              {loading ? "Processing..." : "Analyse & Migrate →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}