/**
 * Test the complete login flow
 * Usage: node test_login_flow.js
 */

require('dotenv').config();
const axios = require('axios');
const { sequelize, User, Profile } = require('./models');
const bcrypt = require('bcrypt');
const { Op } = require('sequelize');

const BASE_URL = 'http://localhost:3000/api';

async function testLoginFlow() {
  try {
    console.log('\n🔐 === TESTING LOGIN FLOW ===\n');

    // Step 1: Check database
    console.log('Step 1: Checking database...');
    await sequelize.authenticate();
    console.log('✅ Database connected\n');

    // Step 2: Create or find test user
    console.log('Step 2: Creating/finding test user...');
    let testUser = await User.findOne({
      where: { username: 'testuser' }
    });

    if (!testUser) {
      console.log('  Creating new test user...');
      const hash = await bcrypt.hash('password123', 10);
      testUser = await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password: hash
      });

      // Create profile
      await Profile.create({
        user_id: testUser.id,
        fullname: 'Test User',
        avatar_url: 'https://cdn-icons-png.flaticon.com/512/149/149071.png'
      });

      console.log('✅ Created test user: testuser\n');
    } else {
      console.log('✅ Found existing test user: testuser\n');
    }

    // Step 3: Test database query
    console.log('Step 3: Testing database login query...');
    const dbUser = await User.findOne({
      where: { [Op.or]: [{ username: 'testuser' }, { email: 'test@example.com' }] },
      include: { model: Profile }
    });

    if (dbUser) {
      console.log('✅ Database query successful');
      console.log('  User ID:', dbUser.id);
      console.log('  Username:', dbUser.username);
      console.log('  Email:', dbUser.email);
      console.log('  Has Profile:', !!dbUser.Profile, '\n');
    } else {
      console.log('❌ Database query failed\n');
      process.exit(1);
    }

    // Step 4: Test password
    console.log('Step 4: Testing password verification...');
    const passwordOk = await bcrypt.compare('password123', dbUser.password);
    if (passwordOk) {
      console.log('✅ Password verification works\n');
    } else {
      console.log('❌ Password verification failed\n');
      process.exit(1);
    }

    // Step 5: Check if backend is running
    console.log('Step 5: Checking if backend is running...');
    try {
      await axios.get('http://localhost:3000/', { timeout: 3000 });
      console.log('✅ Backend is running\n');
    } catch (error) {
      console.log('❌ Backend is NOT running at http://localhost:3000');
      console.log('   Please start it with: npm start\n');
      process.exit(1);
    }

    // Step 6: Test login API
    console.log('Step 6: Testing login API...');
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
      usernameOrEmail: 'testuser',
      password: 'password123'
    });

    if (loginRes.data.token && loginRes.data.user) {
      console.log('✅ Login API successful');
      console.log('  Token length:', loginRes.data.token.length);
      console.log('  User ID:', loginRes.data.user.id);
      console.log('  Username:', loginRes.data.user.username);
      console.log('  Email:', loginRes.data.user.email, '\n');
    } else {
      console.log('❌ Login API response missing token or user\n');
      console.log('  Response:', loginRes.data);
      process.exit(1);
    }

    console.log('✅ === ALL TESTS PASSED ===\n');
    console.log('You can now login with:');
    console.log('  Email/Username: testuser');
    console.log('  Password: password123\n');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    if (error.response?.data) {
      console.error('Server response:', error.response.data);
    }
    console.error('\nStack:', error.stack);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

testLoginFlow();
