import Anthropic from '@anthropic-ai/sdk';
import { BodyLanguageFeatures } from '../types';
import * as crypto from 'crypto';

const anthropic = new Anthropic({
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
export async function getTextEmbedding(text: string): Promise<number[]> {
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
      .map((block) => (block as { type: 'text'; text: string }).text)
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
  } catch (error) {
    console.error('Embedding error:', error);
    
    // Fallback: Generate deterministic embedding from text hash
    return generateHashBasedEmbedding(text);
  }
}

/**
 * Generate a deterministic embedding vector from text using hash-based approach
 * This ensures consistent embeddings for the same text
 */
function generateHashBasedEmbedding(text: string): number[] {
  const hash = crypto.createHash('sha256').update(text).digest();
  const embedding: number[] = [];
  
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
export function normalizeBodyLanguageFeatures(body: BodyLanguageFeatures): number[] {
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
export function buildFeatureVector(
  embedding: number[],
  body: BodyLanguageFeatures
): number[] {
  const bodyFeatures = normalizeBodyLanguageFeatures(body);
  return [...embedding, ...bodyFeatures];
}

/**
 * Build a complete question vector from transcript and body language
 * @param transcript Text transcript
 * @param body Body language features
 * @returns Combined feature vector
 */
export async function buildQuestionVector(
  transcript: string,
  body: BodyLanguageFeatures
): Promise<number[]> {
  const embedding = await getTextEmbedding(transcript);
  return buildFeatureVector(embedding, body);
}


