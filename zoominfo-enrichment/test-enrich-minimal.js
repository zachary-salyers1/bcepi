// Test with minimal/empty payloads to understand what's required
require('dotenv').config({ path: '.env.local' });
const axios = require('axios');

async function testEnrichMinimal() {
  const token = process.env.ZOOMINFO_ACCESS_TOKEN;

  console.log('=== Testing Minimal Enrich Payloads ===\n');

  const tests = [
    {
      name: 'Completely empty attributes',
      payload: {
        data: {
          type: 'ContactEnrich',
          attributes: {}
        }
      }
    },
    {
      name: 'No attributes at all',
      payload: {
        data: {
          type: 'ContactEnrich'
        }
      }
    },
    {
      name: 'Just data object',
      payload: {
        data: {}
      }
    },
    {
      name: 'Empty root',
      payload: {}
    },
    {
      name: 'Try ContactEnrichRequest type',
      payload: {
        data: {
          type: 'ContactEnrichRequest',
          attributes: {}
        }
      }
    },
    {
      name: 'Try EnrichRequest type',
      payload: {
        data: {
          type: 'EnrichRequest',
          attributes: {}
        }
      }
    },
    {
      name: 'Array of empty ContactEnrich',
      payload: {
        data: [
          {
            type: 'ContactEnrich',
            attributes: {}
          }
        ]
      }
    }
  ];

  // Also let's try to understand what fields ARE accepted
  console.log('Testing different endpoints to understand the API structure:\n');

  // Test different endpoints
  const endpoints = [
    {
      name: 'List all available endpoints',
      method: 'GET',
      url: 'https://api.zoominfo.com/gtm/data/v1'
    },
    {
      name: 'Try contacts endpoint',
      method: 'GET',
      url: 'https://api.zoominfo.com/gtm/data/v1/contacts'
    },
    {
      name: 'Try enrich without /contacts',
      method: 'POST',
      url: 'https://api.zoominfo.com/gtm/data/v1/enrich',
      payload: {
        data: {
          type: 'ContactEnrich',
          attributes: {}
        }
      }
    }
  ];

  // Test endpoints first
  for (const endpoint of endpoints) {
    console.log(`\nTesting endpoint: ${endpoint.name}`);
    console.log(`${endpoint.method} ${endpoint.url}`);

    try {
      let response;
      if (endpoint.method === 'GET') {
        response = await axios.get(endpoint.url, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.api+json'
          }
        });
      } else {
        response = await axios.post(endpoint.url, endpoint.payload, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.api+json',
            'Content-Type': 'application/vnd.api+json'
          }
        });
      }

      console.log('✓ Success:', response.status);
      console.log('Response:', JSON.stringify(response.data, null, 2).substring(0, 500));
    } catch (error) {
      console.log('✗ Failed:', error.response?.status);
      if (error.response?.data) {
        console.log('Error:', JSON.stringify(error.response.data, null, 2));
      }
    }
  }

  console.log('\n\n=== Testing Minimal Payloads on /contacts/enrich ===\n');

  // Now test minimal payloads on the enrich endpoint
  for (const test of tests) {
    console.log(`\nTesting: ${test.name}`);
    console.log('Payload:', JSON.stringify(test.payload, null, 2));

    try {
      const response = await axios.post(
        'https://api.zoominfo.com/gtm/data/v1/contacts/enrich',
        test.payload,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.api+json',
            'Content-Type': 'application/vnd.api+json'
          }
        }
      );

      console.log('✓ SUCCESS!');
      console.log('Response:', JSON.stringify(response.data, null, 2));

      // If we get a successful response, analyze what it contains
      console.log('\n🎉 Found working format!');
      break;

    } catch (error) {
      console.log('✗ Failed:', error.response?.status);
      if (error.response?.data?.errors) {
        error.response.data.errors.forEach(err => {
          console.log(`  - ${err.detail || err.title}`);
        });
      }
    }
  }
}

testEnrichMinimal();