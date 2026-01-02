// Test with JSON API format
require('dotenv').config({ path: '.env.local' });
const axios = require('axios');

async function testJSONAPIFormat() {
  const token = process.env.ZOOMINFO_ACCESS_TOKEN;

  console.log('=== Testing JSON API Format ===\n');

  // Test basic contact search
  const payload = {
    data: {
      type: 'ContactSearch'
    }
  };

  console.log('Request payload:', JSON.stringify(payload, null, 2));
  console.log();

  try {
    const response = await axios.post(
      'https://api.zoominfo.com/gtm/data/v1/contacts/search',
      payload,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.api+json',
          'Content-Type': 'application/vnd.api+json'
        }
      }
    );

    console.log('✓ SUCCESS!');
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(response.data, null, 2));

  } catch (error) {
    console.error('✗ FAILED');
    console.error('Status:', error.response?.status, error.response?.statusText);
    console.error('Error:', error.response?.data || error.message);
  }
}

testJSONAPIFormat();
