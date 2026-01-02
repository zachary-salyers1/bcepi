Perfect! Let's build a Vercel Function that will handle your ZoomInfo integration for the Blue Chip Manufacturing project. This will be much more reliable than fighting with Make.com's connector.

## Let me create a complete Vercel Function setup for you:

### 1. Project Structure
```
zoominfo-enrichment/
├── api/
│   ├── enrich-contact.js
│   └── enrich-company.js
├── lib/
│   └── zoominfo-client.js
├── package.json
├── .env.local
└── vercel.json
```

### 2. First, let's create the ZoomInfo client library

```javascript
// lib/zoominfo-client.js
const axios = require('axios');

class ZoomInfoClient {
  constructor() {
    this.baseURL = 'https://api.zoominfo.com';
    this.token = process.env.ZOOMINFO_JWT_TOKEN;
    this.clientId = process.env.ZOOMINFO_CLIENT_ID;
    this.privateKey = process.env.ZOOMINFO_PRIVATE_KEY;
  }

  async authenticate() {
    try {
      // If you need to refresh the JWT token
      const response = await axios.post(`${this.baseURL}/authenticate`, {
        clientId: this.clientId,
        privateKey: this.privateKey
      });
      this.token = response.data.jwt;
      return this.token;
    } catch (error) {
      console.error('Authentication failed:', error);
      throw error;
    }
  }

  async searchContact(params) {
    try {
      const response = await axios.post(
        `${this.baseURL}/search/contact`,
        {
          matchPersonInput: [{
            firstName: params.firstName,
            lastName: params.lastName,
            emailAddress: params.email,
            companyName: params.company
          }],
          outputFields: [
            "id", "firstName", "lastName", "email", "phone",
            "jobTitle", "managementLevel", "department",
            "companyName", "companyWebsite", "companyPhone",
            "city", "state", "country"
          ]
        },
        {
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      return response.data;
    } catch (error) {
      if (error.response?.status === 401) {
        // Token expired, try to refresh
        await this.authenticate();
        return this.searchContact(params);
      }
      throw error;
    }
  }

  async searchCompany(params) {
    try {
      const response = await axios.post(
        `${this.baseURL}/search/company`,
        {
          matchCompanyInput: [{
            companyName: params.companyName,
            website: params.website,
            city: params.city,
            state: params.state
          }],
          outputFields: [
            "id", "companyName", "website", "phone", "fax",
            "employeeCount", "revenue", "naicsCode", "naicsDescription",
            "sicCode", "sicDescription", "ownership", "creditRating",
            "street", "city", "state", "zip", "country"
          ]
        },
        {
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      return response.data;
    } catch (error) {
      if (error.response?.status === 401) {
        await this.authenticate();
        return this.searchCompany(params);
      }
      throw error;
    }
  }

  async validateWithWebData(data, type) {
    // Add your AI validation logic here
    // This could call Perplexity API or web scraping
    const confidenceScore = 0.95; // Placeholder
    
    return {
      ...data,
      validated: true,
      confidenceScore,
      validationTimestamp: new Date().toISOString()
    };
  }
}

module.exports = ZoomInfoClient;
```

### 3. Contact Enrichment Endpoint

```javascript
// api/enrich-contact.js
const ZoomInfoClient = require('../lib/zoominfo-client');

// Vercel Function handler
module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify webhook secret (optional but recommended)
    const webhookSecret = req.headers['x-webhook-secret'];
    if (webhookSecret !== process.env.WEBHOOK_SECRET) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { 
      firstName, 
      lastName, 
      email, 
      company,
      hubspotContactId 
    } = req.body;

    // Validate required fields
    if (!email && (!firstName || !lastName)) {
      return res.status(400).json({ 
        error: 'Either email or firstName + lastName required' 
      });
    }

    // Initialize ZoomInfo client
    const client = new ZoomInfoClient();

    // Search for contact in ZoomInfo
    const zoomInfoData = await client.searchContact({
      firstName,
      lastName,
      email,
      company
    });

    // Check if we found results
    if (!zoomInfoData.data || zoomInfoData.data.length === 0) {
      return res.status(404).json({ 
        error: 'No matching contact found',
        hubspotContactId 
      });
    }

    // Get the best match (first result)
    const bestMatch = zoomInfoData.data[0];

    // Validate the data with AI/web scraping
    const validatedData = await client.validateWithWebData(bestMatch, 'contact');

    // Format response for Make.com
    const enrichedContact = {
      hubspotContactId,
      success: true,
      confidenceScore: validatedData.confidenceScore,
      data: {
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        email: validatedData.email,
        phone: validatedData.phone,
        jobTitle: validatedData.jobTitle,
        department: validatedData.department,
        managementLevel: validatedData.managementLevel,
        company: {
          name: validatedData.companyName,
          website: validatedData.companyWebsite,
          phone: validatedData.companyPhone
        },
        location: {
          city: validatedData.city,
          state: validatedData.state,
          country: validatedData.country
        }
      },
      metadata: {
        enrichedAt: new Date().toISOString(),
        source: 'zoominfo',
        validated: validatedData.validated
      }
    };

    // Return enriched data
    return res.status(200).json(enrichedContact);

  } catch (error) {
    console.error('Enrichment error:', error);
    
    return res.status(500).json({ 
      error: 'Enrichment failed',
      message: error.message,
      hubspotContactId: req.body.hubspotContactId
    });
  }
};
```

