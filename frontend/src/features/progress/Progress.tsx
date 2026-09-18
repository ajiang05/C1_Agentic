import { useState } from "react";
import { Icon } from "../../components/Icon";
import {
  Badge,
  EmptyCourse,
  Meter,
  Modal,
  SectionTitle,
} from "../../components/Shared";
import { SourceDrawer } from "../../components/SourceDrawer";
import { useStudy, percent } from "../../lib/store";
import { sampleSource } from "../../lib/demo";
export function Progress() {
  const { state, go, openLesson, refresh, busy } = useStudy();
  const [modal, setModal] = useState<"method" | "history" | null>(null);
  const [source, setSource] = useState(false);
  if (!state.progress)
    return <EmptyCourse title="Your understanding has room to grow." />;
  const progress = state.progress;
  const review = progress.concepts.find((c) =>
    progress.recommended_reviews.includes(c.concept_id),
  );
  const latest = state.history[0];
  const exportReport = () => {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            exported_at: new Date().toISOString(),
            mode: state.mode,
            progress,
            preferences: state.preferences,
            attempts: state.history,
            review_notes: state.flags,
          },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = "edaptify-progress.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(href), 1000);
  };
  return (
    <div className="page wide-page progress-page">
      <div className="breadcrumb">
        {progress.course_name}
        <span>·</span>
        <Badge tone="neutral">Your knowledge overview</Badge>
      </div>
      <section className="panel progress-hero">
        <div>
          <p className="eyebrow">
            <Icon name="brain" size={16} />
            MAKING YOUR LEARNING VISIBLE
          </p>
          <h1>Your Knowledge & Learning Model</h1>
          <p>
            A clear, gentle view of what you know, what you’re practicing,
            <br className="desktop-break" /> and where your curiosity can take
            you next.
          </p>
        </div>
        <div className="hero-stat">
          <div>
            <span className="round-icon">
              <Icon name="chart" />
            </span>
            <span>
              <small>OVERALL UNDERSTANDING</small>
              <strong>{percent(progress.overall_mastery)}</strong>
            </span>
          </div>
          <div>
            <span className="round-icon">
              <Icon name="clock" />
            </span>
            <span>
              <small>YOUR STUDY PACE</small>
              <strong>Always untimed</strong>
            </span>
          </div>
        </div>
      </section>
      <div className="progress-columns">
        <section className="panel mastery-panel">
          <SectionTitle
            icon="chart"
            aside={<Badge>{progress.concepts.length} concepts</Badge>}
          >
            Concept Mastery Breakdown
          </SectionTitle>
          <p className="small muted">
            Built gradually through practice. These are estimates, not grades.
          </p>
          <div className="mastery-list">
            {progress.concepts.map((c) => (
              <article className="mastery-row" key={c.concept_id}>
                <div className="mastery-title">
                  <strong>{c.concept_name}</strong>
                  <span>
                    {c.attempts
                      ? `${percent(c.mastery_score)} mastery`
                      : "Not yet explored"}
                  </span>
                </div>
                <Meter
                  value={c.attempts ? c.mastery_score : 0}
                  label={c.concept_name}
                  tone={c.mastery_score < 0.6 && c.attempts ? "warm" : "sage"}
                />
                <div className="mastery-meta">
                  <span>
                    {c.attempts
                      ? `${c.correct_attempts} correct · ${c.attempts} attempts`
                      : "A new concept waiting for you"}
                  </span>
                  <Badge
                    tone={c.status === "needs_review" ? "sand" : "neutral"}
                  >
                    {
                      {
                        mastered: "A strong foundation",
                        in_progress: "Active focus",
                        needs_review: "Room to revisit",
                        locked: "Coming up",
                        available: "Ready to explore",
                      }[c.status]
                    }
                  </Badge>
                </div>
              </article>
            ))}
          </div>
          <div className="mastery-footnote">
            <span>
              <Icon name="info" size={15} />
              Progress grows with practice, not pressure.
            </span>
            <button className="text-button" onClick={() => setModal("method")}>
              How is this calculated?
            </button>
          </div>
        </section>
        <aside className="progress-sidebar">
          <section className="panel insight-panel">
            <SectionTitle icon="brain">A little perspective</SectionTitle>
            <blockquote>
              {latest
                ? latest.evaluation.feedback
                : "Your journey is taking shape. Revisit the concepts that feel less familiar, and let your stronger foundations support the next step."}
              {latest && (
                <p className="small">
                  <strong>Next step:</strong> {latest.next_action.reason}
                </p>
              )}
            </blockquote>
            <div className="evidence-note">
              <Icon name="shield" size={16} />
              <span>
                {state.mode === "sample"
                  ? "Sample course · graph algorithms"
                  : "Grounded in your course sources"}
              </span>
            </div>
            <button className="text-button" onClick={() => setSource(true)}>
              Look at the course context <Icon name="arrow" size={16} />
            </button>
          </section>
          <div className="callout">
            <Icon name="leaf" size={28} />
            <div>
              <strong>Nothing to race against.</strong>
              <p>Untimed sessions. Room for pauses. Learning on your terms.</p>
            </div>
          </div>
        </aside>
      </div>
      <section className="panel learning-model">
        <SectionTitle
          icon="settings"
          aside={
            <Badge tone="neutral">Your preferences, always adjustable</Badge>
          }
        >
          Your “How You Learn” Model
        </SectionTitle>
        <p className="small muted">
          The starting preferences you’ve shared with your tutor.
        </p>
        <div className="model-grid">
          <article>
            <p className="eyebrow">LEARNING APPROACH</p>
            <h3>
              {state.preferences.prefers_visuals
                ? "Visual explanations"
                : state.preferences.example_first
                  ? "Worked examples first"
                  : "Gentle explanations"}
            </h3>
            <Icon
              name={state.preferences.prefers_visuals ? "tree" : "book"}
              size={30}
            />
            <p>A familiar starting point for a new idea.</p>
          </article>
          <article>
            <p className="eyebrow">EXPLANATION DEPTH</p>
            <h3>
              {
                {
                  short: "Concise & direct",
                  moderate: "Moderate with context",
                  detailed: "Complete breakdowns",
                }[state.preferences.explanation_length]
              }
            </h3>
            <Icon name="layers" size={30} />
            <p>Enough detail to connect the dots at your pace.</p>
          </article>
          <article>
            <p className="eyebrow">SESSION RHYTHM</p>
            <h3>Room for your attention</h3>
            <div className="model-number">
              {state.preferences.preferred_session_length}
              <small> minutes</small>
            </div>
            <p>A preference, never a countdown.</p>
          </article>
          <article>
            <p className="eyebrow">WHEN YOU’RE STUCK</p>
            <h3>
              {state.preferences.hint_before_solution
                ? "A gentle hint first"
                : "A complete explanation"}
            </h3>
            <Icon name="bulb" size={30} />
            <p>Support you can ask for whenever you need it.</p>
          </article>
        </div>
        <div className="model-footer">
          <span>
            <Icon name="refresh" size={16} />
            You can recalibrate your starting point anytime.
          </span>
          <button className="text-button" onClick={() => setModal("history")}>
            View learning history <Icon name="arrow" size={16} />
          </button>
        </div>
      </section>
      <section className="panel review-queue">
        <div>
          <SectionTitle icon="clock">Your next return</SectionTitle>
          {review ? (
            <button
              className="review-queue-item"
              disabled={!!busy}
              onClick={() => void openLesson(review.concept_id)}
            >
              <span className="round-icon sand">
                <Icon name="refresh" />
              </span>
              <span>
                <strong>{review.concept_name}</strong>
                <small>A gentle refresh · whenever you’re ready</small>
              </span>
              <Icon name="arrow" />
            </button>
          ) : (
            <p>
              No review waiting right now. Continue your journey when it feels
              right.
            </p>
          )}
          <p className="small muted">
            Your recent activity is remembered, so you can pick up where you
            left off.
          </p>
        </div>
        <div className="review-actions">
          <button className="button primary" onClick={() => go("journey")}>
            Resume journey <Icon name="arrow" />
          </button>
          <button className="button light" onClick={() => go("preferences")}>
            <Icon name="settings" size={16} />
            Adjust sensory & preferences
          </button>
          <button className="button secondary" onClick={exportReport}>
            <Icon name="download" size={16} />
            Export progress report
          </button>
        </div>
      </section>
      <div className="memory-status">
        <span>
          <Icon name="save" size={17} />
          {state.mode === "sample"
            ? "Sample progress saved on this device"
            : "Your recent learning is kept in this workspace"}
        </span>
        <button
          className="text-button"
          disabled={!!busy}
          onClick={() => void refresh()}
        >
          <Icon name="refresh" size={15} />
          Refresh progress
        </button>
      </div>
      {modal && (
        <Modal
          title={
            modal === "method"
              ? "Understanding your mastery estimate"
              : "Your learning history"
          }
          onClose={() => setModal(null)}
        >
          {modal === "method" ? (
            <>
              <p>
                Mastery is an estimate based on your practice, not a test score
                or a fixed judgment of your ability.
              </p>
              <p>
                {state.mode === "sample"
                  ? "This sample starts with illustrative scores. Correct sample answers add 12 percentage points; incorrect answers subtract 12, within 5–100%."
                  : "Scores and attempt counts come from the learning backend. The evaluator updates its estimate after each answer."}
              </p>
              <p>
                Concepts with no attempts are shown as “Not yet explored.”
                Preferences are your stated choices; this screen does not infer
                a learning style from them.
              </p>
            </>
          ) : state.history.length ? (
            <ol className="history-list">
              {state.history.map((h) => (
                <li key={h.attempt.id}>
                  <strong>{h.attempt.question_prompt}</strong>
                  <p>Your answer: {h.attempt.student_answer}</p>
                  <Badge tone={h.evaluation.correct ? "sage" : "sand"}>
                    {h.evaluation.correct
                      ? "Understanding strengthened"
                      : "A chance to revisit"}
                  </Badge>
                  <p>{h.evaluation.feedback}</p>
                  <small>
                    {new Date(h.attempt.created_at).toLocaleString()}
                  </small>
                </li>
              ))}
            </ol>
          ) : (
            <p>
              Your first practice answer will appear here. The sample’s starting
              scores are illustrative and have no recorded history.
            </p>
          )}
        </Modal>
      )}
      {source && (
        <SourceDrawer
          sources={
            latest?.evaluation.source_references ||
            (state.mode === "sample" ? [sampleSource] : [])
          }
          onClose={() => setSource(false)}
        />
      )}
    </div>
  );
}
