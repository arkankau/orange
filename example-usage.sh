#!/bin/bash

# Example usage script for Mental Model Interview Coach API
# Make sure the server is running: npm run dev

BASE_URL="http://localhost:3000"

echo "🚀 Mental Model Interview Coach - Example Usage"
echo "================================================"
echo ""

# 1. Create a session
echo "1️⃣  Creating a session..."
SESSION_RESPONSE=$(curl -s -X POST "$BASE_URL/sessions" \
  -H "Content-Type: application/json" \
  -d '{
    "mediaPath": "./sample-interview.mp4",
    "questions": [
      {"index": 1, "startTs": 0, "endTs": 60},
      {"index": 2, "startTs": 60, "endTs": 120},
      {"index": 3, "startTs": 120, "endTs": 180}
    ]
  }')

SESSION_ID=$(echo $SESSION_RESPONSE | grep -o '"id":"[^"]*' | cut -d'"' -f4)

if [ -z "$SESSION_ID" ]; then
  echo "❌ Failed to create session"
  echo "Response: $SESSION_RESPONSE"
  exit 1
fi

echo "✅ Session created: $SESSION_ID"
echo ""

# 2. Process the session
echo "2️⃣  Processing session (this may take a few minutes)..."
PROCESS_RESPONSE=$(curl -s -X POST "$BASE_URL/sessions/$SESSION_ID/process")

if echo "$PROCESS_RESPONSE" | grep -q "error"; then
  echo "❌ Failed to process session"
  echo "Response: $PROCESS_RESPONSE"
  exit 1
fi

echo "✅ Session processed successfully"
echo ""

# 3. Get vectors
echo "3️⃣  Fetching vectors..."
VECTORS_RESPONSE=$(curl -s "$BASE_URL/sessions/$SESSION_ID/vectors")

echo "✅ Vectors retrieved:"
echo "$VECTORS_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$VECTORS_RESPONSE"
echo ""

# 4. Get session details
echo "4️⃣  Fetching session details..."
SESSION_DETAILS=$(curl -s "$BASE_URL/sessions/$SESSION_ID")

echo "✅ Session details:"
echo "$SESSION_DETAILS" | python3 -m json.tool 2>/dev/null || echo "$SESSION_DETAILS"
echo ""

echo "✨ Done! Session ID: $SESSION_ID"

