import { useEffect, useState } from "react";
import { Icon } from "../../components/Icon";
import { Badge, EmptyCourse, Modal } from "../../components/Shared";
import { SourceDrawer } from "../../components/SourceDrawer";
import { useStudy, percent } from "../../lib/store";
function Graph({
  step = 1,
  answer,
  feedback,
}: {
  step?: number;
  answer: string;
  feedback: boolean;
}) {
  const coords: Record<string, [number, number]> = {
    A: [170, 40],
    B: [100, 108],
    C: [240, 108],
    D: [55, 181],
    E: [145, 181],
  };
  return (
    <div className="graph-canvas">
      <svg
        viewBox="0 0 340 235"
        role="img"
        aria-label="Graph: A connects to B and C. B connects to D and E. Depth-first search visits A, B, D, E, C."
      >
        <g className="graph-lines">
          {[
            ["A", "B"],
            ["A", "C"],
            ["B", "D"],
            ["B", "E"],
          ].map(([a, b]) => (
            <line
              key={a + b}
              x1={coords[a][0]}
              y1={coords[a][1]}
              x2={coords[b][0]}
              y2={coords[b][1]}
              className={
                (a === "A" && b === "B") || (b === "D" && step >= 2)
                  ? "visited"
                  : ""
              }
            />
          ))}
        </g>
        {Object.entries(coords).map(([id, [x, y]]) => (
          <g key={id}>
            <circle
              cx={x}
              cy={y}
              r={22}
              className={`graph-node ${id === "A" || (id === "B" && step >= 1) ? "visited" : ""} ${id === "D" && step >= 2 ? "active" : ""} ${feedback && answer === `Node ${id}` ? "chosen" : ""}`}
            />
            <text x={x} y={y + 5} textAnchor="middle">
              {id}
            </text>
          </g>
        ))}
        <text x="203" y="42" className="graph-annotation">
          Start
        </text>
        <text x="18" y="106" className="graph-annotation">
          {step < 2 ? "Current" : "Paused"}
        </text>
      </svg>
      <div className="graph-legend">
        <span>
          <i className="dot sage" />
          Visited path
        </span>
        <span>
          <i className="dot sand" />
          Your choice
        </span>
        <span>
          <i className="dot pale" />
          Next child
        </span>
      </div>
    </div>
  );
}
function Stack({
  step,
  setStep,
}: {
  step: number;
  setStep: (n: number) => void;
}) {
  const nodes = ["A", "B", "D"].slice(0, step + 1).reverse();
  return (
    <>
      <div className="stack-layout">
        <div className="stack-frames">
          <p className="small centered">↓ Top of call stack (active)</p>
          {nodes.map((n, i) => (
            <div className={`stack-frame ${i === 0 ? "active" : ""}`} key={n}>
              <span className="frame-number">{nodes.length - i}</span>
              <div>
                <strong>DFS( Node {n} )</strong>
                <small>
                  {i === 0
                    ? "Currently executing · active frame"
                    : "Paused · waiting for the next call"}
                </small>
              </div>
              <Badge tone="neutral">{i === 0 ? "Running" : "Paused"}</Badge>
            </div>
          ))}
        </div>
        <div className="stack-steps">
          {["Start at A", "Recurse to B", "Dive to D"].map((label, i) => (
            <button
              className={`stack-step ${step === i ? "selected" : ""}`}
              key={label}
              onClick={() => setStep(i)}
              aria-pressed={step === i}
            >
              <strong>
                Step {i + 1}: {label}
              </strong>
              <span>
                {
                  [
                    "The root call is placed on the stack. A finds B first.",
                    "A waits. B becomes the active call and checks its children.",
                    "B waits. D goes on top and is visited next.",
                  ][i]
                }
              </span>
            </button>
          ))}
        </div>
      </div>
      <div className="code-card">
        <p className="eyebrow">A SIMPLE RECURSIVE WALKTHROUGH</p>
        <pre>
          <code>
            {
              "def dfs(node):\n    visit(node)\n    for neighbor in node.neighbors:\n        if neighbor not in visited:\n            dfs(neighbor)  # Explore this branch first"
            }
          </code>
        </pre>
      </div>
    </>
  );
}
export function LessonPage() {
  const { state, patch, openLesson, submit, submitManual, go, busy } = useStudy();
  const [source, setSource] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [hint, setHint] = useState(false);
  const [step, setStep] = useState(1);
  const [paused, setPaused] = useState(false);
  const [grading, setGrading] = useState(false);
  const [evalForm, setEvalForm] = useState({ correct: true, feedback: "", misconception: "" });

  useEffect(() => {
    setHint(false);
    setStep(1);
    setConfirm(false);
    setGrading(false);
  }, [state.lesson?.id]);
  useEffect(() => {
    if (state.result && !state.result.evaluation.correct) setStep(2);
  }, [state.result]);
  if (!state.journey) return <EmptyCourse />;
  if (!state.lesson)
    return (
      <div className="empty-state panel">
        <Icon name="book" size={40} />
        <h1>A little space to focus.</h1>
        <p>
          Choose a concept from your journey, or start with your next
          recommended lesson.
        </p>
        <button
          className="button primary"
          disabled={!!busy}
          onClick={() => void openLesson()}
        >
          Begin lesson <Icon name="arrow" />
        </button>
      </div>
    );
  const lesson = state.lesson,
    result = state.result;
  const isGraph =
    state.mode === "sample" &&
    ["concept-2", "concept-5"].includes(lesson.concept_id);
  const sources = [
    ...lesson.source_references,
    ...lesson.question.source_references,
  ].filter(
    (s, i, a) =>
      a.findIndex(
        (x) => x.material_id === s.material_id && x.excerpt === s.excerpt,
      ) === i,
  );
  const wrong = result && !result.evaluation.correct;
  return (
    <div className="page wide-page lesson-page">
      <section className="lesson-header panel">
        <div>
          <p className="eyebrow">
            <Icon name="tree" size={15} />
            {state.journey.course_name} <span>·</span> YOUR FOCUS SPACE
          </p>
          <h1>{lesson.title}</h1>
        </div>
        <div className="lesson-stage">
          <span>{result ? "Reflect & reconnect" : "Explore & practice"}</span>
          <div
            className="segmented-progress"
            aria-label={result ? "Step 3 of 4" : "Step 2 of 4"}
          >
            {[0, 1, 2, 3].map((i) => (
              <i className={i < (result ? 3 : 2) ? "active" : ""} key={i} />
            ))}
          </div>
        </div>
        <button className="button ghost" onClick={() => setPaused(true)}>
          <Icon name="pause" size={17} />
          Take a pause
        </button>
      </section>
      <div className="lesson-columns">
        <div className="lesson-left">
          <section className="panel question-card">
            <div className="section-title">
              <Badge tone="neutral">
                {result ? "Your original question" : "A little practice"}
              </Badge>
              <span className="small muted">
                <Icon name="eye" size={15} />
                {isGraph ? "Static graph view" : "At your own pace"}
              </span>
            </div>
            <h2>{lesson.question.prompt}</h2>
            {isGraph && (
              <Graph
                step={wrong ? 2 : step}
                answer={state.answer}
                feedback={!!result}
              />
            )}
            <fieldset disabled={!!result || !!busy}>
              <legend>
                {result
                  ? "Your recorded response"
                  : "Choose what feels right. There’s no timer."}
              </legend>
              {lesson.question.options?.length ? (
                <div className="answer-options">
                  {lesson.question.options.map((option, i) => (
                    <label
                      key={option}
                      className={`answer-option ${state.answer === option ? "selected" : ""}`}
                    >
                      <input
                        type="radio"
                        name="answer"
                        value={option}
                        checked={state.answer === option}
                        onChange={() => patch({ answer: option })}
                      />
                      <span className="answer-letter">
                        {String.fromCharCode(65 + i)}
                      </span>
                      <span>{option}</span>
                      {state.answer === option && (
                        <Icon name="check" size={17} />
                      )}
                    </label>
                  ))}
                </div>
              ) : (
                <textarea
                  aria-label="Your answer"
                  rows={5}
                  value={state.answer}
                  placeholder="Put your thinking into words…"
                  onChange={(e) => patch({ answer: e.target.value })}
                />
              )}
            </fieldset>
            {!result && (
              <>
                <div className="question-actions">
                  <button
                    className="button ghost"
                    onClick={() => setHint((v) => !v)}
                    aria-expanded={hint}
                  >
                    <Icon name="bulb" size={17} />
                    {hint ? "Hide hint" : "A gentle hint"}
                  </button>
                  <button
                    className="button primary"
                    disabled={!state.answer.trim() || !!busy}
                    onClick={() => {
                      if (state.evaluatorMode) {
                        setGrading(true);
                        setEvalForm({ correct: true, feedback: "", misconception: "" });
                      } else {
                        setConfirm(true);
                      }
                    }}
                  >
                    {state.evaluatorMode ? "Grade Student Answer (Evaluator)" : "Check my answer"} <Icon name="arrow" size={17} />
                  </button>
                </div>
                {hint && (
                  <div className="hint-box" role="status">
                    <Icon name="bulb" />
                    <p>
                      {isGraph
                        ? "Stay on the current branch. Does B have a child you haven’t visited yet?"
                        : "Return to the explanation and source excerpt. Which part connects most directly to the question?"}
                    </p>
                  </div>
                )}
              </>
            )}
          </section>
          {result && (
            <section
              className={`panel feedback-card ${wrong ? "supportive" : "positive"}`}
              role="status"
            >
              <h2>
                <Icon name={wrong ? "heart" : "check"} />
                {wrong
                  ? "Not quite — and that’s completely okay."
                  : "A little more understanding, built."}
              </h2>
              <p>{result.evaluation.feedback}</p>
              {wrong && (
                <div className="diagnosis">
                  <p className="eyebrow">
                    <Icon name="brain" size={17} />A POSSIBLE STICKING POINT
                  </p>
                  <p>
                    {result.evaluation.identified_misconception ||
                      "This concept may benefit from another approach."}
                  </p>
                  <div className="feedback-mastery">
                    <span>Current concept estimate</span>
                    <strong>
                      {percent(result.evaluation.estimated_mastery)}
                    </strong>
                  </div>
                  <p className="small muted">
                    One answer is a clue, not a complete picture.
                  </p>
                </div>
              )}
              <p className="strategy-note">
                <Icon name="spark" size={17} />
                {result.next_action.reason}
              </p>
            </section>
          )}
          <div className="quiet-note">
            <Icon name="leaf" />
            <p>
              No penalties for pauses. Your response stays here while you take a
              breath.
            </p>
          </div>
        </div>
        <div className="lesson-right">
          <section className="panel teaching-card">
            <div className="section-title">
              <p className="eyebrow">
                {wrong && isGraph
                  ? "LET’S LOOK AT IT ANOTHER WAY"
                  : lesson.teaching_format.replaceAll("_", " ").toUpperCase()}
              </p>
              {isGraph && (
                <Badge tone="neutral">
                  <Icon name="layers" size={14} />
                  Last in, first out
                </Badge>
              )}
            </div>
            <h2>
              {isGraph
                ? "The Call Stack in Runtime Memory"
                : "A moment to understand"}
            </h2>
            <div className="reading-content">
              {lesson.teaching_content.split(/\n\s*\n/).map((text, i) => (
                <p key={i}>{text}</p>
              ))}
            </div>
            {isGraph && <Stack step={step} setStep={setStep} />}
          </section>
          {state.citations && (
            <section className="panel source-lesson">
              <div className="section-title">
                <h3>
                  <Icon name="shield" size={19} />
                  Connected to your course materials
                </h3>
                <small>
                  {sources.length} source{sources.length === 1 ? "" : "s"}
                </small>
              </div>
              {sources[0] ? (
                <blockquote>{sources[0].excerpt}</blockquote>
              ) : (
                <p>No source excerpt was returned for this lesson.</p>
              )}
              <div className="source-actions">
                <small>{sources[0]?.location}</small>
                <button
                  className="button secondary"
                  onClick={() => setSource(true)}
                >
                  <Icon name="book" size={16} />
                  View source
                </button>
                <button
                  className="button ghost"
                  onClick={() => setSource(true)}
                >
                  <Icon name="flag" size={16} />
                  Flag discrepancy
                </button>
              </div>
            </section>
          )}
          {result && (
            <section className="panel next-step-panel">
              <div className="section-title">
                <span className="small">
                  <Icon name="leaf" size={16} />A pace that works for you
                </span>
                <small>Choose your next step</small>
              </div>
              <div className="next-step-buttons">
                {wrong && (
                  <button
                    className="button secondary"
                    onClick={() => {
                      patch({ result: null });
                      setHint(true);
                    }}
                  >
                    Retry with a hint <Icon name="bulb" size={16} />
                  </button>
                )}
                {isGraph && (
                  <button
                    className="button secondary"
                    onClick={() => {
                      setStep((step + 1) % 3);
                      document
                        .querySelector(".teaching-card")
                        ?.scrollIntoView({ block: "center", behavior: "auto" });
                    }}
                  >
                    Step through the stack <Icon name="play" size={16} />
                  </button>
                )}
                <button
                  className="button primary"
                  disabled={!!busy}
                  onClick={() =>
                    void openLesson(
                      wrong
                        ? lesson.concept_id
                        : result.next_action.next_concept_id,
                      !!wrong && isGraph,
                    )
                  }
                >
                  {wrong ? "Try a follow-up question" : "Continue learning"}
                  <Icon name="arrow" size={17} />
                </button>
              </div>
              <button className="text-button" onClick={() => go("progress")}>
                See how your understanding is growing{" "}
                <Icon name="arrow" size={15} />
              </button>
            </section>
          )}
        </div>
      </div>
      {confirm && (
        <Modal
          title="Ready to reflect on your answer?"
          onClose={() => setConfirm(false)}
        >
          <p>
            Your answer: <strong>{state.answer}</strong>
          </p>
          <p>
            You can change your mind before submitting. Either way, we’ll work
            through the next step together.
          </p>
          <div className="button-row">
            <button
              className="button secondary"
              onClick={() => setConfirm(false)}
            >
              Keep thinking
            </button>
            <button
              className="button primary"
              onClick={() => {
                setConfirm(false);
                void submit();
              }}
            >
              Confirm answer <Icon name="check" />
            </button>
          </div>
        </Modal>
      )}
      {paused && (
        <Modal
          title="Take all the time you need."
          onClose={() => setPaused(false)}
        >
          <div className="pause-art">
            <Icon name="leaf" size={55} />
          </div>
          <p className="centered">
            Your place is kept on this device. Stretch, get some water, or
            simply take a breath. There’s no countdown.
          </p>
          <div className="button-row centered">
            <button
              className="button secondary"
              onClick={() => {
                setPaused(false);
                go("journey");
              }}
            >
              Back to my journey
            </button>
            <button className="button primary" onClick={() => setPaused(false)}>
              I’m ready to return
            </button>
          </div>
        </Modal>
      )}
      {source && (
        <SourceDrawer sources={sources} onClose={() => setSource(false)} />
      )}
      {grading && (
        <Modal title="Human Evaluator Mode" onClose={() => setGrading(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <strong>Student Answer:</strong>
              <p>{state.answer}</p>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold' }}>
              <input type="checkbox" checked={evalForm.correct} onChange={e => setEvalForm(f => ({ ...f, correct: e.target.checked }))} />
              Is this correct?
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <strong>Feedback for Student:</strong>
              <textarea rows={3} value={evalForm.feedback} onChange={e => setEvalForm(f => ({ ...f, feedback: e.target.value }))} placeholder="Provide constructive feedback..." />
            </label>
            {!evalForm.correct && (
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <strong>Identified Misconception (optional):</strong>
                <input value={evalForm.misconception} onChange={e => setEvalForm(f => ({ ...f, misconception: e.target.value }))} placeholder="e.g. Forgets base case in recursion" />
              </label>
            )}
            <div className="button-row">
              <button className="button secondary" onClick={() => setGrading(false)}>Cancel</button>
              <button className="button primary" disabled={!!busy} onClick={async () => {
                setGrading(false);
                await submitManual(evalForm.correct, evalForm.feedback, evalForm.misconception || null);
              }}>
                Submit Grade <Icon name="check" />
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
