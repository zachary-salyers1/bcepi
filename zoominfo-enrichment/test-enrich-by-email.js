// Test enrich by email address
require('dotenv').config({ path: '.env.local' });
const axios = require('axios');

async function testEnrichByEmail() {
  const token = process.env.ZOOMINFO_ACCESS_TOKEN;

  console.log('=== Testing Enrich by Email ===\n');

  // Test with email address in matchPersonInput
  const enrichPayload = {
    data: {
      type: 'ContactEnrich',
      attributes: {
        matchPersonInput: [
          {
            emailAddress: 'jmarkel@forestcitytech.com'
          }
        ],
        outputFields: [
          'id',
          'firstName',
          'lastName',
          'email',
          'companyName',
          'jobTitle',
          'contactAccuracyScore'
        ]
      }
    }
  };

  console.log('Enrich Payload:', JSON.stringify(enrichPayload, null, 2));

  try {
    const response = await axios.post(
      'https://api.zoominfo.com/gtm/data/v1/contacts/enrich',
      enrichPayload,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.api+json',
          'Content-Type': 'application/vnd.api+json'
        }
      }
    );

    console.log('\n✓ Success! Status:', response.status);
    console.log('\nResponse:', JSON.stringify(response.data, null, 2));

    // Check match status
    if (response.data?.data?.[0]?.meta?.matchStatus) {
      console.log('\nMatch Status:', response.data.data[0].meta.matchStatus);

      if (response.data.data[0].meta.matchStatus === 'LIMIT_EXCEEDED') {
        console.log('\n⚠️  Your ZoomInfo account has exceeded enrichment limits.');
        console.log('Contact your ZoomInfo Account Manager to add more credits.');
      }
    }

    // If we got attributes, show them
    if (response.data?.data?.[0]?.attributes) {
      const attrs = response.data.data[0].attributes;
      console.log('\n📧 Contact Data:');
      console.log('  Name:', attrs.firstName, attrs.lastName);
      console.log('  Email:', attrs.email);
      console.log('  Company:', attrs.companyName);
      console.log('  Job Title:', attrs.jobTitle);
    }

  } catch (error) {
    console.error('Error:', error.response?.status);
    if (error.response?.data) {
      console.error('Details:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testEnrichByEmail();