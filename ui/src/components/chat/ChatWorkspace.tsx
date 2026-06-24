import type { ChatMessage } from "../../services/types";
import { ContextHelp } from "../common/ContextHelp";
import { ChatComposer } from "./ChatComposer";
import { MessageList } from "./MessageList";

type Props = {
  messages: ChatMessage[];
  loading: boolean;
  completed: boolean;
  onSend: (text: string) => void;
  onUploadFiles?: (files: File[]) => void;
  uploading?: boolean;
  onFinishAssessment: () => void;
  finishing?: boolean;
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
  onUploadFiles,
  uploading = false,
  onFinishAssessment,
  finishing = false,
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
            <strong>All set.</strong> Finish your assessment below to review any
            documents still needed, or add more detail if something changed.
          </div>
        ) : (
          <ContextHelp>
            Answer the question above. The agent will ask the next one
            automatically.
          </ContextHelp>
        )}
        <ChatComposer
          onSend={onSend}
          onUploadFiles={onUploadFiles}
          uploading={uploading}
          disabled={loading || finishing}
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
              disabled={!canSave || saving || loading || finishing || uploading}
            >
              {saving ? "Saving…" : "Save Progress"}
            </button>
          )}
          <button
            type="button"
            className="btn-primary"
            onClick={onFinishAssessment}
            disabled={loading || finishing || uploading}
          >
            {finishing ? "Finishing…" : "Finish Assessment"}
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
