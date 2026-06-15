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
        print(f"Created row ID: {row_id}")

        # 2. DELETE the row
        delete_url = f"https://zmqwlgiujpqjqauqkdoy.supabase.co/rest/v1/poll_votes?id=eq.{row_id}"
        delete_req = urllib.request.Request(delete_url, headers={
            "apikey": "sb_publishable_IEregU6neDEFZc354bgUTg_RLcmoXYr",
            "Authorization": "Bearer sb_publishable_IEregU6neDEFZc354bgUTg_RLcmoXYr"
        }, method="DELETE")
        with urllib.request.urlopen(delete_req) as delete_response:
            print("DELETE status:", delete_response.status)
            
        # 3. GET the row to verify deletion
        get_url = f"https://zmqwlgiujpqjqauqkdoy.supabase.co/rest/v1/poll_votes?id=eq.{row_id}"
        get_req = urllib.request.Request(get_url, headers={
            "apikey": "sb_publishable_IEregU6neDEFZc354bgUTg_RLcmoXYr",
            "Authorization": "Bearer sb_publishable_IEregU6neDEFZc354bgUTg_RLcmoXYr"
        })
        with urllib.request.urlopen(get_req) as get_response:
            get_res = json.loads(get_response.read().decode('utf-8'))
            print("Row after DELETE:", get_res)

except Exception as e:
    print("Error:", e)
