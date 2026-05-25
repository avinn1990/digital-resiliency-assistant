import { AssessmentPanel } from "../assessment/AssessmentPanel";
import { ChatHeader } from "../chat/ChatHeader";
import { ChatWorkspace } from "../chat/ChatWorkspace";
import { WelcomePanel } from "../setup/WelcomePanel";
import { useChatSession } from "../../hooks/useChatSession";

export function AppShell() {
  const chat = useChatSession();

  return (
    <div className="app-shell">
      <ChatHeader
        frameworkName={chat.selectedFramework?.name}
        sessionId={chat.sessionId}
        progress={chat.progress}
        completed={chat.completed}
        backendOnline={chat.backendOnline}
        onNewChat={chat.resetSession}
        onRetryHealth={chat.refreshHealth}
      />

      <main className="app-main">
        {!chat.sessionId ? (
          <WelcomePanel
            frameworks={chat.frameworks}
            selectedFrameworkId={chat.selectedFrameworkId}
            onFrameworkChange={chat.setSelectedFrameworkId}
            onStart={chat.beginSession}
            loading={chat.loading}
            backendOnline={chat.backendOnline}
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
          <p className="error-banner floating">{chat.error}</p>
        )}
      </main>
    </div>
  );
}
