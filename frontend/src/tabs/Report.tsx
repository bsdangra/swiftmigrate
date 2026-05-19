import { useEffect, useState } from "react";
import { useApp } from "../context/AppContext";

type Props = {
  onRedirectToOverview: () => void;
};

export default function Report({ onRedirectToOverview }: Props) {
  const { projectData } = useApp();
  const [selectedFile, setSelectedFile] = useState<any>(null);

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

                    <button
                      className="file-detail-btn"
                      onClick={() => setSelectedFile({ fileName, ...data })}
                    >
                      View Details →
                    </button>
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

      {/* FILE DETAIL MODAL */}
      {selectedFile && (
        <div className="modal-overlay" onClick={() => setSelectedFile(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedFile.fileName}</h2>
              <button
                className="modal-close"
                onClick={() => setSelectedFile(null)}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              <div className="detail-item">
                <span className="detail-label">Status:</span>
                <span className={`detail-value status-${selectedFile.label?.toLowerCase()}`}>
                  {selectedFile.label}
                </span>
              </div>

              <div className="detail-item">
                <span className="detail-label">Confidence Score:</span>
                <span className="detail-value">{selectedFile.score}%</span>
              </div>

              <div className="detail-section">
                <h3>Details</h3>
                <p>{selectedFile.detail}</p>
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn-sm"
                onClick={() => setSelectedFile(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}