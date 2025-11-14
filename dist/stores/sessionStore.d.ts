import { Session } from '../types';
export declare function createSession(mediaPath: string, questionBoundaries: Array<{
    index: number;
    startTs: number;
    endTs: number;
}>): Promise<Session>;
export declare function getSession(sessionId: string): Promise<Session | null>;
export declare function updateSession(session: Session): Promise<void>;
export declare function getAllSessions(): Promise<Session[]>;
//# sourceMappingURL=sessionStore.d.ts.map