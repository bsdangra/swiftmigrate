import { useMemo, useState } from "react";
import { useLog } from "../context/LogContext";

type Log = {
  time: string;
  level: "info" | "warn" | "error" | "success";
  message: string;
};

export default function Logs() {
  const { events } = useLog();
  const [filter, setFilter] = useState<string>("ALL");

  const logs: Log[] = events.map((event) => {
    const level = mapStatusToLevel(event.category);

    return {
      time: new Date(event.timestamp).toLocaleTimeString(),
      level,
      message: event.message || event.type,
    };
  });

  // 🔥 FILTER LOGIC
  const filteredLogs = useMemo(() => {
    if (filter === "ALL") return logs;

    if (filter === "AI") {
      return logs.filter((l) =>
        l.message.toLowerCase().includes("ai")
      );
    }

    return logs.filter(
      (l) => l.level.toUpperCase() === filter
    );
  }, [logs, filter]);

  const rendered = useMemo(
    () =>
      filteredLogs.map((l, i) => (
        <div key={i} className={`log-line ${l.level}`}>
          <span className="log-time">{l.time}</span>
          <span className="log-level">
            {l.level.toUpperCase()}
          </span>
          <span className="log-msg">{l.message}</span>
        </div>
      )),
    [filteredLogs]
  );

  return (
    <div className="tab-panel active">
      {/* 🔥 TOOLBAR (MATCHES HTML) */}
      <div className="log-toolbar">
        <div className="log-filters">
          {["ALL", "INFO", "SUCCESS", "WARN", "ERROR",].map((f) => (
            <span
              key={f}
              className={`filter-chip ${
                filter === f ? "on" : ""
              }`}
              onClick={() => setFilter(f)}
            >
              {f}
            </span>
          ))}
        </div>

        <div style={{ display: "flex", gap: 6 }}>
          <span
            style={{
              fontSize: 11,
              color: "var(--text3)",
              fontFamily: "var(--mono)",
              padding: "4px 0",
            }}
          >
            Live Run · {logs.length} events
          </span>

          <button
            className="btn-sm-outline"
            style={{ fontSize: 11, padding: "4px 10px" }}
            onClick={() =>
              navigator.clipboard.writeText(
                logs.map((l) => `${l.time} ${l.message}`).join("\n")
              )
            }
          >
            Copy
          </button>
        </div>
      </div>

      {/* LOGS */}
      <div className="logs-wrap">{rendered}</div>
    </div>
  );
}

// 🔧 Helper
function mapStatusToLevel(
  status: string
): "info" | "warn" | "error" | "success" {
  const s = status.toLowerCase();

  if (s.includes("error") || s.includes("fail")) return "error";
  if (s.includes("warn")) return "warn";
  if (s.includes("success") || s.includes("done")) return "success";

  return "info";
}