require('dotenv').config();
const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

async function testAPIKey() {
  console.log('Testing API key with different models...\n');

  const models = [
    'claude-3-haiku-20240307',
    'claude-3-sonnet-20240229',
    'claude-3-opus-20240229',
    'claude-3-5-sonnet-20240620',
    'claude-3-5-sonnet-20241022'
  ];

  for (const model of models) {
    try {
      console.log(`Testing: ${model}...`);
      const message = await anthropic.messages.create({
        model: model,
        max_tokens: 100,
        messages: [{
          role: 'user',
          content: 'Say "OK" if you can read this.'
        }]
      });
      console.log(`✅ SUCCESS with ${model}`);
      console.log(`   Response: ${message.content[0].text}`);
      console.log(`   Tokens: ${message.usage.input_tokens + message.usage.output_tokens}\n`);
      return model; // Return the first working model
    } catch (error) {
      console.log(`❌ FAILED: ${error.message}\n`);
    }
  }

  console.log('No working models found. Check your API key and billing.');
}

testAPIKey();
