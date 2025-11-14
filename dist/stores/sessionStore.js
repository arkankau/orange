"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSession = createSession;
exports.getSession = getSession;
exports.updateSession = updateSession;
exports.getAllSessions = getAllSessions;
const uuid_1 = require("uuid");
// In-memory session store
// TODO: Replace with a proper database (PostgreSQL, MongoDB, etc.) for production
const sessions = new Map();
async function createSession(mediaPath, questionBoundaries) {
    const sessionId = (0, uuid_1.v4)();
    const questions = questionBoundaries.map((qb) => ({
        id: (0, uuid_1.v4)(),
        sessionId,
        index: qb.index,
        startTs: qb.startTs,
        endTs: qb.endTs,
    }));
    const session = {
        id: sessionId,
        mediaPath,
        questions,
        createdAt: new Date(),
    };
    sessions.set(sessionId, session);
    return session;
}
async function getSession(sessionId) {
    return sessions.get(sessionId) || null;
}
async function updateSession(session) {
    sessions.set(session.id, session);
}
async function getAllSessions() {
    return Array.from(sessions.values());
}
//# sourceMappingURL=sessionStore.js.map