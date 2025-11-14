import Anthropic from '@anthropic-ai/sdk';
import { BodyLanguageFeatures } from '../types';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

export interface InterviewFeedback {
  transcript: string;
  bodyLanguage: BodyLanguageFeatures;
  strengths: string[];
  areasForImprovement: string[];
  overallScore: number; // 0-100
  detailedFeedback: string;
  suggestions: string[];
}

/**
 * Generate interview feedback using Claude API
 * Analyzes transcript and body language to provide actionable feedback
 */
export async function generateInterviewFeedback(
  transcript: string,
  bodyLanguage: BodyLanguageFeatures,
  questionIndex: number
): Promise<InterviewFeedback> {
  try {
    // Check API key
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error('❌ ANTHROPIC_API_KEY not set!');
      throw new Error('API key not configured');
    }

    const bodyLanguageSummary = `
- Warmth: ${Math.round(bodyLanguage.warmth * 100)}%
- Competence: ${Math.round(bodyLanguage.competence * 100)}%
- Affect: ${Math.round(bodyLanguage.affect * 100)}%
- Eye Contact: ${Math.round((bodyLanguage.eyeContactRatio ?? 0.5) * 100)}%
- Gesture Intensity: ${Math.round((bodyLanguage.gestureIntensity ?? 0.5) * 100)}%
- Posture Stability: ${Math.round((bodyLanguage.postureStability ?? 0.5) * 100)}%
`;

    const prompt = `You are an expert interview coach analyzing a practice interview response.

**Question ${questionIndex} Response:**
"${transcript}"

**Body Language Metrics:**
${bodyLanguageSummary}

Please provide detailed, actionable feedback in the following JSON format:
{
  "strengths": ["strength1", "strength2", "strength3"],
  "areasForImprovement": ["area1", "area2", "area3"],
  "overallScore": 85,
  "detailedFeedback": "2-3 sentences of overall feedback",
  "suggestions": ["suggestion1", "suggestion2", "suggestion3"]
}

Focus on:
- Content quality and clarity
- Communication effectiveness
- Body language alignment with message
- Areas to improve for next practice

Return ONLY valid JSON, no other text.`;

    console.log(`📞 Calling Claude API for feedback on question ${questionIndex}...`);
    console.log(`   Transcript length: ${transcript.length} chars`);
    
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
      .map((block) => (block as { type: 'text'; text: string }).text)
      .join(' ')
      .trim();

    console.log(`✅ Claude API response received (${responseText.length} chars)`);
    console.log(`   Response preview: ${responseText.substring(0, 200)}...`);

    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const feedback = JSON.parse(jsonMatch[0]);
        console.log(`✅ Parsed feedback: Score ${feedback.overallScore}, ${feedback.strengths?.length || 0} strengths, ${feedback.areasForImprovement?.length || 0} improvements`);
        return {
          transcript,
          bodyLanguage,
          strengths: feedback.strengths || [],
          areasForImprovement: feedback.areasForImprovement || [],
          overallScore: feedback.overallScore || 75,
          detailedFeedback: feedback.detailedFeedback || 'Good response overall.',
          suggestions: feedback.suggestions || [],
        };
      } catch (parseError) {
        console.error('❌ JSON parse error:', parseError);
        console.error('   Response text:', responseText);
        throw parseError;
      }
    }

    console.warn('⚠️ No JSON found in Claude response, using fallback');
    // Fallback if JSON parsing fails
    return {
      transcript,
      bodyLanguage,
      strengths: ['Clear communication'],
      areasForImprovement: ['Could add more specific examples'],
      overallScore: 75,
      detailedFeedback: 'Good response. Continue practicing to refine your delivery.',
      suggestions: ['Practice more examples', 'Work on pacing'],
    };
  } catch (error) {
    console.error('❌ Error generating feedback:', error);
    if (error instanceof Error) {
      console.error('   Error message:', error.message);
      // If it's an API error, log more details
      if (error.message.includes('API') || error.message.includes('key')) {
        console.error('   ⚠️ API key or API call issue detected!');
        console.error('   ANTHROPIC_API_KEY exists:', !!process.env.ANTHROPIC_API_KEY);
        console.error('   ANTHROPIC_API_KEY length:', process.env.ANTHROPIC_API_KEY?.length || 0);
      }
    }
    
    // Always return feedback, even if API fails
    // Generate a basic feedback based on transcript and body language
    console.log('⚠️ Using fallback feedback generation');
    return generateFallbackFeedback(transcript, bodyLanguage, questionIndex);
  }
}

