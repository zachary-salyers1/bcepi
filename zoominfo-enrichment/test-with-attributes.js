// Test with search attributes in JSON API format
require('dotenv').config({ path: '.env.local' });
const axios = require('axios');

async function testWithAttributes(payload, description) {
  const token = process.env.ZOOMINFO_ACCESS_TOKEN;

  console.log(`\n=== ${description} ===`);
  console.log('Payload:', JSON.stringify(payload, null, 2));

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
    console.log('Response:', JSON.stringify(response.data, null, 2).substring(0, 2000));
    return true;

  } catch (error) {
    console.error('✗ FAILED');
    console.error('Status:', error.response?.status);
    console.error('Error:', error.response?.data?.detail || error.message);
    if (error.response?.data?.errors) {
      console.error('Details:', JSON.stringify(error.response.data.errors, null, 2));
    }
    return false;
  }
}

async function runTests() {
  console.log('=== Testing JSON API with Attributes ===');

  // Test 1: attributes with email
  await testWithAttributes({
    data: {
      type: 'ContactSearch',
      attributes: {
        emailAddress: 'zach.salyers@salyersai.com'
      }
    }
  }, 'With email in attributes');

  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test 2: attributes with first/last name
  await testWithAttributes({
    data: {
      type: 'ContactSearch',
      attributes: {
        firstName: 'Zach',
        lastName: 'Salyers'
      }
    }
  }, 'With name in attributes');

  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test 3: matchPersonInput in attributes
  await testWithAttributes({
    data: {
      type: 'ContactSearch',
      attributes: {
        matchPersonInput: [{
          emailAddress: 'zach.salyers@salyersai.com'
        }]
      }
    }
  }, 'With matchPersonInput in attributes');

  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test 4: filters
  await testWithAttributes({
    data: {
      type: 'ContactSearch',
      filters: {
        emailAddress: 'zach.salyers@salyersai.com'
      }
    }
  }, 'With filters');
}

runTests();
