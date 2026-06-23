import type { AssessmentFocus } from "../../services/types";
import { formatDisplayLabel } from "../../lib/displayText";

type Props = {
  current: number;
  total: number;
  completed?: boolean;
  assessmentFocus?: AssessmentFocus | null;
};

export function ProgressBar({
  current,
  total,
  completed,
  assessmentFocus,
}: Props) {
  const pct = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;
  const capabilityLabel = assessmentFocus
    ? formatDisplayLabel(assessmentFocus.capability_name)
    : "";
  const rubricLabel = assessmentFocus?.evaluation_focus
    ? formatDisplayLabel(assessmentFocus.evaluation_focus)
    : "";
  const ariaLabel = assessmentFocus
    ? `Assessing ${capabilityLabel}${
        rubricLabel ? `, rubric ${rubricLabel}` : ""
      }`
    : `Progress ${current} of ${total}`;

  return (
    <div className="progress-bar-wrap" aria-label={ariaLabel}>
      <div className="progress-bar-meta">
        {assessmentFocus ? (
          <div className="progress-focus-lines">
            <span>
              <strong>Capability:</strong> {capabilityLabel}
            </span>
            {rubricLabel && (
              <span>
                <strong>Rubric:</strong> {rubricLabel}
              </span>
            )}
          </div>
        ) : (
          <span>Assessment in Progress</span>
        )}
        {completed && <span className="progress-ready">Ready for Results</span>}
      </div>
      <div className="progress-bar-track">
        <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
