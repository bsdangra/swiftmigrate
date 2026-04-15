import React, { useState } from "react";

type Props = {
  onFileRead: (content: string) => void;
};

const FileUpload: React.FC<Props> = ({ onFileRead }) => {
  const [fileName, setFileName] = useState<string>("");

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);

    const reader = new FileReader();

    reader.onload = (event) => {
      const content = event.target?.result as string;
      onFileRead(content);
    };

    reader.readAsText(file);
  };

  const handleClear = () => {
    setFileName("");
    onFileRead("");
  };

  return (
    <div style={{ marginBottom: 20 }}>
      <input type="file" accept=".java" onChange={handleFile} />

      {fileName && (
        <div style={{ marginTop: 10 }}>
          <p>📄 {fileName}</p>
          <button onClick={handleClear}>Clear</button>
        </div>
      )}
    </div>
  );
};

export default FileUpload;