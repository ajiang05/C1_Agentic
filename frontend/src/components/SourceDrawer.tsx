import { useState } from "react";
import type { SourceReference } from "@contracts/types";
import { Modal, Badge } from "./Shared";
import { Icon } from "./Icon";
import { useStudy } from "../lib/store";
export function SourceDrawer({
  sources,
  onClose,
}: {
  sources: SourceReference[];
  onClose: () => void;
}) {
  const { state, patch } = useStudy();
  const [reason, setReason] = useState("");
  const [saved, setSaved] = useState(false);
  const [flagging, setFlagging] = useState(false);
  return (
    <Modal title="Your source material" onClose={onClose} drawer>
      <p className="muted">
        Check the original excerpt alongside the explanation. A source reference
        helps you review a claim; it doesn’t automatically verify it.
      </p>
      {sources.length ? (
        sources.map((source, i) => (
          <article
            className="source-excerpt"
            key={`${source.material_id}-${i}`}
          >
            <Badge>
              <Icon name="book" size={14} />{" "}
              {state.mode === "sample"
                ? "Sample course source"
                : "Course source"}
            </Badge>
            <h3>{source.material_name}</h3>
            <p className="small muted">{source.location}</p>
            <blockquote>{source.excerpt}</blockquote>
          </article>
        ))
      ) : (
        <p>No source excerpt is available for this item yet.</p>
      )}
      <div className="callout">
        <Icon name="shield" />
        <div>
          <strong>You’re part of the review.</strong>
          <p>If something doesn’t match your material, leave a note.</p>
        </div>
      </div>
      {saved ? (
        <p className="success-message" role="status">
          <Icon name="check" />
          Flag saved on this device. It has not been sent to your teacher.
        </p>
      ) : flagging ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!reason.trim()) return;
            patch({
              flags: [
                ...state.flags,
                {
                  id: crypto.randomUUID(),
                  lessonId: state.lesson?.id || "journey",
                  reason: reason.trim(),
                  createdAt: new Date().toISOString(),
                  sources,
                },
              ],
            });
            setSaved(true);
          }}
        >
          <label htmlFor="flag-reason">What should be checked?</label>
          <textarea
            id="flag-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Describe what doesn’t match the source…"
            required
            rows={4}
          />
          <p className="small muted">
            This note is stored locally. You can include it in your exported
            progress report.
          </p>
          <button className="button primary" type="submit">
            Save review note <Icon name="flag" />
          </button>
        </form>
      ) : (
        <button className="button secondary" onClick={() => setFlagging(true)}>
          <Icon name="flag" />
          Flag a discrepancy
        </button>
      )}
    </Modal>
  );
}
