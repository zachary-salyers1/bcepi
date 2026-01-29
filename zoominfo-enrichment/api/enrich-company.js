// api/enrich-company.js
const ZoomInfoClient = require('../lib/zoominfo-client');
const HubSpotClient = require('../lib/hubspot-client');

module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Webhook-Secret, X-Dashboard-Password');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Verify authentication (accept either webhook secret OR dashboard password)
        const webhookSecret = req.headers['x-webhook-secret'];
        const dashboardPassword = req.headers['x-dashboard-password'];

        const isWebhookAuth = webhookSecret === process.env.WEBHOOK_SECRET;
        const isDashboardAuth = dashboardPassword === process.env.DASHBOARD_PASSWORD;

        if (!isWebhookAuth && !isDashboardAuth) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const {
            companyName,
            domain,
            city,
            state,
            hubspotCompanyId
        } = req.body;

        // Validate required fields (domain is preferred, but companyName works too)
        if (!domain && !companyName) {
            return res.status(400).json({
                error: 'Either domain or companyName required',
                hubspotCompanyId
            });
        }

        const zoominfo = new ZoomInfoClient();
        const hubspot = new HubSpotClient();

        // Step 1: Search for company in ZoomInfo to get companyId
        const searchData = await zoominfo.searchCompany({
            companyName,
            website: domain,
            city,
            state
        });

        // Check if we found results
        if (!searchData.data || searchData.data.length === 0) {
            // Mark as enriched (attempted) to prevent retry loops
            if (hubspotCompanyId) {
                await hubspot.updateCompany(hubspotCompanyId, {
                    zoominfo_enriched: 'true',
                    zoominfo_enriched_date: new Date().toISOString().split('T')[0]
                });
            }

            return res.status(404).json({
                error: 'No matching company found in ZoomInfo',
                hubspotCompanyId,
                searchCriteria: { companyName, domain, city, state }
            });
        }

        // Get the best match (first result)
        const searchMatch = searchData.data[0];
        const companyId = searchMatch.id;
        const searchAttributes = searchMatch.attributes || {};

        console.log('Found company in search:', companyId, searchAttributes.companyName);

        // Step 2: Enrich the company to get full data
        const enrichResult = await zoominfo.enrichCompany({
            companyId,
            companyName,
            website: domain
        });

        // Check for limit exceeded
        if (enrichResult.limitExceeded) {
            return res.status(402).json({
                error: 'ZoomInfo enrichment credit limit exceeded',
                message: enrichResult.message,
                hubspotCompanyId,
                zoomInfoId: companyId,
                // Return search data as fallback
                searchData: {
                    companyName: searchAttributes.companyName,
                    website: searchAttributes.website,
                    phone: searchAttributes.phone
                }
            });
        }

        // Get enriched company data
        const companyData = enrichResult.company || searchAttributes;

        // Helper function to extract codes from arrays
        const extractCodes = (codesArray) => {
            if (!codesArray || !Array.isArray(codesArray)) return null;
            return codesArray.map(c => c.code || c).join(', ');
        };

        const extractDescriptions = (codesArray) => {
            if (!codesArray || !Array.isArray(codesArray)) return null;
            return codesArray.map(c => c.description || '').filter(Boolean).join('; ');
        };

        // Map to HubSpot properties
        const hubspotUpdates = {
            // Standard properties
            name: companyData.name,
            domain: companyData.website,
            phone: companyData.phone,
            numberofemployees: companyData.employeeCount,
            annualrevenue: companyData.revenue,
            city: companyData.city,
            state: companyData.state,
            zip: companyData.zipCode,
            country: companyData.country,
            address: companyData.street,

            // Custom properties
            zoominfo_enriched: 'true',
            zoominfo_enriched_date: new Date().toISOString().split('T')[0],
            zoominfo_company_id: String(companyId),
            zoominfo_naics_code: extractCodes(companyData.naicsCodes),
            zoominfo_naics_description: extractDescriptions(companyData.naicsCodes),
            zoominfo_sic_code: extractCodes(companyData.sicCodes),
            zoominfo_sic_description: extractDescriptions(companyData.sicCodes),
            zoominfo_ticker: companyData.ticker,
            zoominfo_parent_company: companyData.parentName,
            zoominfo_ultimate_parent: companyData.ultimateParentName,
            zoominfo_founded: companyData.foundedYear,
            zoominfo_description: companyData.description,
            zoominfo_employee_range: companyData.employeeRange,
            zoominfo_revenue_range: companyData.revenueRange,
            zoominfo_industry: companyData.primaryIndustry
        };

        // Remove undefined/null values to avoid overwriting existing data with empty values
        Object.keys(hubspotUpdates).forEach(key => {
            if (hubspotUpdates[key] === undefined || hubspotUpdates[key] === null) {
                delete hubspotUpdates[key];
            }
        });

        // Update HubSpot if we have a company ID
        if (hubspotCompanyId) {
            await hubspot.updateCompany(hubspotCompanyId, hubspotUpdates);
            console.log(`Updated HubSpot company ${hubspotCompanyId} with ${Object.keys(hubspotUpdates).length} fields`);
        }

        // Format response for Make.com / API consumers
        const enrichedCompany = {
            hubspotCompanyId,
            success: true,
            zoomInfoId: companyId,
            data: {
                name: companyData.name,
                website: companyData.website,
                phone: companyData.phone,
                fax: companyData.fax,
                employees: companyData.employeeCount,
                employeeRange: companyData.employeeRange,
                revenue: companyData.revenue,
                revenueRange: companyData.revenueRange,
                ticker: companyData.ticker,
                description: companyData.description,
                logo: companyData.logo,
                industry: {
                    naicsCodes: companyData.naicsCodes,
                    sicCodes: companyData.sicCodes,
                    primaryIndustry: companyData.primaryIndustry,
                    primaryIndustryCode: companyData.primaryIndustryCode
                },
                address: {
                    street: companyData.street,
                    city: companyData.city,
                    state: companyData.state,
                    zip: companyData.zipCode,
                    country: companyData.country
                },
                hierarchy: {
                    parentId: companyData.parentId,
                    parentName: companyData.parentName,
                    ultimateParentId: companyData.ultimateParentId,
                    ultimateParentName: companyData.ultimateParentName,
                    ultimateParentEmployees: companyData.ultimateParentEmployees,
                    ultimateParentRevenue: companyData.ultimateParentRevenue
                },
                foundedYear: companyData.foundedYear,
                companyStatus: companyData.companyStatus,
                socialMediaUrls: companyData.socialMediaUrls,
                domainList: companyData.domainList
            },
            metadata: {
                enrichedAt: new Date().toISOString(),
                source: 'zoominfo'
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
