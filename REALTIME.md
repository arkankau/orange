# Real-Time Zoom Integration Guide

This guide explains how to use the real-time processing features for live Zoom calls.

## Overview

The system now supports real-time processing of audio/video streams during live Zoom calls. Instead of waiting for a recording to finish, you can stream chunks as they're captured and get real-time analysis.

## Architecture

1. **WebSocket Connection**: Clients connect via Socket.IO for real-time updates
2. **Chunk Streaming**: Audio/video chunks are sent via HTTP POST as they're captured
3. **Real-Time Processing**: Each chunk is processed immediately and results are emitted via WebSocket
4. **Zoom Integration**: Webhook endpoint for Zoom events (recording started/stopped/completed)

## Quick Start

### 1. Create a Real-Time Session

```bash
curl -X POST http://localhost:3000/realtime/sessions \
  -H "Content-Type: application/json" \
  -d '{
    "questions": [
      {"index": 1, "startTs": 0, "endTs": 60},
      {"index": 2, "startTs": 60, "endTs": 120}
    ]
  }'
```

Response:
```json
{
  "id": "session-uuid",
  "mediaPath": "streaming://realtime",
  "questions": [...],
  "realtime": true,
  "websocketUrl": "ws://localhost:3000"
}
```

### 2. Connect via WebSocket

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3000');

// Join the session room
socket.emit('join-session', 'session-uuid');

// Listen for events
socket.on('joined-session', (data) => {
  console.log('Joined session:', data.sessionId);
});

socket.on('chunk-received', (data) => {
  console.log('Chunk received:', data);
});

socket.on('processing-started', (data) => {
  console.log('Processing started for question:', data.questionIndex);
});

socket.on('question-processed', (data) => {
  console.log('Question processed:', data);
  console.log('Transcript:', data.result.transcript);
  console.log('Body language:', data.result.bodyLanguage);
  console.log('Vector length:', data.result.vector?.length);
});

socket.on('processing-error', (data) => {
  console.error('Processing error:', data.error);
});
```

### 3. Stream Audio/Video Chunks

```bash
# Send an audio chunk
curl -X POST http://localhost:3000/realtime/sessions/{sessionId}/chunk \
  -F "audio=@audio-chunk.wav" \
  -F "questionIndex=1" \
  -F "chunkIndex=0" \
  -F "timestamp=0.0" \
  -F "isLast=false"

# Send a video chunk
curl -X POST http://localhost:3000/realtime/sessions/{sessionId}/chunk \
  -F "video=@video-chunk.mp4" \
  -F "questionIndex=1" \
  -F "chunkIndex=0" \
  -F "timestamp=0.0" \
  -F "isLast=false"

# Send final chunk (triggers processing)
curl -X POST http://localhost:3000/realtime/sessions/{sessionId}/chunk \
  -F "audio=@final-audio-chunk.wav" \
  -F "video=@final-video-chunk.mp4" \
  -F "questionIndex=1" \
  -F "chunkIndex=5" \
  -F "timestamp=60.0" \
  -F "isLast=true"
```

## Zoom Integration

### Option 1: Zoom Webhooks

Configure Zoom to send webhooks to your server:

1. In Zoom App settings, set webhook URL to:
   ```
   http://your-server.com/realtime/sessions/{sessionId}/zoom-webhook
   ```

2. The server will handle these events:
   - `recording.started` - Emits `recording-started` via WebSocket
   - `recording.stopped` - Emits `recording-stopped` via WebSocket
   - `recording.completed` - Emits `recording-completed` with download URL

### Option 2: Direct Streaming from Zoom SDK

If using Zoom SDK in your application:

```javascript
// Example: Capture audio/video from Zoom and stream to server
const zoomSDK = require('@zoom/app');

zoomSDK.on('audioData', async (audioBuffer) => {
  const formData = new FormData();
  formData.append('audio', new Blob([audioBuffer]), 'chunk.wav');
  formData.append('questionIndex', currentQuestionIndex);
  formData.append('chunkIndex', chunkCounter++);
  formData.append('timestamp', Date.now() / 1000);
  formData.append('isLast', false);

  await fetch(`http://localhost:3000/realtime/sessions/${sessionId}/chunk`, {
    method: 'POST',
    body: formData,
  });
});

