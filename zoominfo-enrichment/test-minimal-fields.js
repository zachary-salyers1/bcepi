// Test with minimal output fields to find what works
require('dotenv').config({ path: '.env.local' });
const axios = require('axios');

async function testFields(fields, description) {
  const token = process.env.ZOOMINFO_ACCESS_TOKEN;

  const payload = {
    matchPersonInput: [{
      firstName: 'Zach',
      lastName: 'Salyers',
      emailAddress: 'zach.salyers@salyersai.com'
    }],
    outputFields: fields
  };

  console.log(`\n=== Testing: ${description} ===`);
  console.log('Fields:', fields.join(', '));

  try {
    const response = await axios.post(
      'https://api.zoominfo.com/gtm/data/v1/contacts/search',
      payload,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✓ SUCCESS!');
    console.log('Found:', response.data?.data?.length || 0, 'results');
    if (response.data?.data?.[0]) {
      console.log('Sample result fields:', Object.keys(response.data.data[0]));
      console.log('Data:', JSON.stringify(response.data.data[0], null, 2));
    }
    return true;

  } catch (error) {
    console.log('✗ FAILED');
    console.log('Status:', error.response?.status);
    console.log('Error:', error.response?.data?.detail || error.message);
    if (error.response?.data?.errors) {
      console.log('Errors:', JSON.stringify(error.response.data.errors, null, 2));
    }
    return false;
  }
}

async function runTests() {
  console.log('=== ZoomInfo Field Testing ===');

  // Test with minimal fields
  await testFields(['id'], 'Just ID');
  await new Promise(resolve => setTimeout(resolve, 1000));

  await testFields(['id', 'firstName', 'lastName'], 'Basic name fields');
  await new Promise(resolve => setTimeout(resolve, 1000));

  await testFields(['id', 'firstName', 'lastName', 'email'], 'Name + email');
  await new Promise(resolve => setTimeout(resolve, 1000));

  await testFields(['id', 'firstName', 'lastName', 'emailAddress'], 'Name + emailAddress');
  await new Promise(resolve => setTimeout(resolve, 1000));

  await testFields(['id', 'firstName', 'lastName', 'phone'], 'Name + phone');
}

runTests();
