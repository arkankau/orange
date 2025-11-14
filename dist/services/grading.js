"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.gradeAnswer = gradeAnswer;
/**
 * Grading Service
 * Grades interview answers based on transcript, mind map, and body language
 */
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const anthropic = new sdk_1.default({
    apiKey: process.env.ANTHROPIC_API_KEY || '',
});
/**
 * Grade an interview answer
 */
async function gradeAnswer(transcript, mindmap, bodyLanguage, frameworkName) {
    console.log(`📊 Grading answer for framework: ${frameworkName}`);
    const bodyLanguageSummary = `
- Warmth: ${Math.round(bodyLanguage.warmth * 100)}%
- Competence: ${Math.round(bodyLanguage.competence * 100)}%
- Affect: ${Math.round(bodyLanguage.affect * 100)}%
- Eye Contact: ${Math.round((bodyLanguage.eyeContactRatio || 0.5) * 100)}%
- Gesture Intensity: ${Math.round((bodyLanguage.gestureIntensity || 0.5) * 100)}%
- Posture Stability: ${Math.round((bodyLanguage.postureStability || 0.5) * 100)}%
`;
    const prompt = `You are an expert interview coach grading a case interview response.

**Framework:** ${frameworkName}

**Transcript:**
"${transcript}"

**Mental Model Analysis:**
- Missing concepts: ${mindmap.delta.missing.join(', ') || 'None identified'}
- Misprioritized: ${mindmap.delta.misprioritized.join(', ') || 'None'}
- Redundant: ${mindmap.delta.redundant.join(', ') || 'None'}
- Fix summary: ${mindmap.fix_summary}

**Body Language Metrics:**
${bodyLanguageSummary}

Grade this response on three dimensions (0-100 scale):

1. **Structure Score**: How well-structured and organized was the answer? Did they use a framework effectively?
2. **Insight Score**: How insightful and analytical was the answer? Did they identify key issues and provide good analysis?
3. **Communication Score**: How clear and effective was the communication? Was it easy to follow?

Also provide:
- **Body Language Score** (0-100): Based on the body language metrics
- **Comments**: 3-5 specific, actionable comments about what was good and what to improve

Return your response in this JSON format:
{
  "structureScore": 85,
  "insightScore": 80,
  "communicationScore": 75,
  "bodyLanguageScore": 70,
  "comments": [
    "Good use of framework structure",
    "Could provide more specific examples",
    "Body language showed confidence"
  ]
}

Return ONLY valid JSON, no other text.`;
    try {
        const message = await anthropic.messages.create({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 1024,
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
            const grading = JSON.parse(jsonMatch[0]);
            return {
                structureScore: grading.structureScore || 70,
                insightScore: grading.insightScore || 70,
                communicationScore: grading.communicationScore || 70,
                bodyLanguageScore: grading.bodyLanguageScore || Math.round(((bodyLanguage.warmth + bodyLanguage.competence + (bodyLanguage.eyeContactRatio || 0.5)) / 3) * 100),
                comments: grading.comments || ['Good response overall'],
            };
        }
        // Fallback if JSON parsing fails
        return generateFallbackGrading(transcript, bodyLanguage);
    }
    catch (error) {
        console.error('Grading error:', error);
        return generateFallbackGrading(transcript, bodyLanguage);
    }
}
/**
 * Generate fallback grading when Claude API fails
 */
function generateFallbackGrading(transcript, bodyLanguage) {
    const transcriptLength = transcript.trim().length;
    // Calculate scores based on transcript and body language
    let structureScore = 60;
    let insightScore = 60;
    let communicationScore = 60;
    // Structure scoring
    if (transcriptLength > 100)
        structureScore += 15;
    if (transcript.toLowerCase().includes('first') || transcript.toLowerCase().includes('second'))
        structureScore += 10;
    if (transcript.toLowerCase().includes('framework') || transcript.toLowerCase().includes('structure'))
        structureScore += 10;
    // Insight scoring
    if (transcriptLength > 150)
        insightScore += 10;
    if (transcript.toLowerCase().includes('because') || transcript.toLowerCase().includes('reason'))
        insightScore += 10;
    if (transcript.toLowerCase().includes('analyze') || transcript.toLowerCase().includes('consider'))
        insightScore += 10;
    // Communication scoring
    if (transcriptLength > 80)
        communicationScore += 10;
    if (transcript.split('.').length > 3)
        communicationScore += 10; // Multiple sentences
    // Cap scores
    structureScore = Math.min(100, Math.max(40, structureScore));
    insightScore = Math.min(100, Math.max(40, insightScore));
    communicationScore = Math.min(100, Math.max(40, communicationScore));
    const bodyLanguageScore = Math.round(((bodyLanguage.warmth + bodyLanguage.competence + (bodyLanguage.eyeContactRatio || 0.5)) / 3) * 100);
    const comments = [];
    if (transcriptLength > 100) {
        comments.push('Provided a substantial response');
    }
    else {
        comments.push('Response was brief - consider adding more detail');
    }
    if (bodyLanguage.warmth > 0.7) {
        comments.push('Demonstrated good warmth and engagement');
    }
    else {
        comments.push('Work on showing more warmth and approachability');
    }
    if (bodyLanguage.competence > 0.7) {
        comments.push('Conveyed confidence and competence');
    }
    else {
        comments.push('Build more confidence in your delivery');
    }
    comments.push('Continue practicing to refine your approach');
    return {
        structureScore,
        insightScore,
        communicationScore,
        bodyLanguageScore,
        comments,
    };
}
//# sourceMappingURL=grading.js.map