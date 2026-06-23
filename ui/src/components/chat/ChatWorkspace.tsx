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
  canSave?: boolean;
  saving?: boolean;
  saveMessage?: string | null;
  onSave?: () => void;
};

export function ChatWorkspace({
  messages,
  loading,
  completed,
  onSend,
  onRunAssessment,
  assessmentLoading,
  canSave = false,
  saving = false,
  saveMessage = null,
  onSave,
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
          {onSave && (
            <button
              type="button"
              className="btn-secondary"
              onClick={onSave}
              disabled={!canSave || saving || loading || assessmentLoading}
            >
              {saving ? "Saving…" : "Save Progress"}
            </button>
          )}
          <button
            type="button"
            className="btn-primary"
            onClick={onRunAssessment}
            disabled={loading || assessmentLoading}
          >
            {assessmentLoading ? "Building your report…" : "Get My Assessment"}
          </button>
        </div>
        {saveMessage && (
          <p className="chat-save-status" role="status">
            {saveMessage}
          </p>
        )}
      </div>
    </section>
  );
}
