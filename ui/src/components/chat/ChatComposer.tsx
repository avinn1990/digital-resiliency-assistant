import { FormEvent, useId, useState } from "react";
import { ContextHelp } from "../common/ContextHelp";

type Props = {
  onSend: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
};

export function ChatComposer({
  onSend,
  disabled,
  placeholder = "Type your answer here…",
}: Props) {
  const [input, setInput] = useState("");
  const hintId = useId();

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!input.trim() || disabled) return;
    onSend(input);
    setInput("");
  };

  return (
    <div className="chat-composer-wrap">
      <form className="chat-composer" onSubmit={handleSubmit} aria-label="Send a message">
        <label className="sr-only" htmlFor="chat-input">
          Your message to the agent
        </label>
        <textarea
          id="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
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
          disabled={disabled || !input.trim()}
        >
          Send
        </button>
      </form>
      <ContextHelp id={hintId}>
        Press Enter to send. Shift+Enter for a new line.
      </ContextHelp>
    </div>
  );
}
