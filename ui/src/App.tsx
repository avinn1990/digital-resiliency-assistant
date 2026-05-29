import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { AssessmentFlowApp } from "./assessmentFlow/AssessmentFlowApp";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/chat" element={<AppShell />} />
        {/* Assessment flow owns /, /dashboard, /onboarding, etc. */}
        <Route path="/*" element={<AssessmentFlowApp />} />
      </Routes>
    </BrowserRouter>
  );
}
