import React, { useState } from "react";

type Props = {
  onProcessComplete: (data: any) => void; // final analyzed data
};

const FileUpload: React.FC<Props> = ({ onProcessComplete }) => {
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles) return;

    setFiles(Array.from(selectedFiles));
  };

  const handleUpload = async () => {
    if (files.length === 0) return;

    const formData = new FormData();
    files.forEach((file) => {
      formData.append("files", file);
    });

    try {
      setLoading(true);

      const res = await fetch("http://localhost:3000/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      console.log("🚀 Full Response:", data);

      // ✅ Final output to parent
      onProcessComplete(data);

    } catch (err) {
      console.error("❌ Process failed", err);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setFiles([]);
    onProcessComplete(null);
  };

  return (
    <div style={{ marginBottom: 20 }}>
      <input
        type="file"
        multiple
        accept=".java,.zip"
        onChange={handleFileChange}
      />

      {files.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <p>📂 Selected Files:</p>
          <ul>
            {files.map((file, index) => (
              <li key={index}>📄 {file.name}</li>
            ))}
          </ul>

          <button onClick={handleUpload} disabled={loading}>
            {loading ? "Processing..." : "Upload & Analyze"}
          </button>

          <button onClick={handleClear} style={{ marginLeft: 10 }}>
            Clear
          </button>
        </div>
      )}
    </div>
  );
};

export default FileUpload;