const axios = require('axios');

class HubSpotClient {
  constructor() {
    this.baseURL = 'https://api.hubapi.com';
    this.accessToken = process.env.HUBSPOT_ACCESS_TOKEN;

    if (!this.accessToken) {
      throw new Error('HUBSPOT_ACCESS_TOKEN environment variable is required');
    }
  }

  /**
   * Get the auth headers for HubSpot API requests
   */
  getHeaders() {
    return {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Get list memberships (contact IDs) from a HubSpot list
   * @param {string} listId - The HubSpot list ID
   * @param {number} limit - Number of records to fetch (max 100)
   * @param {string} after - Pagination cursor
   * @returns {Object} { results: string[], paging: { next: { after: string } } }
   */
  async getListMemberships(listId, limit = 100, after = null) {
    try {
      let url = `${this.baseURL}/crm/v3/lists/${listId}/memberships?limit=${limit}`;
      if (after) {
        url += `&after=${after}`;
      }

      const response = await axios.get(url, {
        headers: this.getHeaders()
      });

      return {
        results: response.data.results || [],
        paging: response.data.paging || null
      };
    } catch (error) {
      console.error('Error fetching list memberships:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get contact properties by contact ID
   * @param {string} contactId - The HubSpot contact ID
   * @param {string[]} properties - Array of property names to fetch
   * @returns {Object} Contact data with properties
   */
  async getContact(contactId, properties = []) {
    try {
      const defaultProperties = [
        'email',
        'firstname',
        'lastname',
        'phone',
        'mobilephone',
        'jobtitle',
        'company',
        'city',
        'state',
        'zip',
        'country',
        'zoominfo_enriched',
        'lifecyclestage'
      ];

      const allProperties = [...new Set([...defaultProperties, ...properties])];
      const propsParam = allProperties.join(',');

      const response = await axios.get(
        `${this.baseURL}/crm/v3/objects/contacts/${contactId}?properties=${propsParam}`,
        { headers: this.getHeaders() }
      );

      return response.data;
    } catch (error) {
      console.error(`Error fetching contact ${contactId}:`, error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Update contact properties
   * @param {string} contactId - The HubSpot contact ID
   * @param {Object} properties - Object with property name/value pairs to update
   * @returns {Object} Updated contact data
   */
  async updateContact(contactId, properties) {
    try {
      const response = await axios.patch(
        `${this.baseURL}/crm/v3/objects/contacts/${contactId}`,
        { properties },
        { headers: this.getHeaders() }
      );

      return response.data;
    } catch (error) {
      console.error(`Error updating contact ${contactId}:`, error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Batch get contacts by IDs
   * @param {string[]} contactIds - Array of contact IDs
   * @param {string[]} properties - Properties to fetch
   * @returns {Object[]} Array of contact data
   */
  async batchGetContacts(contactIds, properties = []) {
    try {
      const defaultProperties = [
        'email',
        'firstname',
        'lastname',
        'phone',
        'mobilephone',
        'jobtitle',
        'company',
        'city',
        'state',
        'zip',
        'country',
        'zoominfo_enriched',
        'lifecyclestage'
      ];

      const allProperties = [...new Set([...defaultProperties, ...properties])];

      const response = await axios.post(
        `${this.baseURL}/crm/v3/objects/contacts/batch/read`,
        {
          properties: allProperties,
          inputs: contactIds.map(id => ({ id }))
        },
        { headers: this.getHeaders() }
      );

      return response.data.results || [];
    } catch (error) {
      console.error('Error batch fetching contacts:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Batch update contacts
   * @param {Object[]} contacts - Array of { id, properties } objects
   * @returns {Object} Batch update response
   */
  async batchUpdateContacts(contacts) {
    try {
      const response = await axios.post(
        `${this.baseURL}/crm/v3/objects/contacts/batch/update`,
        {
          inputs: contacts.map(c => ({
            id: c.id,
            properties: c.properties
          }))
        },
        { headers: this.getHeaders() }
      );

      return response.data;
    } catch (error) {
      console.error('Error batch updating contacts:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get enrichment stats for a list
   * Counts total contacts and unenriched contacts (where zoominfo_enriched != 'true')
   * @param {string} listId - The HubSpot list ID
   * @returns {Object} { totalCount, unenrichedCount, enrichedCount }
   */
  async getEnrichmentStats(listId) {
    try {
      // Get total count by paginating through list
      let totalCount = 0;
      let enrichedCount = 0;
      let noEmailCount = 0;
      let after = null;

      // Paginate through list to count
      do {
        const memberships = await this.getListMemberships(listId, 100, after);
        const contactIds = memberships.results.map(r => r.recordId || r);

        if (contactIds.length === 0) break;

        // Batch get contacts to check zoominfo_enriched
        const contacts = await this.batchGetContacts(contactIds);

        totalCount += contacts.length;
        enrichedCount += contacts.filter(c =>
          c.properties?.zoominfo_enriched === 'true'
        ).length;
        noEmailCount += contacts.filter(c =>
          !c.properties?.email || c.properties.email.trim() === ''
        ).length;

        after = memberships.paging?.next?.after || null;
      } while (after);

      return {
        totalCount,
        enrichedCount,
        unenrichedCount: totalCount - enrichedCount,
        noEmailCount,
        enrichableCount: totalCount - enrichedCount - noEmailCount
      };
    } catch (error) {
      console.error('Error getting enrichment stats:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get unenriched contacts from a list
   * Fetches list members and filters to only return those where zoominfo_enriched != 'true'
   * @param {string} listId - The HubSpot list ID
   * @param {number} limit - Number of unenriched contacts to return
   * @param {string} after - Pagination cursor for list membership
   * @returns {Object} { results: Contact[], paging: { next: { after } }, total: number }
   */
  async getUnenrichedContacts(listId, limit = 20, after = null) {
    try {
      const defaultProperties = [
        'email',
        'firstname',
        'lastname',
        'phone',
        'mobilephone',
        'jobtitle',
        'company',
        'city',
        'state',
        'zip',
        'country',
        'zoominfo_enriched',
        'lifecyclestage'
      ];

      const unenrichedContacts = [];
      let currentCursor = after;
      let totalChecked = 0;
      const maxIterations = 50; // Safety limit to avoid infinite loops
      let iterations = 0;

      // Keep fetching batches until we have enough unenriched contacts
      while (unenrichedContacts.length < limit && iterations < maxIterations) {
        iterations++;

        // Fetch a batch of list members (fetch more than needed to filter)
        const memberships = await this.getListMemberships(listId, 100, currentCursor);
        const contactIds = memberships.results.map(r => r.recordId || r);

        if (contactIds.length === 0) {
          // No more contacts in list
          break;
        }

        totalChecked += contactIds.length;

        // Batch get contact details
        const contacts = await this.batchGetContacts(contactIds, defaultProperties);

        // Filter to only unenriched contacts that have an email address
        // (contacts without email can't be enriched via ZoomInfo)
        const unenriched = contacts.filter(c =>
          c.properties?.zoominfo_enriched !== 'true' &&
          c.properties?.email && c.properties.email.trim() !== ''
        );

        unenrichedContacts.push(...unenriched);

        // Update cursor for next iteration
        currentCursor = memberships.paging?.next?.after || null;

        if (!currentCursor) {
          // No more pages
          break;
        }

        // If we found enough, we can stop early
        if (unenrichedContacts.length >= limit) {
          break;
        }
      }

      // Trim to requested limit
      const results = unenrichedContacts.slice(0, limit);

      console.log(`Checked ${totalChecked} contacts, found ${unenrichedContacts.length} unenriched, returning ${results.length}`);

      return {
        results,
        paging: currentCursor ? { next: { after: currentCursor } } : null,
        total: unenrichedContacts.length // Note: This is count from what we checked
      };
    } catch (error) {
      console.error('Error getting unenriched contacts:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get quick estimate of unenriched count using search API
   * Faster than full pagination but may be less accurate
   * @param {string} listId - The HubSpot list ID
   * @returns {Object} { unenrichedCount, totalCount }
   */
  async getQuickEnrichmentStats(listId) {
    try {
      // Use search API to count unenriched contacts
      // Note: This searches all contacts, not just list members
      // For accurate list-specific counts, use getEnrichmentStats

      const searchResponse = await axios.post(
        `${this.baseURL}/crm/v3/objects/contacts/search`,
        {
          filterGroups: [{
            filters: [{
              propertyName: 'zoominfo_enriched',
              operator: 'NOT_HAS_PROPERTY'
            }]
          }, {
            filters: [{
              propertyName: 'zoominfo_enriched',
              operator: 'NEQ',
              value: 'true'
            }]
          }],
          limit: 0
        },
        { headers: this.getHeaders() }
      );

      // Get total list count
      const listResponse = await this.getListMemberships(listId, 1);
      const totalEstimate = listResponse.paging?.next ? 'many' : listResponse.results.length;

      return {
        unenrichedCount: searchResponse.data.total || 0,
        note: 'Global count, not list-specific'
      };
    } catch (error) {
      console.error('Error getting quick stats:', error.response?.data || error.message);
      // Return null on error, caller can fall back to full count
      return null;
    }
  }
}

module.exports = HubSpotClient;
