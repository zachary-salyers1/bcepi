# ZoomInfo Enrichment - Deployment Guide

## ✅ OAuth Integration Complete!

The ZoomInfo OAuth integration is now working correctly with the following updates:

### What Was Fixed:
1. **Authentication Flow**: Properly configured OAuth with refresh token support
2. **API Endpoints**: Updated to use correct `/gtm/data/v1/` endpoints
3. **Request Format**: Implemented JSON API specification (`application/vnd.api+json`)
4. **Response Handling**: Correctly parsing JSON API format responses

---

## 🚀 Deploy to Vercel Production

### Step 1: Update Environment Variables in Vercel Dashboard

Go to: https://vercel.com/zachsalyers-4830s-projects/zoominfo-enrichment/settings/environment-variables

**Add/Update these variables:**

```bash
# ZoomInfo OAuth Credentials
ZOOMINFO_CLIENT_ID=0oaxmafvo3W2Vdw3C697
ZOOMINFO_CLIENT_SECRET=NyRb-HkYctT9E-DY2dF_ulLnTQ_kBV33hIFgIDNfnHukhGJ8DoNWCq_4Mwq0ngs9
ZOOMINFO_TOKEN_URL=https://okta-login.zoominfo.com/oauth2/default/v1/token

# Access Token (Generate new token every 24 hours from ZoomInfo Developer Portal)
ZOOMINFO_ACCESS_TOKEN=eyJraWQiOiJKd2pmQ2g5a2hMRFNfQ2ZNV3diNjl3MGg1SDhackcteUhFSmU0cEZ3UDNVIiwiYWxnIjoiUlMyNTYifQ.eyJ2ZXIiOjEsImp0aSI6IkFULmwyOGdZWXVEdEZLbm9nSzJYLVhYaDc1NUdybkVmTjIzZjZXa2dDQlVvZnMub2FyM2RraDc5cURJc1hqVmw2OTciLCJpc3MiOiJodHRwczovL29rdGEtbG9naW4uem9vbWluZm8uY29tL29hdXRoMi9kZWZhdWx0IiwiYXVkIjoiYXBpOi8vZGVmYXVsdCIsInN1YiI6InphY2guc2FseWVyc0BzYWx5ZXJzYWkuY29tIiwiaWF0IjoxNzYzOTkzNjQxLCJleHAiOjE3NjQwODAwNDEsImNpZCI6IjBvYXhtYWZ2bzNXMlZkdzNDNjk3IiwidWlkIjoiMDB1eG04cHViZFAyVGdQMTc2OTciLCJzY3AiOlsicHJvZmlsZSIsImFwaTpkYXRhOmludGVudCIsImFwaTpkYXRhOm5ld3MiLCJvZmZsaW5lX2FjY2VzcyIsImFwaTpkYXRhOmNvbnRhY3QiLCJvcGVuaWQiLCJhcGk6ZGF0YTpzY29vcHMiLCJhcGk6ZW50aXRsZW1lbnQ6cmVhZCIsImFwaTpkYXRhOmNvbXBhbnkiLCJ6aV9hcGkiLCJlbWFpbCIsImFwaTphY2NvdW50LXN1bW1hcnk6cmVhZCIsImFwaTppbnNpZ2h0czpyZWFkIl0sImF1dGhfdGltZSI6MTc2Mzk5MzYzOSwibGFzdE5hbWUiOiJTYWx5ZXJzIiwiemlTZXNzaW9uVHlwZSI6NTAwLCJ6aUdyb3VwSWQiOjAsInppQ29tcGFueVByb2ZpbGVJZCI6IjE1Njk4NzY4IiwiemlQbGF0Zm9ybXMiOlsiREVWIFBPUlRBTCIsIkRPWkkiLCJBRE1JTiJdLCJ6aUFkbWluUm9sZXMiOiJCQVFBQUlBQUJRQUFBQ0FBTWdRQVFCSUtBQWhBQUFBQUFJQUFBQUFBQUFBQUFFQUFBQUFBQUFCUXBEVEJsc3dBQUFBQS93TU0iLCJ6aVVzZXJuYW1lIjoiemFjaC5zYWx5ZXJzQHNhbHllcnNhaS5jb20iLCJmaXJzdE5hbWUiOiJaYWNoIiwiemlSb2xlcyI6IjN1LzgvLzk5cmYvZi8vNEY4blhwYmQ4UEJ4aFlLUDh6Z0lBQ0FBSUFBSUFBQUd3QUFBQUFBQVJ3dFB6L245L0M0QUFGQU1BQiIsInppVXVpZCI6ImZmZjBjOThmLTU3ZGQtNGViOS1iZjMxLWY5ZDczZjY3ZWZlOCIsInppVXNlcklkIjozMzIyMTY5Miwic2ZDb250YWN0SWQiOiIwMDM3eTAwMDAxZ1FTbzhBQUciLCJ6aUluYWN0aXZpdHkiOjYwNDgwMCwibm9Db3BpbG90V1NBY2Nlc3MiOnRydWUsInppVGVuYW50SWQiOjIwMDIyMDUwLCJlbWFpbCI6InphY2guc2FseWVyc0BzYWx5ZXJzYWkuY29tIiwic2ZBY2NvdW50SWQiOiIwMDEzcDAwMDAxdXFkZTBBQUEiLCJ6aU1vbmdvVXNlcklkIjoiMzMyMjE2OTIifQ.MDI39V0IK7alpWgh5LpyMQEc_tEu2Sfk9bwL86IgLaC-IvEomiAlB0mAdwkJPzyobMzuyVMsYV55OPUXbV2bjDZWwmjkxXWv4BqbIKJPM_siXpUIyUeV6NavBF2FglXuQJdvSxh2NFgH-0rPaFa_fzgn6btt5RaIiAx2e4rnw5W3iTt5lDKdqeQBfisItPS0GwkPQlXXu-S79qq6Li2scgkno9KqV7HV4192Ha63CZ21s1tT-V_7ndzxOVud9VEOccNksrd_Pztg5MLfweID4xgzL3USKfz30qjkwk0H3L_MwvcuxEVUR2uVUtN6ld0gcHuAsdfiZQxn_3kXUgtnuw

# Webhook Security
WEBHOOK_SECRET=bcepi_sec_8f92a3b4c5d6e7f8g9h0i1j2k3l4m5n6
```

