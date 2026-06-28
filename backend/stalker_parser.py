import urllib.request
import urllib.parse
import urllib.error
import json
import hashlib
import re
import base64
import time
import sys
import os
import socket
import concurrent.futures

# Set global socket timeout to prevent DNS lookup or connection handshake hangs
socket.setdefaulttimeout(15)

# Debug logging — writes to stderr so it doesn't pollute the JSON stdout output
def _log(*args):
    print('[STALKER]', *args, file=sys.stderr, flush=True)

# In-process session cache: key = "url|mac"
_session_cache = {}
_SESSION_TTL = 3600  # 1 hour

def get_stalker_url(base_url):
    """Mirror getStalkerUrl from index.js exactly."""
    url = base_url.strip()
    if '/c/' in url:
        # e.g. http://host:port/c/  -> http://host:port/portal.php
        url = re.sub(r'/c/.*', '/portal.php', url)
    elif url.endswith('/c'):
        url = url[:-2] + '/portal.php'
    elif url.endswith('/portal.php') or url.endswith('/server/load.php'):
        pass  # already correct
    else:
        # Default: append server/load.php
        url = url.rstrip('/') + '/server/load.php'
    return url

def _extract_php_session(response):
    """Extract PHPSESSID from Set-Cookie header."""
    set_cookie = response.headers.get('Set-Cookie', '')
    if set_cookie:
        m = re.search(r'PHPSESSID=([^;]+)', set_cookie)
        if m:
            return m.group(1)
    return ''

def _make_sn_device_ids(mac):
    sn = hashlib.md5((mac + 'sn').encode()).hexdigest()
    device_id = hashlib.sha256((mac + 'device1').encode()).hexdigest().upper()
    device_id2 = hashlib.sha256((mac + 'device2').encode()).hexdigest().upper()
    return sn, device_id, device_id2

def _base_headers(url, mac, sn):
    return {
        'User-Agent': 'Mozilla/5.0 (QtEmbedded; U; Linux; C) AppleWebKit/533.3 (KHTML, like Gecko) MAG200 stbapp ver: 2 rev: 250 Mobile Safari/533.3',
        'X-User-Agent': 'Model: MAG250; Link: Ethernet',
        'Accept': '*/*',
        'Referer': url.replace('/server/load.php', '/c/index.html').replace('/portal.php', '/c/index.html'),
    }

