/**
 * Contact Enrichment Cron Job
 *
 * This endpoint processes contacts from a HubSpot list, enriches them via ZoomInfo,
 * optionally validates LinkedIn URLs via Gemini, and logs results to Google Sheets.
 *
 * Flow:
 * 1. Load pagination cursor from KV store (or start fresh)
 * 2. Fetch contact IDs from HubSpot list
 * 3. For each contact:
 *    a. Get contact properties from HubSpot
 *    b. Skip if already enriched (zoominfo_enriched = true)
 *    c. Search & enrich via ZoomInfo
 *    d. If LinkedIn URL exists, validate via Gemini
 *    e. Update HubSpot contact with enriched data
 *    f. Log to Google Sheets
 * 4. Save pagination cursor for next run
 */

// Load environment variables from .env.local BEFORE requiring other modules
// Use override: true to ensure local .env.local takes precedence over Vercel-injected vars
const path = require('path');
const envPath = path.join(process.cwd(), '.env.local');
require('dotenv').config({ path: envPath, override: true });

const HubSpotClient = require('../../lib/hubspot-client');
const ZoomInfoClient = require('../../lib/zoominfo-client');
const GoogleSheetsClient = require('../../lib/sheets-client');
const GeminiClient = require('../../lib/gemini-client');
const RunLogStore = require('../../lib/run-log-store');

const BATCH_SIZE = parseInt(process.env.ENRICHMENT_BATCH_SIZE || '10');
const DELAY_BETWEEN_CONTACTS_MS = parseInt(process.env.ENRICHMENT_DELAY_MS || '2000');
const HUBSPOT_LIST_ID = process.env.HUBSPOT_LIST_ID || '151';

/**
 * Sleep helper
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Extract LinkedIn URL from ZoomInfo external URLs
 */
function extractLinkedInUrl(externalUrls) {
  if (!externalUrls || !Array.isArray(externalUrls)) return null;

  const linkedin = externalUrls.find(
    url => url.type?.toLowerCase().includes('linkedin') ||
           url.url?.toLowerCase().includes('linkedin.com')
  );

  return linkedin?.url || null;
}

/**
 * Determine which fields need updating (only update empty HubSpot fields)
 */
function getFieldsToUpdate(hubspotProps, zoomInfoData) {
  const updates = {};

  // Only update if HubSpot field is empty and ZoomInfo has data
  if (!hubspotProps.firstname && zoomInfoData.firstName) {
    updates.firstname = zoomInfoData.firstName;
  }
  if (!hubspotProps.lastname && zoomInfoData.lastName) {
    updates.lastname = zoomInfoData.lastName;
  }
  if (!hubspotProps.phone && (zoomInfoData.phone || zoomInfoData.directPhone)) {
    updates.phone = zoomInfoData.phone || zoomInfoData.directPhone;
  }
  if (!hubspotProps.mobilephone && zoomInfoData.mobilePhone) {
    updates.mobilephone = zoomInfoData.mobilePhone;
  }
  if (!hubspotProps.jobtitle && zoomInfoData.jobTitle) {
    updates.jobtitle = zoomInfoData.jobTitle;
  }
  if (!hubspotProps.company && zoomInfoData.companyName) {
    updates.company = zoomInfoData.companyName;
  }
  if (!hubspotProps.city && zoomInfoData.city) {
    updates.city = zoomInfoData.city;
  }
  if (!hubspotProps.state && zoomInfoData.state) {
    updates.state = zoomInfoData.state;
  }
  if (!hubspotProps.zip && zoomInfoData.zipCode) {
    updates.zip = zoomInfoData.zipCode;
  }
  if (!hubspotProps.country && zoomInfoData.country) {
    updates.country = zoomInfoData.country;
  }

  return updates;
}

/**
 * Process a single contact
 */
