import type { AssessmentResult } from "../../services/types";

const STATUS_LABELS: Record<string, string> = {
  met: "On track",
  partial: "Needs work",
  gap: "Gap found",
  unknown: "Not enough info",
};

type Props = {
  result: AssessmentResult;
  onDismiss?: () => void;
};

export function AssessmentPanel({ result, onDismiss }: Props) {
  return (
    <aside
      className="assessment-panel"
      aria-labelledby="assessment-title"
      role="region"
    >
      <div className="assessment-panel-header">
        <div>
          <p className="success-eyebrow" role="status">
            Assessment complete
          </p>
          <h2 id="assessment-title">Your Results</h2>
        </div>
        {onDismiss && (
          <button
            type="button"
            className="btn-ghost"
            onClick={onDismiss}
            aria-label="Hide results panel"
          >
            Hide
          </button>
        )}
      </div>

      <div className="assessment-score-card">
        <p className="score-label">Overall Score</p>
        <div className="score-row">
          <span className="score-value">{result.overall_score}</span>
          <span className="score-max">out of 100</span>
        </div>
        <p className="score-maturity">
          Maturity level: <strong>{result.maturity_label}</strong>
        </p>
      </div>

      <p className="assessment-summary">{result.summary}</p>

      <h3 className="controls-heading">By Control Area</h3>
      <ul className="control-results">
        {result.control_results.map((control) => (
          <li key={control.control_id} className="control-card">
            <div className="control-card-head">
              <strong>{control.control_id}</strong>
              <span className={`status-pill ${control.status}`}>
                {STATUS_LABELS[control.status] ?? control.status}
              </span>
            </div>
            <p className="control-score">Score: {control.score} / 100</p>
            {control.evidence && (
              <p className="control-evidence">
                <span className="control-field-label">What we heard:</span>{" "}
                {control.evidence}
              </p>
            )}
            {control.recommendations.length > 0 && (
              <>
                <p className="control-field-label">Suggested Next Steps</p>
                <ul className="control-recommendations">
                  {control.recommendations.map((rec, i) => (
                    <li key={i}>{rec}</li>
                  ))}
                </ul>
              </>
            )}
          </li>
        ))}
      </ul>
    </aside>
  );
}
