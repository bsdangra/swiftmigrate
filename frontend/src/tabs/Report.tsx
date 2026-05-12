import { useEffect } from "react";
import { useApp } from "../context/AppContext";

type Props = {
  onRedirectToOverview: () => void;
};

export default function Report({ onRedirectToOverview }: Props) {
  const { projectData } = useApp();

  useEffect(() => {
    if (!projectData) {
      onRedirectToOverview();
    }
  }, [projectData, onRedirectToOverview]);

  if (!projectData) return null;

  const handleDownloadZip = () => {
    if (!projectData.zipPath) return;
    window.location.href = `http://localhost:3000/download/${projectData.zipPath}`;
  };

  const reportUrl = projectData.reportPath
    ? `http://localhost:3000${projectData.reportPath}/index.html`
    : null;

  const handleOpenReport = () => {
    if (reportUrl) {
      window.open(reportUrl, "_blank");
    }
  };

  // ✅ Convert object into array
  const fileConfidenceEntries = Object.entries(
    projectData.fileConversionConfidence || {}
  );

  return (
    <div className="tab-panel active">
      <div className="report-layout">

        {/* RIGHT MAIN */}
        <div className="report-main">

          {/* HEADER */}
          <div className="report-header-card">
            <div>
              <h3>Migration Report</h3>
            </div>

            <div>
              <button className="btn-sm" onClick={handleDownloadZip}>
                ⬇ Export
              </button>

              {reportUrl && (
                <button
                  className="btn-sm"
                  onClick={handleOpenReport}
                  style={{ marginLeft: 8 }}
                >
                  View Report
                </button>
              )}
            </div>
          </div>

          {/* FILE STATS */}
          <div className="report-section">
            <div className="report-section-title">
              File Conversion Summary
            </div>

            <div className="file-summary-list">
              {fileConfidenceEntries.map(([fileName, data]: any) => (
                <div className="file-summary-card" key={fileName}>

                  <div className="file-summary-top">
                    <div className="file-name">{fileName}</div>

                    <div
                      className={`score-badge ${data.label?.toLowerCase()}`}
                    >
                      {data.score}%
                    </div>
                  </div>

                  <div className="file-summary-bottom">
                    <div className="file-status">
                      Status: {data.label}
                    </div>

                    <div className="file-detail">
                      {data.detail}
                    </div>
                  </div>

                </div>
              ))}
            </div>
          </div>

          {/* EMBEDDED REPORT */}
          <div className="report-section report-iframe-section">
            <div className="report-section-title">
              Embedded Report
            </div>

            <iframe
              title="Migration Report"
              src={reportUrl || "about:blank"}
              style={{
                width: "100%",
                border: "1px solid var(--border)",
                borderRadius: 8,
                minHeight: "50vh",
              }}
            />
          </div>

        </div>
      </div>
    </div>
  );
}