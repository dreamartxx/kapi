"""Run with: python3 tests/integration.py (PHP 8.2+ required). Uses isolated storage."""
import http.cookiejar
import json
import os
from pathlib import Path
import socket
import subprocess
import tempfile
import time
import urllib.error
import urllib.request

ROOT = Path(__file__).resolve().parents[1]

class Client:
    def __init__(self, base):
        self.base = base
        self.csrf = ''
        self.http = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))

    def request(self, action, data=None, expected=200, csrf=True):
        req = urllib.request.Request(self.base + '/api.php?action=' + action)
        if data is not None:
            req.data = json.dumps(data).encode()
            req.add_header('Content-Type', 'application/json')
            if csrf:
                req.add_header('X-CSRF-Token', self.csrf)
        try:
            response = self.http.open(req)
        except urllib.error.HTTPError as error:
            response = error
        assert response.status == expected, (action, response.status, expected, response.read().decode())
        return json.load(response)

    def session(self):
        state = self.request('session')
        self.csrf = state['csrf']
        return state

with tempfile.TemporaryDirectory(prefix='kapi-test-') as temp:
    with socket.socket() as sock:
        sock.bind(('127.0.0.1', 0))
        port = sock.getsockname()[1]
    base = f'http://127.0.0.1:{port}'
    env = {**os.environ, 'KAPI_DATA_DIR': temp}
    server = subprocess.Popen(['php', '-S', f'127.0.0.1:{port}', '-t', str(ROOT)], env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        client = Client(base)
        for _ in range(50):
            try:
                initial = client.session()
                break
            except urllib.error.URLError:
                time.sleep(.1)
        else:
            raise RuntimeError('PHP test server did not start')
        assert not initial['configured'] and not initial['authenticated']
        public = client.request('portals')
        assert len(public['portals']) == 7 and len(public) == 1
        client.request('save', {}, expected=401)
        client.request('login', {'password': 'abcdef'}, expected=403, csrf=False)
        state_path = Path(temp) / 'state.php'
        secret = json.loads(state_path.read_text().split('\n', 1)[1])['setup_key']
        client.request('setup', {'key': 'bad-key', 'password': 'abcdef'}, expected=401)
        client.request('setup', {'key': secret, 'password': '12345'}, expected=422)
        client.request('setup', {'key': secret, 'password': 'abcdef'})
        state = client.session()
        assert state['configured'] and state['authenticated']
        raw = state_path.read_text()
        assert 'setup_key' not in raw and secret not in raw and 'abcdef' not in raw
        client.request('setup', {'key': secret, 'password': 'abcdef'}, expected=409)
        original = state['portals']
        changed = json.loads(json.dumps(original))
        changed[3]['name'] = '<img src=x onerror=alert(1)>'
        changed[3]['url'] = 'javascript:alert(1)'
        client.request('save', {'portals': changed, 'revision': state['revision']}, expected=422)
        changed[3]['url'] = 'https://example.org/login'
        saved = client.request('save', {'portals': changed, 'revision': state['revision']})
        assert client.request('portals')['portals'][3]['url'] == 'https://example.org/login'
        client.request('save', {'portals': original, 'revision': state['revision']}, expected=409)
        client.request('save', {'portals': original[:-1], 'revision': saved['revision']}, expected=422)
        second = Client(base)
        second.session()
        second.request('login', {'password': 'abcdef'})
        second.session()
        client.request('password', {'current': 'abcdef', 'password': 'ghijkl'})
        assert not second.session()['authenticated']
        client.session()
        client.request('logout', {})
        assert not client.session()['authenticated']
        for _ in range(5):
            client.request('login', {'password': 'incorrect'}, expected=401)
        client.request('login', {'password': 'incorrect'}, expected=429)
        print('PASS: 7 portals, setup key, 6-character minimum, hash storage, CSRF, authorization, URL validation, persistence, revision conflicts, password rotation, session invalidation, logout, and rate limiting.')
    finally:
        server.terminate()
        server.wait(timeout=5)
