// Test enrich endpoint using field names from search results
require('dotenv').config({ path: '.env.local' });
const axios = require('axios');

async function testEnrichUsingSearchFields() {
  const token = process.env.ZOOMINFO_ACCESS_TOKEN;

  console.log('=== Testing Enrich Using Search Result Field Names ===\n');

  // First, let's do a search to see what fields are available
  console.log('Step 1: Performing search to understand field structure...\n');

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
      console.log('Found contact:');
      console.log('ID:', contact.id);
      console.log('Type:', contact.type);
      console.log('Attributes:', JSON.stringify(contact.attributes, null, 2));

      const contactId = contact.id;

      console.log('\n\nStep 2: Testing different enrich formats with this contact ID...\n');

      const tests = [
        {
          name: 'Using id field',
          payload: {
            data: {
              type: 'ContactEnrich',
              attributes: {
                id: contactId
              }
            }
          }
        },
        {
          name: 'Using contactId field',
          payload: {
            data: {
              type: 'ContactEnrich',
              attributes: {
                contactId: contactId
              }
            }
          }
        },
        {
          name: 'Using personId field',
          payload: {
            data: {
              type: 'ContactEnrich',
              attributes: {
                personId: contactId
              }
            }
          }
        },
        {
          name: 'Using id in data directly',
          payload: {
            data: {
              type: 'ContactEnrich',
              id: contactId,
              attributes: {}
            }
          }
        },
        {
          name: 'Using relationships format',
          payload: {
            data: {
              type: 'ContactEnrich',
              relationships: {
                contact: {
                  data: {
                    type: 'Contact',
                    id: contactId
                  }
                }
              }
            }
          }
        },
        {
          name: 'Direct GET request format',
          url: `https://api.zoominfo.com/gtm/data/v1/contacts/${contactId}`,
          method: 'GET'
        },
        {
          name: 'Using match criteria from search',
          payload: {
            data: {
              type: 'ContactEnrich',
              attributes: {
                firstName: 'Jason',
                lastName: 'Markel',
                companyName: 'Forest City Technologies'
              }
            }
          }
        },
        {
          name: 'Empty attributes with ID at data level',
          payload: {
            data: {
              type: 'ContactEnrich',
              id: contactId
            }
          }
        }
      ];

      for (const test of tests) {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`Testing: ${test.name}`);
        console.log(`${'='.repeat(60)}`);

        try {
          let response;

          if (test.method === 'GET') {
            console.log('GET URL:', test.url);
            response = await axios.get(
              test.url,
              {
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Accept': 'application/vnd.api+json',
                  'Content-Type': 'application/vnd.api+json'
                }
              }
            );
          } else {
            console.log('Payload:', JSON.stringify(test.payload, null, 2));
            response = await axios.post(
              'https://api.zoominfo.com/gtm/data/v1/contacts/enrich',
              test.payload,
              {
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Accept': 'application/vnd.api+json',
                  'Content-Type': 'application/vnd.api+json'
                }
              }
            );
          }

          console.log('\n✓✓✓ SUCCESS! ✓✓✓');
          console.log('Status:', response.status);
          console.log('\nFull Response:');
          console.log(JSON.stringify(response.data, null, 2));

          // Extract contact info if available
          if (response.data?.data) {
            const data = Array.isArray(response.data.data)
              ? response.data.data[0]
              : response.data.data;

            if (data?.attributes) {
              console.log('\n📧 Contact Information:');

              // Check all possible email fields
              const emailFields = ['email', 'emailAddress', 'emails', 'primaryEmail'];
              const phoneFields = ['phone', 'directPhone', 'mobilePhone', 'phones', 'primaryPhone'];

              for (const field of emailFields) {
                if (data.attributes[field]) {
                  console.log(`Email (${field}):`, data.attributes[field]);
                }
              }

              for (const field of phoneFields) {
                if (data.attributes[field]) {
                  console.log(`Phone (${field}):`, data.attributes[field]);
                }
              }

              console.log('\nAll available fields:');
              console.log(Object.keys(data.attributes).join(', '));
            }
          }

          console.log('\n🎉 Found working format! Stopping tests.');
          break;

        } catch (error) {
          console.log('\n✗ Failed');
          console.log('Status:', error.response?.status);

          if (error.response?.data) {
            console.log('Error:', JSON.stringify(error.response.data, null, 2));
          } else {
            console.log('Error:', error.message);
          }
        }
      }
    } else {
      console.log('No contacts found in search');
    }
  } catch (error) {
    console.error('Search failed:', error.response?.data || error.message);
  }
}

testEnrichUsingSearchFields();