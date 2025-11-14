"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeMentalModel = analyzeMentalModel;
/**
 * Mental Model Service
 * Analyzes transcript to match frameworks and generate mind maps
 */
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const anthropic = new sdk_1.default({
    apiKey: process.env.ANTHROPIC_API_KEY || '',
});
// Framework knowledge base (simplified - in production this would be a proper database)
const FRAMEWORKS = [
    { id: 'profitability', name: 'Profitability Framework', category: 'case_type', keywords: ['profit', 'revenue', 'cost', 'margin', 'pricing'] },
    { id: 'market-entry', name: 'Market Entry Framework', category: 'case_type', keywords: ['market', 'entry', 'competition', 'customer', 'strategy'] },
    { id: 'pricing', name: 'Pricing Strategy', category: 'case_type', keywords: ['price', 'pricing', 'value', 'cost', 'competition'] },
    { id: 'growth', name: 'Growth Strategy', category: 'case_type', keywords: ['growth', 'expand', 'scale', 'market share', 'revenue'] },
    { id: 'problem-solving', name: 'Problem Solving', category: 'skill', keywords: ['problem', 'solution', 'analyze', 'root cause', 'issue'] },
    { id: 'structured-thinking', name: 'Structured Thinking', category: 'skill', keywords: ['structure', 'framework', 'organize', 'logical', 'systematic'] },
];
/**
 * Match transcript to best framework
 */
async function matchFramework(transcript) {
    const transcriptLower = transcript.toLowerCase();
    // Simple keyword matching (in production, use embeddings for semantic matching)
    let bestMatch = FRAMEWORKS[0];
    let bestScore = 0;
    for (const framework of FRAMEWORKS) {
        let score = 0;
        for (const keyword of framework.keywords) {
            if (transcriptLower.includes(keyword.toLowerCase())) {
                score += 1;
            }
        }
        // Normalize score
        score = score / framework.keywords.length;
        if (score > bestScore) {
            bestScore = score;
            bestMatch = framework;
        }
    }
    // If no good match, default to structured thinking
    if (bestScore < 0.2) {
        bestMatch = FRAMEWORKS.find(f => f.id === 'structured-thinking') || FRAMEWORKS[0];
        bestScore = 0.5;
    }
    return {
        id: bestMatch.id,
        name: bestMatch.name,
        score: bestScore,
        category: bestMatch.category,
    };
}
/**
 * Generate mind map analysis using Claude
 */
async function generateMindmap(transcript, frameworkName) {
    const prompt = `You are analyzing an interview response about "${frameworkName}".

**Transcript:**
"${transcript}"

Generate a mental model analysis in the following JSON format:
{
  "your_model": {
    "tree": {
      "Main Topic": ["Subtopic 1", "Subtopic 2"],
      "Another Topic": ["Point A", "Point B"]
    }
  },
  "ideal_model": {
    "tree": {
      "Main Topic": ["Ideal Subtopic 1", "Ideal Subtopic 2"],
      "Another Topic": ["Ideal Point A", "Ideal Point B"]
    }
  },
  "delta": {
    "missing": ["missing concept 1", "missing concept 2"],
    "misprioritized": ["concept that should be prioritized differently"],
    "redundant": ["redundant or unnecessary concept"]
  },
  "fix_summary": "2-3 sentences explaining what's missing or could be improved"
}

The "your_model" should reflect what the candidate actually said.
The "ideal_model" should show what a strong answer would include for this framework.
The "delta" should identify gaps and issues.
Return ONLY valid JSON, no other text.`;
    try {
        const message = await anthropic.messages.create({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 2048,
            messages: [
                {
                    role: 'user',
                    content: prompt,
                },
            ],
        });
        const responseText = message.content
            .filter((block) => block.type === 'text')
            .map((block) => block.text)
            .join(' ')
            .trim();
        // Extract JSON
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const analysis = JSON.parse(jsonMatch[0]);
            return {
                your_model: { tree: analysis.your_model?.tree || {} },
                ideal_model: { tree: analysis.ideal_model?.tree || {} },
                delta: {
                    missing: analysis.delta?.missing || [],
                    misprioritized: analysis.delta?.misprioritized || [],
                    redundant: analysis.delta?.redundant || [],
                },
                fix_summary: analysis.fix_summary || 'Analysis generated successfully.',
            };
        }
        // Fallback if JSON parsing fails
        return {
            your_model: { tree: { 'Main Point': ['Subpoint 1', 'Subpoint 2'] } },
            ideal_model: { tree: { 'Main Point': ['Ideal Subpoint 1', 'Ideal Subpoint 2'] } },
            delta: {
                missing: ['Additional detail needed'],
                misprioritized: [],
                redundant: [],
            },
            fix_summary: 'Could not parse mind map analysis. Please try again.',
        };
    }
    catch (error) {
        console.error('Mind map generation error:', error);
        // Return fallback
        return {
            your_model: { tree: { 'Response': ['Point 1', 'Point 2'] } },
            ideal_model: { tree: { 'Ideal Response': ['Ideal Point 1', 'Ideal Point 2'] } },
            delta: {
                missing: ['More structure needed'],
                misprioritized: [],
                redundant: [],
            },
            fix_summary: 'Mind map analysis unavailable. Please try again.',
        };
    }
}
/**
 * Analyze mental model - main entry point
 */
async function analyzeMentalModel(transcript, bodyLanguage) {
    console.log('🧠 Analyzing mental model...');
    // Match framework
    const framework = await matchFramework(transcript);
    console.log(`✅ Matched framework: ${framework.name} (score: ${framework.score})`);
    // Generate mind map
    const mindmap = await generateMindmap(transcript, framework.name);
    console.log(`✅ Generated mind map with ${Object.keys(mindmap.your_model.tree).length} topics`);
    return { framework, mindmap };
}
//# sourceMappingURL=mentalModel.js.map