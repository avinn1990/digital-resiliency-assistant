import type { BackendHealthStatus } from "../../services/health";
import { canReachBackend } from "../../services/health";
import type { FrameworkSummary } from "../../services/types";
import { ConnectionStatus } from "../common/ConnectionStatus";
import { ContextHelp } from "../common/ContextHelp";
import { WelcomeSkeleton } from "../common/LoadingSkeleton";

type Props = {
  frameworks: FrameworkSummary[];
  selectedFrameworkId: string;
  onFrameworkChange: (id: string) => void;
  onStart: () => void;
  loading: boolean;
  frameworksLoading: boolean;
  backendHealth: BackendHealthStatus;
  onRetryHealth: () => void;
  error: string | null;
};

export function WelcomePanel({
  frameworks,
  selectedFrameworkId,
  onFrameworkChange,
  onStart,
  loading,
  frameworksLoading,
  backendHealth,
  onRetryHealth,
  error,
}: Props) {
  const selected = frameworks.find((f) => f.id === selectedFrameworkId);
  const canStart =
    !loading &&
    !!selectedFrameworkId &&
    canReachBackend(backendHealth) &&
    frameworks.length > 0;

  if (frameworksLoading) {
    return (
      <section className="welcome-panel" aria-busy="true" aria-label="Loading">
        <WelcomeSkeleton />
      </section>
    );
  }

  return (
    <section className="welcome-panel" aria-labelledby="welcome-title">
      <h2 id="welcome-title">Get your resiliency score</h2>
      <ContextHelp>
        Pick a framework, answer a few questions in chat, then get a clear
        report — usually under five minutes.
      </ContextHelp>

      <ConnectionStatus status={backendHealth} onRetry={onRetryHealth} />

      {frameworks.length === 0 ? (
        <div className="empty-state-inline">
          <p>
            <strong>No frameworks loaded yet.</strong> Add one via the API or
            use the example framework in the framework service.
          </p>
        </div>
      ) : (
        <>
          <label className="field-label" htmlFor="framework-select">
            Which framework should we use?
          </label>
          <select
            id="framework-select"
            value={selectedFrameworkId}
            onChange={(e) => onFrameworkChange(e.target.value)}
          >
            {!selectedFrameworkId && (
              <option value="" disabled>
                Select a framework
              </option>
            )}
            {frameworks.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name} (version {f.version})
              </option>
            ))}
          </select>

          {selected?.description && (
            <p className="framework-description">{selected.description}</p>
          )}
        </>
      )}

      <button
        type="button"
        className="btn-primary btn-large"
        onClick={onStart}
        disabled={!canStart}
        aria-describedby="start-help"
      >
        {loading ? "Starting your chat…" : "Start assessment chat"}
      </button>
      <ContextHelp id="start-help">
        {backendHealth === "offline"
          ? "The API must be reachable before you can start. If this persists, sync the Render blueprint."
          : backendHealth === "warming"
            ? "Services may still be waking on Render — try starting; retries are built in."
            : "You'll answer one question at a time in chat."}
      </ContextHelp>

      {error && (
        <div className="error-banner" role="alert">
          <strong>Something went wrong.</strong> {error}
        </div>
      )}

      <details className="how-it-works">
        <summary>How this works</summary>
        <ol>
          <li>Choose the assessment framework that matches your organization.</li>
          <li>Reply to the agent's questions in your own words.</li>
          <li>Run the assessment to see scores and what to improve.</li>
        </ol>
      </details>
    </section>
  );
}
