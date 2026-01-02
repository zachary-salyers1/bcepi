// See all fields returned from enrich
require('dotenv').config({ path: '.env.local' });
const ZoomInfoClient = require('./lib/zoominfo-client');

async function seeAllFields() {
  console.log('=== Check All Enrichment Fields ===\n');

  const client = new ZoomInfoClient();

  try {
    const enrichResult = await client.enrichContact({
      emailAddress: 'jmarkel@forestcitytech.com'
    });

    console.log('Full enrichment response:');
    console.log(JSON.stringify(enrichResult, null, 2));

    if (enrichResult.contact) {
      console.log('\n\n=== Available Contact Fields ===');
      console.log(Object.keys(enrichResult.contact).join(', '));

      console.log('\n\n=== Field Values ===');
      Object.keys(enrichResult.contact).forEach(key => {
        const value = enrichResult.contact[key];
        if (value !== null && value !== undefined && value !== '') {
          console.log(`${key}: ${JSON.stringify(value)}`);
        }
      });
    }

  } catch (error) {
    console.error('Error:', error.message);
    if (error.response?.data) {
      console.error('Details:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

seeAllFields();