import { ChangeEvent, FormEvent, useId, useRef, useState } from "react";
import { ContextHelp } from "../common/ContextHelp";

type Props = {
  onSend: (text: string) => void;
  onUploadFiles?: (files: File[]) => void;
  disabled?: boolean;
  uploading?: boolean;
  placeholder?: string;
};

export function ChatComposer({
  onSend,
  onUploadFiles,
  disabled,
  uploading = false,
  placeholder = "Type your answer here…",
}: Props) {
  const [input, setInput] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const hintId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (disabled || uploading) return;
    if (selectedFiles.length > 0 && onUploadFiles) {
      onUploadFiles(selectedFiles);
      setSelectedFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
    if (!input.trim()) return;
    onSend(input);
    setInput("");
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;
    setSelectedFiles((prev) => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    if (selectedFiles.length <= 1 && fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="chat-composer-wrap">
      {selectedFiles.length > 0 && (
        <div className="chat-attachment-chips" aria-label="Files ready to upload">
          {selectedFiles.map((file, index) => (
            <span key={`${file.name}-${index}`} className="chat-attachment-chip">
              {file.name}
              <button
                type="button"
                className="btn-ghost chat-attachment-remove"
                onClick={() => removeFile(index)}
                aria-label={`Remove ${file.name}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      <form className="chat-composer" onSubmit={handleSubmit} aria-label="Send a message">
        <label className="sr-only" htmlFor="chat-input">
          Your message to the agent
        </label>
        {onUploadFiles && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              className="sr-only"
              id="chat-file-input"
              multiple
              accept=".pdf,.docx,.xlsx,.png,.jpg,.jpeg,.txt,application/pdf,image/png,image/jpeg,text/plain"
              onChange={handleFileChange}
              disabled={disabled || uploading}
            />
            <button
              type="button"
              className="btn-secondary chat-attach-btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || uploading}
              aria-label="Attach files"
            >
              {uploading ? "Uploading…" : "Attach"}
            </button>
          </>
        )}
        <textarea
          id="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={placeholder}
          disabled={disabled || uploading}
          rows={2}
          aria-describedby={hintId}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
        />
        <button
          type="submit"
          className="btn-primary"
          disabled={disabled || uploading || (!input.trim() && selectedFiles.length === 0)}
        >
          Send
        </button>
      </form>
      <ContextHelp id={hintId}>
        Press Enter to send. Shift+Enter for a new line. Attach PDF, DOCX, XLSX, PNG, JPG, or TXT files.
      </ContextHelp>
    </div>
  );
}
