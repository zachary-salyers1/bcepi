const axios = require('axios');

class GoogleSheetsClient {
  constructor() {
    this.spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
    this.sheetName = process.env.GOOGLE_SHEET_NAME || 'Contact';
    this.accessToken = null;
    this.tokenExpiry = null;

    // Service account credentials
    this.clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
    // Handle private key - may have literal \n or actual newlines, may have quotes
    let rawKey = process.env.GOOGLE_PRIVATE_KEY || '';
    // Remove surrounding quotes if present
    if ((rawKey.startsWith('"') && rawKey.endsWith('"')) ||
        (rawKey.startsWith("'") && rawKey.endsWith("'"))) {
      rawKey = rawKey.slice(1, -1);
    }
    // Replace literal \n with actual newlines
    this.privateKey = rawKey.replace(/\\n/g, '\n');

    if (!this.spreadsheetId) {
      console.warn('GOOGLE_SPREADSHEET_ID not set - Google Sheets logging disabled');
    }
  }

  /**
   * Check if Sheets logging is enabled
   */
  isEnabled() {
    return !!(this.spreadsheetId && this.clientEmail && this.privateKey);
  }

  /**
   * Generate a JWT for Google API authentication
   */
  async getAccessToken() {
    if (!this.isEnabled()) {
      throw new Error('Google Sheets credentials not configured');
    }

    // Return cached token if still valid
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      const jwt = require('jsonwebtoken');

      const now = Math.floor(Date.now() / 1000);
      const payload = {
        iss: this.clientEmail,
        scope: 'https://www.googleapis.com/auth/spreadsheets',
        aud: 'https://oauth2.googleapis.com/token',
        iat: now,
        exp: now + 3600
      };

      const token = jwt.sign(payload, this.privateKey, { algorithm: 'RS256' });

      const response = await axios.post(
        'https://oauth2.googleapis.com/token',
        new URLSearchParams({
          grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
          assertion: token
        }).toString(),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        }
      );

      this.accessToken = response.data.access_token;
      this.tokenExpiry = Date.now() + (response.data.expires_in * 0.9 * 1000);

      return this.accessToken;
    } catch (error) {
      console.error('Error getting Google access token:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Append a row to the Google Sheet
   * @param {Object} data - Data to log
   */
  async appendRow(data) {
    if (!this.isEnabled()) {
      console.log('Sheets logging disabled - would log:', JSON.stringify(data).substring(0, 100));
      return { skipped: true };
    }

    try {
      const token = await this.getAccessToken();

      // Format row data matching the spreadsheet columns:
      // First Name, Last Name, Phone Number, Job Title, Company, City, State, Zip,
      // Hubspot Contact ID, Validation Status, Validation Notes
      const rowData = [
        data.firstName || '',
        data.lastName || '',
        data.phone || '',
        data.jobTitle || '',
        data.company || '',
        data.city || '',
        data.state || '',
        data.zip || '',
        data.hubspotContactId || '',
        data.validationStatus || '',
        data.validationNotes || ''
      ];

      const response = await axios.post(
        `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}/values/${this.sheetName}:append`,
        {
          values: [rowData]
        },
        {
          params: {
            valueInputOption: 'USER_ENTERED',
            insertDataOption: 'INSERT_ROWS'
          },
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error appending to Google Sheet:', error.response?.data || error.message);
      // Don't throw - logging failures shouldn't stop enrichment
      return { error: error.message };
    }
  }

  /**
   * Append multiple rows at once
   * @param {Object[]} rows - Array of data objects to log
   */
  async appendRows(rows) {
    if (!this.isEnabled()) {
      console.log(`Sheets logging disabled - would log ${rows.length} rows`);
      return { skipped: true };
    }

    try {
      const token = await this.getAccessToken();

      const values = rows.map(data => [
        data.firstName || '',
        data.lastName || '',
        data.phone || '',
        data.jobTitle || '',
        data.company || '',
        data.city || '',
        data.state || '',
        data.zip || '',
        data.hubspotContactId || '',
        data.validationStatus || '',
        data.validationNotes || ''
      ]);

      const response = await axios.post(
        `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}/values/${this.sheetName}:append`,
        { values },
        {
          params: {
            valueInputOption: 'USER_ENTERED',
            insertDataOption: 'INSERT_ROWS'
          },
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error batch appending to Google Sheet:', error.response?.data || error.message);
      return { error: error.message };
    }
  }
}

module.exports = GoogleSheetsClient;
