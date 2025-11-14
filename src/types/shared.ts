export type BodyLanguageFeatures = {
  warmth: number;
  competence: number;
  affect: number;
  eyeContactRatio?: number;
  gestureIntensity?: number;
  postureStability?: number;
};

export type FrameworkMatch = {
  id: string;
  name: string;
  score: number;
  category: "case_type" | "skill";
};

export type MindmapTree = Record<string, string[]>;

export type MindmapDelta = {
  missing: string[];
  misprioritized: string[];
  redundant: string[];
};

export type MindmapAnalysis = {
  your_model: { tree: MindmapTree };
  ideal_model: { tree: MindmapTree };
  delta: MindmapDelta;
  fix_summary: string;
};

export type GradingResult = {
  structureScore: number;
  insightScore: number;
  communicationScore: number;
  bodyLanguageScore?: number;
  comments: string[];
};

export type QuestionResult = {
  sessionId: string;
  questionIndex: number;
  transcript: string;
  frameworkMatch: FrameworkMatch;
  mindmap: MindmapAnalysis;
  grading: GradingResult;
  bodyLanguage?: BodyLanguageFeatures;
};