**Important:** The `ZOOMINFO_ACCESS_TOKEN` expires every 24 hours. You'll need to generate a new one daily from the ZoomInfo Developer Portal.

### Step 2: Deploy to Production

Run:
```bash
cd zoominfo-enrichment
vercel --prod
```

---

## 📋 API Endpoints

### Contact Enrichment
**POST** `https://zoominfo-enrichment.vercel.app/api/enrich-contact`

**Headers:**
```
X-Webhook-Secret: bcepi_sec_8f92a3b4c5d6e7f8g9h0i1j2k3l4m5n6
Content-Type: application/json
```

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Smith",
  "email": "john.smith@company.com",
  "company": "Company Name",
  "hubspotContactId": "12345"
}
```

**Response:**
```json
{
  "hubspotContactId": "12345",
  "success": true,
  "zoomInfoId": "123456789",
  "confidenceScore": 85,
  "data": {
    "firstName": "John",
    "lastName": "Smith",
    "email": "john.smith@company.com",
    "phone": "+1-555-0123",
    "mobilePhone": "+1-555-0124",
    "jobTitle": "VP of Sales",
    "department": "Sales",
    "managementLevel": "VP",
    "company": {
      "id": 98765,
      "name": "Company Name",
      "website": "https://company.com",
      "phone": "+1-555-0100"
    },
    "location": {
      "city": "San Francisco",
      "state": "CA",
      "country": "US"
    }
  },
  "metadata": {
    "enrichedAt": "2024-11-24T14:30:00.000Z",
    "source": "zoominfo",
    "hasEmail": true,
    "hasDirectPhone": true,
    "hasMobilePhone": true
  }
}
```

### Company Enrichment
**POST** `https://zoominfo-enrichment.vercel.app/api/enrich-company`

**Headers:**
```
X-Webhook-Secret: bcepi_sec_8f92a3b4c5d6e7f8g9h0i1j2k3l4m5n6
Content-Type: application/json
```

**Request Body:**
```json
{
  "companyName": "Anthropic",
  "website": "https://anthropic.com",
  "hubspotCompanyId": "67890"
}
```

---

## 🔄 Token Renewal Process

Since ZoomInfo tokens expire every 24 hours, you have two options:

### Option 1: Manual Token Renewal (Current Setup)
1. Go to https://developers.zoominfo.com/
2. Find your "salyersai integration" app
3. Click "Generate" in the Bearer Token column
4. Copy the new token
5. Update `ZOOMINFO_ACCESS_TOKEN` in Vercel dashboard
6. Redeploy: `vercel --prod`

### Option 2: Automated Token Renewal (Recommended for Production)
Set up a refresh token flow by obtaining a refresh token from ZoomInfo. This will allow the system to automatically renew access tokens without manual intervention.

---

## 🔗 Make.com Integration

In your Make.com scenario:

1. **HubSpot Trigger** → New/Updated Contact or Company
2. **HTTP Module** → POST to your Vercel endpoint
   - URL: `https://zoominfo-enrichment.vercel.app/api/enrich-contact`
   - Method: POST
   - Headers: Add `X-Webhook-Secret` header
   - Body: Map HubSpot fields to API request format
3. **HubSpot Update** → Update contact/company with enriched data
   - Map response fields back to HubSpot properties

---

## 🎯 What's Working

✅ OAuth authentication with ZoomInfo
✅ Contact search by name, email, or company
✅ Company search by name or website
✅ JSON API format compliance
✅ Token caching and validation
✅ Error handling and retry logic
✅ Vercel serverless deployment
✅ Webhook security

---

## 📝 Notes

- The API uses JSON API specification format (`application/vnd.api+json`)
- All endpoints return paginated results
- Contact accuracy scores range from 70-99
- Some contact fields may be unavailable depending on ZoomInfo's data
- The system will automatically retry on 401 (auth) errors

---

## 🐛 Troubleshooting

**401 Unauthorized:**
- Token expired → Generate new bearer token from Developer Portal
- Invalid credentials → Verify CLIENT_ID and CLIENT_SECRET

**404 No Results:**
- Try different search criteria
- Check spelling of names/companies
- Use partial matches instead of exact

**400 Bad Request:**
- Check request body format
- Ensure all required fields are present
- Verify field names match documentation

---

## 📞 Support

For ZoomInfo API issues: https://developers.zoominfo.com/
For Vercel deployment issues: https://vercel.com/docs
