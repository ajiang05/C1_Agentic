import { useState } from "react";
import { Icon } from "../../components/Icon";
import {
  Badge,
  EmptyCourse,
  Meter,
  SectionTitle,
} from "../../components/Shared";
import { SourceDrawer } from "../../components/SourceDrawer";
import { useStudy, percent } from "../../lib/store";
import { sampleSource } from "../../lib/demo";
export function Journey() {
  const { state, patch, openLesson, go, busy } = useStudy();
  const [source, setSource] = useState(false);
  if (!state.journey) return <EmptyCourse />;
  const j = state.journey;
  const path = j.nodes.filter(
    (n) => state.mode !== "sample" || n.concept.id !== "concept-5",
  );
  const current =
    j.nodes.find((n) => n.concept.id === j.current_concept_id) ||
    j.nodes.find((n) => n.status !== "locked");
  const completed = path.filter((n) => n.status === "mastered").length;
  const review = state.progress?.concepts.find((c) =>
    state.progress?.recommended_reviews.includes(c.concept_id),
  );
  const dismissed = state.reviewDismissed === new Date().toDateString();
  const sources =
    state.lesson?.source_references ||
    (state.mode === "sample" ? [sampleSource] : []);
  return (
    <div className="page wide-page">
      <section className="journey-hero panel">
        <div>
          <div className="inline-meta">
            <Badge>
              {state.mode === "sample"
                ? "CS 311 · Graph Algorithms Unit"
                : j.course_name}
            </Badge>
            <span className="warm-text">Your personal learning path</span>
          </div>
          <h1>
            {state.mode === "sample"
              ? "Graph Traversal & Topological Search"
              : j.course_name}
          </h1>
          <p className="muted">
            <Icon name="save" size={17} />
            {completed} of {path.length} concepts explored <span>·</span> One
            step at a time
          </p>
        </div>
        <div className="hero-actions">
          <div className="calm-tag">
            <Icon name="leaf" />
            <span>
              <strong>Room to pause</strong>
              <small>Pick up right where you left off</small>
            </span>
          </div>
          <button
            className="button primary"
            disabled={!!busy}
            onClick={() => void openLesson(current?.concept.id)}
          >
            Resume learning <Icon name="arrow" />
          </button>
        </div>
      </section>
      <div className="journey-columns">
        <div>
          {review && !dismissed && (
            <section className="review-banner">
              <div className="review-icon">
                <Icon name="brain" size={27} />
              </div>
              <div>
                <p className="eyebrow warm-text">
                  A GENTLE REVIEW SUGGESTION{" "}
                  <Badge tone="sand">
                    {percent(review.mastery_score)} mastery
                  </Badge>
                </p>
                <h2>{review.concept_name}</h2>
                <p>
                  A little revisiting can help this concept feel more familiar.
                  A short, untimed refresh is here whenever you’re ready.
                </p>
              </div>
              <div>
                <button
                  className="button primary"
                  disabled={!!busy}
                  onClick={() => void openLesson(review.concept_id)}
                >
                  <Icon name="play" size={17} />
                  Start a refresh
                </button>
                <button
                  className="button ghost"
                  onClick={() =>
                    patch({ reviewDismissed: new Date().toDateString() })
                  }
                >
                  Dismiss for today
                </button>
              </div>
            </section>
          )}
          <section className="path-panel panel">
            <SectionTitle
              icon="tree"
              aside={<small>Small steps. Lasting understanding.</small>}
            >
              Your learning path
            </SectionTitle>
            <div className="path-spine">
              {path.map((n, i) => (
                <div
                  className={`path-step ${n.status} ${n.concept.id === current?.concept.id ? "current" : ""}`}
                  key={n.concept.id}
                >
                  <button
                    className="path-node"
                    disabled={n.status === "locked" || !!busy}
                    aria-label={`${n.concept.name}: ${n.status.replaceAll("_", " ")}`}
                    onClick={() => void openLesson(n.concept.id)}
                  >
                    <Icon
                      name={
                        n.status === "mastered"
                          ? "check"
                          : n.status === "locked"
                            ? "lock"
                            : "book"
                      }
                      size={n.status === "locked" ? 22 : 27}
                    />
                  </button>
                  <div className="path-label">
                    {n.concept.id === current?.concept.id && (
                      <p className="eyebrow">● YOUR CURRENT CONCEPT</p>
                    )}
                    <h3>
                      {i + 1}. {n.concept.name}
                    </h3>
                    <p>
                      {n.status === "locked"
                        ? "Build on the previous concept to unlock"
                        : n.status === "mastered"
                          ? `A strong foundation · ${percent(n.mastery_score)} mastery`
                          : n.mastery_score > 0
                            ? `${percent(n.mastery_score)} mastery · room to grow`
                            : "Ready when you are"}
                    </p>
                    {n.concept.id === current?.concept.id && (
                      <button
                        className="button primary compact"
                        disabled={!!busy}
                        onClick={() => void openLesson(n.concept.id)}
                      >
                        Continue learning <Icon name="arrow" size={15} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              <div className="path-step checkpoint">
                <div className="path-node">
                  <Icon name="trophy" size={27} />
                </div>
                <div className="path-label">
                  <h3>A moment to bring it together</h3>
                  <p>Revisit your understanding in the knowledge overview.</p>
                  <button
                    className="text-button"
                    onClick={() => go("progress")}
                  >
                    View your progress <Icon name="arrow" size={16} />
                  </button>
                </div>
              </div>
            </div>
            <div className="path-affirmation">
              <Icon name="heart" size={25} />
              <p>
                “Understanding grows with each return. You don’t need to get
                everything right the first time.”
              </p>
            </div>
          </section>
        </div>
        <aside className="journey-sidebar">
          <section className="next-card">
            <div className="section-title">
              <span className="eyebrow">YOUR NEXT SMALL STEP</span>
              <Badge>Untimed</Badge>
            </div>
            <h2>{current?.concept.name || "Explore your course"}</h2>
            <p>
              {current?.concept.description ||
                "Continue building your understanding, one concept at a time."}
            </p>
            <button
              className="button light"
              disabled={!!busy}
              onClick={() => void openLesson(current?.concept.id)}
            >
              Begin lesson session <Icon name="arrow" />
            </button>
          </section>
          <section className="panel">
            <SectionTitle icon="brain" aside={<Badge>Personalized</Badge>}>
              Your learning rhythm
            </SectionTitle>
            <p className="eyebrow muted">YOUR STARTING PREFERENCES</p>
            <p>
              You’ve chosen{" "}
              <strong>
                {state.preferences.prefers_visuals
                  ? "visual explanations"
                  : state.preferences.example_first
                    ? "worked examples first"
                    : "gentle explanations first"}
              </strong>
              , with {state.preferences.explanation_length} explanations.
            </p>
            <div className="stat-line">
              <span>Comfortable session</span>
              <strong>
                {state.preferences.preferred_session_length} minutes
              </strong>
            </div>
            <div className="stat-line">
              <span>When you get stuck</span>
              <strong>
                {state.preferences.hint_before_solution
                  ? "A gentle hint"
                  : "A full explanation"}
              </strong>
            </div>
            <button className="text-button" onClick={() => go("preferences")}>
              Adjust your preferences <Icon name="arrow" size={16} />
            </button>
          </section>
          <section className="panel source-card">
            <SectionTitle icon="shield">Keep your sources close</SectionTitle>
            <p>
              Your original material stays part of the conversation. Check an
              excerpt whenever you want to look a little closer.
            </p>
            <button
              className="button secondary"
              disabled={!sources.length}
              onClick={() => setSource(true)}
            >
              <Icon name="eye" size={17} />
              Inspect source excerpt
            </button>
            {!sources.length && (
              <small>Sources will appear when you open a lesson.</small>
            )}
          </section>
          <section className="panel">
            <SectionTitle
              icon="chart"
              aside={
                <button className="text-button" onClick={() => go("progress")}>
                  Full view <Icon name="arrow" size={14} />
                </button>
              }
            >
              Your understanding
            </SectionTitle>
            {state.progress?.concepts
              .filter((c) => c.attempts > 0)
              .slice(0, 4)
              .map((c) => (
                <div className="mini-mastery" key={c.concept_id}>
                  <div>
                    <span>{c.concept_name}</span>
                    <strong>{percent(c.mastery_score)}</strong>
                  </div>
                  <Meter
                    value={c.mastery_score}
                    label={c.concept_name}
                    tone={c.mastery_score < 0.6 ? "warm" : "sage"}
                  />
                </div>
              ))}
          </section>
        </aside>
      </div>
      {source && (
        <SourceDrawer sources={sources} onClose={() => setSource(false)} />
      )}
    </div>
  );
}
