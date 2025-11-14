import { Session, Question } from '../types';
import { v4 as uuidv4 } from 'uuid';

// In-memory session store
// TODO: Replace with a proper database (PostgreSQL, MongoDB, etc.) for production
const sessions: Map<string, Session> = new Map();

export async function createSession(
  mediaPath: string,
  questionBoundaries: Array<{ index: number; startTs: number; endTs: number }>
): Promise<Session> {
  const sessionId = uuidv4();
  const questions: Question[] = questionBoundaries.map((qb) => ({
    id: uuidv4(),
    sessionId,
    index: qb.index,
    startTs: qb.startTs,
    endTs: qb.endTs,
  }));

  const session: Session = {
    id: sessionId,
    mediaPath,
    questions,
    createdAt: new Date(),
  };

  sessions.set(sessionId, session);
  return session;
}

export async function getSession(sessionId: string): Promise<Session | null> {
  return sessions.get(sessionId) || null;
}

export async function updateSession(session: Session): Promise<void> {
  sessions.set(session.id, session);
}

export async function getAllSessions(): Promise<Session[]> {
  return Array.from(sessions.values());
}


