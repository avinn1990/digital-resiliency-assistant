type Props = {
  online: boolean | null;
  onRetry?: () => void;
};

export function ConnectionStatus({ online, onRetry }: Props) {
  if (online === null) {
    return (
      <span className="connection-status checking" role="status">
        Checking connection…
      </span>
    );
  }
  if (online) {
    return (
      <span className="connection-status online" role="status">
        Ready to chat
      </span>
    );
  }
  return (
    <span className="connection-status offline" role="status">
      Services are waking up or unreachable — check the API URL and try again
      {onRetry && (
        <button type="button" className="link-btn" onClick={onRetry}>
          Check again
        </button>
      )}
    </span>
  );
}
