type Props = {
  current: number;
  total: number;
  completed?: boolean;
};

export function ProgressBar({ current, total, completed }: Props) {
  const pct = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;
  return (
    <div className="progress-bar-wrap" aria-label={`Progress ${current} of ${total}`}>
      <div className="progress-bar-meta">
        <span>
          Question {Math.min(current + 1, total || 1)} of {total || "—"}
        </span>
        {completed && <span className="progress-ready">Ready for results</span>}
      </div>
      <div className="progress-bar-track">
        <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
