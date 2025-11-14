# Quick Start Guide

## System is READY and WORKING! ✅

The server is currently running on **http://localhost:3001**

### What Just Happened

1. ✅ Built complete Node.js/Express API
2. ✅ Created 5 consulting frameworks
3. ✅ Added 5 sample transcripts
4. ✅ Integrated Claude API (using claude-3-haiku-20240307)
5. ✅ Tested end-to-end - IT WORKS!

### Test It Now

```bash
# Test with Market Entry sample
curl -X POST http://localhost:3001/api/test-sample/market-entry-1 | python3 -m json.tool

# Test with Profitability sample
curl -X POST http://localhost:3001/api/test-sample/profitability-1 | python3 -m json.tool

# Test with custom transcript
curl -X POST http://localhost:3001/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "transcript": "I would start by looking at the market size and then competition",
    "frameworkId": "market-entry",
    "bodyLanguage": {
      "eyeContact": 0.7,
      "fidgeting": 0.3,
      "pace": 0.6,
      "confidence": 0.7
    }
  }'
```

### Example Output

```json
{
  "success": true,
  "analysis": {
    "your_model": {
      "tree": {
        "Competition": ["Number of competitors"],
        "Market": ["Market size", "Market growth"]
      }
    },
    "ideal_model": {
      "tree": {
        "Market": ["Market size", "Market growth", "Market trends"],
        "Customer": ["Customer segments", "Needs", "Willingness to pay"],
        "Competition": ["Competitors", "Barriers", "Advantages"],
        "Economics": ["Revenue", "Costs", "Profitability"],
        "Capabilities": ["Required", "Our strengths", "Gaps"],
        "Risks": ["Regulatory", "Market", "Execution"]
      }
    },
    "delta": {
      "missing": ["Customer segments", "Economics", "Capabilities", "Risks"],
      "misprioritized": [],
      "redundant": []
    },
    "fix_summary": "Start with market sizing, then customer segmentation..."
  },
  "metadata": {
    "frameworkUsed": "Market Entry",
    "tokensUsed": 1238
  }
}
```

## Available Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /health | Health check |
| GET | /api/frameworks | List all frameworks |
| GET | /api/frameworks/:id | Get specific framework |
| GET | /api/samples | List sample transcripts |
| GET | /api/samples/:id | Get specific sample |
| POST | /api/analyze | Analyze custom transcript |
| POST | /api/test-sample/:id | Test with sample data |

## All Sample IDs

- `market-entry-1`
- `market-entry-2`
- `profitability-1`
- `profitability-2`
- `product-launch-1`

## Framework IDs

- `market-entry`
- `profitability`
- `merger-acquisition`
- `product-launch`
- `cost-reduction`

## Cost Per Analysis

~1000-1500 tokens per request ≈ **$0.0005 USD** (using Haiku model)

## Current Configuration

- **Port**: 3001 (changed from 3000 due to conflict)
- **Model**: claude-3-haiku-20240307 (fast and cheap)
- **API Key**: Working ✅

## To Restart Server

```bash
# Stop server
lsof -ti:3001 | xargs kill -9

# Start server
node server.js
```

Or just:

```bash
npm start
```

## Files You Have

```
orange-2/
├── server.js                  ← Main API server
├── frameworks.json            ← 5 frameworks
├── sampleTranscripts.json     ← 5 test transcripts
├── test.js                    ← Test suite
├── verify-api-key.js          ← API key validator
├── package.json               ← Dependencies
├── .env                       ← Config (PORT=3001)
├── README.md                  ← Full documentation
├── QUICKSTART.md              ← This file
└── SETUP_STATUS.md            ← Setup notes
```

## Next Steps

1. **Try all samples**: Test each sample ID
2. **Custom analysis**: Send your own transcripts
3. **Build frontend**: Connect this API to a UI
4. **Add more frameworks**: Edit `frameworks.json`
5. **Deploy**: Host on Heroku, Railway, or AWS

## Troubleshooting

### Server won't start
```bash
# Kill any process on port 3001
lsof -ti:3001 | xargs kill -9

# Restart
node server.js
```

### API errors
- Check `.env` has valid API key
- Verify you have Anthropic credits
- Check console logs for details

## Documentation

- Full docs: `README.md`
- Setup notes: `SETUP_STATUS.md`
- This guide: `QUICKSTART.md`

---

**Everything is working! Start building!** 🚀
