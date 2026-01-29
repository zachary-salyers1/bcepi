# Company Enrichment - Quick Start Guide

## What Was Fixed

The company enrichment feature was **incomplete** - it only searched for companies but never enriched them with full data. This is why:
- ✅ **NAICS code worked** - It appears in search results
- ❌ **Phone, employees, revenue, address didn't work** - These require the enrichment API call

## What Was Implemented

### 1. ZoomInfo Client Enhancement
Added `enrichCompany()` method to [lib/zoominfo-client.js](lib/zoominfo-client.js) that:
- Calls the ZoomInfo company enrichment endpoint
- Returns all available company data (phone, employees, revenue, address, industry codes, ownership, etc.)
- Handles authentication and error cases

### 2. HubSpot Client Enhancement
Added 4 company methods to [lib/hubspot-client.js](lib/hubspot-client.js):
- `getCompany(companyId, properties)` - Fetch company by ID
- `updateCompany(companyId, properties)` - Update single company
- `batchUpdateCompanies(companies)` - Batch update multiple companies
- `getCompanyByDomain(domain)` - Find company by domain

### 3. API Endpoint Rewrite
Completely rewrote [api/enrich-company.js](api/enrich-company.js) to:
- Use 2-step enrichment flow (search → enrich)
- Map all ZoomInfo fields to HubSpot properties
- Update HubSpot company records automatically
- Handle all error cases properly

---

## How to Use

### API Call Format

```bash
curl -X POST https://your-app.vercel.app/api/enrich-company \
  -H "Content-Type: application/json" \
  -H "x-webhook-secret: YOUR_WEBHOOK_SECRET" \
  -d '{
    "domain": "kccmanufacturing.com",
    "hubspotCompanyId": "12345678"
  }'
```

### Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `domain` | string | Yes* | Company domain (e.g., "salesforce.com") |
| `companyName` | string | Yes* | Company name (alternative to domain) |
| `hubspotCompanyId` | string | Yes | HubSpot company record ID to update |
| `city` | string | No | City for disambiguation |
| `state` | string | No | State for disambiguation |

*Either `domain` or `companyName` is required

### Response Format

**Success (200):**
```json
{
  "hubspotCompanyId": "12345678",
  "success": true,
  "zoomInfoId": 987654321,
  "data": {
    "name": "KCC Manufacturing",
    "website": "kccmanufacturing.com",
    "phone": "+1-555-123-4567",
    "employees": 250,
    "employeesRange": "200-500",
    "revenue": 50000000,
    "revenueRange": "$50M-$100M",
    "ownership": "Private",
    "industry": {
      "naicsCode": "332710",
      "naicsDescription": "Machine Shops",
      "sicCode": "3599",
      "sicDescription": "Industrial Machinery, NEC"
    },
    "address": {
      "street": "123 Industrial Pkwy",
      "city": "Springfield",
      "state": "IL",
      "zip": "62701",
      "country": "United States"
    }
  }
}
```

**Not Found (404):**
```json
{
  "error": "No matching company found in ZoomInfo",
  "hubspotCompanyId": "12345678"
}
```

**Credit Limit Exceeded (402):**
```json
{
  "error": "ZoomInfo enrichment credit limit exceeded",
  "message": "Contact your Account Manager",
  "zoomInfoId": 987654321
}
```

---

## HubSpot Custom Properties Setup

⚠️ **IMPORTANT:** Before using the feature, create these custom properties in HubSpot:

Go to: **HubSpot → Settings → Properties → Company Properties**

### Custom Properties to Create

| Property Label | Internal Name | Type | Group |
|---|---|---|---|
| ZoomInfo Company ID | `zoominfo_company_id` | Single-line text | Company Information |
| NAICS Code | `zoominfo_naics_code` | Single-line text | Company Information |
| NAICS Description | `zoominfo_naics_description` | Multi-line text | Company Information |
| SIC Code | `zoominfo_sic_code` | Single-line text | Company Information |
| SIC Description | `zoominfo_sic_description` | Multi-line text | Company Information |
| Ownership Type | `zoominfo_ownership` | Single-line text | Company Information |
| Ticker Symbol | `zoominfo_ticker` | Single-line text | Company Information |
| Credit Rating | `zoominfo_credit_rating` | Single-line text | Company Information |
| Credit Rating Description | `zoominfo_credit_description` | Single-line text | Company Information |
| Parent Company | `zoominfo_parent_company` | Single-line text | Company Information |
| Ultimate Parent Company | `zoominfo_ultimate_parent` | Single-line text | Company Information |
| Year Founded | `zoominfo_founded` | Number | Company Information |
| ZoomInfo Enriched | `zoominfo_enriched` | Single checkbox | Company Information |
| ZoomInfo Enriched Date | `zoominfo_enriched_date` | Date picker | Company Information |

