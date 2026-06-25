import type { AssessmentFocus, PillarProgress, TopicProgress } from "../../services/types";
import { formatDisplayLabel } from "../../lib/displayText";
import {
  formatCapabilityProgress,
  formatPillarProgress,
  formatTimeEstimate,
  formatTopicProgress,
} from "../../lib/engagementUtils";

type Props = {
  current: number;
  total: number;
  completed?: boolean;
  assessmentFocus?: AssessmentFocus | null;
  timeEstimate?: string;
  topicProgress?: TopicProgress | null;
  pillarProgress?: PillarProgress | null;
};

export function ProgressBar({
  current,
  total,
  completed,
  assessmentFocus,
  timeEstimate,
  topicProgress,
  pillarProgress,
}: Props) {
  const pct = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;
  const capabilityLabel = assessmentFocus
    ? formatDisplayLabel(assessmentFocus.capability_name)
    : "";
  const rubricLabel = assessmentFocus?.evaluation_focus
    ? formatDisplayLabel(assessmentFocus.evaluation_focus)
    : "";
  const capabilityProgressLabel = formatCapabilityProgress(current, total);
  const topicLabel = formatTopicProgress(topicProgress);
  const pillarLabel = formatPillarProgress(pillarProgress);
  const timeLabel =
    timeEstimate ?? formatTimeEstimate(Math.max(total - current, 0));

  const ariaLabel = assessmentFocus
    ? `Assessing ${capabilityLabel}${
        rubricLabel ? `, rubric ${rubricLabel}` : ""
      }, ${capabilityProgressLabel}`
    : `${capabilityProgressLabel}, ${timeLabel}`;

  return (
    <div className="progress-bar-wrap" aria-label={ariaLabel}>
      <div className="progress-bar-stats">
        <span className="progress-stat-primary">{capabilityProgressLabel}</span>
        <span className="progress-stat-secondary">{timeLabel}</span>
      </div>
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
            {topicLabel && <span className="progress-topic-line">{topicLabel}</span>}
            {pillarLabel && <span className="progress-pillar-line">{pillarLabel}</span>}
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
