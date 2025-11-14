/**
 * Mental Model Service
 * Analyzes transcript to match frameworks and generate mind maps
 * Integrated from mm branch
 */
import Anthropic from '@anthropic-ai/sdk';
import * as fs from 'fs/promises';
import * as path from 'path';
import { getTextEmbedding } from './embedding';
import { BodyLanguageFeatures, FrameworkMatch, MindmapAnalysis, MindmapTree } from '../types/shared';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

// Framework knowledge base entry type
interface FrameworkKBEntry {
  id: string;
  name: string;
  domain: string;
  category: string;
  source: string;
  description: string;
  tags: string[];
  tree: MindmapTree;
  embedding?: number[];
}

// Framework knowledge base (from mm branch)
const FRAMEWORKS_SEED: Omit<FrameworkKBEntry, 'embedding'>[] = [
  {
    id: "profitability",
    name: "Profitability Framework",
    domain: "consulting",
    category: "case_type",
    source: "Consulting Casebook",
    description: "Break profit into revenue and cost drivers. Analyze revenue (price x volume) and costs (fixed and variable). Consider market size, competition, and customer segments.",
    tags: ["profitability", "revenue", "costs", "pricing", "volume"],
    tree: {
      "Profit": ["Revenue", "Costs"],
      "Revenue": ["Price", "Volume"],
      "Costs": ["Fixed Costs", "Variable Costs"],
      "Price": ["Pricing Strategy", "Market Position"],
      "Volume": ["Market Share", "Market Size"],
      "Fixed Costs": ["Rent", "Salaries", "Overhead"],
      "Variable Costs": ["COGS", "Commission", "Materials"]
    }
  },
  {
    id: "market_entry",
    name: "Market Entry Framework",
    domain: "consulting",
    category: "case_type",
    source: "Consulting Casebook",
    description: "Evaluate market attractiveness, competitive landscape, and company capabilities. Consider barriers to entry, customer segments, and distribution channels.",
    tags: ["market entry", "strategy", "competition", "capabilities"],
    tree: {
      "Market Entry": ["Market Attractiveness", "Competitive Landscape", "Company Capabilities"],
      "Market Attractiveness": ["Market Size", "Growth Rate", "Profitability"],
      "Competitive Landscape": ["Number of Players", "Market Share", "Barriers to Entry"],
      "Company Capabilities": ["Resources", "Core Competencies", "Distribution"]
    }
  },
  {
    id: "growth",
    name: "Growth Strategy Framework",
    domain: "consulting",
    category: "case_type",
    source: "Consulting Casebook",
    description: "Analyze growth opportunities through market penetration, market development, product development, and diversification strategies.",
    tags: ["growth", "strategy", "expansion", "market development"],
    tree: {
      "Growth": ["Organic Growth", "Inorganic Growth"],
      "Organic Growth": ["Market Penetration", "Market Development", "Product Development"],
      "Inorganic Growth": ["Acquisition", "Joint Venture", "Partnership"],
      "Market Penetration": ["Increase Usage", "Win Competitors"],
      "Market Development": ["New Geographies", "New Segments"]
    }
  },
  {
    id: "ma",
    name: "M&A Framework",
    domain: "consulting",
    category: "case_type",
    source: "Consulting Casebook",
    description: "Evaluate merger and acquisition opportunities by assessing standalone value, synergies, financials, and integration risks.",
    tags: ["M&A", "acquisition", "valuation", "synergies"],
    tree: {
      "M&A": ["Stand Alone Value", "Value in Combination", "Execution Risk"],
      "Stand Alone Value": ["Target Financials", "Market Position"],
      "Value in Combination": ["Cost Synergies", "Revenue Synergies"],
      "Execution Risk": ["Integration", "Cultural Fit", "Timeline"]
    }
  },
  {
    id: "pricing",
    name: "Pricing Framework",
    domain: "consulting",
    category: "case_type",
    source: "Consulting Casebook",
    description: "Determine optimal pricing strategy by analyzing customers, product value, competition, and costs.",
    tags: ["pricing", "strategy", "value", "competition"],
    tree: {
      "Pricing": ["Customer Analysis", "Product Value", "Competition", "Costs"],
      "Customer Analysis": ["Willingness to Pay", "Price Sensitivity", "Segments"],
      "Product Value": ["Differentiation", "Quality", "Brand"],
      "Competition": ["Competitor Pricing", "Market Position"]
    }
  }
];

// Framework Store with embedding-based matching (from mm branch)
class FrameworkStore {
  private kb: FrameworkKBEntry[] = [];

  async seed() {
    this.kb = await Promise.all(FRAMEWORKS_SEED.map(async (fw) => {
      const embeddingText = `${fw.name} ${fw.description} ${fw.tags.join(',')} ${JSON.stringify(fw.tree)}`;
      const embedding = await getTextEmbedding(embeddingText);
      return {
        ...fw,
        embedding,
      };
    }));
    console.log(`✅ Framework store seeded with ${this.kb.length} frameworks`);
  }