def authenticate_stalker(base_url, mac, username='', password='', force_fresh=False):
    """Full authentication matching index.js authenticateStalker."""
    url = get_stalker_url(base_url)
    cache_key = f"{url}|{mac}"
    _log(f"authenticate_stalker: base_url={base_url} -> resolved={url} mac={mac}")

    # Return cached session if valid and not forced
    if not force_fresh and cache_key in _session_cache:
        cached = _session_cache[cache_key]
        if time.time() - cached['timestamp'] < _SESSION_TTL:
            _log("authenticate_stalker: returning cached session")
            return url, cached

    sn, device_id, device_id2 = _make_sn_device_ids(mac)
    headers = _base_headers(url, mac, sn)

    php_sess_id = ''
    token = ''

    # Step 1: Handshake
    _log(f"Step 1: Handshake -> {url}?type=stb&action=handshake")
    try:
        cookie_str = f"mac={mac}; stb_lang=en; timezone=GMT; sn={sn}"
        hs_headers = {**headers, 'Cookie': cookie_str}
        req = urllib.request.Request(
            f"{url}?type=stb&action=handshake&key=&js=true",
            headers=hs_headers
        )
        with urllib.request.urlopen(req, timeout=15) as resp:
            new_sess = _extract_php_session(resp)
            if new_sess:
                php_sess_id = new_sess
                _log(f"Handshake: got PHPSESSID={php_sess_id}")
            data = json.loads(resp.read().decode('utf-8'))
            token = data.get('js', {}).get('token', '')
            _log(f"Handshake: token={'(present)' if token else '(empty)'}")
    except Exception as e:
        _log(f"Handshake FAILED: {e}")
        pass

    # Build auth headers with token + session
    def _build_headers():
        cookie = f"mac={mac}; stb_lang=en; timezone=GMT; sn={sn}"
        if php_sess_id:
            cookie += f"; PHPSESSID={php_sess_id}"
        h = {**headers, 'Cookie': cookie}
        if token:
            h['Authorization'] = f"Bearer {token}"
        return h

    # Step 2: get_profile
    _log(f"Step 2: get_profile")
    try:
        auth_headers = _build_headers()
        req = urllib.request.Request(
            f"{url}?type=stb&action=get_profile"
            f"&mac={urllib.parse.quote(mac)}&sn={sn}"
            f"&stb_type=MAG250&device_id={device_id}&device_id2={device_id2}"
            f"&hd=1&auth_second_step=1",
            headers=auth_headers
        )
        with urllib.request.urlopen(req, timeout=15) as resp:
            new_sess = _extract_php_session(resp)
            if new_sess:
                php_sess_id = new_sess
                _log(f"get_profile: updated PHPSESSID={php_sess_id}")
            data = json.loads(resp.read().decode('utf-8'))
            new_token = data.get('js', {}).get('token', '')
            if new_token:
                token = new_token
                _log(f"get_profile: updated token")
    except Exception as e:
        _log(f"get_profile FAILED: {e}")
        pass

    # Step 3: do_auth (username/password portals)
    if username and password:
        _log(f"Step 3: do_auth with username={username}")
        try:
            cookie = f"mac={mac}; stb_lang=en; timezone=GMT; sn={sn}"
            if php_sess_id:
                cookie += f"; PHPSESSID={php_sess_id}"
            do_auth_headers = {
                **headers,
                'Cookie': cookie,
                'Content-Type': 'application/x-www-form-urlencoded'
            }
            if token:
                do_auth_headers['Authorization'] = f"Bearer {token}"

            body = urllib.parse.urlencode({
                'type': 'stb',
                'action': 'do_auth',
                'login': username,
                'password': password,
                'device_id': device_id,
                'device_id2': device_id2,
                'JsHttpRequest': '1-xml'
            }).encode('utf-8')

            req = urllib.request.Request(url, data=body, headers=do_auth_headers, method='POST')
            with urllib.request.urlopen(req, timeout=15) as resp:
                new_sess = _extract_php_session(resp)
                if new_sess:
                    php_sess_id = new_sess
                data = json.loads(resp.read().decode('utf-8'))
                new_token = data.get('js', {}).get('token', '')
                if new_token:
                    token = new_token
                _log(f"do_auth: success, token={'(present)' if token else '(empty)'}")
        except Exception as e:
            _log(f"do_auth FAILED: {e}")
            pass

    _log(f"Authentication complete. token={'(present)' if token else '(none)'} phpSessId={'(present)' if php_sess_id else '(none)'}")
    session = {
        'url': url,
        'token': token,
        'php_sess_id': php_sess_id,
        'sn': sn,
        'timestamp': time.time()
    }
    _session_cache[cache_key] = session
    return url, session

