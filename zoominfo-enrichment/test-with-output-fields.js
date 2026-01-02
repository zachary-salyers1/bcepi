// Test search with output fields specified
require('dotenv').config({ path: '.env.local' });
const axios = require('axios');

async function testWithOutputFields() {
  const token = process.env.ZOOMINFO_ACCESS_TOKEN;

  console.log('=== Testing Contact Search with Output Fields ===\n');

  const payload = {
    data: {
      type: 'ContactSearch',
      attributes: {
        firstName: 'Jason',
        lastName: 'Markel',
        outputFields: [
          'id',
          'firstName',
          'lastName',
          'email',
          'phone',
          'directPhone',
          'mobilePhone',
          'jobTitle',
          'companyName',
          'city',
          'state'
        ]
      }
    }
  };

  console.log('Request:', JSON.stringify(payload, null, 2));
  console.log();

  try {
    const response = await axios.post(
      'https://api.zoominfo.com/gtm/data/v1/contacts/search',
      payload,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.api+json',
          'Content-Type': 'application/vnd.api+json'
        }
      }
    );

    console.log('✓ SUCCESS!');
    console.log('Found', response.data.data?.length || 0, 'contacts');

    if (response.data.data && response.data.data.length > 0) {
      console.log('\n=== First Result ===');
      const first = response.data.data[0];
      console.log('ID:', first.id);
      console.log('\nAttributes:');
      console.log(JSON.stringify(first.attributes, null, 2));

      console.log('\n=== Checking for Email/Phone ===');
      console.log('Has email field?', 'email' in first.attributes);
      console.log('Has directPhone field?', 'directPhone' in first.attributes);
      console.log('Has phone field?', 'phone' in first.attributes);
      console.log('Has mobilePhone field?', 'mobilePhone' in first.attributes);

      console.log('\nEmail value:', first.attributes.email || 'NOT PROVIDED');
      console.log('Phone value:', first.attributes.phone || first.attributes.directPhone || 'NOT PROVIDED');
      console.log('Mobile value:', first.attributes.mobilePhone || 'NOT PROVIDED');
    }

  } catch (error) {
    console.error('✗ FAILED');
    console.error('Status:', error.response?.status);
    console.error('Error:', error.response?.data || error.message);
  }
}

testWithOutputFields();