async function processContact(contact, hubspot, zoominfo, gemini, sheets) {
  const contactId = contact.id;
  const props = contact.properties || {};

  console.log(`Processing contact ${contactId}: ${props.email || 'no email'}`);

  // Skip if already enriched
  if (props.zoominfo_enriched === 'true') {
    console.log(`  Skipping - already enriched`);
    return { skipped: true, reason: 'already_enriched' };
  }

  // Skip if no email (required for ZoomInfo search)
  if (!props.email) {
    console.log(`  Skipping - no email`);
    return { skipped: true, reason: 'no_email' };
  }

  try {
    // Search ZoomInfo by email
    const searchResult = await zoominfo.searchContact({ email: props.email });

    if (!searchResult.data || searchResult.data.length === 0) {
      console.log(`  No ZoomInfo match found`);

      // Mark as enriched (attempted) to avoid re-processing
      await hubspot.updateContact(contactId, { zoominfo_enriched: 'true' });

      return { skipped: true, reason: 'no_zoominfo_match' };
    }

    const searchMatch = searchResult.data[0];
    const personId = searchMatch.id;

    // Check if company exists (required per original Make.com flow)
    if (!searchMatch.attributes?.company?.id) {
      console.log(`  Skipping - no company ID in ZoomInfo`);
      await hubspot.updateContact(contactId, { zoominfo_enriched: 'true' });
      return { skipped: true, reason: 'no_company_id' };
    }

    // Enrich the contact
    const enrichResult = await zoominfo.enrichContact({
      personId,
      emailAddress: props.email,
      firstName: props.firstname,
      lastName: props.lastname,
      companyName: props.company
    });

    if (enrichResult.limitExceeded) {
      console.log(`  ZoomInfo credit limit exceeded!`);
      return { error: true, reason: 'zoominfo_limit_exceeded' };
    }

    const enrichedData = enrichResult.contact || {};

    // Extract LinkedIn URL from externalUrls array (ZoomInfo's format)
    const linkedInUrl = extractLinkedInUrl(enrichedData.externalUrls);

    // Validate via Gemini if LinkedIn URL exists
    let validationStatus = 'Skipped - No LinkedIn';
    let validationNotes = 'None';

    if (linkedInUrl && gemini.isEnabled()) {
      console.log(`  Validating LinkedIn: ${linkedInUrl}`);
      const validation = await gemini.validateLinkedIn({
        linkedInUrl,
        firstName: enrichedData.firstName || props.firstname,
        lastName: enrichedData.lastName || props.lastname,
        companyName: enrichedData.companyName || props.company,
        jobTitle: enrichedData.jobTitle || props.jobtitle
      });

      validationStatus = validation.status;
      validationNotes = validation.notes;
    }

    // Determine which fields to update
    const fieldsToUpdate = getFieldsToUpdate(props, enrichedData);
    const hasUpdates = Object.keys(fieldsToUpdate).length > 0;

    // Always mark as enriched
    fieldsToUpdate.zoominfo_enriched = 'true';

    // Update HubSpot
    await hubspot.updateContact(contactId, fieldsToUpdate);
    console.log(`  Updated HubSpot: ${Object.keys(fieldsToUpdate).join(', ')}`);

    // Log to Google Sheets (only if we have updates or validation status)
    if (hasUpdates || validationStatus !== 'Skipped - No LinkedIn') {
      await sheets.appendRow({
        firstName: fieldsToUpdate.firstname || '',
        lastName: fieldsToUpdate.lastname || '',
        phone: fieldsToUpdate.phone || '',
        jobTitle: fieldsToUpdate.jobtitle || '',
        company: fieldsToUpdate.company || '',
        city: fieldsToUpdate.city || '',
        state: fieldsToUpdate.state || '',
        zip: fieldsToUpdate.zip || '',
        hubspotContactId: contactId,
        validationStatus,
        validationNotes
      });
    }

    return {
      success: true,
      contactId,
      updated: hasUpdates,
      fields: Object.keys(fieldsToUpdate),
      validation: { status: validationStatus, notes: validationNotes }
    };

  } catch (error) {
    console.error(`  Error processing contact ${contactId}:`, error.message);
    return { error: true, contactId, message: error.message };
  }
}

/**
 * Main cron handler
 */
