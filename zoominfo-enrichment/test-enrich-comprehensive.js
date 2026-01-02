// Comprehensive test for enrich endpoint - exploring all possible formats
require('dotenv').config({ path: '.env.local' });
const axios = require('axios');

async function testEnrichComprehensive() {
  const token = process.env.ZOOMINFO_ACCESS_TOKEN;

  console.log('=== Comprehensive Enrich Endpoint Testing ===\n');

  const tests = [
    {
      name: 'Single contact with email (no array)',
      payload: {
        data: {
          type: 'ContactEnrich',
          attributes: {
            emailAddress: 'jmarkel@forestcitytech.com'
          }
        }
      }
    },
    {
      name: 'Multiple contacts as array at data level',
      payload: {
        data: [
          {
            type: 'ContactEnrich',
            attributes: {
              emailAddress: 'jmarkel@forestcitytech.com'
            }
          }
        ]
      }
    },
    {
      name: 'Batch format with included array',
      payload: {
        data: {
          type: 'ContactEnrichBatch',
          attributes: {
            contacts: [
              { emailAddress: 'jmarkel@forestcitytech.com' }
            ]
          }
        }
      }
    },
    {
      name: 'Using "input" wrapper',
      payload: {
        data: {
          type: 'ContactEnrich',
          attributes: {
            input: {
              emailAddress: 'jmarkel@forestcitytech.com'
            }
          }
        }
      }
    },
    {
      name: 'Using "inputs" array wrapper',
      payload: {
        data: {
          type: 'ContactEnrich',
          attributes: {
            inputs: [
              { emailAddress: 'jmarkel@forestcitytech.com' }
            ]
          }
        }
      }
    },
    {
      name: 'Using "enrichInput" wrapper',
      payload: {
        data: {
          type: 'ContactEnrich',
          attributes: {
            enrichInput: {
              emailAddress: 'jmarkel@forestcitytech.com'
            }
          }
        }
      }
    },
    {
      name: 'With outputFields specified',
      payload: {
        data: {
          type: 'ContactEnrich',
          attributes: {
            emailAddress: 'jmarkel@forestcitytech.com',
            outputFields: ['email', 'phone', 'directPhone', 'mobilePhone']
          }
        }
      }
    },
    {
      name: 'Using email instead of emailAddress',
      payload: {
        data: {
          type: 'ContactEnrich',
          attributes: {
            email: 'jmarkel@forestcitytech.com'
          }
        }
      }
    },
    {
      name: 'Using matchInput wrapper',
      payload: {
        data: {
          type: 'ContactEnrich',
          attributes: {
            matchInput: {
              emailAddress: 'jmarkel@forestcitytech.com'
            }
          }
        }
      }
    },
    {
      name: 'Just type without attributes',
      payload: {
        data: {
          type: 'ContactEnrich',
          emailAddress: 'jmarkel@forestcitytech.com'
        }
      }
    },
    {
      name: 'Root level array',
      payload: [
        {
          emailAddress: 'jmarkel@forestcitytech.com'
        }
      ]
    },
    {
      name: 'Simple object at root',
      payload: {
        emailAddress: 'jmarkel@forestcitytech.com'
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

      // Parse the response to extract email/phone
      if (response.data?.data) {
        const data = Array.isArray(response.data.data)
          ? response.data.data[0]
          : response.data.data;

        if (data?.attributes) {
          console.log('\n📧 Contact Information:');
          console.log('Name:', data.attributes.firstName, data.attributes.lastName);
          console.log('Email:', data.attributes.email || data.attributes.emailAddress || 'Not found');
          console.log('Direct Phone:', data.attributes.directPhone || data.attributes.phone || 'Not found');
          console.log('Mobile:', data.attributes.mobilePhone || 'Not found');
          console.log('Company:', data.attributes.companyName || 'Not found');
        }
      }

      // If we found a working format, stop testing
      console.log('\n🎉 Found working format! Stopping tests.');
      break;

    } catch (error) {
      console.log('\n✗ Failed');
      console.log('Status:', error.response?.status);

      if (error.response?.data) {
        console.log('Error Response:');
        console.log(JSON.stringify(error.response.data, null, 2));

        // Log specific error details if available
        if (error.response.data.errors) {
          console.log('\nError Details:');
          error.response.data.errors.forEach((err, i) => {
            console.log(`  ${i + 1}. ${err.detail || err.title || JSON.stringify(err)}`);
          });
        }
        if (error.response.data.detail) {
          console.log('Detail:', error.response.data.detail);
        }
      } else {
        console.log('Error:', error.message);
      }
    }

    // Small delay between requests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n\n=== Testing Complete ===');
}

testEnrichComprehensive();