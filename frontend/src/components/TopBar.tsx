import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { useLog } from "../context/LogContext";
import { clearPendingEvents } from "../services/socket";

type Props = {
  tab: string;
  setTab: (tab: any) => void;
};

export default function Topbar({ tab, setTab }: Props) {
  const navigate = useNavigate();
  const { setProjectData, setClassificationSummary } = useApp();
  const { clearLogs } = useLog();

  const handleNew = () => {
    // 🧹 reset state
    clearLogs();
    clearPendingEvents();
    setProjectData(null);
    setClassificationSummary(null);

    // 🚀 go to welcome screen
    navigate("/upload");
  };

  return (
    <div className="app-topbar">
      <div className="app-logo">
        <div className="logo-sm">SM</div>
        SwiftMigrate
        <span className="version-tag">v1.0</span>
      </div>

      <div className="topbar-center">
        {['overview', 'classify', 'logs', 'report'].map((t) => {
          const label =
            t === 'overview'
              ? 'Overview'
              : t === 'classify'
              ? 'File Classification'
              : t === 'logs'
              ? 'Logs'
              : 'Report';

          return (
            <button
              key={t}
              className={`tab-btn ${tab === t ? "active" : ""}`}
              onClick={() => setTab(t)}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div className="topbar-right">
        {/* <div className="status-pill running">
          <span className="pulse"></span> Converting
        </div> */}
        <button className="btn-sm-outline" onClick={() => handleNew()}>
          + New
        </button>
      </div>
    </div>
  );
}