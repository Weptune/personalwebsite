import urllib.request
import json

headers = {
    "apikey": "sb_publishable_IEregU6neDEFZc354bgUTg_RLcmoXYr",
    "Authorization": "Bearer sb_publishable_IEregU6neDEFZc354bgUTg_RLcmoXYr",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

# 1. Create a row
post_url = "https://zmqwlgiujpqjqauqkdoy.supabase.co/rest/v1/poll_votes"
post_data = json.dumps({"choice": "The Stars"}).encode('utf-8')
req = urllib.request.Request(post_url, data=post_data, headers=headers, method="POST")

try:
    with urllib.request.urlopen(req) as response:
        result = json.loads(response.read().decode('utf-8'))
        row_id = result[0]['id']
        choice_before = result[0]['choice']
        print(f"Created row ID: {row_id}, Choice before PATCH: {choice_before}")

        # 2. PATCH (Update) choice to "The Ocean"
        patch_url = f"https://zmqwlgiujpqjqauqkdoy.supabase.co/rest/v1/poll_votes?id=eq.{row_id}"
        patch_data = json.dumps({"choice": "The Ocean"}).encode('utf-8')
        patch_req = urllib.request.Request(patch_url, data=patch_data, headers=headers, method="PATCH")
        with urllib.request.urlopen(patch_req) as patch_response:
            print("PATCH status:", patch_response.status)
            
        # 3. GET the row to verify choice
        get_headers = {
            "apikey": "sb_publishable_IEregU6neDEFZc354bgUTg_RLcmoXYr",
            "Authorization": "Bearer sb_publishable_IEregU6neDEFZc354bgUTg_RLcmoXYr"
        }
        get_url = f"https://zmqwlgiujpqjqauqkdoy.supabase.co/rest/v1/poll_votes?id=eq.{row_id}"
        get_req = urllib.request.Request(get_url, headers=get_headers)
        with urllib.request.urlopen(get_req) as get_response:
            get_res = json.loads(get_response.read().decode('utf-8'))
            print("Row after PATCH:", get_res)

except Exception as e:
    print("Error:", e)
