import sys
import json
import stalker_parser
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

import io

def parse_epg(content, epg_data=None, filter_ids=None):
    if epg_data is None:
        epg_data = {}
    filter_ids_low = set(str(x).lower() for x in filter_ids) if filter_ids else None
    try:
        # Wrap string in StringIO to support streaming iterparse
        f = io.StringIO(content)
        context = ET.iterparse(f, events=('end',))
        for event, elem in context:
            if elem.tag == 'programme':
                ch_id = elem.get('channel')
                if ch_id:
                    ch_id_low = ch_id.lower()
                    if not filter_ids_low or ch_id_low in filter_ids_low:
                        start = elem.get('start')
                        stop = elem.get('stop')
                        title_elem = elem.find('title')
                        title = title_elem.text if title_elem is not None else "Unknown"
                        desc_elem = elem.find('desc')
                        desc = desc_elem.text if desc_elem is not None else ""
                        
                        if ch_id_low not in epg_data:
                            epg_data[ch_id_low] = []
                        epg_data[ch_id_low].append({"start": start, "stop": stop, "title": title, "desc": desc})
                elem.clear() # Free memory
    except Exception:
        pass
    return epg_data

COUNTRY_CODES = {
    "US", "USA", "UK", "GBR", "CA", "CAN", "FR", "FRA", "DE", "DEU", "ES", "ESP", "IT", "ITA", 
    "AR", "ARG", "MX", "MEX", "IN", "IND", "BR", "BRA", "PT", "PRT", "TR", "TUR", "RU", "RUS", 
    "NL", "NLD", "PL", "POL", "BE", "BEL", "SE", "SWE", "NO", "NOR", "DK", "DNK", "FI", "FIN", 
    "PK", "PAK", "AU", "AUS", "NZ", "NZL", "ZA", "ZAF", "CH", "CHE", "AT", "AUT", "IE", "IRL", 
    "GR", "GRC", "CN", "CHN", "JP", "JPN", "KR", "KOR", "EN", "ENG", "LAT", "SPA", "GER", 
    "POR", "ARA", "ARAB", "HE", "ISR", "IT", "RO", "ROM", "BG", "BGR", "HU", "HUN", "CZ", "CZE", 
    "SK", "SVK", "HR", "HRV", "RS", "SRB", "SI", "SVN", "UA", "UKR", "KZ", "KAZ", "UZ", "UZB", 
    "AL", "ALB", "MK", "MKD", "TH", "THA", "VN", "VNM", "PH", "PHL", "MY", "MYS", "ID", "IDN", 
    "SG", "SGP", "HK", "HKG", "TW", "TWN"
}

country_pattern = "|".join(sorted(list(COUNTRY_CODES), key=len, reverse=True))
country_prefix_regex = re.compile(rf'^(?:\[(?:{country_pattern})\]|\((?:{country_pattern})\)|(?:{country_pattern})\s*[:|#-]\s*)\s*', re.IGNORECASE)

def trim_country_prefix(text):
    if not text:
        return text
    prev = ""
    current = text.strip()
    while prev != current:
        prev = current
        current = country_prefix_regex.sub('', current).strip()
    return current

