import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Topbar from "../components/TopBar";
import Overview from "../tabs/Overview";
import Classification from "../tabs/Classification";
import Logs from "../tabs/Logs";
import Report from "../tabs/Report";
import { useApp } from "../context/AppContext";
import { processProject } from "../services/api";
import type { ProjectData } from "../types";
import Footer from "../components/Footer";
import AboutModal from "../components/AboutModal";
import AboutProjectModal from "../components/AboutProjectModal";

type Tab = "overview" | "classify" | "logs" | "report";

export default function AppLayout() {
  const [tab, setTab] = useState<Tab>("overview");
  const { classificationSummary, setProjectData } = useApp();
  const [progressStep, setProgressStep] = useState(1);
  const [showAbout, setShowAbout] = useState(false);
  const [showProject, setShowProject] = useState(false);
  const navigate = useNavigate();
  const hasTriggered = useRef(false);

  useEffect(() => {
    if (classificationSummary) return;
    navigate("/");
  }, [classificationSummary, navigate]);

  // Trigger processing API on mount - continues even if tabs change
  useEffect(() => {
  if (!classificationSummary || hasTriggered.current) return;

  hasTriggered.current = true;

  const triggerProcessing = async () => {
    try {
      setProgressStep(2);

      const res = await processProject({
        dependencyGraph: classificationSummary.dependencyGraph || {},
        methodContentMap: classificationSummary.methodContentMap || {},
        startTime: classificationSummary.startTime || Date.now(),
      });
      setProgressStep(3);

      if (res.success) {
        setProgressStep(4);
        setProjectData({
          attempts: res.attempts || 0,
          logs: res.logs || '',
          zipPath: res.zipPath || "",
          reportPath: res.reportPath || "",
          ordered: res.ordered || [],
          unordered: res.unordered || [],
          convertedCount: res.convertedCount || 0,
        });

        setTab("report");
      } else {
        setProgressStep(4);
        setProjectData({
          attempts: res.attempts || 0,
          logs: res.logs || '',
          zipPath: res.zipPath || "",
          reportPath: res.reportPath || "",
          ordered: res.ordered || [],
          unordered: res.unordered || [],
          convertedCount: res.convertedCount || 0,
        });
        setTab("report");
      }
    } catch (err) {
      console.error('❌ Processing failed:', err);
      setProgressStep(4);
    }
  };

  triggerProcessing();
}, [classificationSummary]);

  return (
    <>
      <div id="pg-app" className="page active" style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        <Topbar tab={tab} setTab={setTab} />

        <div className="app-body" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          {tab === "overview" && <Overview progressStep={progressStep} />}
          {tab === "classify" && <Classification />}
          {tab === "logs" && <Logs />}
          {tab === "report" && <Report onRedirectToOverview={() => setTab("overview")} />}
        </div>

        {/* 🔥 Footer */}
        <Footer onOpenAbout={() => setShowAbout(true)} onOpenProject={() => setShowProject(true)} />
      </div>
      <AboutModal
        open={showAbout}
        onClose={() => setShowAbout(false)}
      />
      <AboutProjectModal
          open={showProject}
          onClose={() => setShowProject(false)}
        />
    </>
  );
}
