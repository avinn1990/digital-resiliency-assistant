import type { FrameworkSummary } from "../../services/types";
import { ConnectionStatus } from "../common/ConnectionStatus";

type Props = {
  frameworks: FrameworkSummary[];
  selectedFrameworkId: string;
  onFrameworkChange: (id: string) => void;
  onStart: () => void;
  loading: boolean;
  backendOnline: boolean | null;
  onRetryHealth: () => void;
  error: string | null;
};

export function WelcomePanel({
  frameworks,
  selectedFrameworkId,
  onFrameworkChange,
  onStart,
  loading,
  backendOnline,
  onRetryHealth,
  error,
}: Props) {
  const selected = frameworks.find((f) => f.id === selectedFrameworkId);

  return (
    <section className="welcome-panel">
      <div className="welcome-icon" aria-hidden>
        <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="24" cy="24" r="22" stroke="currentColor" strokeWidth="2" />
          <path
            d="M16 28c2-4 6-6 8-6s6 2 8 6M18 20h.01M30 20h.01"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <h2>Start a resiliency assessment</h2>
      <p>
        Chat with the backend agent to answer framework questions. Your responses
        are extracted automatically for scoring.
      </p>

      <ConnectionStatus online={backendOnline} onRetry={onRetryHealth} />

      <label className="field-label" htmlFor="framework-select">
        Assessment framework
      </label>
      <select
        id="framework-select"
        value={selectedFrameworkId}
        onChange={(e) => onFrameworkChange(e.target.value)}
        disabled={frameworks.length === 0 || loading}
      >
        {frameworks.length === 0 && <option value="">No frameworks available</option>}
        {frameworks.map((f) => (
          <option key={f.id} value={f.id}>
            {f.name} (v{f.version})
          </option>
        ))}
      </select>

      {selected?.description && (
        <p className="framework-description">{selected.description}</p>
      )}

      <button
        type="button"
        className="btn-primary btn-large"
        onClick={onStart}
        disabled={loading || !selectedFrameworkId || backendOnline === false}
      >
        {loading ? "Connecting…" : "Start chat with agent"}
      </button>

      {error && <p className="error-banner">{error}</p>}
    </section>
  );
}
