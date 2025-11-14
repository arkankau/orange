# Mental Model Interview Coach - Backend API

A hackathon MVP backend service that processes audio/video interview recordings and generates per-question feature vectors for mental model analysis.

## Features

- **Media Segmentation**: Extract audio/video segments for each interview question using ffmpeg
- **Speech-to-Text**: Transcribe audio segments using OpenAI Whisper API
- **Body Language Analysis**: Analyze body language features (stub implementation for hackathon)
- **Feature Vectors**: Generate combined text + body language feature vectors for each question
- **Vector Storage**: Store vectors in-memory (easily swappable for production vector DB)
- **Real-Time Processing**: Stream audio/video chunks during live Zoom calls with WebSocket updates
- **Zoom Integration**: Webhook endpoints and streaming support for real-time interview analysis

## Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **WebSocket**: Socket.IO for real-time updates
- **Media Processing**: ffmpeg (via fluent-ffmpeg)
- **ASR**: OpenAI Whisper API
- **Embeddings**: OpenAI text-embedding-3-small
- **Vector Storage**: In-memory (ready for Pinecone/Qdrant/pgvector swap)

## Setup

### Prerequisites

- **Node.js 18+** (required for File API support in ASR service)
- **ffmpeg** installed on your system (`brew install ffmpeg` on macOS, `apt-get install ffmpeg` on Ubuntu)
- API keys for OpenAI (Whisper + Embeddings)

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Edit .env and add your API keys
# ANTHROPIC_API_KEY=your-key-here (provided)
# OPENAI_API_KEY=your-openai-key-here
```

### Build

```bash
npm run build
```

### Run

```bash
# Development mode (with hot reload)
npm run dev

# Production mode
npm start
```

The server will start on `http://localhost:3000`

## Real-Time Zoom Integration

For real-time processing during live Zoom calls, see [REALTIME.md](./REALTIME.md) for detailed documentation.

Quick example:
```bash
# Create real-time session
curl -X POST http://localhost:3000/realtime/sessions \
  -H "Content-Type: application/json" \
  -d '{"questions": [{"index": 1, "startTs": 0, "endTs": 60}]}'

# Stream chunks (see REALTIME.md for WebSocket setup)
curl -X POST http://localhost:3000/realtime/sessions/{sessionId}/chunk \
  -F "audio=@chunk.wav" \
  -F "questionIndex=1" \
  -F "chunkIndex=0" \
  -F "isLast=true"
```

## API Endpoints

### 1. Create Session

Create a new interview session with media path and question boundaries.

```bash
curl -X POST http://localhost:3000/sessions \
  -H "Content-Type: application/json" \
  -d '{
    "mediaPath": "/path/to/interview.mp4",
    "questions": [
      {
        "index": 1,
        "startTs": 32.5,
        "endTs": 97.1
      },
      {
        "index": 2,
        "startTs": 100.0,
        "endTs": 180.0
      }
    ]
  }'
```