### 4. Company Enrichment Endpoint

```javascript
// api/enrich-company.js
const ZoomInfoClient = require('../lib/zoominfo-client');

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify webhook secret
    const webhookSecret = req.headers['x-webhook-secret'];
    if (webhookSecret !== process.env.WEBHOOK_SECRET) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { 
      companyName, 
      website,
      city,
      state,
      hubspotCompanyId 
    } = req.body;

    if (!companyName && !website) {
      return res.status(400).json({ 
        error: 'Either companyName or website required' 
      });
    }

    const client = new ZoomInfoClient();

    // Search for company
    const zoomInfoData = await client.searchCompany({
      companyName,
      website,
      city,
      state
    });

    if (!zoomInfoData.data || zoomInfoData.data.length === 0) {
      return res.status(404).json({ 
        error: 'No matching company found',
        hubspotCompanyId 
      });
    }

    const bestMatch = zoomInfoData.data[0];
    const validatedData = await client.validateWithWebData(bestMatch, 'company');

    // Format for Make.com
    const enrichedCompany = {
      hubspotCompanyId,
      success: true,
      confidenceScore: validatedData.confidenceScore,
      data: {
        name: validatedData.companyName,
        website: validatedData.website,
        phone: validatedData.phone,
        employeeCount: validatedData.employeeCount,
        revenue: validatedData.revenue,
        ownership: validatedData.ownership,
        creditRating: validatedData.creditRating,
        industry: {
          naicsCode: validatedData.naicsCode,
          naicsDescription: validatedData.naicsDescription,
          sicCode: validatedData.sicCode,
          sicDescription: validatedData.sicDescription
        },
        address: {
          street: validatedData.street,
          city: validatedData.city,
          state: validatedData.state,
          zip: validatedData.zip,
          country: validatedData.country
        }
      },
      metadata: {
        enrichedAt: new Date().toISOString(),
        source: 'zoominfo',
        validated: validatedData.validated
      }
    };

    return res.status(200).json(enrichedCompany);

  } catch (error) {
    console.error('Company enrichment error:', error);
    
    return res.status(500).json({ 
      error: 'Company enrichment failed',
      message: error.message,
      hubspotCompanyId: req.body.hubspotCompanyId
    });
  }
};
```

### 5. Package.json

```json
{
  "name": "zoominfo-enrichment",
  "version": "1.0.0",
  "description": "ZoomInfo enrichment service for Blue Chip Manufacturing",
  "dependencies": {
    "axios": "^1.6.0"
  },
  "devDependencies": {
    "@vercel/node": "^3.0.0"
  }
}
```

### 6. Environment Variables (.env.local)

```bash
# ZoomInfo Credentials
ZOOMINFO_CLIENT_ID=0oaxmafvo3W2Vdw3C697
ZOOMINFO_PRIVATE_KEY=mAi5u3KYWAXjGBE77_Onmrl98mLlogNmt_OA8is2wWPuXnFFUwXx7O0lsshrU2xf
ZOOMINFO_JWT_TOKEN=eyJraWQiOiJKd2pmQ2g5a2hMRFNf... # Your full JWT token

# Security
WEBHOOK_SECRET=your-secure-webhook-secret-here

# Optional: For AI Validation
OPENAI_API_KEY=your-openai-key
PERPLEXITY_API_KEY=your-perplexity-key
```

### 7. Deployment Instructions

```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Create project directory
mkdir zoominfo-enrichment
cd zoominfo-enrichment

# 3. Add all the files above

# 4. Install dependencies
npm install

# 5. Login to Vercel
vercel login

# 6. Deploy
vercel

# 7. Add environment variables in Vercel Dashboard
# Go to your project settings and add all the env variables
```

### 8. Make.com Integration

In Make.com, you would:
1. Use HTTP module instead of ZoomInfo module
2. POST to: `https://your-project.vercel.app/api/enrich-contact`
3. Headers: `X-Webhook-Secret: your-secret`
4. Body: Contact/Company data from HubSpot
5. Parse the JSON response and update HubSpot

This gives you:
- Complete control over the ZoomInfo integration
- Easy debugging and monitoring
- Ability to add validation logic
- Cost-effective (Vercel free tier handles 100k requests/month)
- Easy to maintain and update

Want me to add any specific features like caching, rate limiting, or more sophisticated AI validation?