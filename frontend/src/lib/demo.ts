import type {
  LearningJourney,
  StudentProgress,
  Lesson,
  SubmitAttemptResponse,
  LearningPreferences,
} from "@contracts/types";
export const defaults: LearningPreferences = {
  example_first: true,
  prefers_visuals: false,
  explanation_length: "moderate",
  preferred_session_length: 10,
  hint_before_solution: true,
};
export const sampleSource = {
  material_id: "sample-notes",
  material_name: "Chapter 4 — Graph Traversal",
  location: "Page 12 · Recursive depth-first search",
  excerpt:
    "Depth-first search explores as far as possible along each branch before backtracking. Recursive DFS uses the call stack to remember pending calls. For edges A–B, A–C, B–D, and B–E, choosing B first produces the order A, B, D, E, C. A stack follows last in, first out: the most recently added call completes first.",
};
const names = [
  "Foundations & Graph Basics",
  "Breadth-First Search (BFS)",
  "Depth-First Search (DFS)",
  "Cycle Detection",
  "Topological Sort",
  "Recursive Call Stack",
];
export function sampleJourney(): LearningJourney {
  return {
    course_id: "sample-course",
    course_name: "CS 311: Algorithms & Data Structures",
    student_id: "sample-student",
    current_concept_id: "concept-2",
    nodes: names.map((name, i) => ({
      concept: {
        id: `concept-${i}`,
        course_id: "sample-course",
        name,
        description: [
          "Vertices, edges, and graph representations.",
          "Explore neighboring nodes level by level.",
          "Follow one branch before backtracking.",
          "Recognize when a path returns to an active node.",
          "Order tasks by their dependencies.",
          "Understand the calls waiting to finish.",
        ][i],
        prerequisite_ids: i === 0 || i === 5 ? [] : [`concept-${i - 1}`],
        order: i,
      },
      status:
        i < 2
          ? "mastered"
          : i === 2
            ? "in_progress"
            : i === 5
              ? "needs_review"
              : "locked",
      mastery_score: [1, 0.92, 0.81, 0, 0, 0.31][i],
    })),
  };
}
export function sampleProgress(journey: LearningJourney): StudentProgress {
  const concepts = journey.nodes.map((n) => ({
    concept_id: n.concept.id,
    concept_name: n.concept.name,
    mastery_score: n.mastery_score,
    attempts: n.status === "locked" ? 0 : n.concept.id === "concept-5" ? 3 : 10,
    correct_attempts:
      n.status === "locked" ? 0 : Math.round(n.mastery_score * 10),
    status: n.status,
    last_reviewed: null,
  }));
  return {
    student_id: journey.student_id,
    course_id: journey.course_id,
    course_name: journey.course_name,
    concepts,
    overall_mastery:
      concepts.reduce((s, c) => s + c.mastery_score, 0) / concepts.length,
    recommended_reviews: ["concept-5"],
  };
}
export function sampleLesson(
  conceptId: string,
  prefs: LearningPreferences,
  followup = false,
): Lesson {
  const i = Number(conceptId.split("-")[1]);
  const prompts = [
    "What connects two vertices in a graph?",
    "Which structure helps BFS visit nodes level by level?",
    "After visiting Node A and then Node B, which node would recursive DFS visit next?",
    "What suggests a cycle during a depth-first traversal?",
    "What does a topological ordering respect?",
    "Which call completes first in a last-in, first-out stack?",
  ];
  const options = [
    ["An edge", "A queue", "A chapter"],
    ["A stack", "A queue", "A set of chapters"],
    ["Node C", "Node D", "Node E", "Node A"],
    [
      "An edge to a node still on the active call stack",
      "Every leaf node",
      "An empty graph",
    ],
    [
      "The alphabetical order of nodes",
      "Dependency order",
      "The length of labels",
    ],
    ["The oldest call", "The most recently added call", "All calls at once"],
  ];
  const isStack = i === 5 || followup;
  return {
    id: `sample-lesson-${crypto.randomUUID()}`,
    concept_id: conceptId,
    course_id: "sample-course",
    title: isStack ? "The Call Stack in Runtime Memory" : names[i],
    teaching_format: prefs.prefers_visuals
      ? "visual"
      : prefs.example_first
        ? "worked_example"
        : "explanation",
    teaching_content: isStack
      ? "Think of the call stack as a stack of plates. A new call goes on top. That call finishes before the one below can continue. When A calls B and B calls D, D is the active frame; B and A wait."
      : i === 2
        ? "Start at A. Follow the branch to B. Before returning to A to explore C, DFS explores the children of B. Each recursive call remembers where to return, so no branch is forgotten."
        : sampleJourney().nodes[i].concept.description,
    question: {
      id: `sample-question-${crypto.randomUUID()}`,
      prompt: followup
        ? "When D finishes, which paused call resumes next?"
        : prompts[i],
      options: followup ? ["DFS(A)", "DFS(B)", "DFS(C)"] : options[i],
      question_type: "multiple_choice",
      difficulty: followup ? "medium" : "easy",
      source_references: [sampleSource],
    },
    source_references: [sampleSource],
  };
}
export function evaluateSample(
  lesson: Lesson,
  answer: string,
  progress: StudentProgress,
): SubmitAttemptResponse {
  const index = Number(lesson.concept_id.split("-")[1]);
  const correctAnswer = lesson.question.prompt.startsWith("When D")
    ? "DFS(B)"
    : [
        "An edge",
        "A queue",
        "Node D",
        "An edge to a node still on the active call stack",
        "Dependency order",
        "The most recently added call",
      ][index];
  const correct = answer === correctAnswer;
  const concepts = progress.concepts.map((c) =>
    c.concept_id === lesson.concept_id
      ? {
          ...c,
          attempts: c.attempts + 1,
          correct_attempts: c.correct_attempts + (correct ? 1 : 0),
          mastery_score: Math.min(
            1,
            Math.max(0.05, c.mastery_score + (correct ? 0.12 : -0.12)),
          ),
          status: (correct ? "mastered" : "needs_review") as typeof c.status,
          last_reviewed: new Date().toISOString(),
        }
      : c,
  );
  const next = correct
    ? `concept-${Math.min(index + 1, 4)}`
    : lesson.concept_id;
  if (correct) {
    const target = concepts.find((c) => c.concept_id === next);
    if (target?.status === "locked") target.status = "available";
  }
  return {
    attempt: {
      id: crypto.randomUUID(),
      student_id: progress.student_id,
      course_id: progress.course_id,
      concept_id: lesson.concept_id,
      question_id: lesson.question.id,
      question_prompt: lesson.question.prompt,
      student_answer: answer,
      correct,
      created_at: new Date().toISOString(),
      identified_misconception: correct
        ? null
        : "Possible confusion between breadth-first order and the active call stack.",
    },
    evaluation: {
      correct,
      understanding: correct ? "strong" : "misconception",
      feedback: correct
        ? "That’s right. You followed the active branch before returning to the parent. Take a moment to notice what clicked."
        : "Not quite — and that’s completely okay. Let’s look at the current branch together. A recursive call finishes exploring its children before returning to its parent.",
      identified_misconception: correct
        ? null
        : "The next node comes from the active branch, rather than the next horizontal level.",
      estimated_mastery: concepts.find(
        (c) => c.concept_id === lesson.concept_id,
      )!.mastery_score,
      source_references: lesson.source_references,
    },
    next_action: {
      action: correct ? "advance" : "remediate",
      reason: correct
        ? "Build on this understanding with the next concept."
        : "Try a visual walkthrough of the call stack, then a follow-up question.",
      next_concept_id: next,
      suggested_difficulty: correct ? "medium" : "easy",
    },
    progress: {
      ...progress,
      concepts,
      overall_mastery:
        concepts.reduce((s, c) => s + c.mastery_score, 0) / concepts.length,
      recommended_reviews: concepts
        .filter((c) => c.status === "needs_review")
        .map((c) => c.concept_id),
    },
  };
}
