import React from "react";
import type { SourceFile } from "../utils/mergeSources";
import { summarizeSources } from "../utils/mergeSources";

export type PreprocessIssue = {
  type: string;
  message: string;
  severity: string;
  suggestion: string;
};

export type MigrationRunSummary = {
  success: boolean;
  attempts: number;
  healed: boolean;
  statusLabel: string;
  finishedAt: string;
  preprocessIssues: PreprocessIssue[];
  qualityScore: number | null;
  intentCategories: string[];
  playwrightLineCount: number;
};

type Props = {
  sourceFiles: SourceFile[];
  mergedPayloadChars: number;
  run: MigrationRunSummary | null;
};

const severityColor: Record<string, string> = {
  high: "#ff6b6b",
  medium: "#d29922",
  low: "#3fb950",
};

const cardShell: React.CSSProperties = {
  border: "1px solid #30363d",
  borderRadius: 12,
  overflow: "hidden",
  background: "linear-gradient(180deg, #161b22 0%, #0d1117 100%)",
  boxShadow: "0 12px 30px rgba(0,0,0,0.35)",
};

const sectionTitle: React.CSSProperties = {
  margin: 0,
  fontSize: 15,
  letterSpacing: 0.3,
  color: "#e6edf3",
  fontWeight: 600,
};

function StatPill({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div
      style={{
        padding: "10px 12px",
        borderRadius: 10,
        border: "1px solid #30363d",
        background: "#0d1117",
        minWidth: 120,
        flex: "1 1 120px",
      }}
    >
      <div style={{ fontSize: 11, color: "#8b949e", textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 16, color: accent || "#e6edf3", marginTop: 4, fontWeight: 600 }}>
        {value}
      </div>
    </div>
  );
}

const MigrationReport: React.FC<Props> = ({ sourceFiles, mergedPayloadChars, run }) => {
  const summaries = summarizeSources(sourceFiles);
  const totalLines = summaries.reduce((n, s) => n + s.lineCount, 0);
  const totalChars = summaries.reduce((n, s) => n + s.charCount, 0);

  const statusColor = run
    ? run.success
      ? "#3fb950"
      : "#ff6b6b"
    : "#8b949e";

  return (
    <div style={{ marginTop: 28 }}>
      <div style={{ ...cardShell }}>
        <div
          style={{
            padding: "14px 18px",
            background: "linear-gradient(90deg, #21262d, #161b22)",
            borderBottom: "1px solid #30363d",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div>
            <h3 style={{ ...sectionTitle, fontSize: 17 }}>Migration report & artefacts</h3>
            <p style={{ margin: "6px 0 0", color: "#8b949e", fontSize: 13 }}>
              Source inventory, quality signals from preprocessing, and run outcome in one place.
            </p>
          </div>
          {run && (
            <div
              style={{
                padding: "8px 14px",
                borderRadius: 999,
                border: `1px solid ${statusColor}`,
                color: statusColor,
                fontSize: 13,
                fontWeight: 600,
                background: "#0d1117",
              }}
            >
              {run.success ? "Migration succeeded" : "Migration needs attention"}
            </div>
          )}
        </div>

        <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 18 }}>
          <div>
            <h4 style={{ ...sectionTitle, marginBottom: 10 }}>Source artefacts</h4>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              <StatPill label="Files" value={String(sourceFiles.length || 0)} />
              <StatPill label="Total lines" value={String(totalLines)} />
              <StatPill label="Characters (sum)" value={totalChars.toLocaleString()} />
              <StatPill
                label="Merged payload"
                value={`${mergedPayloadChars.toLocaleString()} chars`}
                accent="#79c0ff"
              />
            </div>
          </div>

          {summaries.length > 0 && (
            <div>
              <h4 style={{ ...sectionTitle, marginBottom: 10 }}>File manifest</h4>
              <div style={{ border: "1px solid #30363d", borderRadius: 10, overflow: "hidden" }}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1.2fr 2fr 0.7fr 0.9fr",
                    gap: 0,
                    padding: "10px 12px",
                    background: "#161b22",
                    color: "#8b949e",
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  <span>Name</span>
                  <span>Path</span>
                  <span>Lines</span>
                  <span>Size</span>
                </div>
                {summaries.map((s) => (
                  <div
                    key={s.path}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1.2fr 2fr 0.7fr 0.9fr",
                      padding: "10px 12px",
                      borderTop: "1px solid #21262d",
                      fontSize: 13,
                      color: "#c9d1d9",
                      alignItems: "center",
                    }}
                  >
                    <span style={{ color: "#58a6ff", fontWeight: 600 }}>{s.name}</span>
                    <span style={{ color: "#8b949e", wordBreak: "break-all" }}>{s.path}</span>
                    <span>{s.lineCount}</span>
                    <span>{s.charCount.toLocaleString()} B</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {run && (
            <>
              <div>
                <h4 style={{ ...sectionTitle, marginBottom: 10 }}>Run summary</h4>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                  <StatPill label="Finished" value={new Date(run.finishedAt).toLocaleString()} />
                  <StatPill label="Attempts" value={String(run.attempts)} />
                  <StatPill
                    label="Self-heal"
                    value={run.healed ? "Yes" : "No"}
                    accent={run.healed ? "#d29922" : "#8b949e"}
                  />
                  <StatPill
                    label="Quality score"
                    value={run.qualityScore != null ? `${run.qualityScore}/100` : "—"}
                    accent="#79c0ff"
                  />
                  <StatPill
                    label="Playwright lines"
                    value={String(run.playwrightLineCount)}
                  />
                </div>
                <p style={{ margin: "12px 0 0", color: "#8b949e", fontSize: 13 }}>{run.statusLabel}</p>
              </div>

              {run.intentCategories.length > 0 && (
                <div>
                  <h4 style={{ ...sectionTitle, marginBottom: 10 }}>Detected intent (Selenium)</h4>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {run.intentCategories.map((c) => (
                      <span
                        key={c}
                        style={{
                          padding: "6px 10px",
                          borderRadius: 999,
                          background: "#21262d",
                          border: "1px solid #30363d",
                          color: "#c9d1d9",
                          fontSize: 12,
                        }}
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h4 style={{ ...sectionTitle, marginBottom: 10 }}>Preprocess findings</h4>
                {run.preprocessIssues.length === 0 ? (
                  <p style={{ margin: 0, color: "#3fb950", fontSize: 14 }}>
                    No rule-based issues flagged — script looks clean from a migration-readiness
                    perspective.
                  </p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {run.preprocessIssues.map((issue) => (
                      <div
                        key={`${issue.type}-${issue.message}`}
                        style={{
                          border: "1px solid #30363d",
                          borderRadius: 10,
                          padding: 12,
                          background: "#0d1117",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              textTransform: "uppercase",
                              color: severityColor[issue.severity] || "#8b949e",
                            }}
                          >
                            {issue.severity}
                          </span>
                          <span style={{ color: "#e6edf3", fontWeight: 600 }}>{issue.message}</span>
                        </div>
                        <p style={{ margin: "8px 0 0", color: "#8b949e", fontSize: 13 }}>
                          {issue.suggestion}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {!run && sourceFiles.length > 0 && (
            <p style={{ margin: 0, color: "#8b949e", fontSize: 14 }}>
              Run <strong style={{ color: "#c9d1d9" }}>Convert &amp; Run</strong> to populate execution
              metrics, preprocess findings, and intent tags.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default MigrationReport;