zoomSDK.on('videoData', async (videoBuffer) => {
  const formData = new FormData();
  formData.append('video', new Blob([videoBuffer]), 'chunk.mp4');
  formData.append('questionIndex', currentQuestionIndex);
  formData.append('chunkIndex', chunkCounter++);
  formData.append('timestamp', Date.now() / 1000);
  formData.append('isLast', false);

  await fetch(`http://localhost:3000/realtime/sessions/${sessionId}/chunk`, {
    method: 'POST',
    body: formData,
  });
});
```

## WebSocket Events

### Client → Server

- `join-session` - Join a session room to receive updates
  ```javascript
  socket.emit('join-session', sessionId);
  ```

### Server → Client

- `joined-session` - Confirmation that you joined
  ```json
  { "sessionId": "..." }
  ```

- `chunk-received` - A chunk was received
  ```json
  {
    "sessionId": "...",
    "questionIndex": 1,
    "chunkIndex": 0,
    "timestamp": 0.0
  }
  ```

- `processing-started` - Processing started for a question
  ```json
  {
    "sessionId": "...",
    "questionIndex": 1
  }
  ```

- `question-processed` - A question was fully processed
  ```json
  {
    "sessionId": "...",
    "questionIndex": 1,
    "result": {
      "transcript": "...",
      "bodyLanguage": {...},
      "vector": [...],
      "status": "completed"
    }
  }
  ```

- `processing-error` - An error occurred
  ```json
  {
    "sessionId": "...",
    "questionIndex": 1,
    "error": "Error message"
  }
  ```

- `recording-started` - Zoom recording started
- `recording-stopped` - Zoom recording stopped
- `recording-completed` - Zoom recording completed

## Example: Complete Flow

```javascript
// 1. Create session
const session = await fetch('http://localhost:3000/realtime/sessions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    questions: [
      { index: 1, startTs: 0, endTs: 60 },
      { index: 2, startTs: 60, endTs: 120 }
    ]
  })
}).then(r => r.json());

const sessionId = session.id;

// 2. Connect WebSocket
const socket = io('http://localhost:3000');
socket.emit('join-session', sessionId);

socket.on('question-processed', (data) => {
  console.log(`Question ${data.questionIndex} done!`);
  console.log('Transcript:', data.result.transcript);
});

// 3. Stream chunks (simulated)
let chunkIndex = 0;
const interval = setInterval(async () => {
  // Capture audio/video from Zoom
  const audioChunk = await captureAudioChunk();
  const videoChunk = await captureVideoChunk();

  const formData = new FormData();
  formData.append('audio', audioChunk);
  formData.append('video', videoChunk);
  formData.append('questionIndex', '1');
  formData.append('chunkIndex', chunkIndex.toString());
  formData.append('timestamp', (Date.now() / 1000).toString());
  formData.append('isLast', (chunkIndex >= 10).toString());

  await fetch(`http://localhost:3000/realtime/sessions/${sessionId}/chunk`, {
    method: 'POST',
    body: formData,
  });

  chunkIndex++;
  if (chunkIndex > 10) {
    clearInterval(interval);
  }
}, 5000); // Send chunk every 5 seconds
```

## Status Endpoint

Check real-time processing status:

```bash
curl http://localhost:3000/realtime/sessions/{sessionId}/status
```

Response:
```json
{
  "sessionId": "...",
  "activeConnections": 2,
  "questions": [
    {
      "index": 1,
      "hasTranscript": true,
      "hasBodyLanguage": true,
      "hasVector": true
    }
  ]
}
```

## Notes

- Chunks are processed when `isLast=true` is sent
- Audio and video can be sent separately or together
- Processing happens asynchronously - use WebSocket for updates
- Temporary chunk files are automatically cleaned up after processing
- For production, consider using a message queue (Redis/RabbitMQ) for chunk handling

