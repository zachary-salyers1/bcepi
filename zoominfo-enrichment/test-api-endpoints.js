// Test different ZoomInfo API endpoints
require('dotenv').config({ path: '.env.local' });
const axios = require('axios');

async function testEndpoint(url, payload, description) {
  const token = process.env.ZOOMINFO_ACCESS_TOKEN;

  console.log(`\n=== Testing: ${description} ===`);
  console.log('URL:', url);

  try {
    const response = await axios.post(url, payload, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✓ SUCCESS!');
    console.log('Status:', response.status);
    console.log('Data:', JSON.stringify(response.data, null, 2).substring(0, 500));
    return true;

  } catch (error) {
    console.log('✗ FAILED');
    console.log('Status:', error.response?.status, error.response?.statusText);
    console.log('Error:', error.response?.data || error.message);
    return false;
  }
}

async function runTests() {
  console.log('=== ZoomInfo API Endpoint Tests ===');

  const payload = {
    matchPersonInput: [{
      firstName: 'John',
      lastName: 'Smith',
      emailAddress: 'test@example.com'
    }],
    outputFields: ['id', 'firstName', 'lastName']
  };

  const endpoints = [
    { url: 'https://api.zoominfo.com/search/contact', desc: 'Standard contact search' },
    { url: 'https://api.zoominfo.com/enrich/contact', desc: 'Contact enrich endpoint' },
    { url: 'https://api.zoominfo.com/v2/search/contact', desc: 'V2 contact search' },
    { url: 'https://api.zoominfo.com/lookup/contact', desc: 'Contact lookup endpoint' },
  ];

  for (const endpoint of endpoints) {
    await testEndpoint(endpoint.url, payload, endpoint.desc);
    // Wait a bit between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Also try account/usage endpoint
  console.log('\n=== Testing Account/Usage Endpoint ===');
  const token = process.env.ZOOMINFO_ACCESS_TOKEN;
  try {
    const response = await axios.get('https://api.zoominfo.com/lookup/usage', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    console.log('✓ Usage endpoint SUCCESS!');
    console.log('Data:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.log('✗ Usage endpoint FAILED');
    console.log('Status:', error.response?.status);
    console.log('Error:', error.response?.data || error.message);
  }
}

runTests();
