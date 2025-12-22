/**
 * Debug script to check backend connection and database
 * Usage: node debug_backend.js
 */

require('dotenv').config();
const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

async function debugBackend() {
  console.log('\n🔍 === BACKEND DEBUG ===\n');

  // 1. Check if server is running
  console.log('1️⃣ Checking if server is running...');
  try {
    const response = await axios.get('http://localhost:3000/', { timeout: 5000 });
    console.log('✅ Server is running');
  } catch (error) {
    console.log('❌ Server is NOT running at http://localhost:3000');
    console.log('   Error:', error.message);
    console.log('\n   ⚠️ Please start the backend first:');
    console.log('   cd be');
    console.log('   npm start\n');
    process.exit(1);
  }

  // 2. Test login endpoint without credentials
  console.log('\n2️⃣ Testing login endpoint...');
  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      usernameOrEmail: 'nonexistent',
      password: 'test'
    });
    console.log('Response:', response.data);
  } catch (error) {
    if (error.response?.status === 401) {
      console.log('✅ Login endpoint is working (401 = user not found, as expected)');
    } else if (error.response?.status === 500) {
      console.log('❌ Server error on login endpoint');
      console.log('   Response:', error.response.data);
    } else {
      console.log('⚠️ Unexpected response:', error.response?.status, error.response?.data);
    }
  }

  // 3. Check environment variables
  console.log('\n3️⃣ Checking environment variables...');
  const requiredVars = ['DB_NAME', 'DB_USER', 'DB_PASS', 'DB_HOST', 'JWT_SECRET'];
  let allSet = true;
  
  for (const varName of requiredVars) {
    const value = process.env[varName];
    if (value) {
      console.log(`   ✅ ${varName} = ${varName === 'DB_PASS' || varName === 'JWT_SECRET' ? '***' : value}`);
    } else {
      console.log(`   ❌ ${varName} is NOT set`);
      allSet = false;
    }
  }

  if (!allSet) {
    console.log('\n   ⚠️ Missing environment variables in .env file');
  }

  console.log('\n✅ Debug complete\n');
}

debugBackend().catch(err => {
  console.error('Debug error:', err);
  process.exit(1);
});
