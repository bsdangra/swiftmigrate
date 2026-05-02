import { useState, useEffect } from "react";
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
  const [processingStarted, setProcessingStarted] = useState(false);
  const [progressStep, setProgressStep] = useState(1);
  const [showAbout, setShowAbout] = useState(false);
  const [showProject, setShowProject] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (classificationSummary) return;
    navigate("/");
  }, [classificationSummary, navigate]);

  // Trigger processing API on mount - continues even if tabs change
  useEffect(() => {
    if (!classificationSummary || processingStarted) return;

    const triggerProcessing = async () => {
      try {
        setProcessingStarted(true);
        setProgressStep(2); // moved to conversion stage
        console.log('🚀 Triggering project processing...');
        
        const res = await processProject({
          dependencyGraph: classificationSummary.dependencyGraph || {},
          methodContentMap: classificationSummary.methodContentMap || {},
          startTime: classificationSummary.startTime || Date.now(),
        });

        if (res.success) {
          setProgressStep(3);
            const projectData: ProjectData = {
            attempts: res.attempts || 0,
            logs: res.logs || '',
            zipPath: res.zipPath || "",
            reportPath: res.reportPath || "",
            ordered: res.ordered || [],
            unordered: res.unordered || [],
            convertedCount: res.convertedCount || 0,

          };

          setProjectData(projectData);
          setTab("report");
        } else {
          setProgressStep(3);
        }
        console.log('✅ Project processing response:', res);
      } catch (err) {
        console.error('❌ Processing failed:', err);
        setProgressStep(4);
      }
    };

    triggerProcessing();
  }, [classificationSummary, processingStarted]);

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