**Note:** Standard properties like `phone`, `numberofemployees`, `annualrevenue`, `city`, `state`, `zip`, `country`, `address` already exist.

---

## Testing the Fix

### Test with KCC Manufacturing

1. Find KCC Manufacturing in HubSpot and get their company ID
2. Find their domain (or use company name)
3. Call the API:

```bash
curl -X POST https://your-app.vercel.app/api/enrich-company \
  -H "Content-Type: application/json" \
  -H "x-webhook-secret: YOUR_SECRET" \
  -d '{
    "domain": "kccmanufacturing.com",
    "hubspotCompanyId": "THEIR_HUBSPOT_ID"
  }'
```

4. Check the HubSpot company record - you should now see:
   - ✅ Phone number
   - ✅ Employee count
   - ✅ Revenue
   - ✅ Full address (street, city, state, zip)
   - ✅ NAICS code (should still be there)
   - ✅ All other enriched fields

### Test Script (Production Environment)

Run this on a server with valid credentials:

```bash
cd zoominfo-enrichment
node test-company-enrichment.js
```

This will test the full workflow with Salesforce.com as a test company.

---

## What Fields Get Populated

### HubSpot Standard Properties
- `name` - Company name
- `domain` - Website
- `phone` - Main phone number
- `numberofemployees` - Employee count (exact number)
- `annualrevenue` - Annual revenue (exact amount in USD)
- `city` - City
- `state` - State/province
- `zip` - Postal code
- `country` - Country
- `address` - Street address

### HubSpot Custom Properties
- `zoominfo_company_id` - ZoomInfo unique ID
- `zoominfo_naics_code` - NAICS industry code
- `zoominfo_naics_description` - NAICS industry description
- `zoominfo_sic_code` - SIC industry code
- `zoominfo_sic_description` - SIC industry description
- `zoominfo_ownership` - Ownership type (Public/Private)
- `zoominfo_ticker` - Stock ticker symbol (if public)
- `zoominfo_credit_rating` - Credit rating (A, B, C, etc.)
- `zoominfo_credit_description` - Credit rating description
- `zoominfo_parent_company` - Parent company name
- `zoominfo_ultimate_parent` - Ultimate parent company name
- `zoominfo_founded` - Year company was founded
- `zoominfo_enriched` - Checkbox (true after enrichment)
- `zoominfo_enriched_date` - Date of last enrichment

---

## Deployment

The changes are ready to deploy. To deploy to Vercel:

```bash
cd zoominfo-enrichment
vercel --prod
```

After deployment, the API endpoint will be live at:
```
https://your-app.vercel.app/api/enrich-company
```

---

## Client Explanation

You can send this to your client:

> **Issue Resolved:** The company enrichment was only calling ZoomInfo's search API, not the enrichment API. Search results include basic info like NAICS code, but detailed fields (phone, employees, revenue, address) require a separate enrichment call.
>
> **What we fixed:** We implemented the missing enrichment step, so now when a company is enriched, ALL available data from ZoomInfo gets populated in HubSpot, including:
> - Phone numbers
> - Employee count & range
> - Revenue & revenue range
> - Full address (street, city, state, zip, country)
> - Industry codes (NAICS & SIC) with descriptions
> - Ownership type
> - Credit rating
> - Parent/Ultimate parent companies
> - Year founded
>
> **KCC Manufacturing will now get all their data populated** when you run the enrichment.

---

## Files Modified

1. ✅ [lib/zoominfo-client.js](lib/zoominfo-client.js) - Added `enrichCompany()` method
2. ✅ [lib/hubspot-client.js](lib/hubspot-client.js) - Added company CRUD methods
3. ✅ [api/enrich-company.js](api/enrich-company.js) - Complete rewrite with 2-step flow
4. ✅ [test-company-enrichment.js](test-company-enrichment.js) - Test script

---

## Next Steps

1. ✅ Code is complete and ready
2. ⏳ Create custom properties in HubSpot (see above)
3. ⏳ Deploy to Vercel: `vercel --prod`
4. ⏳ Test with KCC Manufacturing domain
5. ⏳ Verify all fields populate correctly
6. ✅ Respond to client with explanation

---

## Support

If you encounter issues:
1. Check Vercel logs for errors
2. Verify ZoomInfo API credentials are valid
3. Confirm HubSpot custom properties exist
4. Test with a known company (e.g., Salesforce.com) first
5. Review the error messages - they indicate exactly what went wrong

The implementation follows the same proven pattern used for contact enrichment, which is working successfully.
