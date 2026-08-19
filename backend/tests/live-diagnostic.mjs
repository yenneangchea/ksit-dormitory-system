import fetch from 'node-fetch';

async function runDiagnostics() {
  console.log('=== KSIT Production Deployment & Database Diagnostic ===\n');

  const baseUrl = 'https://ksit-dorm.vercel.app/api';
  
  try {
    console.log(`1. Testing Health Endpoint: ${baseUrl}/health`);
    const healthRes = await fetch(`${baseUrl}/health`);
    const healthData = await healthRes.json();
    console.log(`   Status: ${healthRes.status} ${healthRes.statusText}`);
    console.log(`   Response:`, healthData);
  } catch (err) {
    console.log(`   [WARN] Health endpoint fetch failed:`, err.message);
  }

  try {
    console.log(`\n2. Testing Buildings Endpoint: ${baseUrl}/buildings`);
    const bldgRes = await fetch(`${baseUrl}/buildings`);
    const bldgData = await bldgRes.json();
    console.log(`   Status: ${bldgRes.status} ${bldgRes.statusText}`);
    console.log(`   Buildings count: ${bldgData.count || (bldgData.data ? bldgData.data.length : 'N/A')}`);
  } catch (err) {
    console.log(`   [WARN] Buildings endpoint fetch failed:`, err.message);
  }

  try {
    console.log(`\n3. Testing Rooms Endpoint: ${baseUrl}/rooms`);
    const roomRes = await fetch(`${baseUrl}/rooms`);
    const roomData = await roomRes.json();
    console.log(`   Status: ${roomRes.status} ${roomRes.statusText}`);
    console.log(`   Rooms count: ${roomData.count || (roomData.data ? roomData.data.length : 'N/A')}`);
  } catch (err) {
    console.log(`   [WARN] Rooms endpoint fetch failed:`, err.message);
  }

  try {
    console.log(`\n4. Testing Invalid Login rejection: ${baseUrl}/auth/login`);
    const loginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'bad@ksit.edu.kh', password: 'wrong' })
    });
    const loginData = await loginRes.json();
    console.log(`   Status: ${loginRes.status} (Expected 401)`);
    console.log(`   Response:`, loginData);
  } catch (err) {
    console.log(`   [WARN] Login test failed:`, err.message);
  }

  console.log('\n=== Diagnostic Complete ===');
}

runDiagnostics();
