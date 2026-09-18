export interface SourceReference {
  material_id: string;
  material_name: string;
  location: string;
  excerpt: string;
}

export interface Concept {
  id: string;
  course_id: string;
  name: string;
  description: string;
  prerequisite_ids: string[];
  order: number;
}

export type Difficulty = "easy" | "medium" | "hard";
export type QuestionType =
  | "multiple_choice"
  | "true_false"
  | "short_answer"
  | "explain"
  | "apply";

export interface LessonQuestion {
  id: string;
  prompt: string;
  question_type: QuestionType;
  options?: string[];
  difficulty: Difficulty;
  source_references: SourceReference[];
}

export interface Lesson {
  id: string;
  concept_id: string;
  course_id: string;
  title: string;
  teaching_content: string;
  teaching_format:
    | "explanation"
    | "worked_example"
    | "analogy"
    | "visual"
    | "step_by_step";
  question: LessonQuestion;
  source_references: SourceReference[];
  /** Person 5 — pedagogical action taken for this lesson turn */
  tutor_action?: string | null;
  guidance?: string | null;
  next_step?: string | null;
}

export type Understanding =
  | "strong"
  | "partial"
  | "misconception"
  | "missing_prerequisite"
  | "guessing";

export type EvaluationOutcome =
  | "correct"
  | "partially_correct"
  | "incorrect"
  | "no_attempt";

export interface Misconception {
  code: string;
  description: string;
  confidence: number;
  evidence: string;
  related_prerequisite_id?: string | null;
}

export interface Evaluation {
  correct: boolean;
  understanding: Understanding;
  feedback: string;
  identified_misconception?: string | null;
  estimated_mastery: number;
  source_references: SourceReference[];
  /** Person 6 extensions — additive for FE / persistence */
  outcome?: EvaluationOutcome;
  score?: number;
  confidence?: number;
  strengths?: string[];
  missing_elements?: string[];
  misconceptions?: Misconception[];
  mastery_delta?: number;
  rationale?: string;
}

export type NextActionType =
  | "advance"
  | "hint"
  | "retry"
  | "reteach"
  | "review_prerequisite"
  | "retry_same"
  | "remediate"
  | "easier_question"
  | "harder_question";

export interface NextAction {
  action: NextActionType;
  reason: string;
  next_concept_id: string;
  suggested_difficulty: Difficulty;
}

export interface Attempt {
  id: string;
  student_id: string;
  course_id: string;
  concept_id: string;
  question_id: string;
  question_prompt: string;
  student_answer: string;
  correct: boolean;
  identified_misconception?: string | null;
  created_at: string;
}

export interface LearningPreferences {
  example_first: boolean;
  prefers_visuals: boolean;
  explanation_length: "short" | "moderate" | "detailed";
  preferred_session_length: number;
  hint_before_solution: boolean;
}

export interface ConceptMastery {
  concept_id: string;
  concept_name: string;
  mastery_score: number;
  attempts: number;
  correct_attempts: number;
  last_reviewed?: string | null;
  status: "locked" | "available" | "in_progress" | "mastered" | "needs_review";
}

export interface StudentProgress {
  student_id: string;
  course_id: string;
  course_name: string;
  concepts: ConceptMastery[];
  overall_mastery: number;
  recommended_reviews: string[];
}

export interface JourneyNode {
  concept: Concept;
  status: ConceptMastery["status"];
  mastery_score: number;
}

export interface LearningJourney {
  course_id: string;
  course_name: string;
  student_id: string;
  nodes: JourneyNode[];
  current_concept_id: string | null;
}

export interface CreateStudentRequest {
  display_name: string;
}

export interface CreateStudentResponse {
  student_id: string;
  display_name: string;
}

export interface UpdatePreferencesRequest {
  preferences: LearningPreferences;
}

export interface CourseSummary {
  id: string;
  name: string;
}

export interface GetStudentCoursesResponse {
  courses: CourseSummary[];
}

export interface UploadCourseResponse {
  course_id: string;
  course_name: string;
  material_ids: string[];
  message: string;
}

export interface GenerateJourneyRequest {
  student_id: string;
}

export interface GenerateJourneyResponse {
  journey: LearningJourney;
}

export interface SubmitAttemptRequest {
  student_id: string;
  course_id: string;
  concept_id: string;
  question_id: string;
  question_prompt: string;
  student_answer: string;
}

export interface SubmitAttemptResponse {
  attempt: Attempt;
  evaluation: Evaluation;
  next_action: NextAction;
  progress: StudentProgress;
}

export interface HealthResponse {
  status: "ok";
  persistence: "memory" | "supabase";
  version: string;
  openai: boolean;
}

export interface HumanEvaluationRequest {
  student_id: string;
  course_id: string;
  concept_id: string;
  content_id: string;
  student_answer: string;
  correct: boolean;
  feedback: string;
  misconception: string | null;
}

export interface HumanEvaluationResponse {
  attempt: Attempt;
  progress: StudentProgress;
  next_action: NextAction;
}

