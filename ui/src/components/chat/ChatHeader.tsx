import type { AppStep } from "../../lib/userMessages";
import type { BackendHealthStatus } from "../../services/health";
import { ConnectionStatus } from "../common/ConnectionStatus";
import { ProgressBar } from "../common/ProgressBar";
import { StepIndicator } from "../common/StepIndicator";

type Props = {
  frameworkName?: string;
  sessionId: string | null;
  currentStep: AppStep;
  progress: { current: number; total: number };
  completed: boolean;
  backendHealth: BackendHealthStatus;
  onNewChat: () => void;
  onRetryHealth: () => void;
};

export function ChatHeader({
  frameworkName,
  sessionId,
  currentStep,
  progress,
  completed,
  backendHealth,
  onNewChat,
  onRetryHealth,
}: Props) {
  return (
    <header className="chat-header">
      <a href="#main-content" className="skip-link">
        Skip to chat
      </a>
      <div className="chat-header-top">
        <div>
          <p className="app-eyebrow">Digital Resiliency Assistant</p>
          <h1>
            {sessionId ? "Assessment chat" : "Get started"}
          </h1>
          {frameworkName && (
            <p className="chat-header-sub">Using {frameworkName}</p>
          )}
        </div>
        <div className="chat-header-actions">
          <ConnectionStatus status={backendHealth} onRetry={onRetryHealth} />
          {sessionId && (
            <button
              type="button"
              className="btn-ghost"
              onClick={onNewChat}
              aria-label="Start over with a new assessment"
            >
              Start over
            </button>
          )}
        </div>
      </div>

      <StepIndicator currentStep={currentStep} />

      {sessionId && (
        <ProgressBar
          current={progress.current}
          total={progress.total}
          completed={completed}
        />
      )}
    </header>
  );
}
