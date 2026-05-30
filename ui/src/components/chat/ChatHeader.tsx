import type { AppStep } from "../../lib/userMessages";
import type { BackendHealthStatus } from "../../services/health";
import { ConnectionStatus } from "../common/ConnectionStatus";
import { ProgressBar } from "../common/ProgressBar";
import { StepIndicator } from "../common/StepIndicator";

type Props = {
  frameworkName?: string;
  serviceName?: string;
  sessionId: string | null;
  currentStep: AppStep;
  progress: { current: number; total: number };
  completed: boolean;
  connectionStatus: BackendHealthStatus;
  onNewChat: () => void;
  onRetryHealth: () => void;
  signedIn?: boolean;
  onSignOut?: () => void;
  onClearProfile?: () => void;
  onOpenWorkspace?: () => void;
};

export function ChatHeader({
  frameworkName,
  serviceName,
  sessionId,
  currentStep,
  progress,
  completed,
  connectionStatus,
  onNewChat,
  onRetryHealth,
  signedIn = false,
  onSignOut,
  onClearProfile,
  onOpenWorkspace,
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
          {serviceName ? (
            <p className="chat-header-sub">Assessing {serviceName}</p>
          ) : frameworkName ? (
            <p className="chat-header-sub">Using {frameworkName}</p>
          ) : null}
        </div>
        <div className="chat-header-actions">
          <ConnectionStatus
            status={connectionStatus}
            sessionActive={Boolean(sessionId)}
            onRetry={onRetryHealth}
          />
          {signedIn && onOpenWorkspace && (
            <button type="button" className="btn-ghost" onClick={onOpenWorkspace}>
              Workspace
            </button>
          )}
          {signedIn && onClearProfile && (
            <button type="button" className="btn-ghost" onClick={onClearProfile}>
              Change role
            </button>
          )}
          {signedIn && onSignOut && (
            <button type="button" className="btn-ghost" onClick={onSignOut}>
              Sign out
            </button>
          )}
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
