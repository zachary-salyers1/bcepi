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
            return codesArray
                .map(c => {
                    // Handle both object format {code: "123"} and string format
                    if (typeof c === 'object' && c !== null) {
                        return c.code || c.value || JSON.stringify(c);
                    }
                    return String(c);
                })
                .filter(Boolean)
                .join(', ');
        };

        const extractDescriptions = (codesArray) => {
            if (!codesArray || !Array.isArray(codesArray)) return null;
            return codesArray
                .map(c => {
                    // Handle both object format {description: "..."} and string format
                    if (typeof c === 'object' && c !== null) {
                        return c.description || c.name || '';
                    }
                    return '';
                })
                .filter(Boolean)
                .join('; ');
        };

        // Convert revenue from thousands to actual dollars
        // ZoomInfo returns revenue in thousands (e.g., 66199 = $66,199,000)
        const actualRevenue = companyData.revenue ? companyData.revenue * 1000 : null;

        // Map to HubSpot properties
        // Start with standard properties (always safe)
        const hubspotUpdates = {
            name: companyData.name,
            domain: companyData.website,
            phone: companyData.phone,
            numberofemployees: companyData.employeeCount,
            annualrevenue: actualRevenue,
            city: companyData.city,
            state: companyData.state,
            zip: companyData.zipCode,
            country: companyData.country,
            address: companyData.street
        };

        // Add custom properties (these need to be created in HubSpot first)
        // If they don't exist, the update will fail, so we'll try without them
        const customProperties = {
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
            zoominfo_industry: Array.isArray(companyData.primaryIndustry)
                ? companyData.primaryIndustry.join(', ')
                : companyData.primaryIndustry
        };

        // Try to add custom properties, but don't fail if they don't exist
        Object.assign(hubspotUpdates, customProperties);

        // Remove undefined/null values to avoid overwriting existing data with empty values
        Object.keys(hubspotUpdates).forEach(key => {
            if (hubspotUpdates[key] === undefined || hubspotUpdates[key] === null) {
                delete hubspotUpdates[key];
            }
        });

        // Update HubSpot - lookup by domain if no ID provided
        let finalHubspotId = hubspotCompanyId;

        if (!finalHubspotId && domain) {
            console.log(`No HubSpot ID provided, looking up by domain: ${domain}`);
            const hsCompany = await hubspot.getCompanyByDomain(domain);
            if (hsCompany) {
                finalHubspotId = hsCompany.id;
                console.log(`Found HubSpot company by domain: ${finalHubspotId}`);
            }
        }

        if (finalHubspotId) {
            try {
                // Try to update with all properties (including custom)
                await hubspot.updateCompany(finalHubspotId, hubspotUpdates);
                console.log(`Updated HubSpot company ${finalHubspotId} with ${Object.keys(hubspotUpdates).length} fields`);
            } catch (error) {
                // If it fails due to missing custom properties, retry with just standard properties
                if (error.response?.status === 400 && error.response?.data?.message?.includes('does not exist')) {
                    console.log('Custom properties not found, updating with standard properties only');

                    // Retry with just standard properties
                    const standardPropertiesOnly = {
                        name: companyData.name,
                        domain: companyData.website,
                        phone: companyData.phone,
                        numberofemployees: companyData.employeeCount,
                        annualrevenue: actualRevenue,
                        city: companyData.city,
                        state: companyData.state,
                        zip: companyData.zipCode,
                        country: companyData.country,
                        address: companyData.street
                    };

                    // Remove null/undefined values
                    Object.keys(standardPropertiesOnly).forEach(key => {
                        if (standardPropertiesOnly[key] === undefined || standardPropertiesOnly[key] === null) {
                            delete standardPropertiesOnly[key];
                        }
                    });

                    await hubspot.updateCompany(finalHubspotId, standardPropertiesOnly);
                    console.log(`Updated HubSpot company ${finalHubspotId} with ${Object.keys(standardPropertiesOnly).length} standard fields only`);
                    console.log('⚠️ Custom properties not created in HubSpot yet - see COMPANY_ENRICHMENT_GUIDE.md');
                } else {
                    throw error;
                }
            }
        } else {
            console.log('No HubSpot company ID - skipping HubSpot update');
        }

        // Format response for Make.com / API consumers
        const enrichedCompany = {
            hubspotCompanyId: finalHubspotId,
            success: true,
            zoomInfoId: companyId,
            hubspotUpdated: !!finalHubspotId,
            data: {
                name: companyData.name,
                website: companyData.website,
                phone: companyData.phone,
                fax: companyData.fax,
                employees: companyData.employeeCount,
                employeeRange: companyData.employeeRange,
                revenue: actualRevenue,
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
