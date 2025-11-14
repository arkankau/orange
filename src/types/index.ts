export interface BodyLanguageFeatures {
  warmth: number; // 0–1
  competence: number; // 0–1
  affect: number; // 0–1
  eyeContactRatio: number; // 0–1
  gestureIntensity: number; // 0–1
  postureStability: number; // 0–1
}

export interface Question {
  id: string;
  sessionId: string;
  index: number; // Q1=1, Q2=2, ...
  startTs: number; // seconds from start of recording
  endTs: number;
  transcript?: string;
  bodyLanguage?: BodyLanguageFeatures;
  vector?: number[];
}

export interface Session {
  id: string;
  mediaPath: string; // path or URL to full recording
  questions: Question[];
  createdAt: Date;
  processedAt?: Date;
}

export interface QuestionVectorRecord {
  id: string;
  sessionId: string;
  questionIndex: number;
  vector: number[];
  bodyLanguage: BodyLanguageFeatures;
  transcript: string;
  createdAt: Date;
}

export interface CreateSessionRequest {
  mediaPath?: string; // Optional for real-time streaming sessions
  questions: Array<{
    index: number;
    startTs: number;
    endTs: number;
  }>;
}


