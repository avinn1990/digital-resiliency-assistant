import type { ChatMessage } from "../../services/types";
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
    <section className="chat-workspace">
      <MessageList messages={messages} loading={loading} />
      <div className="chat-workspace-footer">
        {completed && (
          <div className="chat-hint">
            All questions answered. You can keep chatting or run the assessment.
          </div>
        )}
        <ChatComposer
          onSend={onSend}
          disabled={loading || assessmentLoading}
          placeholder={
            completed
              ? "Optional: add more detail for the agent…"
              : "Type your answer and press Enter…"
          }
        />
        <div className="chat-toolbar">
          <button
            type="button"
            className="btn-secondary"
            onClick={onRunAssessment}
            disabled={loading || assessmentLoading}
          >
            {assessmentLoading ? "Running assessment…" : "Run assessment"}
          </button>
        </div>
      </div>
    </section>
  );
}