**Response:**
```json
{
  "id": "session-uuid",
  "mediaPath": "/path/to/interview.mp4",
  "questions": [
    {
      "id": "question-uuid",
      "sessionId": "session-uuid",
      "index": 1,
      "startTs": 32.5,
      "endTs": 97.1
    },
    ...
  ],
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

### 2. Process Session

Process a session: extract segments, transcribe, analyze body language, and generate vectors.

```bash
curl -X POST http://localhost:3000/sessions/{sessionId}/process
```

**Response:**
```json
{
  "id": "session-uuid",
  "mediaPath": "/path/to/interview.mp4",
  "questions": [
    {
      "id": "question-uuid",
      "sessionId": "session-uuid",
      "index": 1,
      "startTs": 32.5,
      "endTs": 97.1,
      "transcript": "This is the transcribed text...",
      "bodyLanguage": {
        "warmth": 0.75,
        "competence": 0.82,
        "affect": 0.68,
        "eyeContactRatio": 0.71,
        "gestureIntensity": 0.45,
        "postureStability": 0.88
      },
      "vectorLength": 390,
      "transcriptLength": 42
    },
    ...
  ],
  "processedAt": "2024-01-01T00:05:00.000Z"
}
```

### 3. Get Vectors

Retrieve all vectors for a session.

```bash
curl http://localhost:3000/sessions/{sessionId}/vectors
```

**Response:**
```json
[
  {
    "questionIndex": 1,
    "vectorLength": 390,
    "bodyLanguage": {
      "warmth": 0.75,
      "competence": 0.82,
      "affect": 0.68,
      "eyeContactRatio": 0.71,
      "gestureIntensity": 0.45,
      "postureStability": 0.88
    },
    "transcript": "This is the transcribed text...",
    "createdAt": "2024-01-01T00:05:00.000Z"
  },
  ...
]
```

### 4. Get Session

Get session details.

```bash
curl http://localhost:3000/sessions/{sessionId}
```

## Example Workflow

```bash
# 1. Create a session
SESSION_ID=$(curl -X POST http://localhost:3000/sessions \
  -H "Content-Type: application/json" \
  -d '{
    "mediaPath": "./sample-interview.mp4",
    "questions": [
      {"index": 1, "startTs": 0, "endTs": 60},
      {"index": 2, "startTs": 60, "endTs": 120}
    ]
  }' | jq -r '.id')

# 2. Process the session (this may take a few minutes)
curl -X POST http://localhost:3000/sessions/$SESSION_ID/process

# 3. Get the vectors
curl http://localhost:3000/sessions/$SESSION_ID/vectors
```

## Project Structure

```
src/
├── index.ts                 # Main server entry point
├── types/
│   └── index.ts            # TypeScript type definitions
├── routes/
│   └── sessions.ts         # Session API routes
├── services/
│   ├── media.ts            # Media segmentation (ffmpeg)
│   ├── asr.ts              # Speech-to-text (Whisper)
│   ├── bodyLanguage.ts     # Body language analysis (stub)
│   └── embedding.ts        # Text embeddings + vector fusion
└── stores/
    ├── sessionStore.ts     # Session storage (in-memory)
    └── vectorStore.ts      # Vector storage (in-memory)
```

## Implementation Notes

### Body Language Analysis

Currently implemented as a stub that returns pseudo-random values. For production, integrate with:
- MediaPipe Face Mesh (eye contact)
- MediaPipe Pose (gestures, posture)
- Emotion recognition models (affect, warmth)
- Confidence estimation models (competence)

### Vector Storage

Currently in-memory. To swap for production:
1. Replace `src/stores/vectorStore.ts` with your vector DB client
2. Implement the same interface: `saveQuestionVector()` and `getVectorsBySession()`
3. Recommended: Pinecone, Qdrant, or pgvector

### Error Handling

- Development mode includes fallback placeholders for failed API calls
- Production mode will throw errors for debugging
- Individual question failures don't stop the entire session processing

## Development

```bash
# Watch mode
npm run dev

# Build
npm run build

# Clean build artifacts
npm run clean
```

## Environment Variables

- `ANTHROPIC_API_KEY`: Anthropic API key (for embeddings, though we use OpenAI)
- `OPENAI_API_KEY`: OpenAI API key (for Whisper + embeddings)
- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Environment (development/production)

## Limitations (Hackathon MVP)

- No authentication/user management
- In-memory storage (data lost on restart)
- Body language analysis is stubbed
- No frontend
- Basic error handling
- No production-grade vector DB

## Future Enhancements

- [ ] Real body language analysis pipeline
- [ ] Vector database integration (Pinecone/Qdrant)
- [ ] Persistent storage (PostgreSQL)
- [ ] Authentication & user management
- [ ] Similarity search endpoints
- [ ] Progress tracking over time
- [ ] WebSocket for real-time processing updates

## License

MIT

