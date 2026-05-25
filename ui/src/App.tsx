import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  AssessmentResult,
  ChatMessage,
  FrameworkSummary,
  listFrameworks,
  runAssessment,
  sendMessage,
  startSession,
} from "./api";

export default function App() {
  const [frameworks, setFrameworks] = useState<FrameworkSummary[]>([]);
  const [selectedFramework, setSelectedFramework] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [completed, setCompleted] = useState(false);
  const [assessment, setAssessment] = useState<AssessmentResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listFrameworks()
      .then((items) => {
        setFrameworks(items);
        if (items.length > 0) {
          setSelectedFramework(items[0].id);
        }
      })
      .catch((err) => setError(String(err)));
  }, []);

  const beginSession = useCallback(async () => {
    if (!selectedFramework) return;
    setLoading(true);
    setError(null);
    setAssessment(null);
    try {
      const result = await startSession(selectedFramework);
      setSessionId(result.session_id);
      setMessages([{ role: "assistant", content: result.reply }]);
      setProgress(result.progress);
      setCompleted(false);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, [selectedFramework]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!sessionId || !input.trim() || loading) return;
    const text = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setLoading(true);
    setError(null);
    try {
      const result = await sendMessage(sessionId, text);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: result.reply },
      ]);
      setProgress(result.progress);
      setCompleted(result.completed);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  const onAssess = async () => {
    if (!sessionId) return;
    setLoading(true);
    setError(null);
    try {
      const result = await runAssessment(sessionId);
      setAssessment(result);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <header>
        <h1>Digital Resiliency Assistant</h1>
        <p>
          Answer guided questions; your responses are extracted and assessed
          against your framework.
        </p>
      </header>

      {!sessionId && (
        <section className="setup">
          <label htmlFor="framework">Assessment framework</label>
          <select
            id="framework"
            value={selectedFramework}
            onChange={(e) => setSelectedFramework(e.target.value)}
          >
            {frameworks.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name} (v{f.version})
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={beginSession}
            disabled={loading || !selectedFramework}
          >
            Start assessment conversation
          </button>
          {error && <p className="error">{error}</p>}
        </section>
      )}

      {sessionId && (
        <>
          <p className="progress">
            Progress: {progress.current} / {progress.total}
            {completed ? " — ready to assess" : ""}
          </p>
          <section className="chat">
            <div className="messages">
              {messages.map((msg, index) => (
                <div key={index} className={`message ${msg.role}`}>
                  {msg.content}
                </div>
              ))}
            </div>
            <form className="composer" onSubmit={onSubmit}>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your answer..."
                disabled={loading}
              />
              <button type="submit" disabled={loading || !input.trim()}>
                Send
              </button>
            </form>
          </section>
          <div className="actions">
            <button
              type="button"
              className="secondary"
              onClick={onAssess}
              disabled={loading}
            >
              Run assessment
            </button>
          </div>
          {error && <p className="error">{error}</p>}
        </>
      )}

      {assessment && (
        <section className="assessment-panel">
          <h2>Assessment results</h2>
          <p>
            <span className="score-badge">{assessment.overall_score}</span> / 100
            — {assessment.maturity_label}
          </p>
          <p>{assessment.summary}</p>
          {assessment.control_results.map((control) => (
            <div key={control.control_id} className="control-result">
              <strong>{control.control_id}</strong>{" "}
              <span className={`status ${control.status}`}>{control.status}</span>
              <div>Score: {control.score}</div>
              <div>{control.evidence}</div>
              {control.recommendations.length > 0 && (
                <ul>
                  {control.recommendations.map((rec, i) => (
                    <li key={i}>{rec}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