def _stalker_request(base_url, mac, action, extra_params=None, username='', password='', is_retry=False):
    """Single stalker API request with dynamic session refresh — mirrors stalkerRequest."""
    url, session = authenticate_stalker(base_url, mac, username, password, force_fresh=is_retry)
    sn = session.get('sn', '')

    cookie = f"mac={mac}; stb_lang=en; timezone=GMT"
    if sn:
        cookie += f"; sn={sn}"
    if session.get('php_sess_id'):
        cookie += f"; PHPSESSID={session['php_sess_id']}"

    req_headers = {
        **_base_headers(url, mac, sn),
        'Cookie': cookie,
    }
    if session.get('token'):
        req_headers['Authorization'] = f"Bearer {session['token']}"

    params = {'type': extra_params.get('type', 'itv') if extra_params else 'itv',
              'action': action,
              'mac': mac,
              'JsHttpRequest': '1-xml'}
    if extra_params:
        for k, v in extra_params.items():
            if k != 'type':
                params[k] = str(v)

    req_url = url + '?' + urllib.parse.urlencode(params)

    # Retry loop with backoff for rate-limit (429) responses
    max_attempts = 4
    for attempt in range(max_attempts):
        try:
            req = urllib.request.Request(req_url, headers=req_headers)
            with urllib.request.urlopen(req, timeout=20) as resp:
                # Dynamic PHPSESSID update
                new_sess = _extract_php_session(resp)
                if new_sess and new_sess != session.get('php_sess_id'):
                    session['php_sess_id'] = new_sess
                    cache_key = f"{url}|{mac}"
                    _session_cache[cache_key] = session

                if resp.status == 401 and not is_retry:
                    return _stalker_request(base_url, mac, action, extra_params, username, password, is_retry=True)

                return json.loads(resp.read().decode('utf-8'))
        except urllib.error.HTTPError as e:
            if e.code == 429:
                wait = 2 ** (attempt + 1)  # 2s, 4s, 8s, 16s
                _log(f"429 Too Many Requests for {action}, backing off {wait}s (attempt {attempt+1}/{max_attempts})")
                time.sleep(wait)
                continue
            if e.code == 401 and not is_retry:
                return _stalker_request(base_url, mac, action, extra_params, username, password, is_retry=True)
            raise
        except Exception:
            raise
    raise Exception(f"Max retry attempts reached for action={action} after 429 errors")

def _fetch_genres_map(base_url, mac, content_type, username, password, default_group):
    """Fetch genre/category map for a given content_type (itv, vod, series)."""
    genres_map = {}
    try:
        action = 'get_genres' if content_type == 'itv' else 'get_categories'
        _log(f"Fetching genres/categories for type={content_type} via {action}...")
        res = _stalker_request(base_url, mac, action, {'type': content_type}, username, password)
        if isinstance(res, dict) and 'js' in res:
            data = res['js']
            items = data.get('data', data) if isinstance(data, dict) else data
            if isinstance(items, list):
                for g in items:
                    gid = str(g.get('id', ''))
                    genres_map[gid] = g.get('title') or g.get('name') or default_group
        elif isinstance(res, list):
            for g in res:
                gid = str(g.get('id', ''))
                genres_map[gid] = g.get('title') or g.get('name') or default_group
        _log(f"Genres for {content_type}: {len(genres_map)} groups")
    except Exception as e:
        _log(f"get_genres({content_type}) FAILED: {e}")
    return genres_map


