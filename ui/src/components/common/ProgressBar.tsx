import type { AssessmentFocus } from "../../services/types";

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
  const ariaLabel = assessmentFocus
    ? `Assessing ${assessmentFocus.capability_name}${
        assessmentFocus.evaluation_focus
          ? `, rubric ${assessmentFocus.evaluation_focus}`
          : ""
      }`
    : `Progress ${current} of ${total}`;

  return (
    <div className="progress-bar-wrap" aria-label={ariaLabel}>
      <div className="progress-bar-meta">
        {assessmentFocus ? (
          <div className="progress-focus-lines">
            <span>
              <strong>Capability:</strong> {assessmentFocus.capability_name}
            </span>
            {assessmentFocus.evaluation_focus && (
              <span>
                <strong>Rubric:</strong> {assessmentFocus.evaluation_focus}
              </span>
            )}
          </div>
        ) : (
          <span>Assessment in progress</span>
        )}
        {completed && <span className="progress-ready">Ready for results</span>}
      </div>
      <div className="progress-bar-track">
        <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
