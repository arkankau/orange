require('dotenv').config();

const BASE_URL = 'http://localhost:3001';

async function testAPI() {
  console.log('🧪 Testing Consulting Interview Coach API\n');

  try {
    // Test 1: Health check
    console.log('1️⃣  Testing health endpoint...');
    const healthRes = await fetch(`${BASE_URL}/health`);
    const health = await healthRes.json();
    console.log('✅ Health:', health.status);
    console.log('');

    // Test 2: Get all frameworks
    console.log('2️⃣  Testing frameworks endpoint...');
    const frameworksRes = await fetch(`${BASE_URL}/api/frameworks`);
    const frameworks = await frameworksRes.json();
    console.log(`✅ Found ${frameworks.count} frameworks:`, frameworks.frameworks.map(f => f.name).join(', '));
    console.log('');

    // Test 3: Get samples
    console.log('3️⃣  Testing samples endpoint...');
    const samplesRes = await fetch(`${BASE_URL}/api/samples`);
    const samples = await samplesRes.json();
    console.log(`✅ Found ${samples.count} sample transcripts`);
    console.log('');

    // Test 4: Analyze a sample transcript
    console.log('4️⃣  Testing analysis with sample transcript...');
    console.log('   (This will call Claude API - may take a few seconds)');
    const testSampleRes = await fetch(`${BASE_URL}/api/test-sample/market-entry-1`, {
      method: 'POST'
    });
    const testResult = await testSampleRes.json();

    if (testResult.success) {
      console.log('✅ Analysis completed!');
      console.log('\n📊 Results:');
      console.log('   Framework:', testResult.metadata.frameworkUsed);
      console.log('   Tokens used:', testResult.metadata.tokensUsed);
      console.log('\n   Your model branches:', Object.keys(testResult.analysis.your_model.tree).join(', '));
      console.log('   Missing components:', testResult.analysis.delta.missing.length);
      console.log('   Fix summary:', testResult.analysis.fix_summary.substring(0, 100) + '...');
    } else {
      console.log('❌ Analysis failed:', testResult.error);
    }
    console.log('');

    // Test 5: Custom analysis
    console.log('5️⃣  Testing custom transcript analysis...');
    const customAnalysis = await fetch(`${BASE_URL}/api/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        transcript: "I would look at the market size first, then check competition, and finally see if we have the capabilities to succeed.",
        frameworkId: "market-entry",
        bodyLanguage: {
          eyeContact: 0.8,
          fidgeting: 0.3,
          pace: 0.7,
          confidence: 0.75
        }
      })
    });
    const customResult = await customAnalysis.json();

    if (customResult.success) {
      console.log('✅ Custom analysis completed!');
      console.log('   Missing:', customResult.analysis.delta.missing.slice(0, 3).join(', '), '...');
    } else {
      console.log('❌ Custom analysis failed:', customResult.error);
    }
    console.log('');

    console.log('✨ All tests completed!\n');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n💡 Make sure the server is running: npm start\n');
  }
}

testAPI();
