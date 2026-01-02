// Test the ENRICH endpoint (not search!)
require('dotenv').config({ path: '.env.local' });
const axios = require('axios');

async function testEnrichEndpoint() {
  const token = process.env.ZOOMINFO_ACCESS_TOKEN;

  console.log('=== Testing Contact ENRICH Endpoint ===\n');

  // Try different payload formats for the enrich endpoint
  const payloads = [
    {
      name: 'Format 1: With emailAddress',
      data: {
        data: {
          type: 'ContactEnrich',
          attributes: {
            emailAddress: 'jmarkel@forestcitytech.com'
          }
        }
      }
    },
    {
      name: 'Format 2: With matchPersonInput',
      data: {
        data: {
          type: 'ContactEnrich',
          attributes: {
            matchPersonInput: {
              emailAddress: 'jmarkel@forestcitytech.com'
            }
          }
        }
      }
    },
    {
      name: 'Format 3: With personId (ZoomInfo ID)',
      data: {
        data: {
          type: 'ContactEnrich',
          attributes: {
            personId: '-1320034286'
          }
        }
      }
    },
    {
      name: 'Format 4: Just email at root',
      data: {
        emailAddress: 'jmarkel@forestcitytech.com'
      }
    }
  ];

  for (const payload of payloads) {
    console.log(`\nTrying ${payload.name}:`);
    console.log('Payload:', JSON.stringify(payload.data, null, 2));

    try {
      const response = await axios.post(
        'https://api.zoominfo.com/gtm/data/v1/contacts/enrich',
        payload.data,
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

      // If successful, check what fields we got
      if (response.data.data) {
        const contact = response.data.data;
        console.log('\n=== Data Received ===');
        console.log('Email:', contact.attributes?.email || contact.attributes?.emailAddress || 'Not provided');
        console.log('Phone:', contact.attributes?.phone || contact.attributes?.directPhone || 'Not provided');
        console.log('Mobile:', contact.attributes?.mobilePhone || 'Not provided');
      }

      break; // Stop if we find a working format

    } catch (error) {
      console.log('✗ Failed');
      console.log('Status:', error.response?.status);
      console.log('Error:', error.response?.data?.detail || error.message);
    }
  }
}

testEnrichEndpoint();