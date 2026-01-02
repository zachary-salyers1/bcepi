// Decode JWT to check its contents
require('dotenv').config({ path: '.env.local' });

function decodeJWT(token) {
  try {
    // JWT has 3 parts separated by dots
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format');
    }

    // Decode the payload (second part)
    const payload = JSON.parse(
      Buffer.from(parts[1], 'base64').toString('utf-8')
    );

    return payload;
  } catch (error) {
    console.error('Error decoding JWT:', error.message);
    return null;
  }
}

const token = process.env.ZOOMINFO_ACCESS_TOKEN;

if (!token) {
  console.error('No ZOOMINFO_ACCESS_TOKEN found in environment');
  process.exit(1);
}

console.log('=== JWT Token Analysis ===\n');

const payload = decodeJWT(token);

if (payload) {
  console.log('Token Payload:', JSON.stringify(payload, null, 2));
  console.log('\n=== Key Information ===');
  console.log('Issued At (iat):', new Date(payload.iat * 1000).toISOString());
  console.log('Expires At (exp):', new Date(payload.exp * 1000).toISOString());
  console.log('Current Time:', new Date().toISOString());

  const now = Math.floor(Date.now() / 1000);
  const timeUntilExpiry = payload.exp - now;

  if (timeUntilExpiry > 0) {
    console.log(`\n✓ Token is VALID (expires in ${Math.floor(timeUntilExpiry / 3600)} hours, ${Math.floor((timeUntilExpiry % 3600) / 60)} minutes)`);
  } else {
    console.log(`\n✗ Token is EXPIRED (expired ${Math.floor(-timeUntilExpiry / 3600)} hours ago)`);
  }

  console.log('\n=== Scopes ===');
  if (payload.scp && Array.isArray(payload.scp)) {
    payload.scp.forEach(scope => console.log('-', scope));

    console.log('\n✓ Required scopes present:');
    console.log('  - api:data:contact:', payload.scp.includes('api:data:contact') ? '✓' : '✗');
    console.log('  - api:data:company:', payload.scp.includes('api:data:company') ? '✓' : '✗');
    console.log('  - offline_access:', payload.scp.includes('offline_access') ? '✓' : '✗');
  }
}
