export type ExamModule = "CA" | "MIDTERM";
export type ExamStatus = "draft" | "published" | "hidden" | "closed";
export type AttemptStatus = "active" | "submitted" | "expired";

export interface Question {
  id: string;
  question_text: string;
  options: string[];
  correct_index?: number; // stripped before sending to students
  sort_order: number;
}

export interface Exam {
  id: string;
  module_type: ExamModule;
  teacher_id: string;
  class_id: string;
  subject_id: string;
  title: string;
  instructions: string;
  duration_minutes: number;
  num_questions: number;
  passing_score: number;
  randomize_questions: boolean;
  scheduled_date: string | null;
  status: ExamStatus;
}

export interface ExamAttempt {
  id: string;
  exam_id: string;
  student_id: string;
  question_order: string[];
  answers: Record<string, number>;
  flagged: string[];
  started_at: string;
  last_saved_at: string;
  submitted_at: string | null;
  status: AttemptStatus;
  score: number | null;
}
