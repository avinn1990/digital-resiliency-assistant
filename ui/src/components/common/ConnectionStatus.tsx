type Props = {
  online: boolean | null;
  onRetry?: () => void;
};

export function ConnectionStatus({ online, onRetry }: Props) {
  if (online === null) {
    return <span className="connection-status checking">Checking API…</span>;
  }
  if (online) {
    return <span className="connection-status online">Agent online</span>;
  }
  return (
    <span className="connection-status offline">
      Agent offline
      {onRetry && (
        <button type="button" className="link-btn" onClick={onRetry}>
          Retry
        </button>
      )}
    </span>
  );
}
