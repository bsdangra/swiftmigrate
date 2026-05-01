import { useState, useEffect } from "react";
import Topbar from "../components/TopBar";
import Overview from "../tabs/Overview";
import Classification from "../tabs/Classification";
import Logs from "../tabs/Logs";
import Report from "../tabs/Report";
import { useApp } from "../context/AppContext";
import { processProject } from "../services/api";

type Tab = "overview" | "classify" | "logs" | "report";

export default function AppLayout() {
  const [tab, setTab] = useState<Tab>("overview");
  const { classificationSummary } = useApp();
  const [processingStarted, setProcessingStarted] = useState(false);
  const [progressStep, setProgressStep] = useState(1);

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
          startTime: data.startTime || {}
        });

        if (res.success) {
          setProgressStep(3);
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
    <div id="pg-app" className="page active">
      <Topbar tab={tab} setTab={setTab} />

      <div className="app-body">
        {tab === "overview" && <Overview progressStep={progressStep} />}
        {tab === "classify" && <Classification />}
        {tab === "logs" && <Logs />}
        {tab === "report" && <Report />}
      </div>
    </div>
  );
}
