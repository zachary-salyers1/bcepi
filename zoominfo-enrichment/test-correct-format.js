// Test with correct format from ZoomInfo docs
require('dotenv').config({ path: '.env.local' });
const axios = require('axios');

async function testCorrectFormat() {
  const token = process.env.ZOOMINFO_ACCESS_TOKEN;

  console.log('=== Testing Correct Enrich Format ===\n');

  // First search to get a personId
  console.log('Step 1: Search for a contact to get personId...\n');

  try {
    const searchResponse = await axios.post(
      'https://api.zoominfo.com/gtm/data/v1/contacts/search',
      {
        data: {
          type: 'ContactSearch',
          attributes: {
            firstName: 'Jason',
            lastName: 'Markel'
          }
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.api+json',
          'Content-Type': 'application/vnd.api+json'
        }
      }
    );

    if (searchResponse.data.data && searchResponse.data.data.length > 0) {
      const contact = searchResponse.data.data[0];
      const personId = parseInt(contact.id);

      console.log('Found contact:');
      console.log('  ID:', personId);
      console.log('  Name:', contact.attributes.firstName, contact.attributes.lastName);
      console.log('  hasEmail:', contact.attributes.hasEmail);
      console.log('  hasMobilePhone:', contact.attributes.hasMobilePhone);

      console.log('\n\nStep 2: Enrich using the correct format...\n');

      // Now use the correct format with matchPersonInput as an array
      const enrichPayload = {
        data: {
          type: 'ContactEnrich',
          attributes: {
            matchPersonInput: [
              {
                personId: personId
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

      const enrichResponse = await axios.post(
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

      console.log('\n✓✓✓ SUCCESS! ✓✓✓');
      console.log('Status:', enrichResponse.status);
      console.log('\nFull Response:');
      console.log(JSON.stringify(enrichResponse.data, null, 2));

      // Parse the response
      if (enrichResponse.data?.data) {
        const contacts = Array.isArray(enrichResponse.data.data)
          ? enrichResponse.data.data
          : [enrichResponse.data.data];

        console.log(`\n\n📧 Enriched ${contacts.length} contact(s):`);

        contacts.forEach((c, i) => {
          console.log(`\n--- Contact ${i + 1} ---`);
          if (c.attributes) {
            console.log('Name:', c.attributes.firstName, c.attributes.lastName);
            console.log('Email:', c.attributes.email || 'Not available');
            console.log('Direct Phone:', c.attributes.directPhone || 'Not available');
            console.log('Mobile Phone:', c.attributes.mobilePhone || 'Not available');
            console.log('Company:', c.attributes.companyName || c.attributes.company?.name || 'Not available');
            console.log('Job Title:', c.attributes.jobTitle || 'Not available');
            console.log('\nAll available fields:', Object.keys(c.attributes).join(', '));
          }
        });
      }

    } else {
      console.log('No contacts found in search');
    }
  } catch (error) {
    console.error('Error:', error.response?.status);
    if (error.response?.data) {
      console.error('Error details:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Message:', error.message);
    }
  }
}

testCorrectFormat();