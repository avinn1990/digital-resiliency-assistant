import { useEffect, useMemo, useState } from "react";
import type { CanonicalRole } from "../types";
import { resolveRoleId, roleDisplayName } from "../roles";

type Props = {
  roles: CanonicalRole[];
  servicesLoading: boolean;
  servicesError: string | null;
  initialProfile?: {
    username?: string;
    fullName?: string;
    company?: string;
    role?: string;
  };
  onNext: (profile: {
    username: string;
    fullName: string;
    role: string;
    company: string;
  }) => void;
};

export function UserProfilePage({
  roles,
  servicesLoading,
  servicesError,
  initialProfile,
  onNext,
}: Props) {
  const [username, setUsername] = useState(initialProfile?.username ?? "");
  const [fullName, setFullName] = useState(initialProfile?.fullName ?? "");
  const [company, setCompany] = useState(initialProfile?.company ?? "");
  const [role, setRole] = useState(initialProfile?.role ?? "");

  useEffect(() => {
    if (!initialProfile?.role || roles.length === 0) return;
    const resolved = resolveRoleId(initialProfile.role, roles);
    if (resolved) setRole(resolved);
  }, [initialProfile?.role, roles]);

  const canContinue = useMemo(() => {
    return (
      username.trim().length >= 2 &&
      fullName.trim().length >= 2 &&
      company.trim().length >= 2 &&
      role.trim().length >= 2 &&
      !servicesLoading
    );
  }, [username, fullName, company, role, servicesLoading]);

  return (
    <div className="af-page">
      <div className="af-page-inner">
        <div className="af-topbar">
          <div>
            <div className="af-kicker">New Assessment</div>
            <h1 className="af-h1">Tell Us About You</h1>
          </div>
          <a className="af-link" href="/dashboard">
            Back
          </a>
        </div>

        {servicesError && (
          <div className="error-banner" role="alert">
            <strong>Service catalog error.</strong> {servicesError}
          </div>
        )}

        <div className="af-grid-2">
          <div className="af-card af-card-page">
            <label className="field-label" htmlFor="username">
              Username
            </label>
            <input
              id="username"
              className="af-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. jdoe"
              autoComplete="username"
            />

            <label className="field-label" htmlFor="fullName">
              Full name
            </label>
            <input
              id="fullName"
              className="af-input"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Jordan Doe"
              autoComplete="name"
            />

            <label className="field-label" htmlFor="company">
              Company
            </label>
            <input
              id="company"
              className="af-input"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="e.g. Example Corp"
              autoComplete="organization"
            />

            <label className="field-label" htmlFor="role">
              Role
            </label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="af-input"
              disabled={servicesLoading || roles.length === 0}
            >
              <option value="" disabled>
                {servicesLoading ? "Loading roles…" : "Select Your Role"}
              </option>
              {roles.map((item) => (
                <option key={item.role_id} value={item.role_id}>
                  {roleDisplayName(item.role_id, roles)}
                </option>
              ))}
              <option value="Other">Other</option>
            </select>

            <button
              type="button"
              className="btn-primary btn-large"
              onClick={() =>
                onNext({
                  username: username.trim(),
                  fullName: fullName.trim(),
                  company: company.trim(),
                  role: role.trim(),
                })
              }
              disabled={!canContinue}
            >
              Continue
            </button>
            <p className="context-help">
              Roles are normalized across services — one role can map to multiple
              assessment offerings.
            </p>
          </div>

          <div className="af-side-note">
            <h2>What Happens Next</h2>
            <ol className="af-steps">
              <li>We suggest services relevant to your role (pre-selected).</li>
              <li>You answer questions per service, with autosave.</li>
              <li>You review a summary and export your responses.</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}

