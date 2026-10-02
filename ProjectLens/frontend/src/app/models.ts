export type Role = "TRAINER" | "POD_LEAD" | "POD_MEMBER";
export type Status =
  | "NEEDS_IMPROVEMENT"
  | "PENDING_REVIEW"
  | "APPROVED"
  | "NEEDS_REVISION"
  | "REJECTED";
export type Decision = "APPROVED" | "NEEDS_REVISION" | "REJECTED";
export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  podId: number | null;
  podName: string | null;
}
export interface Session {
  token: string;
  expiresAt: string;
  user: User;
}
export interface Criterion {
  id: number;
  title: string;
  description: string;
  learningObjective: string;
  keywords: string[];
  active: boolean;
}
export interface CriterionMatch {
  id: number;
  title: string;
  description: string;
  keywords: string[];
  matchedKeywords: string[];
}
export interface Evaluation {
  alignmentScore: number;
  matchedCriteria: CriterionMatch[];
  missingCriteria: CriterionMatch[];
  overlapDetails: string;
  similarSubmissionId: number | null;
  similarity: number;
  sharedTerms: string[];
  evaluatedAt: string;
  scoringExplanation: string;
  source: "RULE_BASED" | "GEMINI";
}
export interface ReviewDecision {
  id: number;
  decision: Decision;
  comments: string;
  trainerName: string;
  decidedAt: string;
}
export interface Technology {
  name: string;
  category:
    | "FRONTEND"
    | "BACKEND"
    | "DATABASE"
    | "LANGUAGE"
    | "DEVOPS_CLOUD"
    | "TOOLS_OTHER";
}
export interface Submission {
  id: number;
  version: number;
  projectTitle: string;
  problemStatement: string;
  objectives: string;
  technologyStack: Technology[];
  documentationLink: string;
  submissionDate: string;
  alignmentScore: number;
  overlapLevel: "LOW" | "MEDIUM" | "HIGH";
  overlapFlag: boolean;
  status: Status;
  podId: number;
  podName: string;
  submittedBy: string;
  evaluation: Evaluation;
  decisions: ReviewDecision[];
  updatedAt: string;
}
export interface SubmissionRequest {
  projectTitle: string;
  problemStatement: string;
  objectives: string;
  technologyStack: Technology[];
  documentationLink: string;
  version?: number;
}
export interface Stats {
  totalSubmissions: number;
  averageAlignmentScore: number;
  overlapFlags: number;
  pendingReview: number;
  approved: number;
  needsRevision: number;
  rejected: number;
  reviewThreshold: number;
}
export interface Dashboard {
  stats: Stats;
  submissions: Submission[];
}
export interface CriteriaSet {
  theme: string;
  reviewThreshold: number;
  overlapMedium: number;
  overlapHigh: number;
  criteria: Criterion[];
}
export interface Notification {
  id: number;
  title: string;
  message: string;
  submissionId: number | null;
  read: boolean;
  createdAt: string;
}
