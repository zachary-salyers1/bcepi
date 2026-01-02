// Test the updated ZoomInfo client
require('dotenv').config({ path: '.env.local' });
const ZoomInfoClient = require('./lib/zoominfo-client');

async function testUpdatedClient() {
  console.log('=== Testing Updated ZoomInfo Client ===\n');

  const client = new ZoomInfoClient();

  try {
    // Test 1: Search for a contact
    console.log('Step 1: Searching for contact...');
    const searchResult = await client.searchContact({
      firstName: 'Jason',
      lastName: 'Markel'
    });

    if (searchResult.data && searchResult.data.length > 0) {
      const contact = searchResult.data[0];
      console.log('✓ Search successful!');
      console.log('  Person ID:', contact.id);
      console.log('  Name:', contact.attributes.firstName, contact.attributes.lastName);
      console.log('  Job Title:', contact.attributes.jobTitle);
      console.log('  hasEmail:', contact.attributes.hasEmail);
      console.log('  hasMobilePhone:', contact.attributes.hasMobilePhone);

      // Test 2: Enrich the contact
      console.log('\nStep 2: Enriching contact...');
      const enrichResult = await client.enrichContact({
        personId: contact.id
      });

      console.log('\nEnrich Result:');
      console.log('  Success:', enrichResult.success);

      if (enrichResult.limitExceeded) {
        console.log('  ⚠️  Limit Exceeded:', enrichResult.message);
        console.log('\n  Note: Your ZoomInfo account has hit the enrichment credit limit.');
        console.log('  Contact your ZoomInfo Account Manager to add more credits.');
        console.log('  The API format is correct - credits are needed to get actual data.');
      } else if (enrichResult.contact) {
        console.log('  ✓ Got enriched data!');
        console.log('  Email:', enrichResult.contact.email);
        console.log('  Phone:', enrichResult.contact.phone);
        console.log('  Company:', enrichResult.contact.companyName);
      }
    } else {
      console.log('✗ No contacts found');
    }

    // Test 3: Enrich by email
    console.log('\n\nStep 3: Testing enrich by email address...');
    const enrichByEmail = await client.enrichContact({
      emailAddress: 'jmarkel@forestcitytech.com'
    });

    console.log('Enrich by Email Result:');
    console.log('  Success:', enrichByEmail.success);
    if (enrichByEmail.limitExceeded) {
      console.log('  ⚠️  Limit Exceeded');
    }

  } catch (error) {
    console.error('Error:', error.message);
    if (error.response?.data) {
      console.error('API Error:', JSON.stringify(error.response.data, null, 2));
    }
  }

  console.log('\n=== Test Complete ===');
}

testUpdatedClient();