// Direct API test to debug the token issue
require('dotenv').config({ path: '.env.local' });
const axios = require('axios');

async function testDirectAPI() {
  console.log('=== Direct ZoomInfo API Test ===\n');

  const token = process.env.ZOOMINFO_ACCESS_TOKEN;
  console.log('Token (first 50 chars):', token?.substring(0, 50));
  console.log('Token length:', token?.length);
  console.log();

  // Test contact search
  const payload = {
    matchPersonInput: [{
      firstName: 'Zach',
      lastName: 'Salyers',
      emailAddress: 'zach.salyers@salyersai.com',
      companyName: 'Salyers AI'
    }],
    outputFields: ['id', 'firstName', 'lastName', 'email', 'jobTitle', 'companyName']
  };

  console.log('Making request to ZoomInfo API...');
  console.log('URL: https://api.zoominfo.com/search/contact');
  console.log('Payload:', JSON.stringify(payload, null, 2));
  console.log();

  try {
    const response = await axios.post(
      'https://api.zoominfo.com/search/contact',
      payload,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✓ Success!');
    console.log('Status:', response.status);
    console.log('Data:', JSON.stringify(response.data, null, 2));

  } catch (error) {
    console.error('✗ Error occurred:');
    console.error('Status:', error.response?.status);
    console.error('Status Text:', error.response?.statusText);
    console.error('Headers:', error.response?.headers);
    console.error('Data:', error.response?.data);
    console.error('Full error:', error.message);
  }
}

testDirectAPI();
