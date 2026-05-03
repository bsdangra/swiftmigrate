import { useApp } from "../context/AppContext";
import { useLog } from "../context/LogContext";
import { useProgress } from "../hooks/useProgress";

type OverviewProps = {
  progressStep: number;
};

export default function Overview({ progressStep }: OverviewProps) {
  const { classificationSummary } = useApp();
  const { events } = useLog();
  const recentEvents = events.slice(-3);
  useProgress(); // Trigger socket listener setup
  const progress = progressStep;

  if (!classificationSummary) return null;

  const getIcon = (type: string) => {
    const icons: Record<string, string> = {
      upload: '📤',
      classification: '📁',
      dependency: '🔗',
      conversion: '🔄',
      validation: '✅',
      execution: '🚀',
      done: '✨',
    };
    return icons[type] || '⚙️';
  };


  return (
    <div className="tab-panel active">

       {/* PIPELINE */}
      <div className="pipeline-card">
        <div className="card-header">
          <span className="card-title">⚙ Conversion pipeline</span>
          <span className="card-badge badge-amber">
            Step {progress} of 4 ·{" "}
            {progress < 4 ? "Completed" : "Converting"}
          </span>
        </div>

        <div className="pipeline-steps">
          {["Upload", "Classify", "Convert", "Build & Test"].map(
            (step, i) => {
              const currentStep =  progress;

              const isDone = i < currentStep;
              const isActive = i === currentStep;

              return (
                <div
                  key={step}
                  className={`step ${isDone ? "done" : ""} ${
                    isActive ? "active-step" : ""
                  }`}
                >
                  <div className="step-circle">
                    {isDone ? "✓" : i + 1}
                  </div>
                  <div className="step-label">{step}</div>
                </div>
              );
            }
          )}
        </div>
      </div>

      {/* METRICS */}
       <div className="metric-grid">
        <div className="metric-card">
          <div className="metric-label">Framework</div>
          <div className="metric-val" style={{ color: "var(--purple)" }}>{classificationSummary.framework}</div>
          <div className="metric-sub">in project</div>
          <div className="metric-bar">
            <div
              className="metric-bar-fill"
              style={{ width: "100%", background: "var(--purple)" }}
            />
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-label">Total</div>
          <div className="metric-val" style={{ color: "var(--blue)" }}>
            {classificationSummary.summary.totalFiles}
          </div>
          <div className="metric-sub">java and selenimum files identified</div>
          <div className="metric-bar">
            <div
              className="metric-bar-fill"
              style={{ width: "100%", background: "var(--blue)" }}
            />
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-label">Converting</div>
          <div className="metric-val" style={{ color: "var(--green)" }}>
            {classificationSummary.summary.base + classificationSummary.summary.pages + classificationSummary.summary.tests + classificationSummary.summary.utils}
          </div>
          <div className="metric-sub">
            of {classificationSummary.summary.totalFiles} files
          </div>
          <div className="metric-bar">
            <div
              className="metric-bar-fill"
              style={{ width: "100%", background: "var(--green)" }}
            />
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-label">LLM</div>
          <div className="metric-val" style={{ color: "var(--amber)" }}>
            {'Made with Gemini'}
          </div>
          <div className="metric-sub">Model 3.1-pro-preview</div>
          <div className="metric-bar">
            <div
              className="metric-bar-fill"
              style={{
                width: "100%",
                background: "var(--amber)",
              }}
            />
          </div>
        </div>
      </div>

      {/* TWO COLUMN SECTION */}
      <div className="two-col">
        {/* FILE CLASSIFICATION */}
        <div className="pipeline-card">
          <div className="card-header">
            <span className="card-title">◈ File categorization</span>
            <span className="card-badge badge-green">
              {classificationSummary.summary.base + classificationSummary.summary.pages + classificationSummary.summary.tests + classificationSummary.summary.utils} files
            </span>
          </div>

          <div className="class-summary-list">
            <div className="class-row">
              <div className="class-row-left">
                <div
                  className="class-dot"
                  style={{ background: "var(--blue)" }}
                />
                Test files
              </div>
              <span className="class-count">
                {
                  classificationSummary.summary.tests
                }{" "}
                files
              </span>
            </div>

            <div className="class-row">
              <div className="class-row-left">
                <div
                  className="class-dot"
                  style={{ background: "var(--amber)" }}
                />
                Page objects
              </div>
              <span className="class-count">
                {
                  classificationSummary.summary.pages
                }{" "}
                files
              </span>
            </div>

            <div className="class-row">
              <div className="class-row-left">
                <div
                  className="class-dot"
                  style={{ background: "var(--purple)" }}
                />
                Base classes
              </div>
              <span className="class-count">
                {
                  classificationSummary.summary.base
                }{" "}
                files
              </span>
            </div>

            <div className="class-row">
              <div className="class-row-left">
                <div
                  className="class-dot"
                  style={{ background: "var(--text3)" }}
                />
                Utilities
              </div>
              <span className="class-count">
                {
                  classificationSummary.summary.utils
                }{" "}
                files
              </span>
            </div>
          </div>
        </div>

        {/* AI ACTIVITY */}
        <div className="pipeline-card">
          <div className="card-header">
            <span className="card-title">◎ Live Updates</span>
            <span className="card-badge badge-blue">Live</span>
          </div>

          <div className="ai-actions-list">
            {recentEvents.map((f, i) => (
              <div key={i} className="ai-action">
                <div
                  className="ai-dot"
                  style={{
                    background:
                      f.status === "done"
                        ? "var(--green)"
                        : f.status === "flagged"
                        ? "var(--amber)"
                        : "var(--purple)",
                  }}
                />
                <div>
                  <div className="ai-action-text">
                    {getIcon(f.type)} {" "}
                    <span
                      style={{
                        fontFamily: "var(--mono)",
                        color: "var(--text1)",
                      }}
                    >
                      {f.type.charAt(0).toUpperCase() + f.type.slice(1)}
                    </span>
                  </div>
                  <div className="ai-action-sub">
                    {f.status}
                  </div>
                </div>
              </div>
            ))}
            
          </div>
        </div>
      </div>

      {/* DOWNLOAD BANNER */}
      {/* {progress === 100 && (
        <div className="download-banner">
          <div className="download-banner-left">
            <div className="download-icon">⬇</div>
            <div>
              <div className="download-title">
                Migration complete — ready to download
              </div>
              <div className="download-sub">
                {projectData.totalFiles} files converted ·{" "}
                {projectData.aiGenerated} AI-generated tests ·{" "}
                {projectData.unsupported} patterns flagged
              </div>
            </div>
          </div>

          <button className="btn-sm">
            Download ZIP
          </button>
        </div>
      )} */}
    </div>
  );
}