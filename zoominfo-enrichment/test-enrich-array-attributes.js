// Test with attributes as an array based on "size must be between 1 and 25" error
require('dotenv').config({ path: '.env.local' });
const axios = require('axios');

async function testEnrichArrayAttributes() {
  const token = process.env.ZOOMINFO_ACCESS_TOKEN;

  console.log('=== Testing Enrich with Array in Attributes ===\n');

  const tests = [
    {
      name: 'Attributes as array with single email object',
      payload: {
        data: {
          type: 'ContactEnrich',
          attributes: [
            { emailAddress: 'jmarkel@forestcitytech.com' }
          ]
        }
      }
    },
    {
      name: 'Attributes as array with just email string',
      payload: {
        data: {
          type: 'ContactEnrich',
          attributes: ['jmarkel@forestcitytech.com']
        }
      }
    },
    {
      name: 'Attributes as array with contact details',
      payload: {
        data: {
          type: 'ContactEnrich',
          attributes: [
            {
              firstName: 'Jason',
              lastName: 'Markel',
              companyName: 'Forest City Technologies'
            }
          ]
        }
      }
    },
    {
      name: 'Attributes as array with ID',
      payload: {
        data: {
          type: 'ContactEnrich',
          attributes: [
            { id: '3701886388' }
          ]
        }
      }
    },
    {
      name: 'Attributes as array with personId',
      payload: {
        data: {
          type: 'ContactEnrich',
          attributes: [
            { personId: '3701886388' }
          ]
        }
      }
    },
    {
      name: 'Attributes as array with multiple formats',
      payload: {
        data: {
          type: 'ContactEnrich',
          attributes: [
            { email: 'jmarkel@forestcitytech.com' },
            { emailAddress: 'jmarkel@forestcitytech.com' },
            { matchPersonInput: { emailAddress: 'jmarkel@forestcitytech.com' } }
          ]
        }
      }
    },
    {
      name: 'Attributes as array with nested structure',
      payload: {
        data: {
          type: 'ContactEnrich',
          attributes: [
            {
              type: 'Contact',
              attributes: {
                emailAddress: 'jmarkel@forestcitytech.com'
              }
            }
          ]
        }
      }
    },
    {
      name: 'Attributes as array with input wrapper',
      payload: {
        data: {
          type: 'ContactEnrich',
          attributes: [
            {
              input: {
                emailAddress: 'jmarkel@forestcitytech.com'
              }
            }
          ]
        }
      }
    }
  ];

  for (const test of tests) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Testing: ${test.name}`);
    console.log(`${'='.repeat(60)}`);
    console.log('Payload:', JSON.stringify(test.payload, null, 2));

    try {
      const response = await axios.post(
        'https://api.zoominfo.com/gtm/data/v1/contacts/enrich',
        test.payload,
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
      console.log('Status:', response.status);
      console.log('\nFull Response:');
      console.log(JSON.stringify(response.data, null, 2));

      // Parse response
      if (response.data?.data) {
        const contacts = Array.isArray(response.data.data)
          ? response.data.data
          : [response.data.data];

        console.log(`\n📧 Found ${contacts.length} contact(s):`);

        contacts.forEach((contact, i) => {
          console.log(`\nContact ${i + 1}:`);
          if (contact.attributes) {
            // Log all fields that contain 'email' or 'phone'
            Object.keys(contact.attributes).forEach(key => {
              if (key.toLowerCase().includes('email') ||
                  key.toLowerCase().includes('phone') ||
                  key.toLowerCase().includes('name') ||
                  key.toLowerCase().includes('company')) {
                console.log(`  ${key}: ${contact.attributes[key]}`);
              }
            });

            // Also show all available fields
            console.log('  All fields:', Object.keys(contact.attributes).join(', '));
          }
        });
      }

      console.log('\n🎉 Found working format! Stopping tests.');
      break;

    } catch (error) {
      console.log('\n✗ Failed');
      console.log('Status:', error.response?.status);

      if (error.response?.data) {
        if (error.response.data.errors) {
          console.log('Errors:');
          error.response.data.errors.forEach(err => {
            console.log(`  - ${err.detail || err.title}`);
            if (err.source?.pointer) {
              console.log(`    at: ${err.source.pointer}`);
            }
          });
        }
        if (error.response.data.detail) {
          console.log('Detail:', error.response.data.detail);
        }
      } else {
        console.log('Error:', error.message);
      }
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n\n=== Testing Complete ===');
}

testEnrichArrayAttributes();