import { useMemo, useState } from "react";
import type { AuthUser } from "../../auth/types";
import { servicesForRole } from "../roles";
import type { EvaluationServiceSummary } from "../types";

type Props = {
  authUser: AuthUser;
  roles: string[];
  services: EvaluationServiceSummary[];
  servicesLoading: boolean;
  servicesError: string | null;
  onComplete: (profile: { company: string; role: string }) => void;
};

export function OnboardingPage({
  authUser,
  roles,
  services,
  servicesLoading,
  servicesError,
  onComplete,
}: Props) {
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");

  const matchedServices = useMemo(
    () => servicesForRole(role, services),
    [role, services]
  );

  const canContinue = useMemo(() => {
    return (
      company.trim().length >= 2 &&
      role.trim().length >= 2 &&
      !servicesLoading &&
      matchedServices.length > 0
    );
  }, [company, role, servicesLoading, matchedServices.length]);

  return (
    <div className="af-page">
      <div className="af-page-inner af-onboarding">
        <div className="af-topbar">
          <div>
            <div className="af-kicker">Welcome</div>
            <h1 className="af-h1">Set up your workspace</h1>
            <p className="context-help">
              Hi {authUser.name.split(" ")[0]}, tell us where you work and what you do.
              We’ll show the assessment services mapped to your role.
            </p>
          </div>
        </div>

        {servicesError && (
          <div className="error-banner" role="alert">
            <strong>Service catalog error.</strong> {servicesError}
          </div>
        )}

        <div className="af-grid-2">
          <div className="af-card af-card-page">
            <label className="field-label" htmlFor="onboarding-company">
              Company
            </label>
            <input
              id="onboarding-company"
              className="af-input"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="e.g. Example Corp"
              autoComplete="organization"
            />

            <label className="field-label" htmlFor="onboarding-role">
              Role
            </label>
            <select
              id="onboarding-role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="af-input"
              disabled={servicesLoading || roles.length === 0}
            >
              <option value="" disabled>
                {servicesLoading ? "Loading roles…" : "Select your role"}
              </option>
              {roles.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <button
              type="button"
              className="btn-primary btn-large"
              onClick={() =>
                onComplete({
                  company: company.trim(),
                  role: role.trim(),
                })
              }
              disabled={!canContinue}
            >
              Continue
            </button>

            {role && matchedServices.length === 0 && !servicesLoading && (
              <p className="context-help">
                No services are mapped to this role yet. Choose a different role or
                contact your administrator.
              </p>
            )}
          </div>

          <div className="af-card af-card-page">
            <h2 className="af-h2">Services for your role</h2>
            {!role ? (
              <p className="context-help">
                Select a role to see the assessment services associated with it.
              </p>
            ) : servicesLoading ? (
              <p className="context-help">Loading services…</p>
            ) : matchedServices.length === 0 ? (
              <p className="context-help">
                No services are currently mapped to <strong>{role}</strong>.
              </p>
            ) : (
              <>
                <p className="context-help">
                  These services are mapped to <strong>{role}</strong> in our target
                  audience list.
                </p>
                <div className="af-onboarding-service-list">
                  {matchedServices.map((service) => (
                    <div key={service.service_id} className="af-onboarding-service">
                      <div className="af-onboarding-service-title">
                        {service.service_name ?? service.service_id}
                        {service.version ? (
                          <span className="af-pill">v{service.version}</span>
                        ) : null}
                      </div>
                      {service.description && (
                        <div className="af-onboarding-service-desc">
                          {service.description}
                        </div>
                      )}
                      <div className="af-onboarding-service-meta">
                        <span className="af-mono">{service.service_id}</span>
                        <span className="af-pill ok">Mapped to your role</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
