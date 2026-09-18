import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import type {
  LearningJourney,
  StudentProgress,
  Lesson,
  SubmitAttemptResponse,
  LearningPreferences,
  SourceReference,
} from "@contracts/types";
import { api } from "./api";
import { getAccessToken, signInAnonymously } from "./supabase";
import {
  defaults,
  sampleJourney,
  sampleProgress,
  sampleLesson,
  evaluateSample,
} from "./demo";
export type Page = "preferences" | "upload" | "journey" | "lesson" | "progress";
export type Sensory = {
  theme: "day" | "sand" | "slate";
  motion: boolean;
  audio: boolean;
  textSize: "standard" | "large";
};
export type LocalFlag = {
  id: string;
  lessonId: string;
  reason: string;
  createdAt: string;
  sources: SourceReference[];
};
interface State {
  version: 1;
  preferences: LearningPreferences;
  approach: string;
  support: string;
  sensory: Sensory;
  studentId: string | null;
  name: string;
  mode: "sample" | "backend";
  journey: LearningJourney | null;
  progress: StudentProgress | null;
  lesson: Lesson | null;
  result: SubmitAttemptResponse | null;
  answer: string;
  history: SubmitAttemptResponse[];
  flags: LocalFlag[];
  reviewDismissed: string | null;
  citations: boolean;
  evaluatorMode: boolean;
}
const initial: State = {
  version: 1,
  preferences: defaults,
  approach: "example",
  support: "hint",
  sensory: { theme: "day", motion: false, audio: false, textSize: "standard" },
  studentId: null,
  name: "Learner",
  mode: "backend",
  journey: null,
  progress: null,
  lesson: null,
  result: null,
  answer: "",
  history: [],
  flags: [],
  reviewDismissed: null,
  citations: true,
  evaluatorMode: false,
};
const KEY = "calmpath.workspace.v1";
function readState(): State {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || "null");
    if (
      s?.version === 1 &&
      s.preferences &&
      s.sensory &&
      Array.isArray(s.history) &&
      Array.isArray(s.flags)
    )
      return { ...initial, ...s };
  } catch {
    /* Default to a usable workspace when storage is unavailable. */
  }
  return initial;
}
function readPage(): Page {
  const key = window.location.hash.slice(1);
  return ["preferences", "upload", "journey", "lesson", "progress"].includes(
    key,
  )
    ? (key as Page)
    : "preferences";
}
function useWorkspace() {
  const [state, setState] = useState<State>(readState);
  const [page, setPage] = useState<Page>(readPage);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [storageError, setStorageError] = useState(false);
  const working = useRef(false);
  const patch = (update: Partial<State>) =>
    setState((s) => ({ ...s, ...update }));
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }, [state]);
  useEffect(() => {
    document.documentElement.dataset.theme = state.sensory.theme;
    document.documentElement.dataset.motion = state.sensory.motion
      ? "smooth"
      : "reduced";
    document.documentElement.dataset.textSize = state.sensory.textSize;
  }, [state.sensory]);
  useEffect(() => {
    const change = () => setPage(readPage());
    window.addEventListener("hashchange", change);
    return () => window.removeEventListener("hashchange", change);
  }, []);
  useEffect(() => {
    document.title = `${{ preferences: "Your preferences", upload: "Course materials", journey: "Learning journey", lesson: "Study lesson", progress: "Your knowledge" }[page]} · CalmPath`;
    window.scrollTo(0, 0);
    document.querySelector<HTMLElement>("#main-content")?.focus();
  }, [page]);
  const go = (p: Page) => {
    setError("");
    setNotice("");
    setPage(p);
    window.location.hash = p;
  };
  async function run(label: string, action: () => Promise<void>) {
    if (working.current) return false;
    working.current = true;
    setBusy(label);
    setError("");
    try {
      await action();
      return true;
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Something went wrong. Please try again.",
      );
      return false;
    } finally {
      working.current = false;
      setBusy("");
    }
  }
  const savePreferences = async (next = false) => {
    patch({ preferences: state.preferences });
    setNotice("Your preferences are saved on this device.");
    if (state.studentId && state.mode === "backend") {
      const saved = await run("Saving preferences", async () => {
        await api.updatePreferences(state.studentId!, state.preferences);
        setNotice("Your preferences are saved.");
      });
      if (!saved) return;
    }
    if (next) go("upload");
  };
  const useSample = () => {
    const j = sampleJourney();
    patch({
      mode: "sample",
      studentId: "sample-student",
      journey: j,
      progress: sampleProgress(j),
      lesson: null,
      result: null,
      answer: "",
      history: [],
      reviewDismissed: null,
    });
    setNotice(
      "Sample course loaded. Practice and progress stay on this device.",
    );
    go("journey");
  };
  const upload = async (name: string, syllabus: File, notes: File) =>
    run("Preparing your learning journey", async () => {
      let studentId = state.mode === "backend" ? state.studentId : null;
      if (!studentId) {
        let token = await getAccessToken();
        if (!token) {
          await signInAnonymously();
          token = await getAccessToken();
        }
        const student = await api.createStudent(
          state.name,
          token,
        );
        studentId = student.student_id;
        patch({ studentId, mode: "backend" });
      }
      await api.updatePreferences(studentId, state.preferences);
      const course = await api.uploadCourse({
        studentId,
        courseName: name,
        syllabus,
        notes,
      });
      const { journey } = await api.generateJourney(
        course.course_id,
        studentId,
      );
      const progress = await api.getProgress(studentId, course.course_id);
      patch({
        studentId,
        mode: "backend",
        journey,
        progress,
        lesson: null,
        result: null,
        answer: "",
        history: [],
        reviewDismissed: null,
      });
      go("journey");
    });
  const openLesson = async (conceptId?: string, followup = false) =>
    run("Preparing your lesson", async () => {
      if (!state.journey)
        throw new Error(
          "Add your course materials or explore the sample course first.",
        );
      const id =
        conceptId ||
        state.journey.current_concept_id ||
        state.journey.nodes.find((n) => n.status !== "locked")?.concept.id;
      if (!id)
        throw new Error("Your course does not have an available concept yet.");
      const lesson =
        state.mode === "sample"
          ? sampleLesson(id, state.preferences, followup)
          : await api.getLesson(state.journey.course_id, id, state.studentId!);
      patch({ lesson, result: null, answer: "" });
      go("lesson");
    });
  const submit = async () =>
    run("Reflecting on your answer", async () => {
      if (
        !state.lesson ||
        !state.progress ||
        !state.answer.trim() ||
        state.result
      )
        return;
      const result =
        state.mode === "sample"
          ? evaluateSample(state.lesson, state.answer, state.progress)
          : await api.submitAttempt({
              student_id: state.studentId!,
              course_id: state.lesson.course_id,
              concept_id: state.lesson.concept_id,
              question_id: state.lesson.question.id,
              question_prompt: state.lesson.question.prompt,
              student_answer: state.answer,
            });
      setState((s) => ({
        ...s,
        result,
        progress: result.progress,
        history: [result, ...s.history].slice(0, 50),
        journey: s.journey
          ? {
              ...s.journey,
              current_concept_id: result.next_action.next_concept_id,
              nodes: s.journey.nodes.map((n) => {
                const m = result.progress.concepts.find(
                  (c) => c.concept_id === n.concept.id,
                );
                return m
                  ? { ...n, status: m.status, mastery_score: m.mastery_score }
                  : n;
              }),
            }
          : null,
      }));
      if (state.sensory.audio) {
        try {
          const ctx = new AudioContext();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.value = 440;
          gain.gain.setValueAtTime(0.015, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.3);
          osc.start();
          osc.stop(ctx.currentTime + 0.3);
          osc.onended = () => void ctx.close();
        } catch {
          /* Audio is optional. */
        }
      }
    });
  const submitManual = async (correct: boolean, feedback: string, misconception: string | null) =>
    run("Submitting manual grade", async () => {
      if (!state.lesson || !state.progress || !state.answer.trim() || state.result) return;
      if (state.mode === "sample") {
        setNotice("Evaluator mode is only available when connected to the backend.");
        return;
      }
      const result = await api.submitHumanEvaluation({
        student_id: state.studentId!,
        course_id: state.lesson.course_id,
        concept_id: state.lesson.concept_id,
        content_id: state.lesson.question.id,
        student_answer: state.answer,
        correct,
        feedback,
        misconception,
      });
      setState((s) => ({
        ...s,
        result,
        progress: result.progress,
        history: [result, ...s.history].slice(0, 50),
        journey: s.journey
          ? {
              ...s.journey,
              current_concept_id: result.next_action.next_concept_id,
              nodes: s.journey.nodes.map((n) => {
                const m = result.progress.concepts.find((c) => c.concept_id === n.concept.id);
                return m ? { ...n, status: m.status, mastery_score: m.mastery_score } : n;
              }),
            }
          : null,
      }));
      if (state.sensory.audio) {
        try {
          const ctx = new AudioContext();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.value = 440;
          gain.gain.setValueAtTime(0.015, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.3);
          osc.start();
          osc.stop(ctx.currentTime + 0.3);
          osc.onended = () => void ctx.close();
        } catch {
          /* Audio is optional. */
        }
      }
    });
  const refresh = () =>
    run("Refreshing your progress", async () => {
      if (!state.journey || state.mode === "sample") {
        setNotice("Your sample progress is up to date on this device.");
        return;
      }
      const [journey, progress] = await Promise.all([
        api.getJourney(state.journey.course_id, state.studentId!),
        api.getProgress(state.studentId!, state.journey.course_id),
      ]);
      patch({ journey, progress });
      setNotice("Your progress is up to date.");
    });
  return {
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
    savePreferences,
    useSample,
    upload,
    openLesson,
    submit,
    submitManual,
    refresh,
  };
}
const Workspace = createContext<ReturnType<typeof useWorkspace> | null>(null);
export function WorkspaceProvider({ children }: { children: ReactNode }) {
  return (
    <Workspace.Provider value={useWorkspace()}>{children}</Workspace.Provider>
  );
}
export function useStudy() {
  const value = useContext(Workspace);
  if (!value) throw new Error("Workspace provider missing");
  return value;
}
export const percent = (n: number) =>
  `${Math.round(Math.max(0, Math.min(1, n)) * 100)}%`;
