import { useState, useEffect } from "react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import hld from "../assets/swiftmigrate_hld_final_v3.svg";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function AboutProjectModal({ open, onClose }: Props) {
  const [tab, setTab] = useState<"overview" | "hld" | "lld">("overview");

  useEffect(() => {
    if (!open) return;

    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  return (
    <div
      className={`about-overlay ${open ? "active" : ""}`}
      onClick={onClose}
    >
      <div
        className="about-modal project-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="about-header">
          <div className="about-logo">SM</div>

          <div>
            <div className="about-title">SwiftMigrate</div>
            <div className="about-subtitle">
              Architecture Overview
            </div>
          </div>

          <button className="about-close" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* TABS */}
        <div className="project-tabs">
          {["overview", "hld", "lld"].map((t) => (
            <button
              key={t}
              className={`tab-btn ${tab === t ? "active" : ""}`}
              onClick={() => setTab(t as any)}
            >
              {t.toUpperCase()}
            </button>
          ))}
        </div>

        {/* CONTENT */}
        <div className="project-content">
          {tab === "overview" && (
            <div className="project-section">
              <p>
                <strong>SwiftMigrate</strong> is an agentic AI pipeline
                that transforms Selenium test frameworks into Playwright.
                It combines deterministic rule engines with AI-driven
                self-healing for unmatched reliability.
              </p>

              <div className="pipeline-list">
                {[
                  "Upload & Extract",
                  "Classification Engine",
                  "Dependency Graph Build",
                  "Topological Sorting",
                  "AI Conversion",
                  "Self-Healing Loop",
                  "Playwright Project Generation",
                ].map((step, i) => (
                  <div key={i} className="pipeline-item">
                    <span className="pipeline-index">{i + 1}</span>
                    {step}
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "hld" && (
            <div className="project-section hld-wrapper">
                <TransformWrapper>
                <TransformComponent>
                    <img
                        src={hld}
                        alt="HLD Diagram"
                        className="hld-image"
                    />
                </TransformComponent>
                </TransformWrapper>
             
            </div>
          )}

          {tab === "lld" && (
            <div className="project-section">
              <div className="lld-grid">
                {[
                  {
                    title: "Extractor",
                    desc: "Parses ZIP and filters Java files",
                  },
                  {
                    title: "Classifier",
                    desc: "Identifies test/page/base/util classes",
                  },
                  {
                    title: "Graph Builder",
                    desc: "Builds dependency relationships",
                  },
                  {
                    title: "Converter",
                    desc: "Transforms Selenium → Playwright",
                  },
                  {
                    title: "Validator",
                    desc: "Static validation + fixes",
                  },
                  {
                    title: "Self-Healer",
                    desc: "Retries with AI corrections",
                  },
                ].map((block) => (
                  <div key={block.title} className="lld-card">
                    <div className="lld-title">{block.title}</div>
                    <div className="lld-desc">{block.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="about-footer">
          SwiftMigrate · AI-driven Migration Engine
        </div>
      </div>
    </div>
  );
}