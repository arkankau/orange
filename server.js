require('dotenv').config();
const express = require('express');
const cors = require('cors');
const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs').promises;

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Load frameworks and sample transcripts
let frameworks = [];
let sampleTranscripts = [];

async function loadData() {
  try {
    const frameworksData = await fs.readFile('./frameworks.json', 'utf-8');
    frameworks = JSON.parse(frameworksData).frameworks;

    const transcriptsData = await fs.readFile('./sampleTranscripts.json', 'utf-8');
    sampleTranscripts = JSON.parse(transcriptsData).transcripts;

    console.log(`Loaded ${frameworks.length} frameworks and ${sampleTranscripts.length} sample transcripts`);
  } catch (error) {
    console.error('Error loading data:', error);
  }
}

// System prompt
const SYSTEM_PROMPT = `You are a consulting interview coach. You extract mental models from candidate interview answers, compare them against ideal frameworks, and output ONLY structured JSON. Do NOT reveal chain-of-thought. Use internal reasoning silently and produce only valid JSON according to the schema. Your job: (1) extract the candidate's mental model as a tree, (2) restate the ideal framework tree, (3) compute missing/misaligned components, and (4) provide a one-minute fix summary.`;

// Template for user prompt
function buildUserPrompt(transcript, frameworkName, frameworkTree, bodyLanguage) {
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

// Routes

// GET /api/frameworks - Get all available frameworks
app.get('/api/frameworks', (req, res) => {
  res.json({
    success: true,
    count: frameworks.length,
    frameworks: frameworks.map(f => ({
      id: f.id,
      name: f.name,
      description: f.description
    }))
  });
});

// GET /api/frameworks/:id - Get specific framework
app.get('/api/frameworks/:id', (req, res) => {
  const framework = frameworks.find(f => f.id === req.params.id);
  if (!framework) {
    return res.status(404).json({
      success: false,
      error: 'Framework not found'
    });
  }
  res.json({
    success: true,
    framework
  });
});

// GET /api/samples - Get all sample transcripts
app.get('/api/samples', (req, res) => {
  res.json({
    success: true,
    count: sampleTranscripts.length,
    samples: sampleTranscripts
  });
});

// GET /api/samples/:id - Get specific sample transcript
app.get('/api/samples/:id', (req, res) => {
  const sample = sampleTranscripts.find(s => s.id === req.params.id);
  if (!sample) {
    return res.status(404).json({
      success: false,
      error: 'Sample not found'
    });
  }
  res.json({
    success: true,
    sample
  });
});

// POST /api/analyze - Analyze a transcript
app.post('/api/analyze', async (req, res) => {
  try {
    const { transcript, frameworkId, bodyLanguage } = req.body;

    // Validation
    if (!transcript || !frameworkId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: transcript and frameworkId'
      });
    }

    // Find framework
    const framework = frameworks.find(f => f.id === frameworkId);
    if (!framework) {
      return res.status(404).json({
        success: false,
        error: 'Framework not found'
      });
    }

    // Default body language if not provided
    const bodyLang = bodyLanguage || {
      eyeContact: 0.5,
      fidgeting: 0.5,
      pace: 0.5,
      confidence: 0.5
    };

    // Build prompt
    const userPrompt = buildUserPrompt(
      transcript,
      framework.name,
      framework.tree,
      bodyLang
    );

    // Call Claude API
    console.log('Calling Claude API...');
    const message = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: userPrompt
      }]
    });

    // Extract JSON from response
    const responseText = message.content[0].text;
    let analysis;

    try {
      analysis = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse Claude response:', responseText);
      return res.status(500).json({
        success: false,
        error: 'Failed to parse AI response',
        rawResponse: responseText
      });
    }

    // Return result
    res.json({
      success: true,
      analysis,
      metadata: {
        frameworkUsed: framework.name,
        tokensUsed: message.usage.input_tokens + message.usage.output_tokens
      }
    });

  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/test-sample/:id - Test with a sample transcript
app.post('/api/test-sample/:id', async (req, res) => {
  try {
    const sample = sampleTranscripts.find(s => s.id === req.params.id);
    if (!sample) {
      return res.status(404).json({
        success: false,
        error: 'Sample not found'
      });
    }

    // Use the analyze endpoint logic
    const framework = frameworks.find(f => f.id === sample.frameworkId);
    if (!framework) {
      return res.status(404).json({
        success: false,
        error: 'Framework not found for this sample'
      });
    }

    const userPrompt = buildUserPrompt(
      sample.transcript,
      framework.name,
      framework.tree,
      sample.bodyLanguage
    );

    console.log(`Testing sample: ${sample.id}`);
    const message = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: userPrompt
      }]
    });

    const responseText = message.content[0].text;
    let analysis;

    try {
      analysis = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse Claude response:', responseText);
      return res.status(500).json({
        success: false,
        error: 'Failed to parse AI response',
        rawResponse: responseText
      });
    }

    res.json({
      success: true,
      sample: {
        id: sample.id,
        question: sample.question
      },
      analysis,
      metadata: {
        frameworkUsed: framework.name,
        tokensUsed: message.usage.input_tokens + message.usage.output_tokens
      }
    });

  } catch (error) {
    console.error('Test sample error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// Start server
async function startServer() {
  await loadData();
  app.listen(PORT, () => {
    console.log(`\n🚀 Consulting Interview Coach API`);
    console.log(`📡 Server running on http://localhost:${PORT}`);
    console.log(`\nAvailable endpoints:`);
    console.log(`  GET  /health                  - Health check`);
    console.log(`  GET  /api/frameworks          - List all frameworks`);
    console.log(`  GET  /api/frameworks/:id      - Get specific framework`);
    console.log(`  GET  /api/samples             - List sample transcripts`);
    console.log(`  GET  /api/samples/:id         - Get specific sample`);
    console.log(`  POST /api/analyze             - Analyze a transcript`);
    console.log(`  POST /api/test-sample/:id     - Test with sample data`);
    console.log(`\n💡 Try: POST http://localhost:${PORT}/api/test-sample/market-entry-1\n`);
  });
}

startServer();
