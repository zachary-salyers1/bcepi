// Test enrich endpoint to understand what it expects
require('dotenv').config({ path: '.env.local' });
const axios = require('axios');

async function testEnrichSimple() {
  const token = process.env.ZOOMINFO_ACCESS_TOKEN;

  console.log('=== Testing Enrich Endpoint to Understand Format ===\n');

  // Test 1: Empty body to see what error we get
  console.log('Test 1: Empty body');
  try {
    const response = await axios.post(
      'https://api.zoominfo.com/gtm/data/v1/contacts/enrich',
      {},
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.api+json',
          'Content-Type': 'application/vnd.api+json'
        }
      }
    );
    console.log('Response:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.log('Error:', error.response?.data);
  }

  console.log('\n---\n');

  // Test 2: Try with just data object
  console.log('Test 2: Just data object with type');
  try {
    const response = await axios.post(
      'https://api.zoominfo.com/gtm/data/v1/contacts/enrich',
      {
        data: {
          type: 'ContactEnrich'
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.api+json',
          'Content-Type': 'application/vnd.api+json'
        }
      }
    );
    console.log('Response:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.log('Error:', error.response?.data);
  }

  console.log('\n---\n');

  // Test 3: Try with attributes object
  console.log('Test 3: With empty attributes');
  try {
    const response = await axios.post(
      'https://api.zoominfo.com/gtm/data/v1/contacts/enrich',
      {
        data: {
          type: 'ContactEnrich',
          attributes: {}
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.api+json',
          'Content-Type': 'application/vnd.api+json'
        }
      }
    );
    console.log('Response:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.log('Error:', error.response?.data);
  }
}

testEnrichSimple();