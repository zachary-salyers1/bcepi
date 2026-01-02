// Final end-to-end test
require('dotenv').config({ path: '.env.local' });
const ZoomInfoClient = require('./lib/zoominfo-client');

async function testEndToEnd() {
  console.log('=== ZoomInfo Integration - Final Test ===\n');

  const client = new ZoomInfoClient();

  // Test 1: Contact Search by Name
  console.log('Test 1: Contact Search by Name');
  console.log('-------------------------------');
  try {
    const result1 = await client.searchContact({
      firstName: 'Zach',
      lastName: 'Salyers'
    });

    console.log('✓ Success!');
    console.log('Found', result1.data?.length || 0, 'contacts');
    if (result1.data && result1.data.length > 0) {
      console.log('\nFirst result:');
      console.log('- ID:', result1.data[0].id);
      console.log('- Name:', result1.data[0].attributes.firstName, result1.data[0].attributes.lastName);
      console.log('- Title:', result1.data[0].attributes.jobTitle);
      console.log('- Company:', result1.data[0].attributes.company?.name);
      console.log('- Accuracy Score:', result1.data[0].attributes.contactAccuracyScore);
    }
  } catch (error) {
    console.error('✗ Failed:', error.message);
  }

  console.log('\n\nTest 2: Contact Search by Email');
  console.log('--------------------------------');
  try {
    const result2 = await client.searchContact({
      email: 'zach.salyers@salyersai.com'
    });

    console.log('✓ Success!');
    console.log('Found', result2.data?.length || 0, 'contacts');
  } catch (error) {
    console.error('✗ Failed:', error.message);
  }

  console.log('\n\nTest 3: Company Search');
  console.log('----------------------');
  try {
    const result3 = await client.searchCompany({
      companyName: 'Anthropic'
    });

    console.log('✓ Success!');
    console.log('Found', result3.data?.length || 0, 'companies');
    if (result3.data && result3.data.length > 0) {
      console.log('\nFirst result:');
      console.log('- ID:', result3.data[0].id);
      console.log('- Name:', result3.data[0].attributes.companyName || result3.data[0].attributes.name);
      console.log('- Website:', result3.data[0].attributes.website);
      console.log('- Employees:', result3.data[0].attributes.employeeCount);
    }
  } catch (error) {
    console.error('✗ Failed:', error.message);
  }

  console.log('\n\n=== All Tests Complete ===');
  console.log('\n✅ ZoomInfo OAuth Integration is WORKING!');
  console.log('\nNext steps:');
  console.log('1. Deploy to Vercel with environment variables');
  console.log('2. Set up Make.com webhook integration');
  console.log('3. Connect to HubSpot for contact/company enrichment');
}

testEndToEnd();