module.exports = async (req, res) => {
  // Verify cron secret (Vercel sends this header)
  const authHeader = req.headers.authorization;
  const isCronTrigger = authHeader === `Bearer ${process.env.CRON_SECRET}`;
  const isManualTrigger = req.headers['x-webhook-secret'] === process.env.WEBHOOK_SECRET ||
                          req.headers['x-dashboard-password'] === process.env.DASHBOARD_PASSWORD;

  if (!isCronTrigger && !isManualTrigger) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Determine trigger source
  const triggerSource = req.headers['x-trigger-source'] === 'manual' ? 'manual' : 'cron';

  // Initialize run store early to check scheduler
  const runStore = new RunLogStore();

  // For cron triggers, check if scheduler is enabled
  if (triggerSource === 'cron') {
    const schedulerSettings = await runStore.shouldRunNow();
    if (!schedulerSettings) {
      console.log('Scheduler is disabled or not due yet - skipping cron run');
      return res.status(200).json({
        success: true,
        message: 'Scheduler disabled or not due yet',
        skipped: true
      });
    }
    console.log('Scheduler is enabled and due - proceeding with run');

    // Update last_run_at and next_run_at immediately at run START
    // This ensures next_run_at is calculated from when the run began,
    // not when it finished (which could be several minutes later)
    await runStore.updateLastRun();
  }

  // Get batch size from scheduler settings or environment
  const schedulerSettings = await runStore.getSchedulerSettings();
  const effectiveBatchSize = schedulerSettings?.batchSize || BATCH_SIZE;

  console.log('=== Starting Contact Enrichment ===');
  console.log(`Trigger: ${triggerSource}, Batch size: ${effectiveBatchSize}, Delay: ${DELAY_BETWEEN_CONTACTS_MS}ms`);

  const startTime = Date.now();
  const results = {
    processed: 0,
    enriched: 0,
    skipped: 0,
    errors: 0,
    details: []
  };

  // runStore already initialized above
  let runId = null;

  try {
    // Start run logging
    const runStart = await runStore.startRun(triggerSource);
    runId = runStart.runId;
    console.log(`Run ID: ${runId}`);

    // Initialize clients
    const hubspot = new HubSpotClient();
    const zoominfo = new ZoomInfoClient();
    const sheets = new GoogleSheetsClient();
    const gemini = new GeminiClient();

    // Fetch ONLY unenriched contacts from HubSpot list
    // Always start from beginning - we filter for unenriched as we scan
    // The cursor is no longer used since getUnenrichedContacts scans the list
    // and filters to find contacts that haven't been enriched yet
    const searchResult = await hubspot.getUnenrichedContacts(HUBSPOT_LIST_ID, effectiveBatchSize, null);
    const contacts = searchResult.results;

    console.log(`Found ${contacts.length} unenriched contacts to process`);

    if (contacts.length === 0) {
      console.log('No unenriched contacts remaining - enrichment complete!');
      await runStore.completeRun(runId, { nextCursor: null });
      return res.status(200).json({
        message: 'All contacts enriched!',
        cursor: null,
        runId,
        totalUnenriched: 0
      });
    }

    // Process each contact
    for (const contact of contacts) {
      const result = await processContact(contact, hubspot, zoominfo, gemini, sheets);
      const props = contact.properties || {};

      results.processed++;
      results.details.push(result);

      // Log contact to run store
      await runStore.addContact(runId, {
        id: contact.id,
        email: props.email || 'unknown',
        status: result.success ? 'enriched' : (result.skipped ? 'skipped' : 'error'),
        reason: result.reason || null,
        errorMessage: result.message || null,
        fieldsUpdated: result.fields || [],
        validation: result.validation || null
      });

      if (result.success) {
        results.enriched++;
      } else if (result.skipped) {
        results.skipped++;
      } else if (result.error) {
        results.errors++;

        // Stop if ZoomInfo limit exceeded
        if (result.reason === 'zoominfo_limit_exceeded') {
          console.log('Stopping - ZoomInfo credit limit exceeded');
          break;
        }
      }

      // Delay between contacts
      if (contacts.indexOf(contact) < contacts.length - 1) {
        await sleep(DELAY_BETWEEN_CONTACTS_MS);
      }
    }

    // Complete the run
    await runStore.completeRun(runId, {});

    // Note: updateLastRun() is called at the START of cron runs now,
    // so next_run_at is calculated from run start time, not end time

    // Update cached stats
    try {
      const stats = await hubspot.getEnrichmentStats(HUBSPOT_LIST_ID);
      await runStore.cacheStats(stats);
    } catch (statsError) {
      console.error('Failed to update stats cache:', statsError.message);
    }

    const duration = Date.now() - startTime;
    console.log(`=== Completed in ${duration}ms ===`);
    console.log(`Processed: ${results.processed}, Enriched: ${results.enriched}, Skipped: ${results.skipped}, Errors: ${results.errors}`);

    return res.status(200).json({
      success: true,
      runId,
      duration: `${duration}ms`,
      nextCursor,
      summary: {
        processed: results.processed,
        enriched: results.enriched,
        skipped: results.skipped,
        errors: results.errors
      },
      details: results.details
    });

  } catch (error) {
    console.error('Cron job failed:', error);

    // Mark run as failed
    if (runId) {
      await runStore.failRun(runId, error.message);
    }

    return res.status(500).json({
      error: 'Enrichment failed',
      message: error.message,
      runId,
      duration: `${Date.now() - startTime}ms`,
      results
    });
  }
};
