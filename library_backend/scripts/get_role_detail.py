"""
Get role detail by id using admin token.
Usage: python scripts/get_role_detail.py 1
"""
import sys, json, urllib.request, urllib.parse
BASE='http://127.0.0.1:8000'

def post_token(username, password):
    url = BASE + '/api/token'
    data = urllib.parse.urlencode({'username': username, 'password': password}).encode('utf-8')
    req = urllib.request.Request(url, data=data, method='POST')
    req.add_header('Content-Type', 'application/x-www-form-urlencoded')
    with urllib.request.urlopen(req) as resp:
        return json.load(resp)

def get_role(token, role_id):
    url = f"{BASE}/api/permissions/roles/{role_id}"
    req = urllib.request.Request(url, method='GET')
    req.add_header('Authorization', f'Bearer {token}')
    with urllib.request.urlopen(req) as resp:
        return json.load(resp)

if __name__=='__main__':
    role_id = sys.argv[1] if len(sys.argv)>1 else '1'
    t = post_token('admin','admin')
    token = t.get('access_token')
    role = get_role(token, role_id)
    print(json.dumps(role, indent=2))
