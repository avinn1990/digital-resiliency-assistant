import type { ChatMessage } from "../../services/types";
import { ContextHelp } from "../common/ContextHelp";
import { ChatComposer } from "./ChatComposer";
import { MessageList } from "./MessageList";

type Props = {
  messages: ChatMessage[];
  loading: boolean;
  completed: boolean;
  onSend: (text: string) => void;
  onRunAssessment: () => void;
  assessmentLoading: boolean;
};

export function ChatWorkspace({
  messages,
  loading,
  completed,
  onSend,
  onRunAssessment,
  assessmentLoading,
}: Props) {
  return (
    <section
      className="chat-workspace"
      aria-label="Chat with assessment agent"
    >
      <MessageList messages={messages} loading={loading} />
      <div className="chat-workspace-footer">
        {completed ? (
          <div className="chat-hint success" role="status">
            <strong>All set.</strong> Run your assessment below, or add more
            detail if something changed.
          </div>
        ) : (
          <ContextHelp>
            Answer the question above. The agent will ask the next one
            automatically.
          </ContextHelp>
        )}
        <ChatComposer
          onSend={onSend}
          disabled={loading || assessmentLoading}
          placeholder={
            completed
              ? "Add more detail (optional)…"
              : "Type your answer here…"
          }
        />
        <div className="chat-toolbar">
          <button
            type="button"
            className="btn-primary"
            onClick={onRunAssessment}
            disabled={loading || assessmentLoading}
          >
            {assessmentLoading ? "Building your report…" : "Get my assessment"}
          </button>
        </div>
      </div>
    </section>
  );
}
