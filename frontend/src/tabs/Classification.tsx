import { useMemo, useState } from "react";
import { useApp } from "../context/AppContext";

export default function Classification() {
  const { classificationSummary } = useApp();

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  if (!classificationSummary) return null;

  // 🔥 flatten all files from response
  const allFiles = [
    ...(classificationSummary.classified.baseClasses || []),
    ...(classificationSummary.classified.pageObjects || []),
    ...(classificationSummary.classified.testFiles || []),
    ...(classificationSummary.classified.utils || []),
    ...(classificationSummary.classified.ignored || []),
  ];

  // 🧠 derive UI fields
  const processed = allFiles.map((f: any) => {
    return {
      name: f.fileName,
      type: f.type,

    }
    // const confidence = Math.round((f.confidence || 0) * 100);

    // let status = "Converted";
    // if (confidence < 60) status = "Flagged";
    // else if (confidence < 80) status = "Review";

    // const patternCount =
    //   (f.score?.test || 0) +
    //   (f.score?.page || 0) +
    //   (f.score?.base || 0) +
    //   (f.score?.util || 0);

    // return {
    //   name: f.fileName,
    //   type: f.finalType,
    //   confidence,
    //   status,
    //   patterns: patternCount,
    // };
  });

  // 🔍 filtering
  const filtered = useMemo(() => {
    return processed.filter((f) => {
      const matchSearch = f.name
        .toLowerCase()
        .includes(search.toLowerCase());

      const matchFilter =
        filter === "all" ||
        f.type === filter;
        //(filter === "issues" && f.status === "Flagged");

      return matchSearch && matchFilter;
    });
  }, [processed, search, filter]);

  // 🎨 helpers
  const getTypeClass = (type: string) => {
    if (type === "test") return "tag-test";
    if (type === "pageObject") return "tag-pom";
    if (type === "base") return "tag-base";
    return "tag-util";
  };

  return (
    <div className="tab-panel active">
      {/* 🔥 TOOLBAR */}
      <div className="fc-toolbar">
        <input
          className="search-input"
          placeholder="Search files…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <span
          className={`filter-chip ${filter === "all" ? "on" : ""}`}
          onClick={() => setFilter("all")}
        >
          All ({processed.length})
        </span>

        <span
          className={`filter-chip ${filter === "test" ? "on" : ""}`}
          onClick={() => setFilter("test")}
        >
          Tests
        </span>

        <span
          className={`filter-chip ${filter === "pageObject" ? "on" : ""}`}
          onClick={() => setFilter("pageObject")}
        >
          Page Objects
        </span>

        <span
          className={`filter-chip ${filter === "base" ? "on" : ""}`}
          onClick={() => setFilter("base")}
        >
          Base
        </span>

        <span
          className={`filter-chip ${filter === "utility" ? "on" : ""}`}
          onClick={() => setFilter("utility")}
        >
          Utils
        </span>

        {/* <span
          className={`filter-chip ${
            filter === "issues" ? "on" : ""
          }`}
          style={{ marginLeft: "auto", color: "var(--red)" }}
          onClick={() => setFilter("issues")}
        >
          ⚠ Issues
        </span> */}
      </div>

      {/* 🔥 TABLE */}
      <div
        style={{
          background: "var(--bg2)",
          border: "0.5px solid var(--border)",
          borderRadius: "8px",
          overflow: "hidden",
        }}
      >
        <table className="fc-table">
          <thead>
            <tr>
              <th>Filename</th>
              <th>Type</th>
              {/* <th>Status</th>
              <th>Patterns</th>
              <th>Confidence</th> */}
            </tr>
          </thead>

          <tbody>
            {filtered.map((f, i) => (
              <tr key={i}>
                <td className="fc-filename">{f.name}</td>

                <td>
                  <span className={`file-type-tag ${getTypeClass(f.type)}`}>
                    {f.type}
                  </span>
                </td>

                {/* <td>{getStatus(f.status)}</td>

                <td style={{ fontFamily: "var(--mono)" }}>
                  {f.patterns}
                </td>

                <td>
                  <div style={{ display: "flex", gap: 6 }}>
                    <div className="confidence-bar">
                      <div
                        className="conf-fill"
                        style={{
                          width: `${f.confidence}%`,
                          background: getConfidenceColor(f.confidence),
                        }}
                      />
                    </div>
                    <span
                      style={{
                        fontFamily: "var(--mono)",
                        fontSize: 11,
                        color: getConfidenceColor(f.confidence),
                      }}
                    >
                      {f.confidence}
                    </span>
                  </div>
                </td> */}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}