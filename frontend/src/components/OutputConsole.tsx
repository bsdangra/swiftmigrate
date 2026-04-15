import React from "react";

type Props = {
  output: string;
};

const OutputConsole: React.FC<Props> = ({ output }) => {
  const isSuccess = output?.toLowerCase().includes("passed");
  const isError =
    output?.toLowerCase().includes("error") ||
    output?.toLowerCase().includes("failed");

  return (
    <div
      style={{
        border: "1px solid #333",
        borderRadius: 8,
        overflow: "hidden",
        background: "#0d1117",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "8px 12px",
          background: "#161b22",
          color: "#fff",
          fontSize: 14,
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <span>Execution Console</span>
        <span>
          {isSuccess && "✅ Passed"}
          {isError && "❌ Failed"}
          {!isSuccess && !isError && "⏳ Waiting"}
        </span>
      </div>

      {/* Logs */}
      <pre
        style={{
          margin: 0,
          padding: 16,
          height: 220,
          overflow: "auto",
          fontSize: 12,
          lineHeight: 1.5,
          color: isError ? "#ff6b6b" : isSuccess ? "#0f0" : "#ccc",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {output || "Execution logs will appear here..."}
      </pre>
    </div>
  );
};

export default OutputConsole;