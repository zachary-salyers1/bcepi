require('dotenv').config({ path: '.env.local' });
const ZoomInfoClient = require('./lib/zoominfo-client');

async function testCompanyEnrichment() {
  console.log('🧪 Testing Company Enrichment (ZoomInfo Only)\n');
  console.log('='.repeat(60));

  const zoominfo = new ZoomInfoClient();
  const testDomain = 'salesforce.com';

  console.log(`\n📋 Test Domain: ${testDomain}\n`);

  try {
    // Step 1: Search
    console.log('1️⃣  Searching for company...');
    const searchResult = await zoominfo.searchCompany({ website: testDomain });

    if (!searchResult.data || searchResult.data.length === 0) {
      console.error('❌ No results found');
      return;
    }

    const searchMatch = searchResult.data[0];
    console.log('   ✅ Found:', searchMatch.attributes?.name);
    console.log('   📍 Company ID:', searchMatch.id);

    // Step 2: Enrich
    console.log('\n2️⃣  Enriching company...');
    const enrichResult = await zoominfo.enrichCompany({
      companyId: searchMatch.id,
      website: testDomain
    });

    if (!enrichResult.success) {
      console.error('❌ Enrichment failed:', enrichResult.message);
      return;
    }

    const company = enrichResult.company;
    console.log('   ✅ Success!\n');

    // Display all enriched data
    console.log('📊 ENRICHED COMPANY DATA');
    console.log('='.repeat(60));
    console.log('\n🏢 Basic Information:');
    console.log('   ├─ Name:', company.name);
    console.log('   ├─ Website:', company.website);
    console.log('   ├─ Phone:', company.phone);
    console.log('   ├─ Fax:', company.fax || 'N/A');
    console.log('   └─ Description:', company.description?.substring(0, 100) + '...');

    console.log('\n👥 Company Size:');
    console.log('   ├─ Employees:', company.employeeCount?.toLocaleString() || 'N/A');
    console.log('   ├─ Employee Range:', company.employeeRange || 'N/A');
    console.log('   ├─ Revenue:', company.revenue ? `$${company.revenue.toLocaleString()}` : 'N/A');
    console.log('   └─ Revenue Range:', company.revenueRange || 'N/A');

    console.log('\n🏭 Industry:');
    console.log('   ├─ Primary Industry:', company.primaryIndustry || 'N/A');
    console.log('   ├─ NAICS Codes:', company.naicsCodes?.map(c => `${c.code} (${c.description})`).join('; ') || 'N/A');
    console.log('   └─ SIC Codes:', company.sicCodes?.map(c => `${c.code} (${c.description})`).join('; ') || 'N/A');

    console.log('\n📍 Location:');
    console.log('   ├─ Street:', company.street || 'N/A');
    console.log('   ├─ City:', company.city || 'N/A');
    console.log('   ├─ State:', company.state || 'N/A');
    console.log('   ├─ ZIP:', company.zipCode || 'N/A');
    console.log('   └─ Country:', company.country || 'N/A');

    console.log('\n🏢 Corporate Hierarchy:');
    console.log('   ├─ Parent:', company.parentName || 'None');
    console.log('   ├─ Ultimate Parent:', company.ultimateParentName || 'None');
    console.log('   ├─ Ultimate Parent Employees:', company.ultimateParentEmployees?.toLocaleString() || 'N/A');
    console.log('   └─ Ultimate Parent Revenue:', company.ultimateParentRevenue ? `$${company.ultimateParentRevenue.toLocaleString()}` : 'N/A');

    console.log('\n💼 Additional Info:');
    console.log('   ├─ Founded Year:', company.foundedYear || 'N/A');
    console.log('   ├─ Ticker:', company.ticker || 'N/A');
    console.log('   ├─ Company Status:', company.companyStatus || 'N/A');
    console.log('   ├─ Company Type:', company.type || 'N/A');
    console.log('   └─ Contacts in ZoomInfo:', company.numberOfContactsInZoomInfo?.toLocaleString() || 'N/A');

    if (company.socialMediaUrls && company.socialMediaUrls.length > 0) {
      console.log('\n🌐 Social Media:');
      company.socialMediaUrls.forEach(url => {
        console.log('   ├─', url);
      });
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ COMPANY ENRICHMENT IS WORKING!\n');
    console.log('📝 Next Steps:');
    console.log('   1. Create custom properties in HubSpot (see COMPANY_ENRICHMENT_GUIDE.md)');
    console.log('   2. Deploy to production: vercel --prod');
    console.log('   3. Test the full API endpoint with KCC Manufacturing');
    console.log('\n💡 The API endpoint is ready to use at:');
    console.log('   POST /api/enrich-company');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.response?.data) {
      console.error('   Response:', JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  }
}

testCompanyEnrichment().catch(error => {
  console.error('\n💥 Fatal error:', error);
  process.exit(1);
});