/**
 * Generate fallback feedback when Claude API is unavailable
 */
function generateFallbackFeedback(
  transcript: string,
  bodyLanguage: BodyLanguageFeatures,
  questionIndex: number
): InterviewFeedback {
  const transcriptLength = transcript.trim().length;
  const avgBodyLanguage = (
    bodyLanguage.warmth +
    bodyLanguage.competence +
    bodyLanguage.affect +
    (bodyLanguage.eyeContactRatio ?? 0.5) +
    (bodyLanguage.gestureIntensity ?? 0.5) +
    (bodyLanguage.postureStability ?? 0.5)
  ) / 6;

  // Calculate score based on transcript quality and body language
  let score = 50; // Base score
  
  // Transcript quality scoring
  if (transcriptLength > 100) score += 15;
  else if (transcriptLength > 50) score += 10;
  else if (transcriptLength > 20) score += 5;
  
  // Body language scoring
  score += Math.round(avgBodyLanguage * 25);
  
  // Cap at 100
  score = Math.min(100, Math.max(40, score));

  const strengths: string[] = [];
  const improvements: string[] = [];
  const suggestions: string[] = [];

  // Analyze transcript
  if (transcriptLength > 50) {
    strengths.push('Provided a substantial response');
  } else {
    improvements.push('Response was too brief - try to elaborate more');
  }

  if (transcript.toLowerCase().includes('i think') || transcript.toLowerCase().includes('i believe')) {
    strengths.push('Used personal perspective effectively');
  }

  if (transcriptLength < 30) {
    improvements.push('Add more detail and examples to your answer');
    suggestions.push('Practice expanding on your points with specific examples');
  }

  // Analyze body language
  if (bodyLanguage.warmth > 0.7) {
    strengths.push('Demonstrated good warmth and approachability');
  } else if (bodyLanguage.warmth < 0.5) {
    improvements.push('Work on showing more warmth and engagement');
    suggestions.push('Practice maintaining eye contact and using friendly gestures');
  }

  if (bodyLanguage.competence > 0.7) {
    strengths.push('Conveyed confidence and competence');
  } else if (bodyLanguage.competence < 0.5) {
    improvements.push('Build more confidence in your delivery');
    suggestions.push('Practice speaking with more authority and clarity');
  }

  if ((bodyLanguage.eyeContactRatio ?? 0.5) < 0.5) {
    improvements.push('Improve eye contact during responses');
    suggestions.push('Practice looking at the camera/interviewer more consistently');
  }

  // Default suggestions if none added
  if (suggestions.length === 0) {
    suggestions.push('Continue practicing to refine your delivery');
    suggestions.push('Record yourself to identify areas for improvement');
  }

  // Default strengths if none added
  if (strengths.length === 0) {
    strengths.push('Completed the response');
  }

  // Default improvements if none added
  if (improvements.length === 0) {
    improvements.push('Keep practicing to improve');
  }

  const detailedFeedback = score >= 75
    ? 'Good response overall. You demonstrated solid communication skills and maintained good body language. Continue practicing to refine your delivery.'
    : score >= 60
    ? 'Decent response. You covered the main points, but there\'s room for improvement in both content depth and delivery. Focus on adding more specific examples and maintaining better body language.'
    : 'Your response needs improvement. Try to provide more detailed answers with specific examples, and work on your body language to convey more confidence and engagement.';

  return {
    transcript,
    bodyLanguage,
    strengths,
    areasForImprovement: improvements,
    overallScore: score,
    detailedFeedback,
    suggestions,
  };
}

