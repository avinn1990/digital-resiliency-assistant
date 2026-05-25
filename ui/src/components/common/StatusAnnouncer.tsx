type Props = {
  message: string;
};

/** Screen-reader live region for async updates (loading, errors, success). */
export function StatusAnnouncer({ message }: Props) {
  if (!message) return null;
  return (
    <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
      {message}
    </div>
  );
}
