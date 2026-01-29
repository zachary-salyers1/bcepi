require('dotenv').config({ path: '.env.local' });
const axios = require('axios');

async function getCompanyFields() {
  try {
    const token = process.env.ZOOMINFO_ACCESS_TOKEN;

    console.log('Fetching available company enrichment fields from ZoomInfo...\n');

    const response = await axios.get(
      'https://api.zoominfo.com/gtm/data/v1/lookup/enrich',
      {
        params: {
          'filter[entity]': 'company',
          'filter[fieldType]': 'output'
        },
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.api+json'
        }
      }
    );

    const fields = response.data.data || [];

    console.log(`Found ${fields.length} available output fields:\n`);

    // Debug: Show first field structure
    if (fields.length > 0) {
      console.log('Sample field structure:', JSON.stringify(fields[0], null, 2));
    }

    console.log('\nField Names for outputFields array:');
    console.log('='.repeat(60));

    const fieldNames = fields
      .map(f => {
        // Try different possible paths
        return f.attributes?.name || f.attributes?.fieldName || f.name || f.id;
      })
      .filter(Boolean)
      .sort();

    fieldNames.forEach((name, index) => {
      console.log(`  '${name}',`);
    });

    console.log('\n' + '='.repeat(60));
    console.log(`\nTotal: ${fieldNames.length} fields`);

    // Also save to file for reference
    const fs = require('fs');
    fs.writeFileSync('company-fields-response.json', JSON.stringify(response.data, null, 2));
    console.log('\nFull response saved to: company-fields-response.json');

  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
    throw error;
  }
}

getCompanyFields();
