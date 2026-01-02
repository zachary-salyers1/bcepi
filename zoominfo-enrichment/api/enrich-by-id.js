// api/enrich-by-id.js
const ZoomInfoClient = require('../lib/zoominfo-client');

// Vercel Function to enrich contact by ZoomInfo ID
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
        // Verify webhook secret
        const webhookSecret = req.headers['x-webhook-secret'];
        if (webhookSecret !== process.env.WEBHOOK_SECRET) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const {
            zoomInfoId,
            hubspotContactId
        } = req.body;

        // Validate required fields
        if (!zoomInfoId) {
            return res.status(400).json({
                error: 'zoomInfoId is required',
                received: { zoomInfoId, hubspotContactId }
            });
        }

        console.log('Enriching contact by ID:', { zoomInfoId, hubspotContactId });

        // Initialize ZoomInfo client
        const client = new ZoomInfoClient();

        // Enrich contact by ID
        const enrichedData = await client.enrichContactById(zoomInfoId);

        // Check if we got data
        if (!enrichedData || !enrichedData.data) {
            return res.status(404).json({
                error: 'Contact not found by ID',
                zoomInfoId,
                hubspotContactId
            });
        }

        // Get the contact data - JSON API format
        const contactData = enrichedData.data.attributes || {};

        // Format response for Make.com with ALL available data
        const fullContact = {
            hubspotContactId,
            success: true,
            zoomInfoId: enrichedData.data.id,
            confidenceScore: contactData.contactAccuracyScore || 0,
            data: {
                // Basic Info
                firstName: contactData.firstName,
                lastName: contactData.lastName,
                middleName: contactData.middleName,

                // Contact Info
                email: contactData.email || contactData.emailAddress,
                phone: contactData.directPhone || contactData.phone,
                mobilePhone: contactData.mobilePhone,

                // Job Info
                jobTitle: contactData.jobTitle,
                department: contactData.department,
                managementLevel: contactData.managementLevel,

                // Company Info
                company: {
                    id: contactData.company?.id,
                    name: contactData.company?.name || contactData.companyName,
                    website: contactData.companyWebsite,
                    phone: contactData.companyPhone
                },

                // Location
                location: {
                    city: contactData.city,
                    state: contactData.state,
                    country: contactData.country,
                    street: contactData.street,
                    zipCode: contactData.zipCode
                },

                // Social
                linkedInUrl: contactData.linkedInUrl,

                // Additional
                education: contactData.education,
                yearsOfExperience: contactData.yearsOfExperience
            },
            metadata: {
                enrichedAt: new Date().toISOString(),
                source: 'zoominfo',
                lastUpdatedDate: contactData.lastUpdatedDate,
                validDate: contactData.validDate,
                hasEmail: contactData.hasEmail,
                hasDirectPhone: contactData.hasDirectPhone,
                hasMobilePhone: contactData.hasMobilePhone,
                hasSupplementalEmail: contactData.hasSupplementalEmail
            }
        };

        // Return enriched data
        return res.status(200).json(fullContact);

    } catch (error) {
        console.error('Enrichment by ID error:', error);

        return res.status(500).json({
            error: 'Enrichment failed',
            message: error.message,
            hubspotContactId: req.body.hubspotContactId
        });
    }
};
