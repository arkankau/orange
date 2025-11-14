# Mental Model Trainer - Frontend

React + Vite frontend for the Mental Model Interview Coach application.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

The frontend will run on `http://localhost:8080` and proxy API requests to the backend at `http://localhost:5001`.

## Environment Variables

Create a `.env` file in the frontend directory:

```env
VITE_API_BASE_URL=http://localhost:5001/api
```

## Features

- **Real-time Audio Recording**: Record interview answers using the browser's MediaRecorder API
- **Mental Model Visualization**: Compare your mental model against ideal frameworks
- **Performance Analytics**: View detailed scores and feedback
- **Question Management**: Track multiple questions in a session

## Integration with Backend

The frontend connects to the backend orchestration endpoint:
- `POST /api/sessions/:sessionId/questions/:questionIndex/analyze` - Analyze audio/transcript

See `src/api/client.ts` for the API client implementation.

