// Test enrich endpoint with BATCH format (array)
require('dotenv').config({ path: '.env.local' });
const axios = require('axios');

async function testEnrichBatch() {
  const token = process.env.ZOOMINFO_ACCESS_TOKEN;

  console.log('=== Testing Enrich with BATCH Format (Array) ===\n');

  // Test different batch formats
  const tests = [
    {
      name: 'Array of emails',
      payload: {
        data: {
          type: 'ContactEnrich',
          attributes: [
            { emailAddress: 'jmarkel@forestcitytech.com' }
          ]
        }
      }
    },
    {
      name: 'Array with multiple fields',
      payload: {
        data: {
          type: 'ContactEnrich',
          attributes: [
            {
              firstName: 'Jason',
              lastName: 'Markel',
              companyName: 'Forest City Technologies'
            }
          ]
        }
      }
    },
    {
      name: 'Array with personId',
      payload: {
        data: {
          type: 'ContactEnrich',
          attributes: [
            { personId: '-1320034286' }
          ]
        }
      }
    },
    {
      name: 'Direct array at attributes',
      payload: {
        data: [
          {
            type: 'ContactEnrich',
            attributes: {
              emailAddress: 'jmarkel@forestcitytech.com'
            }
          }
        ]
      }
    }
  ];

  for (const test of tests) {
    console.log(`\nTrying: ${test.name}`);
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

      // Check if we got email and phone
      if (response.data.data) {
        const data = Array.isArray(response.data.data) ? response.data.data[0] : response.data.data;
        if (data?.attributes) {
          console.log('\n=== Contact Data ===');
          console.log('Email:', data.attributes.email || data.attributes.emailAddress || 'Not provided');
          console.log('Phone:', data.attributes.phone || data.attributes.directPhone || 'Not provided');
          console.log('Mobile:', data.attributes.mobilePhone || 'Not provided');
        }
      }
      break; // Stop on success

    } catch (error) {
      console.log('✗ Failed:', error.response?.status);
      console.log('Error:', error.response?.data?.detail || error.message);
    }
  }
}

testEnrichBatch();