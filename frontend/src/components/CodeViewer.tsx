import React from "react";

type Props = {
  code: string;
  title?: string;
  onDownload?: () => void; 
};

const CodeViewer: React.FC<Props> = ({ code, title, onDownload }) => {
  const handleCopy = () => {
    navigator.clipboard.writeText(code || "");
  };

  return (
    <div
      style={{
        border: "1px solid #333",
        borderRadius: 8,
        
        background: "#1e1e1e",
        width: "100%",
        minHeight: 350,
        height: "100%", 
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "#2a2a2a",
          padding: "8px 12px",
          color: "#fff",
          fontSize: 14,
        }}
      >
        <span>{title || "Code"}</span>
        <div style={{ display: "flex", gap: 8 }}>
          {onDownload && (
            <button
              onClick={onDownload}
              title="Download Playwright file"
              style={{
                background: "#444",
                color: "#fff",
                border: "none",
                padding: "4px 8px",
                cursor: "pointer",
                borderRadius: 4,
              }}
            >
              ⬇️
            </button>
          )}

          <button
            onClick={handleCopy}
            style={{
              background: "#444",
              color: "#fff",
              border: "none",
              padding: "4px 8px",
              cursor: "pointer",
              borderRadius: 4,
            }}
          >
            Copy
          </button>
        </div>
      </div>

      {/* Code */}
      <pre
        style={{
          margin: 0,
          padding: 16,
          flex: 1,
          overflowX: "auto",     // horizontal scroll
          overflowY: "auto",         // ✅ enables both scrolls
          color: "#0f0",
          fontSize: 13,
          textAlign: "left",
          whiteSpace: "pre",         // ✅ NO wrapping (important)
          fontFamily: "monospace",
        }}
      >
        {code || "No code available"}
      </pre>
    </div>
  );
};

export default CodeViewer;