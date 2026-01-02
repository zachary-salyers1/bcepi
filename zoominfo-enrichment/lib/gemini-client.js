const axios = require('axios');

class GeminiClient {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    this.model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
    this.baseURL = 'https://generativelanguage.googleapis.com/v1beta/models';

    if (!this.apiKey) {
      console.warn('GEMINI_API_KEY not set - LinkedIn validation disabled');
    }
  }

  /**
   * Check if Gemini validation is enabled
   */
  isEnabled() {
    return !!this.apiKey;
  }

  /**
   * Validate LinkedIn profile against ZoomInfo data
   * @param {Object} params - Validation parameters
   * @param {string} params.linkedInUrl - LinkedIn profile URL
   * @param {string} params.firstName - First name from ZoomInfo
   * @param {string} params.lastName - Last name from ZoomInfo
   * @param {string} params.companyName - Company name from ZoomInfo
   * @param {string} params.jobTitle - Job title from ZoomInfo
   * @returns {Object} { status: 'MATCH'|'MISMATCH'|'SKIPPED', notes: string }
   */
  async validateLinkedIn(params) {
    if (!this.isEnabled()) {
      return {
        status: 'SKIPPED',
        notes: 'Gemini API not configured'
      };
    }

    if (!params.linkedInUrl) {
      return {
        status: 'SKIPPED',
        notes: 'No LinkedIn URL provided'
      };
    }

    try {
      const prompt = `You are a data validation assistant. Check LinkedIn profiles to verify employment information.

Check this LinkedIn profile: ${params.linkedInUrl}

Verify if ${params.firstName} ${params.lastName} currently works at ${params.companyName} as ${params.jobTitle}.

Respond in this exact format only:
STATUS: MATCH or MISMATCH
NOTES: [If match, say 'Confirmed'. If mismatch, state the current company and/or title shown on LinkedIn]`;

      const response = await axios.post(
        `${this.baseURL}/${this.model}:generateContent?key=${this.apiKey}`,
        {
          contents: [
            {
              parts: [{ text: prompt }]
            }
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 150
          }
        },
        {
          headers: { 'Content-Type': 'application/json' }
        }
      );

      // Parse Gemini response
      const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

      // Extract status and notes from response
      const statusMatch = text.match(/STATUS:\s*(MATCH|MISMATCH)/i);
      const notesMatch = text.match(/NOTES:\s*(.+)/i);

      return {
        status: statusMatch ? statusMatch[1].toUpperCase() : 'UNKNOWN',
        notes: notesMatch ? notesMatch[1].trim() : text.substring(0, 200)
      };
    } catch (error) {
      console.error('Gemini validation error:', error.response?.data || error.message);

      // Return skipped on error - don't fail the whole enrichment
      return {
        status: 'SKIPPED',
        notes: `Validation error: ${error.message}`
      };
    }
  }

  /**
   * Batch validate multiple LinkedIn profiles (sequentially with delay)
   * @param {Object[]} profiles - Array of profile params to validate
   * @param {number} delayMs - Delay between requests in ms
   * @returns {Object[]} Array of validation results
   */
  async batchValidate(profiles, delayMs = 1000) {
    const results = [];

    for (const profile of profiles) {
      const result = await this.validateLinkedIn(profile);
      results.push({
        ...profile,
        validation: result
      });

      // Add delay between requests to avoid rate limits
      if (profiles.indexOf(profile) < profiles.length - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    return results;
  }
}

module.exports = GeminiClient;
