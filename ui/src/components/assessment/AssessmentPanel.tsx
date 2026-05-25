import type { AssessmentResult } from "../../services/types";

type Props = {
  result: AssessmentResult;
  onDismiss?: () => void;
};

export function AssessmentPanel({ result, onDismiss }: Props) {
  return (
    <aside className="assessment-panel" aria-labelledby="assessment-title">
      <div className="assessment-panel-header">
        <h2 id="assessment-title">Assessment results</h2>
        {onDismiss && (
          <button type="button" className="btn-ghost" onClick={onDismiss}>
            Close
          </button>
        )}
      </div>
      <div className="assessment-score-card">
        <span className="score-value">{result.overall_score}</span>
        <span className="score-max">/ 100</span>
        <span className="score-maturity">{result.maturity_label}</span>
      </div>
      <p className="assessment-summary">{result.summary}</p>
      <ul className="control-results">
        {result.control_results.map((control) => (
          <li key={control.control_id} className="control-card">
            <div className="control-card-head">
              <strong>{control.control_id}</strong>
              <span className={`status-pill ${control.status}`}>
                {control.status}
              </span>
            </div>
            <p className="control-score">Score: {control.score}</p>
            <p className="control-evidence">{control.evidence}</p>
            {control.recommendations.length > 0 && (
              <ul className="control-recommendations">
                {control.recommendations.map((rec, i) => (
                  <li key={i}>{rec}</li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </aside>
  );
}
