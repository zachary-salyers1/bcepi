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
}

module.exports = HubSpotClient;
