import { ConnectionStatus } from "../common/ConnectionStatus";
import { ProgressBar } from "../common/ProgressBar";

type Props = {
  frameworkName?: string;
  sessionId: string | null;
  progress: { current: number; total: number };
  completed: boolean;
  backendOnline: boolean | null;
  onNewChat: () => void;
  onRetryHealth: () => void;
};

export function ChatHeader({
  frameworkName,
  sessionId,
  progress,
  completed,
  backendOnline,
  onNewChat,
  onRetryHealth,
}: Props) {
  return (
    <header className="chat-header">
      <div className="chat-header-top">
        <div>
          <h1>Digital Resiliency Assistant</h1>
          <p className="chat-header-sub">
            {frameworkName
              ? `Framework: ${frameworkName}`
              : "Chat with your assessment agent"}
          </p>
        </div>
        <div className="chat-header-actions">
          <ConnectionStatus online={backendOnline} onRetry={onRetryHealth} />
          {sessionId && (
            <button type="button" className="btn-ghost" onClick={onNewChat}>
              New chat
            </button>
          )}
        </div>
      </div>
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
