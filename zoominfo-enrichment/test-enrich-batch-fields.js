// Test with different batch field names inside attributes
require('dotenv').config({ path: '.env.local' });
const axios = require('axios');

async function testEnrichBatchFields() {
  const token = process.env.ZOOMINFO_ACCESS_TOKEN;

  console.log('=== Testing Different Batch Field Names ===\n');

  // Common batch field names to try
  const batchFieldNames = [
    'items',
    'batch',
    'requests',
    'records',
    'contacts',
    'data',
    'inputs',
    'enrichRequests',
    'contactRequests',
    'matchRequests',
    'people',
    'persons',
    'queries',
    'criteria',
    'filters',
    'matches',
    'searchInputs'
  ];

  const testEmail = { emailAddress: 'jmarkel@forestcitytech.com' };

  for (const fieldName of batchFieldNames) {
    console.log(`\nTesting field name: "${fieldName}"`);

    const payload = {
      data: {
        type: 'ContactEnrich',
        attributes: {
          [fieldName]: [testEmail]
        }
      }
    };

    console.log('Payload:', JSON.stringify(payload, null, 2));

    try {
      const response = await axios.post(
        'https://api.zoominfo.com/gtm/data/v1/contacts/enrich',
        payload,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.api+json',
            'Content-Type': 'application/vnd.api+json'
          },
          timeout: 10000
        }
      );

      console.log('\n✓✓✓ SUCCESS! ✓✓✓');
      console.log(`The correct field name is: "${fieldName}"`);
      console.log('\nStatus:', response.status);
      console.log('Full Response:');
      console.log(JSON.stringify(response.data, null, 2));

      // Parse response to extract contact info
      if (response.data?.data) {
        const contacts = Array.isArray(response.data.data)
          ? response.data.data
          : [response.data.data];

        console.log(`\n📧 Enriched ${contacts.length} contact(s):`);

        contacts.forEach((contact, i) => {
          console.log(`\nContact ${i + 1}:`);
          if (contact.attributes) {
            // Look for email and phone fields
            const emailFields = ['email', 'emailAddress', 'emails', 'primaryEmail'];
            const phoneFields = ['phone', 'directPhone', 'mobilePhone', 'phones', 'companyPhone'];
            const nameFields = ['firstName', 'lastName', 'fullName', 'name'];

            // Check for email
            for (const field of emailFields) {
              if (contact.attributes[field]) {
                console.log(`  Email (${field}): ${contact.attributes[field]}`);
              }
            }

            // Check for phone
            for (const field of phoneFields) {
              if (contact.attributes[field]) {
                console.log(`  Phone (${field}): ${contact.attributes[field]}`);
              }
            }

            // Check for name
            for (const field of nameFields) {
              if (contact.attributes[field]) {
                console.log(`  ${field}: ${contact.attributes[field]}`);
              }
            }

            // Show all available fields
            const allFields = Object.keys(contact.attributes);
            console.log('\n  All available fields:', allFields.join(', '));

            // Show sample of actual values for fields containing sensitive data
            const sensitiveFields = allFields.filter(f =>
              f.toLowerCase().includes('email') ||
              f.toLowerCase().includes('phone') ||
              f.toLowerCase().includes('address')
            );

            if (sensitiveFields.length > 0) {
              console.log('\n  Data fields with values:');
              sensitiveFields.forEach(field => {
                const value = contact.attributes[field];
                if (value && value !== true && value !== false) {
                  console.log(`    ${field}: ${value}`);
                }
              });
            }
          }
        });
      }

      console.log('\n🎉 Found the working format!');
      break;

    } catch (error) {
      if (error.response?.status === 400) {
        const errorDetail = error.response.data?.errors?.[0]?.detail || error.response.data?.detail;
        if (errorDetail && errorDetail.includes('Invalid field requested')) {
          console.log(`✗ Field "${fieldName}" not recognized`);
        } else if (errorDetail && errorDetail.includes('size must be between')) {
          console.log(`✗ Field "${fieldName}" exists but wrong format`);
        } else {
          console.log(`✗ Failed: ${errorDetail || 'Unknown error'}`);
        }
      } else {
        console.log(`✗ Error: ${error.response?.status || error.message}`);
      }
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  console.log('\n\n=== Test Complete ===');
}

testEnrichBatchFields();