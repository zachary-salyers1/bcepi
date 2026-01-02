// Debug rate limiting and check response headers
require('dotenv').config({ path: '.env.local' });
const axios = require('axios');

async function testRateLimitDebug() {
  const token = process.env.ZOOMINFO_ACCESS_TOKEN;

  console.log('=== Rate Limit Debug Test ===\n');

  const enrichPayload = {
    data: {
      type: 'ContactEnrich',
      attributes: {
        matchPersonInput: [
          { emailAddress: 'jmarkel@forestcitytech.com' }
        ],
        outputFields: [
          'id',
          'firstName',
          'lastName',
          'email',
          'companyName',
          'jobTitle'
        ]
      }
    }
  };

  console.log('Making a single enrich request...\n');

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

    console.log('Status:', response.status);

    console.log('\n=== Response Headers ===');
    Object.keys(response.headers).forEach(key => {
      // Look for any rate limit or credit related headers
      if (key.toLowerCase().includes('rate') ||
          key.toLowerCase().includes('limit') ||
          key.toLowerCase().includes('credit') ||
          key.toLowerCase().includes('remaining') ||
          key.toLowerCase().includes('x-')) {
        console.log(`${key}: ${response.headers[key]}`);
      }
    });

    console.log('\n=== All Headers ===');
    console.log(JSON.stringify(response.headers, null, 2));

    console.log('\n=== Response Body ===');
    console.log(JSON.stringify(response.data, null, 2));

    // Check the matchStatus
    const matchStatus = response.data?.data?.[0]?.meta?.matchStatus;
    console.log('\n=== Match Status ===');
    console.log('matchStatus:', matchStatus);

    if (matchStatus === 'LIMIT_EXCEEDED') {
      console.log('\n⚠️  Still getting LIMIT_EXCEEDED');
      console.log('\nPossible causes:');
      console.log('1. The "Enrich" scope may not be enabled on your OAuth app');
      console.log('2. Your subscription tier may not include API enrichment');
      console.log('3. There may be a separate API credit allocation needed');
      console.log('\nSuggested follow-up with ZoomInfo:');
      console.log('- Ask them to verify the "Enrich" scope is enabled on Client ID: 0oaxmafvo3W2Vdw3C697');
      console.log('- Ask if "Copilot Enterprise Bundle" includes Data API enrichment access');
    }

  } catch (error) {
    console.log('Error Status:', error.response?.status);
    console.log('\n=== Error Response Headers ===');
    if (error.response?.headers) {
      console.log(JSON.stringify(error.response.headers, null, 2));
    }
    console.log('\n=== Error Response Body ===');
    if (error.response?.data) {
      console.log(JSON.stringify(error.response.data, null, 2));
    }
  }
}

testRateLimitDebug();