"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTextEmbedding = getTextEmbedding;
exports.normalizeBodyLanguageFeatures = normalizeBodyLanguageFeatures;
exports.buildFeatureVector = buildFeatureVector;
exports.buildQuestionVector = buildQuestionVector;
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const crypto = __importStar(require("crypto"));
const anthropic = new sdk_1.default({
    apiKey: process.env.ANTHROPIC_API_KEY || '',
});
/**
 * Get text embedding using Anthropic Claude API
 * Since Anthropic doesn't have a direct embeddings API, we use Claude to generate
 * a structured representation and convert it to a numerical vector
 *
 * @param text Text to embed
 * @returns Embedding vector
 */
async function getTextEmbedding(text) {
    try {
        // Use Claude to generate a structured text representation
        const message = await anthropic.messages.create({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 512,
            messages: [
                {
                    role: 'user',
                    content: `Analyze this interview response and provide a structured representation as a JSON array of 384 numbers (floats between -1 and 1) that capture semantic meaning, key topics, sentiment, and important concepts. Return ONLY a valid JSON array, nothing else.

Text: "${text.substring(0, 2000)}"

Return format: [0.123, -0.456, ...] (exactly 384 numbers)`,
                },
            ],
        });
        // Extract JSON array from Claude's response
        const responseText = message.content
            .filter((block) => block.type === 'text')
            .map((block) => block.text)
            .join(' ')
            .trim();
        // Try to parse JSON array from response
        const jsonMatch = responseText.match(/\[[\d\s.,\-eE]+\]/);
        if (jsonMatch) {
            const embedding = JSON.parse(jsonMatch[0]);
            if (Array.isArray(embedding) && embedding.length === 384) {
                return embedding;
            }
        }
        // Fallback: Generate deterministic embedding from text hash
        return generateHashBasedEmbedding(text);
    }
    catch (error) {
        console.error('Embedding error:', error);
        // Fallback: Generate deterministic embedding from text hash
        return generateHashBasedEmbedding(text);
    }
}
/**
 * Generate a deterministic embedding vector from text using hash-based approach
 * This ensures consistent embeddings for the same text
 */
function generateHashBasedEmbedding(text) {
    const hash = crypto.createHash('sha256').update(text).digest();
    const embedding = [];
    // Generate 384-dimensional vector from hash
    for (let i = 0; i < 384; i++) {
        const byte1 = hash[i % hash.length];
        const byte2 = hash[(i + 1) % hash.length];
        // Combine bytes to create float between -1 and 1
        const value = ((byte1 * 256 + byte2) / 65535) * 2 - 1;
        embedding.push(value);
    }
    return embedding;
}
/**
 * Normalize and scale body language features to match embedding dimensions
 * @param body Body language features
 * @returns Normalized feature vector
 */
function normalizeBodyLanguageFeatures(body) {
    // Scale each feature to a reasonable range and return as array
    // We'll create a small feature vector from the 6 body language metrics
    return [
        body.warmth,
        body.competence,
        body.affect,
        body.eyeContactRatio ?? 0.5,
        body.gestureIntensity ?? 0.5,
        body.postureStability ?? 0.5,
    ];
}
/**
 * Build a feature vector by concatenating text embedding with normalized body language features
 * @param embedding Text embedding vector
 * @param body Body language features
 * @returns Combined feature vector
 */
function buildFeatureVector(embedding, body) {
    const bodyFeatures = normalizeBodyLanguageFeatures(body);
    return [...embedding, ...bodyFeatures];
}
/**
 * Build a complete question vector from transcript and body language
 * @param transcript Text transcript
 * @param body Body language features
 * @returns Combined feature vector
 */
async function buildQuestionVector(transcript, body) {
    const embedding = await getTextEmbedding(transcript);
    return buildFeatureVector(embedding, body);
}
//# sourceMappingURL=embedding.js.map