import { STEPS, type AppStep } from "../../lib/userMessages";

type Props = {
  currentStep: AppStep;
};

export function StepIndicator({ currentStep }: Props) {
  return (
    <nav className="step-indicator" aria-label="Assessment progress">
      <ol>
        {STEPS.map((step) => {
          const state =
            step.id < currentStep
              ? "done"
              : step.id === currentStep
                ? "current"
                : "upcoming";
          return (
            <li key={step.id} className={`step-item ${state}`}>
              <span className="step-marker" aria-hidden>
                {step.id < currentStep ? "✓" : step.id}
              </span>
              <span className="step-label">
                <span className="step-label-full">{step.label}</span>
                <span className="step-label-short">{step.short}</span>
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
