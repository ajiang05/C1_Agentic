import { useState } from "react";
import { WorkspaceProvider, useStudy, type Page } from "./lib/store";
import { Icon } from "./components/Icon";
import { Modal } from "./components/Shared";
import { Preferences } from "./features/onboarding/Preferences";
import { Upload } from "./features/course-upload/Upload";
import { Journey } from "./features/journey/Journey";
import { LessonPage } from "./features/lesson/Lesson";
import { Progress } from "./features/progress/Progress";
import { Welcome } from "./features/welcome/Welcome";
import "./styles/app.css";
const tabs: [Page, string][] = [
  ["preferences", "Preferences"],
  ["upload", "Course Upload"],
  ["journey", "Learning Journey"],
  ["lesson", "Study Lesson"],
  ["progress", "Mastery & Knowledge"],
];
function Shell() {
  const {
    state,
    patch,
    page,
    go,
    busy,
    error,
    setError,
    notice,
    setNotice,
    storageError,
  } = useStudy();
  const [settings, setSettings] = useState(false);
  const [profile, setProfile] = useState(false);
  const themeName = {
    day: "Soft Day",
    sand: "Warm Sand",
    slate: "Muted Slate",
  }[state.sensory.theme];
  if (page === "welcome") {
    return (
      <>
        <a
          href="#main-content"
          className="skip-link"
          onClick={(e) => {
            e.preventDefault();
            document.getElementById("main-content")?.focus();
          }}
        >
          Skip to main content
        </a>
        <Welcome />
      </>
    );
  }
  return (
    <>
      <a
        href="#main-content"
        className="skip-link"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById("main-content")?.focus();
        }}
      >
        Skip to main content
      </a>
      <div className="sensory-bar">        <div>
          <button onClick={() => setSettings(true)}>
            <Icon name="palette" size={15} />
            Theme: {themeName}
          </button>
          <span className="utility-divider">|</span>
          <button
            onClick={() =>
              patch({
                sensory: { ...state.sensory, audio: !state.sensory.audio },
              })
            }
            aria-pressed={state.sensory.audio}
          >
            <Icon name={state.sensory.audio ? "volume" : "mute"} size={15} />
            Audio: {state.sensory.audio ? "Gentle chime" : "Off (muted)"}
          </button>
        </div>
        <div>
          <button
            onClick={() =>
              patch({
                sensory: { ...state.sensory, motion: !state.sensory.motion },
              })
            }
            aria-pressed={!state.sensory.motion}
          >
            <Icon name="pause" size={14} />
            {state.sensory.motion
              ? "Soft transitions"
              : "Reduced motion active"}
          </button>
          <span className="utility-divider">|</span>
          <span className="untimed">
            <Icon name="clock" size={15} />
            Untimed / Take your time
          </span>
        </div>
      </div>
      <header className="app-header">
        <button
          className="brand"
          onClick={() => go(state.journey ? "journey" : "preferences")}
          aria-label="edaptify home"
        >
          <img src="/edaptify.svg" width="37" height="37" alt="" />
          <span>
            <strong>edaptify</strong>
            <small>Adaptive Study Journey</small>
          </span>
        </button>
        <div className="course-pill">
          <Icon name="book" size={17} />
          <span>
            {state.journey?.course_name || "Your own path to understanding"}
          </span>
        </div>
        <nav aria-label="Learning workspace">
          {tabs.map(([id, label], i) => (
            <a
              key={id}
              href={`#${id}`}
              aria-current={page === id ? "page" : undefined}
              onClick={(e) => {
                e.preventDefault();
                if (!busy) go(id);
              }}
              className={page === id ? "active" : ""}
            >
              <span>{i + 1}.</span> {label}
            </a>
          ))}
        </nav>
        <button
          className="profile-button"
          aria-label="Your profile"
          onClick={() => setProfile(true)}
        >
          <Icon name="user" size={18} />
        </button>
      </header>
      {state.mode === "sample" && state.journey && (
        <div className="demo-ribbon">
          <Icon name="leaf" size={15} />
          <span>
            Sample course · explore freely · progress saved on this device
          </span>
          <button onClick={() => go("upload")}>
            Use my own materials <Icon name="arrow" size={14} />
          </button>
        </div>
      )}
      <main id="main-content" tabIndex={-1}>
        {storageError && (
          <div className="global-message error" role="alert">
            Your browser cannot save this workspace. Keep this tab open or
            export your progress before leaving.
          </div>
        )}
        {error && (
          <div className="global-message error" role="alert">
            <Icon name="info" />
            <div>
              <strong>We couldn’t complete that step.</strong>
              <p>{error}</p>
              <small>
                Your current work is still here. Please try again when you’re
                ready.
              </small>
            </div>
            <button
              className="icon-button"
              aria-label="Dismiss error"
              onClick={() => setError("")}
            >
              <Icon name="close" />
            </button>
          </div>
        )}
        {notice && (
          <div className="global-message success" role="status">
            <Icon name="check" />
            <span>{notice}</span>
            <button
              className="icon-button"
              aria-label="Dismiss notification"
              onClick={() => setNotice("")}
            >
              <Icon name="close" />
            </button>
          </div>
        )}
        {busy && (
          <div className="loading-notice" role="status">
            <Icon name="leaf" size={18} />
            {busy}… Take your time.
          </div>
        )}
        {page === "preferences" ? (
          <Preferences />
        ) : page === "upload" ? (
          <Upload />
        ) : page === "journey" ? (
          <Journey />
        ) : page === "lesson" ? (
          <LessonPage />
        ) : (
          <Progress />
        )}
      </main>
      <footer className="app-footer">
        <span>
          <Icon name="shield" size={19} />
          edaptify Study Environment <b>·</b> A grounded, gentle pace
        </span>
        <div>
          <button 
            className="evaluator-toggle" 
            onClick={() => patch({ evaluatorMode: !state.evaluatorMode })}
            style={{ background: 'none', border: 'none', color: state.evaluatorMode ? '#e74c3c' : 'inherit', cursor: 'pointer', font: 'inherit', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <Icon name="check" size={15} />
            {state.evaluatorMode ? "Evaluator Mode: ON" : "Evaluator Mode: OFF"}
          </button>
          <span>No high-pressure timers</span>
          <span>One step at a time</span>
        </div>
      </footer>
      {settings && (
        <Modal title="Make this space yours" onClose={() => setSettings(false)}>
          <p className="muted">
            Changes apply right away and stay on this device.
          </p>
          <fieldset>
            <legend>Your sensory theme</legend>
            <div className="theme-options">
              {(["day", "sand", "slate"] as const).map((theme) => (
                <button
                  className={`theme-option ${theme} ${theme === state.sensory.theme ? "selected" : ""}`}
                  key={theme}
                  aria-pressed={theme === state.sensory.theme}
                  onClick={() =>
                    patch({ sensory: { ...state.sensory, theme } })
                  }
                >
                  <Icon name={theme === "slate" ? "moon" : "sun"} size={24} />
                  <strong>
                    {
                      {
                        day: "Soft Day",
                        sand: "Warm Sand",
                        slate: "Muted Slate",
                      }[theme]
                    }
                  </strong>
                  {theme === state.sensory.theme && (
                    <Icon name="check" size={16} />
                  )}
                </button>
              ))}
            </div>
          </fieldset>
          <label className="settings-row">
            <span>
              <strong>Larger reading text</strong>
              <small>A little more room for each word</small>
            </span>
            <input
              type="checkbox"
              checked={state.sensory.textSize === "large"}
              onChange={(e) =>
                patch({
                  sensory: {
                    ...state.sensory,
                    textSize: e.target.checked ? "large" : "standard",
                  },
                })
              }
            />
          </label>
          <label className="settings-row">
            <span>
              <strong>Reduced motion</strong>
              <small>A still, predictable workspace</small>
            </span>
            <input
              type="checkbox"
              checked={!state.sensory.motion}
              onChange={(e) =>
                patch({
                  sensory: { ...state.sensory, motion: !e.target.checked },
                })
              }
            />
          </label>
          <label className="settings-row">
            <span>
              <strong>Gentle confirmation chime</strong>
              <small>A quiet tone after checking an answer</small>
            </span>
            <input
              type="checkbox"
              checked={state.sensory.audio}
              onChange={(e) =>
                patch({
                  sensory: { ...state.sensory, audio: e.target.checked },
                })
              }
            />
          </label>
          <button
            className="button primary full-width"
            onClick={() => setSettings(false)}
          >
            Back to my space <Icon name="check" />
          </button>
        </Modal>
      )}
      {profile && (
        <Modal title="Your study space" onClose={() => setProfile(false)}>
          <label htmlFor="display-name">
            What would you like to be called?
          </label>
          <input
            id="display-name"
            value={state.name}
            onChange={(e) => patch({ name: e.target.value })}
            maxLength={80}
          />
          <p className="muted">
            Your workspace, preferences, and recent activity are saved on this
            device.{" "}
            {state.mode === "sample"
              ? "You’re currently exploring the sample course."
              : "Connect your course materials to start learning."}
          </p>
          <button className="button primary" onClick={() => setProfile(false)}>
            Save & return <Icon name="check" />
          </button>
        </Modal>
      )}
    </>
  );
}
export function App() {
  return (
    <WorkspaceProvider>
      <Shell />
    </WorkspaceProvider>
  );
}
