"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveQuestionVector = saveQuestionVector;
exports.getVectorsBySession = getVectorsBySession;
exports.getVectorById = getVectorById;
const uuid_1 = require("uuid");
// In-memory vector store
// TODO: Replace with a proper vector database (Pinecone, Qdrant, pgvector, etc.) for production
const vectors = new Map();
const sessionVectors = new Map(); // sessionId -> vectorIds[]
async function saveQuestionVector(record) {
    const vectorRecord = {
        ...record,
        id: (0, uuid_1.v4)(),
        createdAt: new Date(),
    };
    vectors.set(vectorRecord.id, vectorRecord);
    // Track vectors by session
    if (!sessionVectors.has(record.sessionId)) {
        sessionVectors.set(record.sessionId, []);
    }
    sessionVectors.get(record.sessionId).push(vectorRecord.id);
    return vectorRecord;
}
async function getVectorsBySession(sessionId) {
    const vectorIds = sessionVectors.get(sessionId) || [];
    return vectorIds
        .map((id) => vectors.get(id))
        .filter((v) => v !== undefined)
        .sort((a, b) => a.questionIndex - b.questionIndex);
}
async function getVectorById(vectorId) {
    return vectors.get(vectorId) || null;
}
//# sourceMappingURL=vectorStore.js.map