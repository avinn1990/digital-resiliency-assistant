import type { EvaluationServiceSummary } from "../../assessmentFlow/types";
import { serviceDisplayName } from "../../assessmentFlow/roles";
import type { BackendHealthStatus } from "../../services/health";
import { canReachBackend } from "../../services/health";
import { ConnectionStatus } from "../common/ConnectionStatus";
import { ContextHelp } from "../common/ContextHelp";

type Props = {
  serviceIds: string[];
  services: EvaluationServiceSummary[];
  servicesLoading: boolean;
  onStart: () => void;
  loading: boolean;
  backendHealth: BackendHealthStatus;
  onRetryHealth: () => void;
  error: string | null;
};

export function WelcomePanel({
  serviceIds,
  services,
  servicesLoading,
  onStart,
  loading,
  backendHealth,
  onRetryHealth,
  error,
}: Props) {
  const selectedServices = serviceIds
    .map((id) => services.find((service) => service.service_id === id))
    .filter((service): service is EvaluationServiceSummary => Boolean(service));

  const canStart =
    !loading &&
    serviceIds.length > 0 &&
    canReachBackend(backendHealth) &&
    !servicesLoading;

  return (
    <section className="welcome-panel" aria-labelledby="welcome-title">
      <h2 id="welcome-title">Ready to Start Your Assessment</h2>
      <ContextHelp>
        These are the services you selected. Click below when you are ready to
        begin the chat assessment.
      </ContextHelp>

      <ConnectionStatus status={backendHealth} onRetry={onRetryHealth} />

      {servicesLoading ? (
        <p className="context-help">Loading services…</p>
      ) : serviceIds.length === 0 ? (
        <div className="empty-state-inline">
          <p>
            <strong>No services selected.</strong> Go back to your workspace and
            choose services before starting chat.
          </p>
        </div>
      ) : selectedServices.length === 0 ? (
        <div className="af-onboarding-service-list">
          {serviceIds.map((id) => (
            <div key={id} className="af-onboarding-service">
              <div className="af-onboarding-service-title">
                <span>{id}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="af-onboarding-service-list">
          {selectedServices.map((service) => (
            <div key={service.service_id} className="af-onboarding-service">
              <div className="af-onboarding-service-title">
                <span>{serviceDisplayName(service)}</span>
                {service.version ? (
                  <span className="af-pill">v{service.version}</span>
                ) : null}
              </div>
              {service.description && (
                <div className="af-onboarding-service-desc">{service.description}</div>
              )}
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        className="btn-primary btn-large"
        onClick={onStart}
        disabled={!canStart}
        aria-describedby="start-help"
      >
        {loading ? "Starting your chat…" : "Start Assessment Chat"}
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
    </section>
  );
}
