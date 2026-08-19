"""
Fetch admin token and print /api/permissions/roles using urllib (no extra deps).
"""
import json
import urllib.request
import urllib.parse

BASE = 'http://127.0.0.1:8000'

def post_token(username, password):
    url = BASE + '/api/token'
    data = urllib.parse.urlencode({'username': username, 'password': password}).encode('utf-8')
    req = urllib.request.Request(url, data=data, method='POST')
    req.add_header('Content-Type', 'application/x-www-form-urlencoded')
    with urllib.request.urlopen(req) as resp:
        return json.load(resp)


def get_roles(token):
    url = BASE + '/api/permissions/roles'
    req = urllib.request.Request(url, method='GET')
    req.add_header('Authorization', f'Bearer {token}')
    with urllib.request.urlopen(req) as resp:
        return json.load(resp)

if __name__ == '__main__':
    t = post_token('admin', 'admin')
    print('Token response:')
    print(json.dumps(t, indent=2))
    token = t.get('access_token')
    print('\nFetching roles with Authorization header...')
    roles = get_roles(token)
    print(json.dumps(roles, indent=2))
