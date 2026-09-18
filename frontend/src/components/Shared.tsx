import { useEffect, useRef, type ReactNode } from "react";
import { Icon, type IconName } from "./Icon";
import { useStudy, percent } from "../lib/store";
export function Badge({
  children,
  tone = "sage",
}: {
  children: ReactNode;
  tone?: "sage" | "sand" | "neutral";
}) {
  return <span className={`badge ${tone}`}>{children}</span>;
}
export function SectionTitle({
  icon,
  children,
  aside,
}: {
  icon: IconName;
  children: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <div className="section-title">
      <h2>
        <Icon name={icon} />
        {children}
      </h2>
      {aside}
    </div>
  );
}
export function Meter({
  value,
  label,
  tone = "sage",
}: {
  value: number;
  label: string;
  tone?: string;
}) {
  return (
    <div
      className={`meter ${tone}`}
      role="progressbar"
      aria-label={label}
      aria-valuenow={Math.round(value * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <span style={{ width: percent(value) }} />
    </div>
  );
}
export function Modal({
  title,
  onClose,
  children,
  drawer = false,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  drawer?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const node = ref.current;
    node?.showModal();
    const callback = (e: Event) => {
      e.preventDefault();
      close.current();
    };
    node?.addEventListener("cancel", callback);
    return () => {
      node?.removeEventListener("cancel", callback);
      node?.close();
      if (previous?.isConnected) previous.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={drawer ? "modal drawer" : "modal"}
      aria-labelledby="dialog-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          const r = e.currentTarget.getBoundingClientRect();
          if (
            e.clientX < r.left ||
            e.clientX > r.right ||
            e.clientY < r.top ||
            e.clientY > r.bottom
          )
            onClose();
        }
      }}
    >
      <div className="modal-heading">
        <h2 id="dialog-title">{title}</h2>
        <button
          className="icon-button"
          aria-label="Close dialog"
          onClick={onClose}
        >
          <Icon name="close" />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function EmptyCourse({
  title = "A little preparation, then your own path.",
}: {
  title?: string;
}) {
  const { go, useSample } = useStudy();
  return (
    <section className="empty-state panel">
      <div className="empty-icon">
        <Icon name="leaf" size={36} />
      </div>
      <p className="eyebrow">YOUR SPACE TO LEARN</p>
      <h1>{title}</h1>
      <p>
        Add your syllabus and course notes to create your journey, or explore a
        sample graph-algorithms course at your own pace.
      </p>
      <div className="button-row">
        <button className="button primary" onClick={() => go("upload")}>
          Add course materials <Icon name="arrow" />
        </button>
        <button className="button secondary" onClick={useSample}>
          Explore sample course
        </button>
      </div>
      <small>
        The sample is interactive and saves your practice on this device.
      </small>
    </section>
  );
}
