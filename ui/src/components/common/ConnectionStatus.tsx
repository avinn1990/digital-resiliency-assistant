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
      Agent unavailable — start the API first
      {onRetry && (
        <button type="button" className="link-btn" onClick={onRetry}>
          Check again
        </button>
      )}
    </span>
  );
}