  async search(queryEmbedding: number[], topK = 3): Promise<Array<{ entry: FrameworkKBEntry; score: number }>> {
    if (this.kb.length === 0) {
      await this.seed();
    }

    const cosineSimilarity = (a: number[], b: number[]): number => {
      const dot = a.reduce((sum, ai, i) => sum + ai * (b[i] || 0), 0);
      const normA = Math.sqrt(a.reduce((sum, ai) => sum + ai * ai, 0));
      const normB = Math.sqrt(b.reduce((sum, bi) => sum + (bi || 0) * (bi || 0), 0));
      if (normA === 0 || normB === 0) return 0;
      return dot / (normA * normB);
    };

    const scored = this.kb.map(entry => ({
      entry,
      score: cosineSimilarity(queryEmbedding, entry.embedding || []),
    }));
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK);
  }
}

const frameworkStore = new FrameworkStore();

/**
 * Match transcript to best framework using embedding-based similarity (from mm branch)
 */
async function matchFramework(transcript: string): Promise<FrameworkMatch> {
  const queryText = `Candidate consulting case answer: ${transcript}`;
  const queryEmbedding = await getTextEmbedding(queryText);
  const results = await frameworkStore.search(queryEmbedding, 1);

  if (results.length > 0 && results[0].score > 0.3) {
    const best = results[0].entry;
    return {
      id: best.id,
      name: best.name,
      score: results[0].score,
      category: best.category === 'case_type' ? 'case_type' : 'skill',
    };
  }

  // Fallback to first framework if no good match
  const fallback = FRAMEWORKS_SEED[0];
  return {
    id: fallback.id,
    name: fallback.name,
    score: 0.5,
    category: fallback.category === 'case_type' ? 'case_type' : 'skill',
  };
}

/**
 * Get framework by ID
 */
async function getFrameworkById(id: string): Promise<FrameworkKBEntry | null> {
  // Ensure store is seeded
  await frameworkStore.seed();
  
  // Find in seed data
  const frameworkSeed = FRAMEWORKS_SEED.find(f => f.id === id);
  if (!frameworkSeed) return null;

  // Generate embedding if needed
  const embeddingText = `${frameworkSeed.name} ${frameworkSeed.description} ${frameworkSeed.tags.join(',')} ${JSON.stringify(frameworkSeed.tree)}`;
  const embedding = await getTextEmbedding(embeddingText);

  return {
    ...frameworkSeed,
    embedding,
  };
}

// System prompt from claude branch
const SYSTEM_PROMPT = `You are a consulting interview coach. You extract mental models from candidate interview answers, compare them against ideal frameworks, and output ONLY structured JSON. Do NOT reveal chain-of-thought. Use internal reasoning silently and produce only valid JSON according to the schema. Your job: (1) extract the candidate's mental model as a tree, (2) restate the ideal framework tree, (3) compute missing/misaligned components, and (4) provide a one-minute fix summary.`;

/**
 * Build user prompt (from claude branch)
 */
function buildUserPrompt(
  transcript: string,
  frameworkName: string,
  frameworkTree: MindmapTree,
  bodyLanguage: BodyLanguageFeatures
): string {
  return `Given the following input, return ONLY valid JSON per the schema below.

SCHEMA:
{
  "your_model": {
    "tree": { "<string>": ["<string>", "..."] }
  },
  "ideal_model": {
    "tree": { "<string>": ["<string>", "..."] }
  },
  "delta": {
    "missing": ["<string>", "..."],
    "misprioritized": ["<string>", "..."],
    "redundant": ["<string>", "..."]
  },
  "fix_summary": "<string>"
}

INPUT:
Transcript:
${transcript}

Framework name: ${frameworkName}
Framework tree:
${JSON.stringify(frameworkTree, null, 2)}

Body language scores:
${JSON.stringify(bodyLanguage, null, 2)}

OUTPUT REQUIREMENTS:
- Extract the candidate's mental model tree (from the transcript).
- Output the ideal model tree exactly as provided.
- Compare the two to produce missing, misprioritized, and redundant components.
- Write a concise 1-minute fix to improve the structure.
- Output ONLY valid JSON. No prose, no explanation.`;
}

/**
 * Generate mind map analysis using Claude (from claude + mm branches)
 */