def parse_m3u(content, source=""):
    # If the URL returned the Proxy's HTML Web UI, flag it
    if content.strip().lower().startswith('<!doctype html>') or '<html' in content[:100].lower() or '<body' in content[:100].lower():
        return None

    lines = content.splitlines()
    if lines and lines[0].startswith('\ufeff'):
        lines[0] = lines[0].replace('\ufeff', '')

    channels = []
    current_channel = {}
    epg_url = None
    exp_date = None
    
    is_hls_chunklist = False

    for line in lines:
        line = line.strip()
        if not line:
            continue
            
        line_upper = line.upper()

        if line_upper.startswith('#EXT-X-TARGETDURATION') or line_upper.startswith('#EXT-X-MEDIA-SEQUENCE'):
            is_hls_chunklist = True
            continue

        if line_upper.startswith('#EXTM3U'):
            epg_match = re.search(r'(?:x-tvg-url|url-tvg)=["\']([^"\']+)["\']', line, re.IGNORECASE)
            if epg_match:
                epg_url = epg_match.group(1)
            exp_match = re.search(r'(?:exp-date|expire)=["\']([^"\']+)["\']', line, re.IGNORECASE)
            if exp_match:
                exp_date = exp_match.group(1)
            continue
            
        if line_upper.startswith('#EXTINF'):
            # Robust attribute extraction mapping all key="value" pairs
            attrs = {}
            for match in re.finditer(r'([a-zA-Z0-9_-]+)\s*=\s*(?:["\']([^"\']*)["\']|([^\s,]+))', line):
                key = match.group(1).lower()
                val = match.group(2) if match.group(2) is not None else match.group(3)
                attrs[key] = val

            # Extract title by finding the first comma not inside quotes
            in_quotes = False
            comma_pos = -1
            for i, char in enumerate(line):
                if char == '"' or char == "'":
                    in_quotes = not in_quotes
                elif char == ',' and not in_quotes:
                    comma_pos = i
                    break
                    
            if comma_pos >= 0:
                raw_title = line[comma_pos + 1:].strip()
            else:
                # Fallback if the M3U is malformed and lacks a comma
                raw_title = re.sub(r'(?i)#EXTINF:.*?(?=\s|$)', '', line).strip()
            
            # If it's an HLS chunklist and the title is empty, it's just a .ts segment. Ignore it.
            if is_hls_chunklist and not raw_title:
                current_channel['ignore'] = True
                continue
                
            current_channel['title'] = trim_country_prefix(raw_title) if raw_title else "Unknown Channel"
            current_channel['logo'] = attrs.get('tvg-logo', '')
            current_channel['tvg_id'] = attrs.get('tvg-id', '')
            current_channel['tvg_name'] = attrs.get('tvg-name', '')
            current_channel['group'] = trim_country_prefix(attrs.get('group-title', 'Uncategorized'))
            current_channel['tmdb_id'] = attrs.get('tmdb-id') or attrs.get('tmdb_id') or attrs.get('tmdbid') or ''
            
        elif line_upper.startswith('#EXT-X-STREAM-INF'):
            # Handle HLS Master Playlists that list channels as variant streams
            is_hls_chunklist = True
            if 'title' not in current_channel:
                name_match = re.search(r'NAME=["\']([^"\']+)["\']', line)
                if name_match:
                    current_channel['title'] = trim_country_prefix(name_match.group(1))
                else:
                    res_match = re.search(r'RESOLUTION=([^,]+)', line)
                    if res_match:
                        current_channel['title'] = f"Stream {res_match.group(1)}"
            if 'logo' not in current_channel:
                current_channel['logo'] = ""
                
        elif line_upper.startswith('#EXTGRP:'):
            current_channel['group'] = trim_country_prefix(line[8:].strip())
            
        elif not line_upper.startswith('#'):
            if current_channel.pop('ignore', False):
                continue
                
            url = line
            if source.startswith('http') and not (url.startswith('http://') or url.startswith('https://')):
                url = urljoin(source, url)
            current_channel['url'] = url
            
            # Fallback if no #EXTINF or #EXT-X-STREAM-INF provided a title
            if 'title' not in current_channel:
                if is_hls_chunklist:
                    continue # Skip raw un-annotated segments in HLS streams
                current_channel['title'] = f"Stream {len(channels) + 1}"
            if 'logo' not in current_channel:
                current_channel['logo'] = ""
                
            # Classify stream type
            title_lower = current_channel.get('title', '').lower()
            group_lower = current_channel.get('group', '').lower()
            url_lower = url.lower()
            
            # Match series patterns
            has_series_pattern = bool(
                re.search(r's\d+\s*e\d+', title_lower) or 
                re.search(r'season\s*\d+\s*episode\s*\d+', title_lower) or 
                re.search(r'\d+x\d+', title_lower)
            )
            
            # A channel is VOD if its group or name suggests movies/series, and its URL is not a typical live stream
            group_indicates_vod = (
                "movie" in group_lower or
                "cinema" in group_lower or
                "films" in group_lower or
                "vod" in group_lower or
                "flick" in group_lower or
                "theater" in group_lower or
                "theatre" in group_lower or
                "filme" in group_lower or
                "pelicula" in group_lower or
                "series" in group_lower or
                "shows" in group_lower or
                "season" in group_lower or
                "episode" in group_lower or
                "serial" in group_lower or
                "novela" in group_lower or
                has_series_pattern
            )
            
            is_live_url = (
                ".m3u8" in url_lower or
                "/live" in url_lower or
                "/stream" in url_lower or
                "live-tv" in url_lower or
                "/ch/" in url_lower
            )
            
            is_vod_extension = url_lower.split('?')[0].endswith(('.mp4', '.mkv', '.avi', '.divx', '.flv', '.mov', '.wmv'))
            
            if (group_indicates_vod and not is_live_url) or is_vod_extension:
                is_series = (
                    "series" in group_lower or 
                    "shows" in group_lower or 
                    "season" in group_lower or 
                    "episode" in group_lower or 
                    "serial" in group_lower or 
                    "novela" in group_lower or
                    "/series/" in url_lower or
                    "/episodes/" in url_lower or
                    has_series_pattern
                )
                if is_series:
                    current_channel['type'] = 'series'
                else:
                    current_channel['type'] = 'movie'
            else:
                current_channel['type'] = 'live'
                
            channels.append(current_channel)
            current_channel = {} # Reset for the next channel

    # If it was an HLS stream with NO valid named channels extracted, return it as a single Live Stream fallback
    if is_hls_chunklist and len(channels) == 0:
        title = urlparse(source).hostname or "HLS Stream"
        return {"channels": [{"title": f"Live Stream ({title})", "logo": "", "url": source}], "epg_url": None, "exp_date": None}

    return {"channels": channels, "epg_url": epg_url, "exp_date": exp_date}

