export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
export interface LearningPreferences {
  example_first: boolean;
  prefers_visuals: boolean;
  explanation_length: 'short' | 'moderate' | 'detailed';
  preferred_session_length: 5 | 10 | 15 | 20;
  hint_before_solution: boolean;
}
export interface EvaluatedAttempt {
  /** Derived from verified server authentication. */
  userId: string;
  /** Generate once per submission and reuse unchanged for retries. */
  attemptId: string;
  contentId: string;
  studentAnswer: Exclude<Json, null>;
  /** Trusted evaluator output, never accepted directly from the browser. */
  correct: boolean;
  feedback?: string;
  misconception?: string | null;
  relatedConceptId?: string | null;
  /** Student-reported confidence, not a guessed value. */
  confidence?: number | null;
  isReview?: boolean;
}
export interface Profile {
  id: string;
  display_name: string;
  learning_preferences: LearningPreferences;
  created_at: string;
  updated_at: string;
}
export interface StoredAttempt {
  id: string;
  user_id: string;
  course_id: string;
  content_id: string;
  concept_id: string;
  student_answer: Json;
  correct: boolean;
  feedback: string;
  identified_misconception: string | null;
  related_concept_id: string | null;
  confidence: number | null;
  is_review: boolean;
  mastery_after: number;
  created_at: string;
}
export interface AttemptResult { attempt: StoredAttempt; duplicate: boolean }
export interface LearningMemory {
  course_id: string;
  profile: Profile;
  concepts: Array<{
    id: string;
    name: string;
    position: number;
    mastery_score: number | null;
    attempts: number;
    correct_attempts: number;
    last_reviewed: string | null;
    next_review_at: string | null;
    has_sources: boolean;
    status: 'unassessed' | 'in_progress' | 'completed';
    prerequisites: string[];
  }>;
  recent_attempts: StoredAttempt[];
  recommended_review: {
    concept_id: string;
    name: string;
    mastery_score: number;
    due_at: string;
    reason: 'weak_topic' | 'scheduled_review';
  } | null;
}
