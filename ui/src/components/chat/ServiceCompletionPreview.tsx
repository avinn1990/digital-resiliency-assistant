import type { AssessmentResult } from "../../services/types";
import { AssessmentPanel } from "../assessment/AssessmentPanel";

type Props = {
  serviceName: string;
  capabilitiesAssessed: number;
  pendingArtifactCount: number;
  servicesRemaining: number;
  assessmentResult: AssessmentResult | null;
  assessing: boolean;
  onContinue: () => void;
};

export function ServiceCompletionPreview({
  serviceName,
  capabilitiesAssessed,
  pendingArtifactCount,
  servicesRemaining,
  assessmentResult,
  assessing,
  onContinue,
}: Props) {
  const hasMore = servicesRemaining > 0;

  return (
    <section className="service-completion-preview" aria-labelledby="service-complete-title">
      <div className="service-completion-header">
        <p className="success-eyebrow" role="status">
          Service complete
        </p>
        <h2 id="service-complete-title">{serviceName}</h2>
        <p className="service-completion-summary">
          You assessed {capabilitiesAssessed} capability area
          {capabilitiesAssessed === 1 ? "" : "s"}.
          {pendingArtifactCount > 0
            ? ` ${pendingArtifactCount} document${
                pendingArtifactCount === 1 ? "" : "s"
              } can be uploaded later.`
            : ""}
          {hasMore
            ? " Full maturity scores unlock when you finish all selected services."
            : " You're ready to finish and review your assessment."}
        </p>
      </div>

      {assessing && (
        <p className="context-help" aria-busy="true">
          Preparing a preview of your results…
        </p>
      )}

      {assessmentResult && (
        <div className="service-completion-results">
          <AssessmentPanel result={assessmentResult} />
        </div>
      )}

      <div className="service-completion-actions">
        <button
          type="button"
          className="btn-primary"
          onClick={onContinue}
          disabled={assessing}
        >
          {hasMore ? "Continue to next service" : "Continue"}
        </button>
      </div>
    </section>
  );
}
