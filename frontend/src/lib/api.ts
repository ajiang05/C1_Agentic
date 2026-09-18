/**
 * Shared API client — People 2 & 3 use this; Person 1 owns contract alignment.
 */
import type {
  CreateStudentResponse,
  GenerateJourneyResponse,
  HealthResponse,
  LearningJourney,
  LearningPreferences,
  Lesson,
  StudentProgress,
  SubmitAttemptRequest,
  SubmitAttemptResponse,
  UploadCourseResponse,
} from "@contracts/types";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") || "/api/v1";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, init);
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${detail}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  health: () => request<HealthResponse>("/health"),

  createStudent: (display_name: string, accessToken?: string) =>
    request<CreateStudentResponse>("/students", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify({ display_name }),
    }),

  updatePreferences: (studentId: string, preferences: LearningPreferences) =>
    request<LearningPreferences>(`/students/${studentId}/preferences`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ preferences }),
    }),

  uploadCourse: async (params: {
    studentId: string;
    courseName: string;
    syllabus: File;
    notes: File;
  }): Promise<UploadCourseResponse> => {
    const form = new FormData();
    form.append("student_id", params.studentId);
    form.append("course_name", params.courseName);
    form.append("syllabus", params.syllabus);
    form.append("notes", params.notes);
    return request<UploadCourseResponse>("/courses/upload", {
      method: "POST",
      body: form,
    });
  },

  generateJourney: (courseId: string, studentId: string) =>
    request<GenerateJourneyResponse>(`/courses/${courseId}/journey`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ student_id: studentId }),
    }),

  getJourney: (courseId: string, studentId: string) =>
    request<LearningJourney>(
      `/courses/${courseId}/journey?student_id=${encodeURIComponent(studentId)}`,
    ),

  getLesson: (courseId: string, conceptId: string, studentId: string) =>
    request<Lesson>(
      `/courses/${courseId}/lessons/${conceptId}?student_id=${encodeURIComponent(studentId)}`,
    ),

  submitAttempt: (body: SubmitAttemptRequest) =>
    request<SubmitAttemptResponse>("/attempts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),

  getProgress: (studentId: string, courseId: string) =>
    request<StudentProgress>(
      `/students/${studentId}/progress?course_id=${encodeURIComponent(courseId)}`,
    ),
};
