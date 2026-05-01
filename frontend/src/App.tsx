import { BrowserRouter, Routes, Route } from "react-router-dom";
import Welcome from "./routes/Welcome";
import Upload from "./routes/Upload";
import AppLayout from "./routes/Applaylout";
import { AppProvider } from "./context/AppContext";
import { LogProvider } from "./context/LogContext";
import "./services/socket"; // Initialize socket connection early

export default function App() {
  return (
    <AppProvider>
      <LogProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Welcome />} />
            <Route path="/upload" element={<Upload />} />
            <Route path="/app" element={<AppLayout />} />
          </Routes>
        </BrowserRouter>
      </LogProvider>
    </AppProvider>
  );
}
