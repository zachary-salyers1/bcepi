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