def _fetch_paginated(base_url, mac, content_type, genres_map, channels, seen_ids, username, password, content_tag):
    """Fetch all items of a given type using parallel paginated get_ordered_list with wildcard category."""
    params = {
        'type': content_type,
        'p': '0',
        'JsHttpRequest': '1-xml',
        'fav': '0',
        'sortby': 'name' if content_type != 'itv' else 'number',
    }
    if content_type == 'itv':
        params['genre'] = '*'
    else:
        params['category'] = '*'

    # Initial request to get page 0 and total_items
    try:
        res = _stalker_request(base_url, mac, 'get_ordered_list', params, username, password)
    except Exception as e:
        _log(f"Initial get_ordered_list({content_type}) FAILED: {e}")
        return

    js = res.get('js') or {}
    ch_list = js.get('data', []) if isinstance(js.get('data'), list) else []
    if not ch_list:
        return
        
    _append_channels(ch_list, channels, genres_map, base_url, mac, seen_ids, content_tag=content_tag, forced_group=None)
    
    total_items = js.get("total_items", 0)
    if isinstance(total_items, str) and total_items.isdigit():
        total_items = int(total_items)
    elif not isinstance(total_items, int):
        total_items = 0
        
    items_per_page = len(ch_list)
    
    if items_per_page == 0:
        return
        
    total_pages = (total_items + items_per_page - 1) // items_per_page
    _log(f"get_ordered_list({content_type}) total_items={total_items}, items_per_page={items_per_page}, total_pages={total_pages}")
    
    if total_pages <= 1:
        return
        
    # Limit max pages to prevent infinite loops
    total_pages = min(total_pages, 500)
    
    def fetch_page(p):
        page_params = params.copy()
        page_params['p'] = str(p)
        try:
            page_res = _stalker_request(base_url, mac, 'get_ordered_list', page_params, username, password)
            page_js = page_res.get('js') or {}
            return page_js.get('data', []) if isinstance(page_js.get('data'), list) else []
        except Exception as e:
            _log(f"get_ordered_list({content_type}) page {p} FAILED: {e}")
            return []
            
    # Fetch remaining pages concurrently
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
        future_to_page = {executor.submit(fetch_page, p): p for p in range(1, total_pages)}
        for future in concurrent.futures.as_completed(future_to_page):
            p = future_to_page[future]
            try:
                page_ch_list = future.result()
                if page_ch_list:
                    _append_channels(page_ch_list, channels, genres_map, base_url, mac, seen_ids, content_tag=content_tag, forced_group=None)
                    _log(f"get_ordered_list({content_type}) page {p} added {len(page_ch_list)} items")
            except Exception as e:
                _log(f"get_ordered_list({content_type}) page {p} exception: {e}")


def fetch_stalker_channels(base_url, mac, username='', password=''):
    """Authenticate and return a dummy channel. Everything is lazy loaded."""
    _log(f"fetch_stalker_channels: url={base_url} mac={mac}")
    authenticate_stalker(base_url, mac, username, password)
    
    # We no longer bulk fetch Live TV. Everything is lazy loaded!
    return [{
        "name": "Stalker Portal Connected",
        "url": "stalker://connected",
        "group_title": "System",
        "tvg_id": "",
        "tvg_logo": ""
    }]


def fetch_stalker_categories(base_url, mac, content_type, username='', password=''):
    """Lazy load: Fetch categories for a specific content type."""
    categories = []
    try:
        action = 'get_genres' if content_type == 'itv' else 'get_categories'
        res = _stalker_request(base_url, mac, action, {'type': content_type}, username, password)
        if isinstance(res, dict) and 'js' in res:
            data = res['js']
            items = data.get('data', data) if isinstance(data, dict) else data
            if isinstance(items, list):
                for g in items:
                    gid = str(g.get('id', ''))
                    name = g.get('title') or g.get('name') or ''
                    if gid and name:
                        categories.append({'id': gid, 'name': name})
        elif isinstance(res, list):
            for g in res:
                gid = str(g.get('id', ''))
                name = g.get('title') or g.get('name') or ''
                if gid and name:
                    categories.append({'id': gid, 'name': name})
    except Exception as e:
        _log(f"fetch_stalker_categories FAILED: {e}")
        raise
    return categories


def fetch_stalker_channels_for_category(base_url, mac, content_type, category_id, username='', password=''):
    """Lazy load: Fetch channels for a specific category ID."""
    channels = []
    seen_ids = set()
    page = 0
    
    content_tag = 'live'
    if content_type == 'vod':
        content_tag = 'movie'
    elif content_type == 'series':
        content_tag = 'series'
        
    while page < 500:
        try:
            if page > 0:
                time.sleep(0.3)
                
            params = {
                'type': content_type,
                'p': str(page),
                'JsHttpRequest': '1-xml',
                'fav': '0',
                'sortby': 'name' if content_type != 'itv' else 'number',
            }
            
            if content_type == 'itv':
                params['genre'] = category_id
            else:
                params['category'] = category_id

            res = _stalker_request(base_url, mac, 'get_ordered_list', params, username, password)
            js = res.get('js') or {}
            ch_list = js.get('data', [])
            items_returned = len(ch_list)
            
            if items_returned == 0:
                break
                
            prev_len = len(channels)
            # We don't have genres_map, but we can fake it so _append_channels knows the fallback name
            fake_map = {str(category_id): f"Category {category_id}"}
            _append_channels(ch_list, channels, fake_map, base_url, mac, seen_ids, content_tag=content_tag)
            
            if items_returned < 14:  # standard page size
                break
                
            page += 1
        except Exception as pe:
            _log(f"fetch_stalker_channels_for_category page {page} FAILED: {pe}")
            break
            
    return channels


