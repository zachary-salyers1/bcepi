// Test enrich endpoints
require('dotenv').config({ path: '.env.local' });
const axios = require('axios');

async function testEnrich(url, payload, description) {
  const token = process.env.ZOOMINFO_ACCESS_TOKEN;

  console.log(`\n=== Testing: ${description} ===`);
  console.log('URL:', url);
  console.log('Payload:', JSON.stringify(payload, null, 2));

  try {
    const response = await axios.post(url, payload, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✓ SUCCESS!');
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(response.data, null, 2));
    return true;

  } catch (error) {
    console.log('✗ FAILED');
    console.log('Status:', error.response?.status, error.response?.statusText);
    console.log('Error:', error.response?.data || error.message);
    return false;
  }
}

async function runTests() {
  console.log('=== ZoomInfo Enrich API Testing ===');

  // Test contact enrich with different formats
  await testEnrich(
    'https://api.zoominfo.com/gtm/data/v1/contacts/enrich',
    {
      matchPersonInput: [{
        emailAddress: 'zach.salyers@salyersai.com'
      }]
    },
    'Contact enrich - email only with matchPersonInput'
  );

  await new Promise(resolve => setTimeout(resolve, 1000));

  await testEnrich(
    'https://api.zoominfo.com/gtm/data/v1/contacts/enrich',
    {
      emailAddress: 'zach.salyers@salyersai.com'
    },
    'Contact enrich - email only plain'
  );

  await new Promise(resolve => setTimeout(resolve, 1000));

  await testEnrich(
    'https://api.zoominfo.com/gtm/data/v1/contacts/enrich',
    [{
      emailAddress: 'zach.salyers@salyersai.com'
    }],
    'Contact enrich - array of objects'
  );

  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test company enrich
  await testEnrich(
    'https://api.zoominfo.com/gtm/data/v1/companies/enrich',
    {
      matchCompanyInput: [{
        companyName: 'Salyers AI'
      }]
    },
    'Company enrich - name with matchCompanyInput'
  );

  await new Promise(resolve => setTimeout(resolve, 1000));

  await testEnrich(
    'https://api.zoominfo.com/gtm/data/v1/companies/enrich',
    {
      companyName: 'Salyers AI'
    },
    'Company enrich - name plain'
  );
}

runTests();
