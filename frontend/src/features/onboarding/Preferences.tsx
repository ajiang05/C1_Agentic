import { Icon, type IconName } from "../../components/Icon";
import { Badge, SectionTitle } from "../../components/Shared";
import { useStudy } from "../../lib/store";
import { defaults } from "../../lib/demo";
const approaches: [string, string, string, IconName][] = [
  [
    "example",
    "Seeing a concrete example first",
    "A real input-output trace before theoretical definitions.",
    "layers",
  ],
  [
    "explanation",
    "Reading a gentle explanation first",
    "A calm introduction to the idea and the problem it solves.",
    "book",
  ],
  [
    "visual",
    "Seeing a structured visual diagram",
    "Visual trees, flowcharts, and spatial diagrams with quiet styling.",
    "tree",
  ],
  [
    "practice",
    "Trying an interactive problem myself",
    "An opportunity to explore and notice patterns at my own pace.",
    "play",
  ],
];
const supports: [string, string, string, IconName][] = [
  [
    "hint",
    "Give me a gentle hint first",
    "A small orienting clue, without giving the answer away.",
    "bulb",
  ],
  [
    "metaphor",
    "Explain it with a new metaphor",
    "A fresh perspective, like a call stack compared to a stack of plates.",
    "leaf",
  ],
  [
    "steps",
    "Walk me through a similar example",
    "Deconstruct a related problem so I can follow the logic on my terms.",
    "tree",
  ],
  [
    "solution",
    "Show the full solution and source",
    "A complete breakdown with the original course reference.",
    "file",
  ],
];
function ChoiceGrid({
  items,
  name,
  value,
  onChange,
}: {
  items: typeof approaches;
  name: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="choice-grid">
      {items.map(([id, title, desc, icon]) => (
        <label className={`choice ${value === id ? "selected" : ""}`} key={id}>
          <input
            type="radio"
            name={name}
            value={id}
            checked={value === id}
            onChange={() => onChange(id)}
          />
          <div>
            <span className="choice-title">
              {title}
              <Icon name={icon} size={18} />
            </span>
            <span className="choice-description">{desc}</span>
          </div>
        </label>
      ))}
    </div>
  );
}
export function Preferences() {
  const { state, patch, savePreferences, go, setNotice, busy } = useStudy();
  const prefs = state.preferences;
  const reset = () => {
    patch({
      preferences: { ...defaults },
      approach: "example",
      support: "hint",
      sensory: {
        theme: "day",
        motion: false,
        audio: false,
        textSize: "standard",
      },
    });
    setNotice("Calm defaults restored.");
  };
  return (
    <div className="page preferences-page">
      <section className="intro-banner">
        <div className="round-icon">
          <Icon name="shield" />
        </div>
        <div>
          <h1>You are in full control.</h1>
          <p>
            This questionnaire is optional. Your preferences are a gentle
            starting point, and you can adjust them anytime.
          </p>
        </div>
        <div className="intro-actions">
          <button
            className="button ghost"
            onClick={() => void savePreferences()}
          >
            <Icon name="save" size={17} />
            Save & resume later
          </button>
          <button
            className="button secondary"
            onClick={() => {
              patch({
                preferences: { ...defaults },
                approach: "example",
                support: "hint",
              });
              go("upload");
            }}
          >
            Skip & use calm defaults <Icon name="arrow" size={17} />
          </button>
        </div>
      </section>
      <div className="step-line">
        <span>
          <i /> STEP 1 OF 5 · YOUR STARTING POINT
        </span>
        <Badge tone="neutral">No time constraints</Badge>
      </div>
      <section className="panel preference-panel">
        <SectionTitle icon="brain">1. Sensory & Learning Approach</SectionTitle>
        <p className="section-description">
          When something is unfamiliar, what helps you feel most grounded?
        </p>
        <ChoiceGrid
          items={approaches}
          name="approach"
          value={state.approach}
          onChange={(v) =>
            patch({
              approach: v,
              preferences: {
                ...prefs,
                example_first: v === "example",
                prefers_visuals: v === "visual",
              },
            })
          }
        />
      </section>
      <section className="panel preference-panel">
        <SectionTitle icon="heart">2. Feedback & Sticking Points</SectionTitle>
        <p className="section-description">
          When you get stuck, how would you like the tutor to respond?
        </p>
        <ChoiceGrid
          items={supports}
          name="support"
          value={state.support}
          onChange={(v) =>
            patch({
              support: v,
              preferences: { ...prefs, hint_before_solution: v === "hint" },
            })
          }
        />
      </section>
      <section className="panel preference-panel">
        <SectionTitle icon="clock">3. Session Cadence & Depth</SectionTitle>
        <p className="section-description">
          Choose a comfortable rhythm. Every lesson is untimed, with room to
          pause.
        </p>
        <fieldset>
          <legend>Session duration preference</legend>
          <div className="duration-grid">
            {[
              [
                5,
                "Micro-sessions",
                "5–8 min",
                "One focused concept, with space to breathe.",
              ],
              [
                10,
                "Standard chapters",
                "10–15 min",
                "A lesson and practice with natural checkpoints.",
              ],
              [
                20,
                "Deep focus",
                "20–30 min",
                "A little more room to follow your curiosity.",
              ],
            ].map(([v, title, time, desc]) => (
              <label
                className={`duration choice ${prefs.preferred_session_length === v ? "selected" : ""}`}
                key={v}
              >
                <input
                  type="radio"
                  name="duration"
                  checked={prefs.preferred_session_length === v}
                  onChange={() =>
                    patch({
                      preferences: {
                        ...prefs,
                        preferred_session_length: Number(v),
                      },
                    })
                  }
                />
                <span>
                  <strong>{title}</strong>
                  <b>{time}</b>
                  <small>{desc}</small>
                </span>
                <Icon name="clock" size={17} />
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend>
            Explanation detail <small>Adjustable whenever you need</small>
          </legend>
          <div className="segmented detail-options">
            {[
              ["short", "Concise & direct"],
              ["moderate", "Moderate with context"],
              ["detailed", "Complete breakdowns"],
            ].map(([v, label]) => (
              <label
                className={prefs.explanation_length === v ? "active" : ""}
                key={v}
              >
                <input
                  type="radio"
                  name="depth"
                  checked={prefs.explanation_length === v}
                  onChange={() =>
                    patch({
                      preferences: {
                        ...prefs,
                        explanation_length:
                          v as typeof prefs.explanation_length,
                      },
                    })
                  }
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
      </section>
      <aside className="callout sage-callout">
        <Icon name="info" />
        <div>
          <strong>How CalmPath respects your input</strong>
          <p>
            These choices are a starting point, not a label. You can change your
            preferences as you discover what works for you.
          </p>
        </div>
      </aside>
      <div className="page-actions">
        <button className="button ghost" onClick={reset}>
          <Icon name="refresh" size={17} />
          Restore calm defaults
        </button>
        <button
          className="button primary"
          disabled={!!busy}
          onClick={() => void savePreferences(true)}
        >
          Save preferences & continue <Icon name="arrow" />
        </button>
      </div>
    </div>
  );
}