def attach_epg(channels, epg_data, channel_mappings={}):
    if not channels:
        return channels
    if not epg_data:
        for ch in channels:
            ch['epg_programmes'] = []
        return channels
        
    # Create a case-insensitive lookup map for EPG programmes
    epg_data_low = {str(k).lower(): v for k, v in epg_data.items()}
    # Convert mappings values to lowercase as well
    mappings_low = {k: (str(v).lower() if v else None) for k, v in channel_mappings.items()}

    for ch in channels:
        ch_id = ch.get('tvg_id')
        ch_name = ch.get('tvg_name')
        ch_id_low = str(ch_id).lower() if ch_id else None
        ch_name_low = str(ch_name).lower() if ch_name else None
        
        mapping_key = ch.get('title')
        mapped_id_low = mappings_low.get(mapping_key)
        
        if mapped_id_low and mapped_id_low in epg_data_low:
            ch['epg_programmes'] = epg_data_low[mapped_id_low]
        else:
            ch['epg_programmes'] = (
                epg_data_low.get(ch_id_low) 
                or epg_data_low.get(ch_name_low) 
                or []
            )
    return channels

def process_source(source):

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
                        f = io.StringIO(content)
                        context = ET.iterparse(f, events=('end',))
                        for event, elem in context:
                            if elem.tag == 'channel':
                                ch_id = elem.get('id')
                                if ch_id:
                                    display_name = elem.find('display-name')
                                    name = display_name.text if display_name is not None and display_name.text else ch_id
                                    icon_elem = elem.find('icon')
                                    icon = icon_elem.get('src', '') if icon_elem is not None else ''
                                    epg_channels.append({"id": ch_id, "name": name, "source": epg_source, "icon": icon})
                                elem.clear()
                except Exception:
                    pass
        print(json.dumps(epg_channels))
        sys.exit(0)

    if source == "--epg-logos":
        epg_source_arg = sys.argv[2] if len(sys.argv) > 2 else ""
        logo_map = {}
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
                        f = io.StringIO(content)
                        context = ET.iterparse(f, events=('end',))
                        for event, elem in context:
                            if elem.tag == 'channel':
                                ch_id = elem.get('id')
                                if ch_id:
                                    icon_elem = elem.find('icon')
                                    if icon_elem is not None:
                                        src = icon_elem.get('src', '')
                                        if src:
                                            logo_map[ch_id.lower()] = src
                                            if ch_id.isdigit():
                                                display_name_elem = elem.find('display-name')
                                                if display_name_elem is not None and display_name_elem.text:
                                                    dn = display_name_elem.text.strip()
                                                    if dn:
                                                        logo_map[dn.lower()] = src
                                elem.clear()
                except Exception:
                    pass
        print(json.dumps(logo_map))
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
                print(json.dumps({"channels": attach_epg(channels, {}, channel_mappings), "epg_url": None, "exp_date": None}))
                sys.exit(0)
                
            parsed = parse_m3u(content, source)
            channels = parsed.get("channels") if parsed else None
            m3u_epg_url = parsed.get("epg_url") if parsed else None
            exp_date = parsed.get("exp_date") if parsed else None
            
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
                                exp_date = guess_parsed.get("exp_date")
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
            exp_date = parsed.get("exp_date") if parsed else None
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
                    
        print(json.dumps({"channels": attach_epg(channels, epg_data, channel_mappings), "epg_url": m3u_epg_url, "exp_date": exp_date}))
            
    except Exception as e:
        print(json.dumps({"error": str(e)}))

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No M3U source provided"}))
        sys.exit(1)
        
    source = sys.argv[1]
    
    if source == "--stalker":
        base_url = sys.argv[2] if len(sys.argv) > 2 else ""
        mac = sys.argv[3] if len(sys.argv) > 3 else ""
        username = sys.argv[4] if len(sys.argv) > 4 else ""
        password = sys.argv[5] if len(sys.argv) > 5 else ""
        try:
            channels = stalker_parser.fetch_stalker_channels(base_url, mac, username, password)
            print(json.dumps({"channels": channels, "epg_url": None, "exp_date": None}))
        except Exception as e:
            print(json.dumps({"error": str(e)}))
        sys.exit(0)
        
    if source == "--resolve-stalker":
        base_url = sys.argv[2] if len(sys.argv) > 2 else ""
        mac = sys.argv[3] if len(sys.argv) > 3 else ""
        cmd = sys.argv[4] if len(sys.argv) > 4 else ""
        username = sys.argv[5] if len(sys.argv) > 5 else ""
        password = sys.argv[6] if len(sys.argv) > 6 else ""
        try:
            url = stalker_parser.resolve_stalker_stream(base_url, mac, cmd, username, password)
            print(json.dumps({"url": url}))
        except Exception as e:
            print(json.dumps({"error": str(e)}))
        sys.exit(0)
        
    if source == "--stalker-categories":
        base_url = sys.argv[2] if len(sys.argv) > 2 else ""
        mac = sys.argv[3] if len(sys.argv) > 3 else ""
        content_type = sys.argv[4] if len(sys.argv) > 4 else "itv"
        username = sys.argv[5] if len(sys.argv) > 5 else ""
        password = sys.argv[6] if len(sys.argv) > 6 else ""
        try:
            categories = stalker_parser.fetch_stalker_categories(base_url, mac, content_type, username, password)
            print(json.dumps({"categories": categories}))
        except Exception as e:
            print(json.dumps({"error": str(e)}))
        sys.exit(0)

    if source == "--stalker-channels":
        base_url = sys.argv[2] if len(sys.argv) > 2 else ""
        mac = sys.argv[3] if len(sys.argv) > 3 else ""
        content_type = sys.argv[4] if len(sys.argv) > 4 else "itv"
        category_id = sys.argv[5] if len(sys.argv) > 5 else "*"
        username = sys.argv[6] if len(sys.argv) > 6 else ""
        password = sys.argv[7] if len(sys.argv) > 7 else ""
        try:
            channels = stalker_parser.fetch_stalker_channels_for_category(base_url, mac, content_type, category_id, username, password)
            print(json.dumps({"channels": channels}))
        except Exception as e:
            print(json.dumps({"error": str(e)}))
        sys.exit(0)
        
    process_source(source)

if __name__ == '__main__':
    main()