import { useApp } from "../context/AppContext";

export default function Report() {
  const { projectData } = useApp();

  if (!projectData) return null;

  const score = 85;

  return (
    <div className="tab-panel active">
      <div className="report-layout">
        {/* LEFT HISTORY */}
        <div className="report-history">
          <div className="history-title">Run history</div>

          <div className="history-item active">
            <div className="history-run">Run #48</div>
            <div className="history-date">Today</div>
            <div style={{ color: "var(--green)" }}>
              ● {projectData.totalFiles}/{projectData.totalFiles} passed
            </div>
          </div>
        </div>

        {/* RIGHT MAIN */}
        <div className="report-main">
          {/* HEADER */}
          <div className="report-header-card">
            <div>
              <h3>Migration Report</h3>
              <p>{projectData.projectName}</p>
            </div>

            <div className="score-circle">
              <div className="score-text">
                <span className="score-num">{score}</span>
              </div>
            </div>
          </div>

          {/* STATS */}
          <div className="report-stats">
            <div className="rstat">
              <div className="rstat-num">{projectData.totalFiles}</div>
              <div className="rstat-lbl">files converted</div>
            </div>

            <div className="rstat">
              <div className="rstat-num">{projectData.aiGenerated}</div>
              <div className="rstat-lbl">AI tests</div>
            </div>

            <div className="rstat">
              <div className="rstat-num">{projectData.unsupported}</div>
              <div className="rstat-lbl">flagged</div>
            </div>
          </div>

          {/* UNSUPPORTED */}
          <div className="report-section">
            <div className="report-section-title">
              ⚠ Unsupported patterns
            </div>

            <div className="unsupported-list">
              <div className="unsp-item">
                <span className="unsp-line">L:47</span>
                <div>
                  <div className="unsp-code">
                    CustomWaitHelper.waitUntilVisible()
                  </div>
                  <div className="unsp-note">
                    Needs manual review
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* AI LOG */}
          <div className="report-section">
            <div className="report-section-title">
              ◈ AI agent log
            </div>

            <div className="ai-log-list">
              <div className="ai-log-item">
                <span className="ai-log-tag">GEN</span>
                <div>Generated 23 tests</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}