/**
 * API Client for orange Interview Coach Backend
 */
import { QuestionResult, BodyLanguageFeatures } from '../types/api';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api';

export interface AnalyzeQuestionRequest {
  sessionId: string;
  questionIndex: number;
  audioBlob?: Blob;
  transcript?: string;
  bodyLanguage?: BodyLanguageFeatures;
  audioUrl?: string;
}

/**
 * Analyze a question using the orchestration endpoint
 */
export async function analyzeQuestion(
  request: AnalyzeQuestionRequest
): Promise<QuestionResult> {
  const formData = new FormData();
  
  if (request.audioBlob) {
    formData.append('audio', request.audioBlob, 'audio.webm');
  }
  
  if (request.transcript) {
    formData.append('transcript', request.transcript);
  }
  
  if (request.bodyLanguage) {
    formData.append('bodyLanguage', JSON.stringify(request.bodyLanguage));
  }
  
  if (request.audioUrl) {
    formData.append('audioUrl', request.audioUrl);
  }

  const response = await fetch(
    `${API_BASE_URL}/sessions/${request.sessionId}/questions/${request.questionIndex}/analyze`,
    {
      method: 'POST',
      body: formData,
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Create a new session
 */
export async function createSession(mediaPath?: string, questions?: Array<{ index: number; startTs: number; endTs: number }>) {
  const response = await fetch(`${API_BASE_URL}/sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      mediaPath,
      questions: questions || [],
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get session details
 */
export async function getSession(sessionId: string) {
  const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

