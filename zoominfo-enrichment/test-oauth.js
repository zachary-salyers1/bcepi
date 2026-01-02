// Test script for ZoomInfo OAuth authentication
require('dotenv').config({ path: '.env.local' });
const ZoomInfoClient = require('./lib/zoominfo-client');

async function testOAuth() {
  console.log('=== Testing ZoomInfo OAuth Flow ===\n');

  // Verify environment variables
  console.log('Environment Variables Check:');
  console.log('- CLIENT_ID:', process.env.ZOOMINFO_CLIENT_ID ? '✓ Set' : '✗ Missing');
  console.log('- CLIENT_SECRET:', process.env.ZOOMINFO_CLIENT_SECRET ? '✓ Set' : '✗ Missing');
  console.log('- ACCESS_TOKEN:', process.env.ZOOMINFO_ACCESS_TOKEN ? '✓ Set' : '✗ Missing');
  console.log('- REFRESH_TOKEN:', process.env.ZOOMINFO_REFRESH_TOKEN ? '✓ Set' : '✗ Missing');
  console.log('- TOKEN_URL:', process.env.ZOOMINFO_TOKEN_URL || 'Using default');
  console.log();

  try {
    // Initialize client
    const client = new ZoomInfoClient();

    // Test authentication
    console.log('Testing OAuth authentication...');
    const token = await client.authenticate();

    if (token) {
      console.log('✓ Authentication successful!');
      console.log('Token:', token.substring(0, 50) + '...');
      console.log('Token length:', token.length);
      console.log();

      // Test contact search with the new token
      console.log('Testing contact search with OAuth token...');
      const contactResult = await client.searchContact({
        firstName: 'Zach',
        lastName: 'Salyers',
        email: 'zach.salyers@salyersai.com',
        company: 'Salyers AI'
      });

      if (contactResult && contactResult.data) {
        console.log('✓ Contact search successful!');
        console.log('Found', contactResult.data.length, 'result(s)');
        if (contactResult.data.length > 0) {
          console.log('First result:', JSON.stringify(contactResult.data[0], null, 2));
        }
      } else {
        console.log('⚠ Contact search returned no results');
      }

    } else {
      console.log('✗ Authentication failed - no token received');
    }

  } catch (error) {
    console.error('\n✗ Test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    process.exit(1);
  }

  console.log('\n=== OAuth Test Complete ===');
}

// Run the test
testOAuth();
