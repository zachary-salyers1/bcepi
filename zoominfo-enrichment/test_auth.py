import requests
import base64
import os

# Credentials from user's screenshot and previous context
CLIENT_ID = "0oaxmafvo3W2Vdw3C697"
CLIENT_SECRET = "NyRb-HkYctT9E-DY2dF_ulLnTQ_kBV33hIfGlDNfnHukhGJ8DoNWCq_4Mwq0ngs9"
TOKEN_URL = "https://okta-login.zoominfo.com/oauth2/default/v1/token"

def test_auth():
    print(f"Testing Auth for Client ID: {CLIENT_ID}")
    
    # Encode credentials
    creds = f"{CLIENT_ID}:{CLIENT_SECRET}"
    encoded_creds = base64.b64encode(creds.encode("ascii")).decode("ascii")
    
    headers = {
        "Authorization": f"Basic {encoded_creds}",
        "Content-Type": "application/x-www-form-urlencoded"
    }
    
    # Try with 'data' scope
    data = {
        "grant_type": "client_credentials",
        "scope": "data"
    }
    
    print("\n--- Attempt 1: scope='data' ---")
    try:
        response = requests.post(TOKEN_URL, headers=headers, data=data)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
    except Exception as e:
        print(f"Error: {e}")

    # Try WITHOUT scope (sometimes defaults work)
    data_no_scope = {
        "grant_type": "client_credentials"
    }
    
    print("\n--- Attempt 2: No scope ---")
    try:
        response = requests.post(TOKEN_URL, headers=headers, data=data_no_scope)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
    except Exception as e:
        print(f"Error: {e}")

    print("\n--- Attempt 3: Credentials in Body ---")
    try:
        data_body = {
            "grant_type": "client_credentials",
            "scope": "data",
            "client_id": CLIENT_ID,
            "client_secret": CLIENT_SECRET
        }
        # Remove Auth header for this test
        headers_no_auth = {"Content-Type": "application/x-www-form-urlencoded"}
        
        response = requests.post(TOKEN_URL, headers=headers_no_auth, data=data_body)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_auth()
