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

        // DEBUG LOGGING
        console.log('--- Webhook Auth Debug ---');
        console.log(`Received Header: '${webhookSecret}'`);
        console.log(`Expected Env:    '${process.env.WEBHOOK_SECRET}'`);
        console.log('Match?', webhookSecret === process.env.WEBHOOK_SECRET);
        console.log('--------------------------');

        if (webhookSecret !== process.env.WEBHOOK_SECRET) {
            return res.status(401).json({
                error: 'Unauthorized',
                debug: {
                    received: webhookSecret,
                    expected: 'Check Vercel Logs' // Don't return the real secret to the client
                }
            });
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

        // Step 1: Search for contact in ZoomInfo to get their personId
        const searchData = await client.searchContact({
            firstName,
            lastName,
            email,
            company
        });

        // Check if we found results
        if (!searchData.data || searchData.data.length === 0) {
            return res.status(404).json({
                error: 'No matching contact found in ZoomInfo',
                hubspotContactId,
                searchCriteria: { firstName, lastName, email, company }
            });
        }

        // Get the best match (first result)
        const searchMatch = searchData.data[0];
        const personId = searchMatch.id;
        const searchAttributes = searchMatch.attributes || {};

        console.log('Found contact in search:', personId, searchAttributes.firstName, searchAttributes.lastName);

        // Step 2: Enrich the contact to get actual email/phone data
        const enrichResult = await client.enrichContact({
            personId,
            emailAddress: email,
            firstName,
            lastName,
            companyName: company
        });

        // Check for limit exceeded
        if (enrichResult.limitExceeded) {
            return res.status(402).json({
                error: 'ZoomInfo enrichment credit limit exceeded',
                message: enrichResult.message,
                hubspotContactId,
                zoomInfoId: personId,
                // Return search data as fallback (without PII)
                searchData: {
                    firstName: searchAttributes.firstName,
                    lastName: searchAttributes.lastName,
                    jobTitle: searchAttributes.jobTitle,
                    company: searchAttributes.company,
                    hasEmail: searchAttributes.hasEmail,
                    hasMobilePhone: searchAttributes.hasMobilePhone
                }
            });
        }

        // Get enriched contact data
        const contactData = enrichResult.contact || searchAttributes;

        // Format response for Make.com
        const enrichedContact = {
            hubspotContactId,
            success: true,
            zoomInfoId: personId,
            confidenceScore: contactData.contactAccuracyScore,
            data: {
                firstName: contactData.firstName,
                lastName: contactData.lastName,
                email: contactData.email,
                phone: contactData.phone || contactData.directPhone,
                mobilePhone: contactData.mobilePhone,
                jobTitle: contactData.jobTitle,
                department: contactData.department,
                managementLevel: contactData.managementLevel,
                company: {
                    id: contactData.company?.id || searchAttributes.company?.id,
                    name: contactData.companyName || contactData.company?.name || searchAttributes.company?.name,
                    website: contactData.companyWebsite,
                    phone: contactData.companyPhone
                },
                location: {
                    city: contactData.city,
                    state: contactData.state,
                    country: contactData.country
                }
            },
            metadata: {
                enrichedAt: new Date().toISOString(),
                source: 'zoominfo',
                lastUpdatedDate: contactData.lastUpdatedDate || searchAttributes.lastUpdatedDate
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
