import { QuestionVectorRecord } from '../types';
export declare function saveQuestionVector(record: Omit<QuestionVectorRecord, 'id' | 'createdAt'>): Promise<QuestionVectorRecord>;
export declare function getVectorsBySession(sessionId: string): Promise<QuestionVectorRecord[]>;
export declare function getVectorById(vectorId: string): Promise<QuestionVectorRecord | null>;
//# sourceMappingURL=vectorStore.d.ts.map