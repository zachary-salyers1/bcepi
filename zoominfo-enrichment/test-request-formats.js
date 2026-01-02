// Test different request body formats
require('dotenv').config({ path: '.env.local' });
const axios = require('axios');

async function testFormat(payload, description) {
  const token = process.env.ZOOMINFO_ACCESS_TOKEN;

  console.log(`\n=== Testing: ${description} ===`);
  console.log('Payload:', JSON.stringify(payload, null, 2));

  try {
    const response = await axios.post(
      'https://api.zoominfo.com/gtm/data/v1/contacts/search',
      payload,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✓ SUCCESS!');
    console.log('Response:', JSON.stringify(response.data, null, 2).substring(0, 1000));
    return true;

  } catch (error) {
    console.log('✗ FAILED');
    console.log('Status:', error.response?.status, error.response?.statusText);
    console.log('Error:', error.response?.data?.detail || error.message);
    return false;
  }
}

async function runTests() {
  console.log('=== ZoomInfo Request Format Testing ===');

  // Format 1: matchPersonInput (current)
  await testFormat({
    matchPersonInput: [{
      firstName: 'John',
      lastName: 'Smith'
    }],
    outputFields: ['id']
  }, 'matchPersonInput format');

  await new Promise(resolve => setTimeout(resolve, 1000));

  // Format 2: Just plain object
  await testFormat({
    firstName: 'John',
    lastName: 'Smith'
  }, 'Plain object format');

  await new Promise(resolve => setTimeout(resolve, 1000));

  // Format 3: personInput
  await testFormat({
    personInput: {
      firstName: 'John',
      lastName: 'Smith'
    }
  }, 'personInput format');

  await new Promise(resolve => setTimeout(resolve, 1000));

  // Format 4: Empty body (see if it returns schema error)
  await testFormat({}, 'Empty body to see error message');
}

runTests();
