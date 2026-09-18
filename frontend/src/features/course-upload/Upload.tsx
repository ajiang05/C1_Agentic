import { useRef, useState } from "react";
import { Icon } from "../../components/Icon";
import { Badge } from "../../components/Shared";
import { useStudy } from "../../lib/store";
function FileCard({
  kind,
  file,
  onChange,
}: {
  kind: "syllabus" | "notes";
  file: File | null;
  onChange: (f: File | null) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const accept = (f?: File) => {
    if (!f) return;
    if (!/\.(txt|md)$/i.test(f.name)) {
      setError(
        "Please choose a .txt or .md file. PDF support is not available yet.",
      );
      return;
    }
    if (f.size === 0 || f.size > 10 * 1024 * 1024) {
      setError("Choose a nonempty file smaller than 10 MB.");
      return;
    }
    setError("");
    onChange(f);
  };
  return (
    <section className="panel upload-card">
      <div className="section-title">
        <h2>
          <span className="step-number">{kind === "syllabus" ? 1 : 2}</span>
          {kind === "syllabus"
            ? "Syllabus & Schedule"
            : "Course Materials & Notes"}
        </h2>
        <Badge tone={kind === "syllabus" ? "sand" : "sage"}>Required</Badge>
      </div>
      <p>
        {kind === "syllabus"
          ? "Your course topics, learning goals, and the order you’ll explore them."
          : "The explanations, examples, and references your lessons will be built from."}
      </p>
      <div
        className={`dropzone ${dragging ? "dragging" : ""} ${file ? "has-file" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          accept(e.dataTransfer.files[0]);
        }}
      >
        <input
          ref={input}
          type="file"
          accept=".txt,.md,text/plain,text/markdown"
          aria-label={
            kind === "syllabus" ? "Upload syllabus" : "Upload course notes"
          }
          onChange={(e) => {
            accept(e.target.files?.[0]);
            e.target.value = "";
          }}
          hidden
        />
        {file ? (
          <>
            <div className="file-preview">
              <div className="file-icon">
                <Icon name={kind === "syllabus" ? "file" : "book"} size={26} />
              </div>
              <div>
                <strong>{file.name}</strong>
                <small>
                  {(file.size / 1024).toFixed(1)} KB · Ready to upload
                </small>
              </div>
              <button
                className="icon-button"
                aria-label={`Remove ${kind}`}
                onClick={() => onChange(null)}
              >
                <Icon name="close" size={18} />
              </button>
            </div>
            <div className="file-ready">
              <Icon name="check" size={18} />
              <span>
                File selected. Content will be processed when you generate your
                journey.
              </span>
            </div>
            <button
              className="button secondary"
              onClick={() => input.current?.click()}
            >
              <Icon name="refresh" size={17} />
              Replace file
            </button>
          </>
        ) : (
          <>
            <div className="upload-glyph">
              <Icon name="upload" size={30} />
            </div>
            <strong>
              Drop your {kind === "syllabus" ? "syllabus" : "course notes"} here
            </strong>
            <span className="muted small">
              or choose a file from your device
            </span>
            <button
              className="button secondary"
              onClick={() => input.current?.click()}
            >
              Choose {kind === "syllabus" ? "syllabus" : "notes"}
            </button>
            <small>TXT or Markdown · up to 10 MB</small>
          </>
        )}
      </div>
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
export function Upload() {
  const { state, patch, upload, busy, useSample } = useStudy();
  const [syllabus, setSyllabus] = useState<File | null>(null);
  const [notes, setNotes] = useState<File | null>(null);
  const [name, setName] = useState("");
  return (
    <div className="page upload-page">
      <div className="workspace-strip">
        <span>
          <span className="step-number filled">2</span> Your course workspace
        </span>
        <span>
          <Icon name="check" size={16} />
          Preferences ready <b>·</b> Step 2 of 5
        </span>
      </div>
      <header className="page-heading">
        <Badge>
          <Icon name="leaf" size={14} />A path built around your course
        </Badge>
        <h1>
          Bring your materials.
          <br />
          We’ll find a way through, together.
        </h1>
        <p>
          Upload your syllabus and course notes. Turn what you need to learn
          into a gentle, step-by-step journey that moves at your pace.
        </p>
      </header>
      <div className="callout">
        <div className="round-icon">
          <Icon name="shield" />
        </div>
        <div>
          <strong>No sensory surprises</strong>
          <p>
            No flashing animations, sound effects, or unexpected page jumps. You
            decide when your learning journey begins.
          </p>
        </div>
      </div>
      <div className="course-name-field">
        <label htmlFor="course-name">What’s your course called?</label>
        <input
          id="course-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. CS 311: Algorithms & Data Structures"
          maxLength={160}
        />
      </div>
      <div className="upload-grid">
        <FileCard kind="syllabus" file={syllabus} onChange={setSyllabus} />
        <FileCard kind="notes" file={notes} onChange={setNotes} />
      </div>
      <section className="verification-card panel">
        <div className="round-icon filled">
          <Icon name="shield" />
        </div>
        <div>
          <h2>
            Keep your sources close <Badge>Human verification</Badge>
          </h2>
          <p>
            Include source excerpts with lesson cards so you can check an
            explanation against your original notes.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={state.citations}
          className={`switch ${state.citations ? "on" : ""}`}
          onClick={() => patch({ citations: !state.citations })}
          aria-label="Show source excerpts"
        >
          <span />
        </button>
      </section>
      <div className="page-actions">
        <p className="small">
          <Icon name="upload" size={16} />
          {Number(!!syllabus) + Number(!!notes)} of 2 materials selected
        </p>
        <button
          className="button primary"
          disabled={!syllabus || !notes || !name.trim() || !!busy}
          onClick={() => {
            if (syllabus && notes) void upload(name.trim(), syllabus, notes);
          }}
        >
          {busy || "Generate learning journey"}
          <Icon name="arrow" />
        </button>
      </div>
      <div className="sample-banner">
        <div>
          <strong>Just looking around?</strong>
          <p>Explore a ready-to-go sample course in graph algorithms.</p>
        </div>
        <button className="button ghost" disabled={!!busy} onClick={useSample}>
          Try the sample course <Icon name="arrow" size={17} />
        </button>
      </div>
    </div>
  );
}
