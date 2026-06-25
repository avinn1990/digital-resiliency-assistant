type Props = {
  message: string;
  onDismiss?: () => void;
};

export function EngagementBanner({ message, onDismiss }: Props) {
  return (
    <div className="engagement-banner" role="status">
      <p>{message}</p>
      {onDismiss && (
        <button
          type="button"
          className="btn-ghost engagement-banner-dismiss"
          onClick={onDismiss}
          aria-label="Dismiss message"
        >
          Dismiss
        </button>
      )}
    </div>
  );
}
