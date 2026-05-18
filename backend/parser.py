import sys
import json
import urllib.request
import urllib.error
import os
import re
import gzip
import xml.etree.ElementTree as ET
from urllib.parse import urljoin, urlparse
import hashlib
import time
import tempfile

CACHE_DIR = os.environ.get('AIVUE_CACHE_DIR', tempfile.gettempdir())
FORCE_REFRESH = os.environ.get('AIVUE_FORCE_REFRESH', '0') == '1'

def fetch_content(url):
    safe_filename = hashlib.md5(url.encode('utf-8')).hexdigest()
    cache_path = os.path.join(CACHE_DIR, safe_filename + ".txt")
    meta_path = os.path.join(CACHE_DIR, safe_filename + ".meta")

    if not FORCE_REFRESH and os.path.exists(cache_path) and os.path.exists(meta_path):
        age = time.time() - os.path.getmtime(cache_path)
        if age < (24 * 3600):  # 24 hour cache duration
            try:
                with open(cache_path, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
                with open(meta_path, 'r', encoding='utf-8', errors='ignore') as f:
                    ctype = f.read().strip()
                return content, ctype
            except Exception:
                pass

    # Disguise as VLC to prevent Stalker proxies from blocking the request
    req = urllib.request.Request(url, headers={'User-Agent': 'VLC/3.0.9 LibVLC/3.0.9', 'Accept': '*/*', 'Accept-Encoding': 'gzip'})
    with urllib.request.urlopen(req, timeout=30) as response:
        content_type = response.headers.get('Content-Type', '').lower()
        raw_data = response.read()
        
        # Automatically decompress gzip responses common in Go-based proxies
        if raw_data.startswith(b'\x1f\x8b'):
            raw_data = gzip.decompress(raw_data)
            
        try:
            content = raw_data.decode('utf-8', errors='ignore')
        except Exception:
            content = raw_data.decode('latin-1', errors='ignore')
            
        # Save to local cache
        try:
            os.makedirs(CACHE_DIR, exist_ok=True)
            with open(cache_path, 'w', encoding='utf-8') as f:
                f.write(content)
            with open(meta_path, 'w', encoding='utf-8') as f:
                f.write(content_type)
        except Exception:
            pass

        return content, content_type

def parse_epg(content, epg_data=None, filter_ids=None):
    if epg_data is None:
        epg_data = {}
    try:
        root = ET.fromstring(content)
        for prog in root.findall('programme'):
            ch_id = prog.get('channel')
            if not ch_id:
                continue
            if filter_ids and ch_id not in filter_ids:
                continue
            start = prog.get('start')
            stop = prog.get('stop')
            title_elem = prog.find('title')
            title = title_elem.text if title_elem is not None else "Unknown"
            desc_elem = prog.find('desc')
            desc = desc_elem.text if desc_elem is not None else ""
            
            if ch_id not in epg_data:
                epg_data[ch_id] = []
            epg_data[ch_id].append({"start": start, "stop": stop, "title": title, "desc": desc})
    except Exception:
        pass
    return epg_data

def parse_m3u(content, source=""):
    # If the URL returned the Proxy's HTML Web UI, flag it
    if content.strip().lower().startswith('<!doctype html>') or '<html' in content[:100].lower() or '<body' in content[:100].lower():
        return None

    # Detect if this is a single video stream (HLS manifest) instead of an IPTV playlist
    # This prevents the parser from extracting individual .ts video segments as channels!
    if '#EXT-X-TARGETDURATION' in content or '#EXT-X-MEDIA-SEQUENCE' in content or ('#EXT-X-STREAM-INF' in content and '#EXTINF' not in content):
        title = urlparse(source).hostname or "HLS Stream"
        return {"channels": [{"title": f"Live Stream ({title})", "logo": "", "url": source}], "epg_url": None}

    lines = content.splitlines()
    channels = []
    current_channel = {}
    epg_url = None

    for line in lines:
        line = line.strip()
        if not line:
            continue

        if line.startswith('#EXTM3U'):
            epg_match = re.search(r'(?:x-tvg-url|url-tvg)=["\']([^"\']+)["\']', line, re.IGNORECASE)
            if epg_match:
                epg_url = epg_match.group(1)
            continue
            
        if line.startswith('#EXTINF'):
            # Extract title (after the first comma to allow commas in channel names)
            title_split = line.split(',', 1)
            current_channel['title'] = title_split[1].strip() if len(title_split) > 1 else "Unknown Channel"

            # Safely extract logo using regex to handle both single and double quotes
            logo_match = re.search(r'tvg-logo=["\']([^"\']+)["\']', line)
            current_channel['logo'] = logo_match.group(1) if logo_match else ""
            
            tvg_id_match = re.search(r'tvg-id=["\']([^"\']+)["\']', line, re.IGNORECASE)
            current_channel['tvg_id'] = tvg_id_match.group(1) if tvg_id_match else ""
            
            tvg_name_match = re.search(r'tvg-name=["\']([^"\']+)["\']', line, re.IGNORECASE)
            current_channel['tvg_name'] = tvg_name_match.group(1) if tvg_name_match else ""
            
            group_title_match = re.search(r'group-title\s*=\s*(["\'])(.*?)\1', line, re.IGNORECASE)
            if not group_title_match:
                group_title_match = re.search(r'group-title\s*=\s*([^\s,]+)', line, re.IGNORECASE)
                current_channel['group'] = group_title_match.group(1).strip() if group_title_match else "Uncategorized"
            else:
                current_channel['group'] = group_title_match.group(2).strip()
            
        elif line.startswith('#EXT-X-STREAM-INF'):
            # Handle HLS Master Playlists that list channels as variant streams
            if 'title' not in current_channel:
                name_match = re.search(r'NAME=["\']([^"\']+)["\']', line)
                if name_match:
                    current_channel['title'] = name_match.group(1)
                else:
                    res_match = re.search(r'RESOLUTION=([^,]+)', line)
                    if res_match:
                        current_channel['title'] = f"Stream {res_match.group(1)}"
            if 'logo' not in current_channel:
                current_channel['logo'] = ""
                
        elif line.startswith('#EXTGRP:'):
            current_channel['group'] = line[8:].strip()
            
        elif not line.startswith('#'):
            url = line
            if source.startswith('http') and not (url.startswith('http://') or url.startswith('https://')):
                url = urljoin(source, url)
            current_channel['url'] = url
            
            # Fallback if no #EXTINF or #EXT-X-STREAM-INF provided a title
            if 'title' not in current_channel:
                current_channel['title'] = f"Stream {len(channels) + 1}"
            if 'logo' not in current_channel:
                current_channel['logo'] = ""
                
            channels.append(current_channel)
            current_channel = {} # Reset for the next channel

    return {"channels": channels, "epg_url": epg_url}

def attach_epg(channels, epg_data, channel_mappings={}):
    if not epg_data or not channels:
        return channels
    for ch in channels:
        ch_id = ch.get('tvg_id')
        ch_name = ch.get('tvg_name')
        
        mapping_key = ch.get('title')
        mapped_id = channel_mappings.get(mapping_key)
        if mapped_id and mapped_id in epg_data:
            ch['epg_programmes'] = epg_data[mapped_id]
        else:
            ch['epg_programmes'] = epg_data.get(ch_id) or epg_data.get(ch_name) or []
    return channels

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No M3U source provided"}))
        sys.exit(1)

    source = sys.argv[1]

    if source == "--epg-only":
        epg_source_arg = sys.argv[2] if len(sys.argv) > 2 else ""
        epg_channels = []
        if epg_source_arg:
            epg_sources = [s.strip() for s in epg_source_arg.split(',') if s.strip()]
            for epg_source in epg_sources:
                try:
                    content = ""
                    if epg_source.startswith('http://') or epg_source.startswith('https://'):
                        content, _ = fetch_content(epg_source)
                    elif os.path.exists(epg_source):
                        with open(epg_source, 'r', encoding='utf-8', errors='ignore') as f:
                            content = f.read()
                    
                    if content:
                        root = ET.fromstring(content)
                        for ch in root.findall('channel'):
                            ch_id = ch.get('id')
                            if not ch_id: continue
                            display_name = ch.find('display-name')
                            name = display_name.text if display_name is not None and display_name.text else ch_id
                            epg_channels.append({"id": ch_id, "name": name, "source": epg_source})
                except Exception:
                    pass
        print(json.dumps(epg_channels))
        sys.exit(0)

    if source == "--epg-dict":
        epg_source_arg = sys.argv[2] if len(sys.argv) > 2 else ""
        filter_ids_arg = sys.argv[3] if len(sys.argv) > 3 else ""
        
        filter_ids = set([s.strip() for s in filter_ids_arg.split(',') if s.strip()]) if filter_ids_arg else None

        epg_data = {}
        if epg_source_arg:
            epg_sources = [s.strip() for s in epg_source_arg.split(',') if s.strip()]
            for epg_source in epg_sources:
                try:
                    if epg_source.startswith('http://') or epg_source.startswith('https://'):
                        epg_content, _ = fetch_content(epg_source)
                        parse_epg(epg_content, epg_data, filter_ids)
                    elif os.path.exists(epg_source):
                        with open(epg_source, 'r', encoding='utf-8', errors='ignore') as f:
                            parse_epg(f.read(), epg_data, filter_ids)
                except Exception:
                    pass
        print(json.dumps(epg_data))
        sys.exit(0)

    epg_source_arg = sys.argv[2] if len(sys.argv) > 2 else ""
    mappings_arg = sys.argv[3] if len(sys.argv) > 3 else "{}"

    try:
        channel_mappings = json.loads(mappings_arg)
    except Exception:
        channel_mappings = {}

    try:
        # Check if source is a URL or a Local File
        if source.startswith('http://') or source.startswith('https://'):
            content, ctype = fetch_content(source)
            
            # If the proxy returns binary video data, treat as direct stream
            if ctype.startswith('video/') and 'mpegurl' not in ctype:
                channels = [{"title": f"Live Stream ({urlparse(source).hostname or 'Direct Stream'})", "logo": "", "url": source}]
                print(json.dumps({"channels": attach_epg(channels, {}, channel_mappings), "epg_url": None}))
                sys.exit(0)
                
            parsed = parse_m3u(content, source)
            channels = parsed.get("channels") if parsed else None
            m3u_epg_url = parsed.get("epg_url") if parsed else None
            
            # Smart proxy resolution: If it was an HTML page, returned 0 channels, OR returned a single fallback stream
            is_fallback = channels is not None and len(channels) == 1 and channels[0].get('url') == source
            if channels is None or len(channels) == 0 or is_fallback:
                endpoints_to_try = ['/iptv', '/m3u', '/playlist.m3u', '/playlist']
                parsed_url = urlparse(source)
                
                # Only try appending if we are at the root URL
                if parsed_url.path == '' or parsed_url.path == '/':
                    for ep in endpoints_to_try:
                        try:
                            guess_url = urljoin(source, ep)
                            guess_content, _ = fetch_content(guess_url)
                            guess_parsed = parse_m3u(guess_content, guess_url)
                            guess_channels = guess_parsed.get("channels") if guess_parsed else None
                            # If we found a larger playlist, use it instead of the single fallback stream
                            if guess_channels is not None and len(guess_channels) > (1 if is_fallback else 0):
                                channels = guess_channels
                                m3u_epg_url = guess_parsed.get("epg_url")
                                break
                        except:
                            pass
                            
            if channels is None:
                print(json.dumps({"error": f"The URL returned a Web Page (HTML). Please provide the exact M3U endpoint for your proxy (e.g. {source.rstrip('/')}/m3u)."}))
                sys.exit(1)
                
            if len(channels) == 0:
                print(json.dumps({"error": "No channels found. If using Stalkerhek, make sure the Stalker portal has successfully synced and try the '/iptv' endpoint."}))
                sys.exit(1)
            
        elif os.path.exists(source):
            with open(source, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
            parsed = parse_m3u(content, source)
            channels = parsed.get("channels") if parsed else None
            m3u_epg_url = parsed.get("epg_url") if parsed else None
            if channels is None or len(channels) == 0:
                print(json.dumps({"error": "No channels found in this file."}))
                sys.exit(1)
        else:
            print(json.dumps({"error": f"File not found: {source}"}))
            sys.exit(1)
            
        needed_ids = set()
        for ch in channels:
            if ch.get('tvg_id'): needed_ids.add(ch['tvg_id'])
            if ch.get('tvg_name'): needed_ids.add(ch['tvg_name'])
            if ch.get('title') in channel_mappings:
                needed_ids.add(channel_mappings[ch['title']])
                
        epg_data = {}
        if epg_source_arg:
            epg_sources = [s.strip() for s in epg_source_arg.split(',') if s.strip()]
            for epg_source in epg_sources:
                try:
                    if epg_source.startswith('http://') or epg_source.startswith('https://'):
                        epg_content, _ = fetch_content(epg_source)
                        parse_epg(epg_content, epg_data, needed_ids)
                    elif os.path.exists(epg_source):
                        with open(epg_source, 'r', encoding='utf-8', errors='ignore') as f:
                            parse_epg(f.read(), epg_data, needed_ids)
                except Exception:
                    pass
                    
        print(json.dumps({"channels": attach_epg(channels, epg_data, channel_mappings), "epg_url": m3u_epg_url}))
            
    except Exception as e:
        print(json.dumps({"error": str(e)}))

if __name__ == '__main__':
    main()