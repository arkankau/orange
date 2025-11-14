# Frontend Integration Guide

## API Endpoint

**POST** `/api/sessions/:sessionId/questions/:questionIndex/analyze`

## Request Format

### Option 1: Upload Audio File
```typescript
const formData = new FormData();
formData.append('audio', audioBlob, 'recording.webm');
formData.append('bodyLanguage', JSON.stringify({
  warmth: 0.7,
  competence: 0.8,
  affect: 0.6,
  eyeContactRatio: 0.75,
  gestureIntensity: 0.5,
  postureStability: 0.8
}));

const response = await fetch(
  `http://localhost:5001/api/sessions/${sessionId}/questions/${questionIndex}/analyze`,
  {
    method: 'POST',
    body: formData
  }
);
```

### Option 2: Use Existing Transcript
```typescript
const response = await fetch(
  `http://localhost:5001/api/sessions/${sessionId}/questions/${questionIndex}/analyze`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      transcript: 'Your transcribed text here...',
      bodyLanguage: {
        warmth: 0.7,
        competence: 0.8,
        affect: 0.6
      }
    })
  }
);
```

## Response Type

```typescript
interface QuestionResult {
  sessionId: string;
  questionIndex: number;
  transcript: string;
  frameworkMatch: {
    id: string;
    name: string;
    score: number;
    category: "case_type" | "skill";
  };
  mindmap: {
    your_model: { tree: Record<string, string[]> };
    ideal_model: { tree: Record<string, string[]> };
    delta: {
      missing: string[];
      misprioritized: string[];
      redundant: string[];
    };
    fix_summary: string;
  };
  grading: {
    structureScore: number;
    insightScore: number;
    communicationScore: number;
    bodyLanguageScore?: number;
    comments: string[];
  };
  bodyLanguage?: BodyLanguageFeatures;
}
```

## React Example

```typescript
// src/api/questions.ts
import { QuestionResult, BodyLanguageFeatures } from './types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api';

export async function analyzeQuestion(
  sessionId: string,
  questionIndex: number,
  audioBlob: Blob,
  bodyLanguage?: BodyLanguageFeatures
): Promise<QuestionResult> {
  const formData = new FormData();
  formData.append('audio', audioBlob);
  
  if (bodyLanguage) {
    formData.append('bodyLanguage', JSON.stringify(bodyLanguage));
  }

  const res = await fetch(
    `${API_BASE}/sessions/${sessionId}/questions/${questionIndex}/analyze`,
    { method: 'POST', body: formData }
  );

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Analysis failed');
  }
  
  return res.json();
}

// Alternative: Use existing transcript
export async function analyzeQuestionWithTranscript(
  sessionId: string,
  questionIndex: number,
  transcript: string,
  bodyLanguage?: BodyLanguageFeatures
): Promise<QuestionResult> {
  const res = await fetch(
    `${API_BASE}/sessions/${sessionId}/questions/${questionIndex}/analyze`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript, bodyLanguage }),
    }
  );

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Analysis failed');
  }
  
  return res.json();
}
```

## React Component Example

```typescript
// src/components/QuestionAnalysis.tsx
import { useState } from 'react';
import { analyzeQuestion } from '../api/questions';
import { QuestionResult, BodyLanguageFeatures } from '../types';

export function QuestionAnalysis({ 
  sessionId, 
  questionIndex,
  audioBlob,
  bodyLanguage 
}: {
  sessionId: string;
  questionIndex: number;
  audioBlob: Blob;
  bodyLanguage?: BodyLanguageFeatures;
}) {
  const [result, setResult] = useState<QuestionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const analysis = await analyzeQuestion(
        sessionId,
        questionIndex,
        audioBlob,
        bodyLanguage
      );
      setResult(analysis);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Analyzing...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!result) return <button onClick={handleAnalyze}>Analyze Question</button>;

  return (
    <div>
      <h2>Question {questionIndex} Analysis</h2>
      
      {/* Framework Match */}
      <div>
        <h3>Framework: {result.frameworkMatch.name}</h3>
        <p>Match Score: {Math.round(result.frameworkMatch.score * 100)}%</p>
      </div>

      {/* Grading Scores */}
      <div>
        <h3>Scores</h3>
        <ul>
          <li>Structure: {result.grading.structureScore}/100</li>
          <li>Insight: {result.grading.insightScore}/100</li>
          <li>Communication: {result.grading.communicationScore}/100</li>
          {result.grading.bodyLanguageScore && (
            <li>Body Language: {result.grading.bodyLanguageScore}/100</li>
          )}
        </ul>
      </div>

      {/* Comments */}
      <div>
        <h3>Feedback</h3>
        <ul>
          {result.grading.comments.map((comment, i) => (
            <li key={i}>{comment}</li>
          ))}
        </ul>
      </div>

      {/* Mind Map Analysis */}
      <div>
        <h3>Mind Map Analysis</h3>
        <p>{result.mindmap.fix_summary}</p>
        
        {result.mindmap.delta.missing.length > 0 && (
          <div>
            <h4>Missing Concepts:</h4>
            <ul>
              {result.mindmap.delta.missing.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Transcript */}
      <div>
        <h3>Transcript</h3>
        <p>{result.transcript}</p>
      </div>
    </div>
  );
}
```

## Usage in Recording Flow

```typescript
// In your recording component
const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
const [audioChunks, setAudioChunks] = useState<Blob[]>([]);

const stopRecording = async () => {
  if (mediaRecorder) {
    mediaRecorder.stop();
    mediaRecorder.onstop = async () => {
      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
      
      // Get body language metrics (from your existing tracking)
      const bodyLanguage = {
        warmth: 0.7,
        competence: 0.8,
        affect: 0.6,
        eyeContactRatio: 0.75,
        gestureIntensity: 0.5,
        postureStability: 0.8
      };

      // Analyze the question
      try {
        const result = await analyzeQuestion(
          sessionId,
          currentQuestionIndex,
          audioBlob,
          bodyLanguage
        );
        
        // Store result in state
        setQuestionResults(prev => ({
          ...prev,
          [currentQuestionIndex]: result
        }));
        
        // Show toast
        toast.success(`Question ${currentQuestionIndex} feedback ready!`);
      } catch (error) {
        toast.error('Analysis failed. Please try again.');
      }
    };
  }
};
```

