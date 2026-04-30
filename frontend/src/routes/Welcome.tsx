import { useNavigate } from "react-router-dom";

export default function Welcome() {
  const navigate = useNavigate();

  return (
    <div id="pg-welcome" className="page active">
      {/* Background elements */}
      <div className="welcome-grid"></div>
      <div className="welcome-glow"></div>

      <div className="welcome-inner">
        {/* Badge */}
        <div className="welcome-badge">
          <span>●</span> Team Antaran · Hackathon 2026
        </div>

        {/* Logo */}
        <div className="welcome-logo">
          <div className="logo-mark">SM</div>
          <div style={{ textAlign: "left" }}>
            <div
              style={{
                fontSize: 22,
                fontWeight: 700,
                letterSpacing: "-0.5px",
              }}
            >
              SwiftMigrate
            </div>
            <div
              style={{
                fontSize: 11,
                color: "var(--text2)",
                fontFamily: "var(--mono)",
              }}
            >
              v1.0 · Selenium → Playwright
            </div>
          </div>
        </div>

        {/* Title */}
        <h1 className="welcome-title">
          Swift<span>Migrate</span>
        </h1>

        {/* Subtitle */}
        <p className="welcome-sub">
          Agentic AI pipeline that migrates legacy Java Selenium suites to
          Playwright — with self-healing, new test generation, and full
          execution reports.
        </p>

        {/* Features */}
        <div className="welcome-features">
          <div className="feat-card">
            <div className="feat-icon">⚙</div>
            <div className="feat-label">Deterministic core</div>
            <div className="feat-desc">
              Rule engine maps 70+ known patterns. Same input, same output,
              every time.
            </div>
          </div>

          <div className="feat-card">
            <div className="feat-icon">◈</div>
            <div className="feat-label">AI agent layer</div>
            <div className="feat-desc">
              Generates new tests, heals failures, resolves unknown patterns
              with confidence scoring.
            </div>
          </div>

          <div className="feat-card">
            <div className="feat-icon">◎</div>
            <div className="feat-label">Full report</div>
            <div className="feat-desc">
              Every migration decision logged. Transparent, auditable,
              downloadable.
            </div>
          </div>
        </div>

        {/* CTA */}
        <button
          className="btn-primary"
          onClick={() => navigate("/upload")}
        >
          Start Migration →
        </button>
      </div>
    </div>
  );
}