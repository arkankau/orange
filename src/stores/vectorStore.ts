import { QuestionVectorRecord } from '../types';
import { v4 as uuidv4 } from 'uuid';

// In-memory vector store
// TODO: Replace with a proper vector database (Pinecone, Qdrant, pgvector, etc.) for production
const vectors: Map<string, QuestionVectorRecord> = new Map();
const sessionVectors: Map<string, string[]> = new Map(); // sessionId -> vectorIds[]

export async function saveQuestionVector(record: Omit<QuestionVectorRecord, 'id' | 'createdAt'>): Promise<QuestionVectorRecord> {
  const vectorRecord: QuestionVectorRecord = {
    ...record,
    id: uuidv4(),
    createdAt: new Date(),
  };

  vectors.set(vectorRecord.id, vectorRecord);

  // Track vectors by session
  if (!sessionVectors.has(record.sessionId)) {
    sessionVectors.set(record.sessionId, []);
  }
  sessionVectors.get(record.sessionId)!.push(vectorRecord.id);

  return vectorRecord;
}

export async function getVectorsBySession(sessionId: string): Promise<QuestionVectorRecord[]> {
  const vectorIds = sessionVectors.get(sessionId) || [];
  return vectorIds
    .map((id) => vectors.get(id))
    .filter((v): v is QuestionVectorRecord => v !== undefined)
    .sort((a, b) => a.questionIndex - b.questionIndex);
}

export async function getVectorById(vectorId: string): Promise<QuestionVectorRecord | null> {
  return vectors.get(vectorId) || null;
}