def _append_channels(ch_list, channels, genres_map, base_url, mac, seen_ids, content_tag='live', forced_group=None):
    for c in ch_list:
        cmd = c.get('cmd', '')
        if not cmd:
            continue
        ch_id = str(c.get('id', ''))
        ch_name = c.get('name', '') or c.get('title', '')
        dedup_key = ch_id or ch_name or cmd
        if dedup_key in seen_ids:
            continue
        seen_ids.add(dedup_key)

        genre_id = str(c.get('tv_genre_id') or c.get('genre_id') or c.get('category_id') or c.get('ch_genre_id') or '')

        # 0. Use forced group from pagination category iteration
        group = forced_group

        # 1. Try explicit name fields on the channel object itself
        if not group:
            group = (c.get('category_name') or c.get('genre_name') or c.get('group_name')
                     or c.get('group') or c.get('tv_genre_name') or c.get('ch_genre_name'))

        # 2. Fall back to the pre-fetched genres map
        if not group and genre_id:
            group = genres_map.get(genre_id, '')

        # 3. If still empty but we have a genre_id, dynamically populate the map
        #    from sibling channels in this same batch that DO have a name
        if not group and genre_id:
            # Try to find a sibling that knows this genre's name
            for other in ch_list:
                other_id = str(other.get('tv_genre_id') or other.get('genre_id') or
                               other.get('category_id') or other.get('ch_genre_id') or '')
                if other_id == genre_id:
                    other_name = (other.get('category_name') or other.get('genre_name')
                                  or other.get('tv_genre_name') or other.get('ch_genre_name'))
                    if other_name:
                        genres_map[genre_id] = other_name  # cache for future channels
                        group = other_name
                        break

        # 4. Ultimate fallback
        if not group:
            group = 'Movies' if content_tag == 'movie' else ('Series' if content_tag == 'series' else 'Live TV')

        # Validate logo — only keep absolute HTTP logos
        logo = c.get('logo', '') or c.get('screenshot_uri', '') or ''
        if logo and not logo.startswith('http'):
            logo = ''
        channels.append({
            "tvg_id": ch_id,
            "tvg_name": ch_name,
            "title": ch_name,
            "logo": logo,
            "group": group,
            "url": f"stalker://{base_url}|{mac}|{cmd}",
            "content_type": content_tag,
        })

