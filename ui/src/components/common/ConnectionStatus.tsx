import type { BackendHealthStatus } from "../../services/health";

type Props = {
  status: BackendHealthStatus;
  sessionActive?: boolean;
  onRetry?: () => void;
};

export function ConnectionStatus({ status, sessionActive = false, onRetry }: Props) {
  if (status === "checking") {
    return (
      <span className="connection-status checking" role="status">
        Checking connection…
      </span>
    );
  }
  if (status === "ready") {
    return (
      <span className="connection-status online" role="status">
        {sessionActive ? "Chat connected" : "Ready to chat"}
      </span>
    );
  }
  if (status === "warming" && !sessionActive) {
    return (
      <span className="connection-status warming" role="status">
        Some background services are still starting. You can begin chatting; the
        first reply may take a little longer.
        {onRetry && (
          <button type="button" className="link-btn" onClick={onRetry}>
            Check again
          </button>
        )}
      </span>
    );
  }
  return (
    <span className="connection-status offline" role="status">
      Cannot reach the API — services may still be starting, or the blueprint
      deploy may need to finish syncing.
      {onRetry && (
        <button type="button" className="link-btn" onClick={onRetry}>
          Check again
        </button>
      )}
    </span>
  );
}
