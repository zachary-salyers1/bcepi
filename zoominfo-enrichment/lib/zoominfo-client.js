const axios = require('axios');

class ZoomInfoClient {
  constructor() {
    this.baseURL = 'https://api.zoominfo.com';
    this.token = process.env.ZOOMINFO_ACCESS_TOKEN || null;
    this.refreshToken = process.env.ZOOMINFO_REFRESH_TOKEN || null;
    this.tokenExpiry = null;
    this.clientId = process.env.ZOOMINFO_CLIENT_ID;
    this.clientSecret = process.env.ZOOMINFO_CLIENT_SECRET;
    this.tokenUrl = process.env.ZOOMINFO_TOKEN_URL || 'https://okta-login.zoominfo.com/oauth2/default/v1/token';
  }

  async authenticate() {
    try {
      // If we have a token but no expiry set (loaded from env), assume it's valid
      if (this.token && !this.tokenExpiry) {
        console.log('Using access token from environment variables');
        return this.token;
      }

      // Check if we have a valid cached token with expiry
      if (this.token && this.tokenExpiry && Date.now() < this.tokenExpiry) {
        console.log('Using cached access token');
        return this.token;
      }

      // If we have a refresh token, use it to get a new access token
      if (this.refreshToken) {
        console.log('Refreshing access token using refresh token...');

        const response = await axios.post(
          this.tokenUrl,
          new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: this.refreshToken
          }).toString(),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'Authorization': `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`
            }
          }
        );

        this.token = response.data.access_token;

        // Update refresh token if a new one is provided
        if (response.data.refresh_token) {
          this.refreshToken = response.data.refresh_token;
        }

        // Set expiry to 90% of actual expiry to refresh before it expires
        const expiresIn = response.data.expires_in || 3600;
        this.tokenExpiry = Date.now() + (expiresIn * 0.9 * 1000);

        console.log('Token refreshed successfully, expires in', expiresIn, 'seconds');
        return this.token;
      }

      // If we reach here, no valid authentication method available
      throw new Error('No valid authentication method available. Please provide either ZOOMINFO_ACCESS_TOKEN or ZOOMINFO_REFRESH_TOKEN in environment variables.');

    } catch (error) {
      console.error('Authentication failed:', error.response?.data || error.message);
      throw new Error(`ZoomInfo authentication failed: ${error.response?.data?.error_description || error.message}`);
    }
  }

  async searchContact(params) {
    try {
      // Ensure we have a valid token
      if (!this.token) {
        await this.authenticate();
      }

      // Build JSON API format request
      // Note: outputFields removed - they cause errors. Search returns metadata only.
      // Use enrichContact() to get actual email/phone data.
      const requestBody = {
        data: {
          type: 'ContactSearch',
          attributes: {}
        }
      };

      // Add search parameters
      if (params.email) requestBody.data.attributes.emailAddress = params.email;
      if (params.firstName) requestBody.data.attributes.firstName = params.firstName;
      if (params.lastName) requestBody.data.attributes.lastName = params.lastName;
      if (params.company) requestBody.data.attributes.companyName = params.company;

      const response = await axios.post(
        `${this.baseURL}/gtm/data/v1/contacts/search`,
        requestBody,
        {
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'Accept': 'application/vnd.api+json',
            'Content-Type': 'application/vnd.api+json'
          }
        }
      );

      return response.data;
    } catch (error) {
      if (error.response?.status === 401) {
        // Token expired or invalid
        console.log('Token expired or invalid (401). Response:', error.response?.data);
        console.log('Attempting to refresh...');
        this.token = null; // Clear the token to force re-authentication
        await this.authenticate();
        return this.searchContact(params);
      }
      console.error('Contact search error:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });
      throw error;
    }
  }

  async searchCompany(params) {
    try {
      // Ensure we have a valid token
      if (!this.token) {
        await this.authenticate();
      }

      // Build JSON API format request
      const requestBody = {
        data: {
          type: 'CompanySearch',
          attributes: {}
        }
      };

      // Add search parameters
      if (params.companyName) requestBody.data.attributes.companyName = params.companyName;
      if (params.website) requestBody.data.attributes.companyWebsite = params.website;
      if (params.city) requestBody.data.attributes.address = params.city;
      if (params.state) requestBody.data.attributes.state = params.state;
      if (params.companyId) requestBody.data.attributes.companyId = params.companyId;

      const response = await axios.post(
        `${this.baseURL}/gtm/data/v1/companies/search`,
        requestBody,
        {
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'Accept': 'application/vnd.api+json',
            'Content-Type': 'application/vnd.api+json'
          }
        }
      );

      return response.data;
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('Token expired, refreshing...');
        this.token = null; // Clear the token to force re-authentication
        await this.authenticate();
        return this.searchCompany(params);
      }
      console.error('Company search error:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });
      throw error;
    }
  }

  /**
   * Enrich a contact using the correct matchPersonInput format
   * @param {Object} params - Enrichment parameters
   * @param {string} [params.personId] - ZoomInfo person ID
   * @param {string} [params.emailAddress] - Email address to match
   * @param {string} [params.firstName] - First name for matching
   * @param {string} [params.lastName] - Last name for matching
   * @param {string} [params.companyName] - Company name for matching
   * @returns {Object} Enriched contact data
   */
  async enrichContact(params) {
    try {
      // Ensure we have a valid token
      if (!this.token) {
        await this.authenticate();
      }

      // Build the matchPersonInput object
      const matchInput = {};
      if (params.personId) matchInput.personId = parseInt(params.personId);
      if (params.emailAddress) matchInput.emailAddress = params.emailAddress;
      if (params.firstName) matchInput.firstName = params.firstName;
      if (params.lastName) matchInput.lastName = params.lastName;
      if (params.companyName) matchInput.companyName = params.companyName;

      const requestBody = {
        data: {
          type: 'ContactEnrich',
          attributes: {
            matchPersonInput: [matchInput],
            // Only request fields available in your ZoomInfo plan
            // Add more fields here if you have access to them
            outputFields: [
              'id',
              'firstName',
              'lastName',
              'email',
              'companyName',
              'jobTitle',
              'city',
              'state',
              'country'
            ]
          }
        }
      };

      console.log('Enriching contact with:', JSON.stringify(matchInput));

      const response = await axios.post(
        `${this.baseURL}/gtm/data/v1/contacts/enrich`,
        requestBody,
        {
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'Accept': 'application/vnd.api+json',
            'Content-Type': 'application/vnd.api+json'
          }
        }
      );

      // Parse the response
      const result = {
        success: true,
        data: response.data
      };

      // Check for limit exceeded
      if (response.data?.data?.[0]?.meta?.matchStatus === 'LIMIT_EXCEEDED') {
        result.success = false;
        result.limitExceeded = true;
        result.message = 'ZoomInfo enrichment credit limit exceeded. Contact your Account Manager.';
      } else if (response.data?.data?.[0]?.attributes) {
        result.contact = response.data.data[0].attributes;
      }

      return result;
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('Token expired, refreshing...');
        this.token = null;
        await this.authenticate();
        return this.enrichContact(params);
      }
      console.error('Contact enrich error:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });
      throw error;
    }
  }

  /**
   * Batch enrich multiple contacts (up to 25)
   * @param {Array} contacts - Array of contact match parameters
   * @returns {Object} Enriched contacts data
   */
  async enrichContactsBatch(contacts) {
    try {
      // Ensure we have a valid token
      if (!this.token) {
        await this.authenticate();
      }

      // Validate batch size
      if (contacts.length > 25) {
        throw new Error('Maximum batch size is 25 contacts');
      }

      // Build matchPersonInput array
      const matchPersonInput = contacts.map(c => {
        const input = {};
        if (c.personId) input.personId = parseInt(c.personId);
        if (c.emailAddress) input.emailAddress = c.emailAddress;
        if (c.firstName) input.firstName = c.firstName;
        if (c.lastName) input.lastName = c.lastName;
        if (c.companyName) input.companyName = c.companyName;
        return input;
      });

      const requestBody = {
        data: {
          type: 'ContactEnrich',
          attributes: {
            matchPersonInput,
            // Only request fields available in your ZoomInfo plan
            outputFields: [
              'id',
              'firstName',
              'lastName',
              'email',
              'companyName',
              'jobTitle',
              'city',
              'state',
              'country'
            ]
          }
        }
      };

      console.log(`Batch enriching ${contacts.length} contacts`);

      const response = await axios.post(
        `${this.baseURL}/gtm/data/v1/contacts/enrich`,
        requestBody,
        {
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'Accept': 'application/vnd.api+json',
            'Content-Type': 'application/vnd.api+json'
          }
        }
      );

      return response.data;
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('Token expired, refreshing...');
        this.token = null;
        await this.authenticate();
        return this.enrichContactsBatch(contacts);
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
