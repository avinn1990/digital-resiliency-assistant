import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { AssessmentFlowApp } from "./assessmentFlow/AssessmentFlowApp";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AssessmentFlowApp />} />
        <Route path="/chat" element={<AppShell />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