async function generateMindmap(
  transcript: string,
  framework: FrameworkKBEntry,
  bodyLanguage: BodyLanguageFeatures
): Promise<MindmapAnalysis> {
  const userPrompt = buildUserPrompt(
    transcript,
    framework.name,
    framework.tree,
    bodyLanguage
  );

  try {
    console.log(`📞 Calling Claude API for mind map analysis (framework: ${framework.name})...`);
    
    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    });

    const responseText = message.content
      .filter((block) => block.type === 'text')
      .map((block) => (block as { type: 'text'; text: string }).text)
      .join(' ')
      .trim();

    // Clean up JSON (remove markdown code blocks if present)
    let cleanedText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    // Extract JSON
    // Try to extract JSON from response
    let jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      // Try to find JSON in code blocks
      const codeBlockMatch = cleanedText.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
      if (codeBlockMatch) {
        jsonMatch = [codeBlockMatch[1]];
      }
    }
    
    if (jsonMatch) {
      try {
        const analysis = JSON.parse(jsonMatch[0]);
        console.log(`✅ Mind map analysis parsed successfully`);
        console.log(`   Your model keys: ${Object.keys(analysis.your_model?.tree || {}).length}`);
        console.log(`   Ideal model keys: ${Object.keys(analysis.ideal_model?.tree || framework.tree).length}`);
        
        // Ensure we have valid trees
        const yourTree = analysis.your_model?.tree || {};
        const idealTree = analysis.ideal_model?.tree || framework.tree;
        
        // If your_tree is empty, use fallback
        if (Object.keys(yourTree).length === 0) {
          console.warn('⚠️ Your model tree is empty, using fallback');
          return simpleFallbackAnalysis(transcript, framework);
        }
        
        return {
          your_model: { tree: yourTree },
          ideal_model: { tree: idealTree },
          delta: {
            missing: analysis.delta?.missing || [],
            misprioritized: analysis.delta?.misprioritized || [],
            redundant: analysis.delta?.redundant || [],
          },
          fix_summary: analysis.fix_summary || 'Analysis generated successfully.',
        };
      } catch (parseError) {
        console.error('❌ JSON parse error:', parseError);
        console.error('Response text (first 1000 chars):', cleanedText.substring(0, 1000));
      }
    }

    // Fallback if JSON parsing fails
    console.warn('⚠️ Failed to parse Claude response, using fallback');
    return simpleFallbackAnalysis(transcript, framework);
  } catch (error) {
    console.error('Mind map generation error:', error);
    return simpleFallbackAnalysis(transcript, framework);
  }
}

/**
 * Simple fallback analysis (from mm branch)
 */
function simpleFallbackAnalysis(transcript: string, framework: FrameworkKBEntry): MindmapAnalysis {
  const words = transcript.toLowerCase();
  const mentionedConcepts = new Set<string>();
  
  // Extract key words from transcript
  const transcriptWords = words.split(/\s+/);
  
  // Check for framework concepts
  Object.keys(framework.tree).forEach(parent => {
    const parentLower = parent.toLowerCase();
    if (transcriptWords.some(w => w.includes(parentLower) || parentLower.includes(w))) {
      mentionedConcepts.add(parent);
    }
    framework.tree[parent]?.forEach(child => {
      const childLower = child.toLowerCase();
      if (transcriptWords.some(w => w.includes(childLower) || childLower.includes(w))) {
        mentionedConcepts.add(child);
      }
    });
  });

  // Build user's tree from mentioned concepts
  const yourTree: MindmapTree = {};
  Object.entries(framework.tree).forEach(([parent, children]) => {
    if (mentionedConcepts.has(parent)) {
      yourTree[parent] = children.filter(c => mentionedConcepts.has(c));
    }
  });

  // If no concepts matched, create a minimal tree from first framework entry
  if (Object.keys(yourTree).length === 0 && Object.keys(framework.tree).length > 0) {
    const firstKey = Object.keys(framework.tree)[0];
    const firstChildren = framework.tree[firstKey] || [];
    // Take first 2-3 children as a basic structure
    yourTree[firstKey] = firstChildren.slice(0, Math.min(3, firstChildren.length));
    console.log(`⚠️ No concepts matched, using minimal tree with ${firstKey}`);
  }

  const allIdealNodes = new Set([
    ...Object.keys(framework.tree),
    ...Object.values(framework.tree).flat()
  ]);
  
  const allUserNodes = new Set([
    ...Object.keys(yourTree),
    ...Object.values(yourTree).flat()
  ]);

  const missing = Array.from(allIdealNodes).filter(n => !allUserNodes.has(n));
  
  return {
    your_model: { tree: yourTree },
    ideal_model: { tree: framework.tree },
    delta: { missing, misprioritized: [], redundant: [] },
    fix_summary: `You covered ${allUserNodes.size} out of ${allIdealNodes.size} key concepts. Focus on: ${missing.slice(0, 3).join(', ')}`
  };
}

/**
 * Analyze mental model - main entry point
 */
export async function analyzeMentalModel(
  transcript: string,
  bodyLanguage: BodyLanguageFeatures
): Promise<{ framework: FrameworkMatch; mindmap: MindmapAnalysis }> {
  console.log('🧠 Analyzing mental model...');
  
  // Match framework using embedding-based similarity
  const frameworkMatch = await matchFramework(transcript);
  console.log(`✅ Matched framework: ${frameworkMatch.name} (score: ${frameworkMatch.score.toFixed(2)})`);

  // Get full framework details
  const framework = await getFrameworkById(frameworkMatch.id);
  if (!framework) {
    throw new Error(`Framework ${frameworkMatch.id} not found`);
  }

  // Generate mind map using Claude
  const mindmap = await generateMindmap(transcript, framework, bodyLanguage);
  console.log(`✅ Generated mind map with ${Object.keys(mindmap.your_model.tree).length} topics`);

  return { framework: frameworkMatch, mindmap };
}
