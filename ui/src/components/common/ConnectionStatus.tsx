import type { BackendHealthStatus } from "../../services/health";

type Props = {
  status: BackendHealthStatus;
  onRetry?: () => void;
};

export function ConnectionStatus({ status, onRetry }: Props) {
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
        Ready to chat
      </span>
    );
  }
  if (status === "warming") {
    return (
      <span className="connection-status warming" role="status">
        Assessment services are starting — you can begin; the first message may
        take a moment.
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
      Cannot reach the API — check that dra-ui VITE_API_URL points to your public
      dra-backend URL (https://….onrender.com), then redeploy.
      {onRetry && (
        <button type="button" className="link-btn" onClick={onRetry}>
          Check again
        </button>
      )}
    </span>
  );
}
