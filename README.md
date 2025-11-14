# Consulting Interview Coach API

AI-powered consulting interview feedback system using Claude API to analyze candidate responses and provide structured feedback.

## Features

- **Framework Library**: 5 pre-built consulting frameworks (Market Entry, Profitability, M&A, Product Launch, Cost Reduction)
- **Mental Model Extraction**: Automatically extracts candidate's problem-solving structure from transcripts
- **Gap Analysis**: Identifies missing, misprioritized, and redundant components
- **Actionable Feedback**: Provides concise improvement summaries
- **Sample Transcripts**: Ready-to-use test data

## Project Structure

```
orange-2/
├── server.js              # Main Express server
├── frameworks.json        # Consulting framework library
├── sampleTranscripts.json # Test data
├── test.js               # API test suite
├── package.json
├── .env                  # API key configuration
└── README.md
```

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Your `.env` file is already set up with:
```
ANTHROPIC_API_KEY=sk-ant-api03-...
PORT=3000
```

⚠️ **IMPORTANT**: Your API key is currently exposed. After testing, rotate it at:
https://console.anthropic.com/settings/keys

### 3. Start the Server

```bash
npm start
```

You should see:
```
🚀 Consulting Interview Coach API
📡 Server running on http://localhost:3000
```

### 4. Run Tests

In a new terminal:
```bash
npm test
```

## API Endpoints

### Health Check
```bash
GET /health
```

### Get All Frameworks
```bash
GET /api/frameworks
```

**Response:**
```json
{
  "success": true,
  "count": 5,
  "frameworks": [
    {
      "id": "market-entry",
      "name": "Market Entry",
      "description": "Framework for evaluating whether to enter a new market"
    }
  ]
}
```

### Get Specific Framework
```bash
GET /api/frameworks/:id
```

**Example:**
```bash
curl http://localhost:3000/api/frameworks/market-entry
```

### Get Sample Transcripts
```bash
GET /api/samples
```

### Analyze Transcript
```bash
POST /api/analyze
Content-Type: application/json

{
  "transcript": "I would first look at the market size...",
  "frameworkId": "market-entry",
  "bodyLanguage": {
    "eyeContact": 0.8,
    "fidgeting": 0.3,
    "pace": 0.7,
    "confidence": 0.75
  }
}
```

**Response:**
```json
{
  "success": true,
  "analysis": {
    "your_model": {
      "tree": {
        "Market": ["Market size", "Growth"],
        "Competition": ["Players"]
      }
    },
    "ideal_model": {
      "tree": {
        "Market": ["Market size", "Market growth", "Market trends"],
        "Customer": ["Customer segments", "Customer needs"],
        "Competition": ["Number of competitors", "Barriers to entry"],
        "Economics": ["Revenue potential", "Cost structure"],
        "Capabilities": ["Required capabilities", "Our strengths"],
        "Risks": ["Regulatory risks", "Market risks"]
      }
    },
    "delta": {
      "missing": ["Customer segments", "Economics", "Capabilities"],
      "misprioritized": [],
      "redundant": []
    },
    "fix_summary": "Start with market size and customer segmentation before diving into competition..."
  },
  "metadata": {
    "frameworkUsed": "Market Entry",
    "tokensUsed": 1234
  }
}
```

### Test with Sample Data
```bash
POST /api/test-sample/:id
```

**Example:**
```bash
curl -X POST http://localhost:3000/api/test-sample/market-entry-1
```

## Quick Test Examples

### 1. List Available Frameworks
```bash
curl http://localhost:3000/api/frameworks
```

### 2. Test with Sample Transcript
```bash
curl -X POST http://localhost:3000/api/test-sample/profitability-1
```

### 3. Analyze Custom Transcript
```bash
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "transcript": "I think we should look at costs first, then revenue.",
    "frameworkId": "profitability",
    "bodyLanguage": {
      "eyeContact": 0.6,
      "fidgeting": 0.5,
      "pace": 0.5,
      "confidence": 0.6
    }
  }'
```

## Available Frameworks

1. **Market Entry** (`market-entry`)
   - Market, Customer, Competition, Economics, Capabilities, Risks

2. **Profitability Analysis** (`profitability`)
   - Revenue, Costs, External Factors, Internal Factors

3. **M&A Evaluation** (`merger-acquisition`)
   - Strategic Fit, Financial, Operational, Risk

4. **Product Launch** (`product-launch`)
   - Market Opportunity, Product, Go-to-Market, Competition, Economics, Risks

5. **Cost Reduction** (`cost-reduction`)
   - Cost Categories, Analysis Approach, Implementation, Risk Mitigation

## Development

### Start with Hot Reload
```bash
npm run dev
```

### Add New Framework

Edit `frameworks.json`:
```json
{
  "id": "new-framework",
  "name": "New Framework",
  "description": "Description here",
  "tree": {
    "Category1": ["Item1", "Item2"],
    "Category2": ["Item3", "Item4"]
  }
}
```

### Add Sample Transcript

Edit `sampleTranscripts.json`:
```json
{
  "id": "new-sample-1",
  "frameworkId": "market-entry",
  "question": "Your case question",
  "transcript": "Candidate's response...",
  "bodyLanguage": {
    "eyeContact": 0.7,
    "fidgeting": 0.4,
    "pace": 0.6,
    "confidence": 0.65
  }
}
```

## Integration Example

### Node.js/JavaScript
```javascript
const response = await fetch('http://localhost:3000/api/analyze', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    transcript: userTranscript,
    frameworkId: 'market-entry',
    bodyLanguage: bodyLangData
  })
});

const result = await response.json();
console.log('Missing components:', result.analysis.delta.missing);
console.log('Fix:', result.analysis.fix_summary);
```

### Python
```python
import requests

response = requests.post('http://localhost:3000/api/analyze', json={
    'transcript': user_transcript,
    'frameworkId': 'market-entry',
    'bodyLanguage': {
        'eyeContact': 0.8,
        'fidgeting': 0.3,
        'pace': 0.7,
        'confidence': 0.75
    }
})

result = response.json()
print('Analysis:', result['analysis'])
```

## Error Handling

The API returns structured error responses:

```json
{
  "success": false,
  "error": "Framework not found"
}
```

Common status codes:
- `200`: Success
- `400`: Bad request (missing fields)
- `404`: Resource not found
- `500`: Server error

## Cost Considerations

Each analysis call uses the Claude API and costs approximately:
- **Input tokens**: ~800-1200 tokens (framework + transcript)
- **Output tokens**: ~400-600 tokens (JSON response)
- **Total cost per call**: ~$0.01-0.02 USD

The `metadata.tokensUsed` field shows exact usage per request.

## Security Notes

1. **Rotate your API key immediately** after sharing it
2. Add `.env` to `.gitignore` (already done)
3. Never commit API keys to version control
4. Use environment variables in production
5. Consider rate limiting for production deployments

## Troubleshooting

### "Cannot find module" errors
```bash
npm install
```

### "Failed to parse AI response"
- Check if your API key is valid
- Ensure Claude API is accessible
- Review console logs for raw response

### Port already in use
Change PORT in `.env`:
```
PORT=3001
```

## Next Steps

- [ ] Add authentication (JWT, API keys)
- [ ] Implement rate limiting
- [ ] Add database for storing analyses
- [ ] Build frontend dashboard
- [ ] Add more frameworks
- [ ] Implement scoring system
- [ ] Add batch processing
- [ ] Create visualization for mental model trees

## License

MIT

## Support

For issues or questions, check the console logs or review the sample test cases in `test.js`.
