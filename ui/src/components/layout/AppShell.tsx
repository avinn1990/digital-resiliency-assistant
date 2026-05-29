import { getCurrentStep } from "../../lib/userMessages";
import { useChatSession } from "../../hooks/useChatSession";
import { AssessmentPanel } from "../assessment/AssessmentPanel";
import { ChatHeader } from "../chat/ChatHeader";
import { ChatWorkspace } from "../chat/ChatWorkspace";
import { StatusAnnouncer } from "../common/StatusAnnouncer";
import { WelcomePanel } from "../setup/WelcomePanel";
import { useLocation, useNavigate } from "react-router-dom";
import { clearProfile, isSignedIn, signOut } from "../../auth/accountActions";

export function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const signedIn = isSignedIn();
  const serviceIds = (() => {
    const raw = new URLSearchParams(location.search).get("services") ?? "";
    return raw
      .split(",")
      .map((s) => decodeURIComponent(s).trim())
      .filter(Boolean);
  })();
  const chat = useChatSession({ serviceIds });
  const currentStep = getCurrentStep(chat.sessionId, !!chat.assessment);

  const statusMessage = chat.loading
    ? "Loading, please wait."
    : chat.assessing
      ? "Running your assessment."
      : chat.error
        ? chat.error
        : chat.assessment
          ? `Assessment complete. Overall score ${chat.assessment.overall_score} out of 100.`
          : "";

  return (
    <div className="app-shell">
      <ChatHeader
        frameworkName={chat.selectedFramework?.name}
        sessionId={chat.sessionId}
        currentStep={currentStep}
        progress={chat.progress}
        completed={chat.completed}
        connectionStatus={chat.connectionStatus}
        onNewChat={chat.resetSession}
        onRetryHealth={chat.refreshHealth}
        signedIn={signedIn}
        onSignOut={() => {
          signOut();
          navigate("/", { replace: true });
        }}
        onClearProfile={() => {
          void clearProfile().then(() => {
            navigate("/onboarding", { replace: true });
          });
        }}
        onOpenWorkspace={() => navigate("/dashboard")}
      />

      <StatusAnnouncer message={statusMessage} />

      <main id="main-content" className="app-main" tabIndex={-1}>
        {!chat.sessionId ? (
          <WelcomePanel
            frameworks={chat.frameworks}
            selectedFrameworkId={chat.selectedFrameworkId}
            onFrameworkChange={chat.setSelectedFrameworkId}
            onStart={chat.beginSession}
            loading={chat.loading}
            frameworksLoading={chat.frameworksLoading}
            backendHealth={chat.connectionStatus}
            onRetryHealth={chat.refreshHealth}
            error={chat.error}
          />
        ) : (
          <div className="app-main-split">
            <ChatWorkspace
              messages={chat.messages}
              loading={chat.loading}
              completed={chat.completed}
              onSend={chat.submitUserMessage}
              onRunAssessment={chat.executeAssessment}
              assessmentLoading={chat.assessing}
            />
            {chat.assessment && (
              <AssessmentPanel
                result={chat.assessment}
                onDismiss={chat.clearAssessment}
              />
            )}
          </div>
        )}
        {chat.sessionId && chat.error && (
          <div className="error-banner floating" role="alert">
            <strong>Something went wrong.</strong> {chat.error}
          </div>
        )}
      </main>
    </div>
  );
}