def resolve_stalker_stream(base_url, mac, cmd, username='', password=''):
    """Resolve stalker cmd to playable URL — full probe logic from index.js."""
    _log(f"resolve_stalker_stream: cmd={cmd[:80]}..." if len(cmd) > 80 else f"resolve_stalker_stream: cmd={cmd}")
    original_cmd = cmd.strip()
    if original_cmd.lower().startswith('ffmpeg '):
        original_cmd = original_cmd[7:].strip()

    probes = []

    # Extract stream ID for clean MAG commands
    stream_id = ''
    m = re.search(r'[?&]stream=(\d+)', original_cmd)
    if m:
        stream_id = m.group(1)
    else:
        m = re.search(r'/ch/(\d+)', original_cmd)
        if m:
            stream_id = m.group(1)

    if stream_id:
        probes.append({'type': 'itv', 'cmd': f'ffmpeg http://localhost/ch/{stream_id}'})
        probes.append({'type': 'itv', 'cmd': f'ffmpeg http://localhost/ch/{stream_id}_'})

    probes.append({'type': 'itv', 'cmd': cmd})

    # JSON / Base64 variations
    parsed_obj = None
    if cmd.startswith('{'):
        try:
            parsed_obj = json.loads(cmd)
        except Exception:
            pass
    else:
        try:
            decoded = base64.b64decode(cmd + '==').decode('utf-8')
            if decoded.startswith('{'):
                parsed_obj = json.loads(decoded)
        except Exception:
            pass

    if parsed_obj:
        alt_obj = dict(parsed_obj)
        if 'episode_num' in alt_obj and 'episode_number' not in alt_obj:
            alt_obj['episode_number'] = alt_obj['episode_num']
        if 'episode_number' in alt_obj and 'episode_num' not in alt_obj:
            alt_obj['episode_num'] = alt_obj['episode_number']
        as_json = json.dumps(alt_obj, separators=(',', ':'))
        as_b64 = base64.b64encode(as_json.encode('utf-8')).decode('utf-8')
        if cmd != as_json:
            probes.append({'type': 'itv', 'cmd': as_json})
        if cmd != as_b64:
            probes.append({'type': 'itv', 'cmd': as_b64})

    _log(f"Probes to try: {[p['cmd'][:40] for p in probes]}")
    final_url = ''
    url = get_stalker_url(base_url)

    for probe in probes:
        probe_type = probe.get('type', 'itv')
        probe_cmd = probe.get('cmd')
        _log(f"Trying probe: type={probe_type} cmd={probe_cmd[:60]}")
        try:
            res = _stalker_request(base_url, mac, 'create_link', {
                'type': probe_type, 'cmd': probe_cmd
            }, username, password)

            js_data = res.get('js', {})
            _log(f"create_link raw js: {str(js_data)[:200]}")
            candidates = []
            if isinstance(js_data, dict):
                candidates += [js_data.get('cmd'), js_data.get('url')]
            elif isinstance(js_data, list) and js_data:
                candidates += [js_data[0].get('cmd'), js_data[0].get('url')]
            elif isinstance(js_data, str):
                candidates.append(js_data)
            candidates += [res.get('cmd'), res.get('url'), res.get('stream_url')]
            candidates.append(original_cmd)  # absolute fallback

            for c in candidates:
                if c and isinstance(c, str):
                    cleaned = re.sub(r'^ffmpeg\s+', '', c.strip(), flags=re.IGNORECASE)
                    if 'stream=&' not in cleaned:
                        final_url = cleaned
                        break

            if final_url:
                _log(f"Probe succeeded! URL: {final_url}")
                break
        except Exception as e:
            _log(f"Probe FAILED: {e}")
            pass

    if not final_url:
        _log("All probes exhausted. No URL found.")
        return ''

    # Strip any remaining ffmpeg prefix
    if final_url.lower().startswith('ffmpeg '):
        final_url = final_url[7:].strip()

    # Repair localhost URLs before urlparse to prevent parsing exceptions or failures with malformed characters
    if 'localhost' in final_url or '127.0.0.1' in final_url:
        try:
            parsed_portal = urllib.parse.urlparse(url)
            portal_netloc = parsed_portal.netloc
            final_url = final_url.replace('localhost', portal_netloc).replace('127.0.0.1', portal_netloc)
        except Exception:
            pass

    # Repair relative URLs
    if not final_url.startswith('http'):
        parsed = urllib.parse.urlparse(url)
        final_url = f"{parsed.scheme}://{parsed.netloc}{'' if final_url.startswith('/') else '/'}{final_url}"
    else:
        # Repair localhost URLs (fallback if not replaced above)
        try:
            parsed_final = urllib.parse.urlparse(final_url)
            if parsed_final.hostname in ('localhost', '127.0.0.1'):
                parsed_portal = urllib.parse.urlparse(url)
                final_url = final_url.replace(
                    f"{parsed_final.scheme}://{parsed_final.netloc}",
                    f"{parsed_portal.scheme}://{parsed_portal.netloc}"
                )
        except Exception:
            pass

    return final_url
