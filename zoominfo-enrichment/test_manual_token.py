import requests
import json

# Manual Token provided by user
TOKEN = "eyJraWQiOiJKd2pmQ2g5a2hMRFNfQ2ZNV3diNjl3MGg1SDhackcteUhFSmU0cEZ3UDNVIiwiYWxnIjoiUlMyNTYifQ.eyJ2ZXIiOjEsImp0aSI6IkFULkc1VVd2eDdqdVhTVVBkRHVhV2NJZGFUZF9URWNhYkVVa3JwR3cxNl93eFkub2FyM2Q3ZzJoeGxHMzJ1NjE2OTciLCJpc3MiOiJodHRwczovL29rdGEtbG9naW4uem9vbWluZm8uY29tL29hdXRoMi9kZWZhdWx0IiwiYXVkIjoiYXBpOi8vZGVmYXVsdCIsInN1YiI6InphY2guc2FseWVyc0BzYWx5ZXJzYWkuY29tIiwiaWF0IjoxNzYzNjg4MTUwLCJleHAiOjE3NjM3NzQ1NTAsImNpZCI6IjBvYXhtYWZ2bzNXMlZkdzNDNjk3IiwidWlkIjoiMDB1eG04cHViZFAyVGdQMTc2OTciLCJzY3AiOlsiYXBpOmRhdGE6aW50ZW50IiwiYXBpOmRhdGE6bmV3cyIsIm9mZmxpbmVfYWNjZXNzIiwiYXBpOmRhdGE6Y29udGFjdCIsImFwaTpkYXRhOnNjb29wcyIsImFwaTplbnRpdGxlbWVudDpyZWFkIiwicHJvZmlsZSIsImVtYWlsIiwiYXBpOmRhdGE6Y29tcGFueSIsInppX2FwaSIsIm9wZW5pZCIsImFwaTphY2NvdW50LXN1bW1hcnk6cmVhZCIsImFwaTppbnNpZ2h0czpyZWFkIl0sImF1dGhfdGltZSI6MTc2MzY4ODE0OCwibGFzdE5hbWUiOiJTYWx5ZXJzIiwiemlTZXNzaW9uVHlwZSI6NTAwLCJ6aUdyb3VwSWQiOjAsInppQ29tcGFueVByb2ZpbGVJZCI6IjE1Njk4NzY4IiwiemlQbGF0Zm9ybXMiOlsiREVWIFBPUlRBTCIsIkRPWkkiLCJBRE1JTiJdLCJ6aUFkbWluUm9sZXMiOiJCQVFBQUlBQUJRQUFBQ0FBTWdRQVFCSUtBQWhBQUFBQUFJQUFBQUFBQUFBQUFFQUFBQUFBQUFCUXBEVEJsc3dBQUFBQS93TU0iLCJ6aVVzZXJuYW1lIjoiemFjaC5zYWx5ZXJzQHNhbHllcnNhaS5jb20iLCJmaXJzdE5hbWUiOiJaYWNoIiwiemlSb2xlcyI6IjN1LzgvLzk5cmYvZi8vNEY4blhwYmQ4UEJ4aFlLUDh6Z0lBQ0FBSUFBSUFBQUd3QUFBQUFBQVJ3dFB6L245L0M0QUFGQU1BQiIsInppVXVpZCI6IjBhN2E0YmRkLWI3NmEtNDI2Mi1hMjIwLTc4MTFjZmYzZWZjNiIsInppVXNlcklkIjozMzIyMTY5Miwic2ZDb250YWN0SWQiOiIwMDM3eTAwMDAxZ1FTbzhBQUciLCJ6aUluYWN0aXZpdHkiOjYwNDgwMCwibm9Db3BpbG90V1NBY2Nlc3MiOnRydWUsInppVGVuYW50SWQiOjIwMDIyMDUwLCJlbWFpbCI6InphY2guc2FseWVyc0BzYWx5ZXJzYWkuY29tIiwic2ZBY2NvdW50SWQiOiIwMDEzcDAwMDAxdXFkZTBBQUEiLCJ6aU1vbmdvVXNlcklkIjoiMzMyMjE2OTIifQ.Psw_jpu2yMAHcuAXVUNAnyh9UoWCNt2mfAGsFYBSFnC4s2LP5Pvo32ax5j3ienId0lAvCVP-LsJO_DXwprZhZ1H4JPT7059_NPB9-sqmyuQQ-IdviiX2V4sq_9l0OAB21tTyKy1fsTgi_HjpWpZutDzw1sR7SkV9fqKgOmix_qSQPkSI3Zz8E19HUsfn1k1IkOFCYyD3ibDbkAHC0nfmlxgmlu5UTeex-YElUkyEI_2s0sBviN_cBIo5_Huhu_BoOxylqxwZAtOK1onmW7okxhsBJ58LV0-_KPxonmsKTA6Cg2lAmqld9VEsi11nbMEhmj9u1-vvOwvLLTIsKUQeSA"

URL = "https://api.zoominfo.com/search/contact"

def test_enrichment():
    print("Testing Enrichment with Manual Token...")
    
    headers = {
        "Authorization": f"Bearer {TOKEN}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "matchPersonInput": [{
            "firstName": "Zach",
            "lastName": "Salyers",
            "emailAddress": "zach.salyers@salyersai.com",
            "companyName": "Salyers AI"
        }],
        "outputFields": ["id", "firstName", "lastName", "email", "jobTitle", "companyName"]
    }
    
    try:
        response = requests.post(URL, headers=headers, json=payload)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_enrichment()
