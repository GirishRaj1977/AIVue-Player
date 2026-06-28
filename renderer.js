// Connect the renderer console logs directly to the main process logger
if (window.iptvAPI && window.iptvAPI.isDev && window.iptvAPI.log) {
    const originalConsoleLog = console.log;
    const originalConsoleWarn = console.warn;
    const originalConsoleError = console.error;

    console.log = (...args) => {
        const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
        originalConsoleLog(...args);
        let cat = 'app';
        if (msg.toLowerCase().includes('epg')) cat = 'epg';
        else if (msg.toLowerCase().includes('play') || msg.toLowerCase().includes('mpv')) cat = 'player';
        else if (msg.toLowerCase().includes('m3u') || msg.toLowerCase().includes('stalker') || msg.toLowerCase().includes('xtream')) cat = 'portal';
        window.iptvAPI.log(cat, 'info', `[RENDERER] ${msg}`);
    };

    console.warn = (...args) => {
        const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
        originalConsoleWarn(...args);
        let cat = 'app';
        if (msg.toLowerCase().includes('epg')) cat = 'epg';
        else if (msg.toLowerCase().includes('play') || msg.toLowerCase().includes('mpv')) cat = 'player';
        else if (msg.toLowerCase().includes('m3u') || msg.toLowerCase().includes('stalker') || msg.toLowerCase().includes('xtream')) cat = 'portal';
        window.iptvAPI.log(cat, 'warn', `[RENDERER] ${msg}`);
    };

    console.error = (...args) => {
        const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
        originalConsoleError(...args);
        let cat = 'app';
        if (msg.toLowerCase().includes('epg')) cat = 'epg';
        else if (msg.toLowerCase().includes('play') || msg.toLowerCase().includes('mpv')) cat = 'player';
        else if (msg.toLowerCase().includes('m3u') || msg.toLowerCase().includes('stalker') || msg.toLowerCase().includes('xtream')) cat = 'portal';
        window.iptvAPI.log(cat, 'error', `[RENDERER] ${msg}`);
    };
}




const channelList = document.getElementById('channel-list');
const playerContainer = document.getElementById('player-container');
const clearBtn = document.getElementById('clear-btn');
const loadingMsg = document.getElementById('loading');

const importNameInput = document.getElementById('import-name');
const btnModeFile = document.getElementById('btn-mode-file');
const btnModeUrl = document.getElementById('btn-mode-url');
const containerFile = document.getElementById('input-container-file');
const containerUrl = document.getElementById('input-container-url');
const importFilePath = document.getElementById('import-file-path');
const importUrlPath = document.getElementById('import-url-path');
const importBrowseBtn = document.getElementById('import-browse-btn');
const importSubmitBtn = document.getElementById('import-submit-btn');
const importEpgInput = document.getElementById('import-epg-path'); // New Input Field
const importCancelBtn = document.getElementById('import-cancel-btn');

const importStalkerName = document.getElementById('import-stalker-name');
const importStalkerUrl = document.getElementById('import-stalker-url');
const importStalkerMac = document.getElementById('import-stalker-mac');
const importStalkerSubmitBtn = document.getElementById('import-stalker-submit-btn');
const importStalkerCancelBtn = document.getElementById('import-stalker-cancel-btn');

const importXtremeName = document.getElementById('import-xtreme-name');
const importXtremeUrl = document.getElementById('import-xtreme-url');
const importXtremeUser = document.getElementById('import-xtreme-user');
const importXtremePass = document.getElementById('import-xtreme-pass');
const importXtremeSubmitBtn = document.getElementById('import-xtreme-submit-btn');
const importXtremeCancelBtn = document.getElementById('import-xtreme-cancel-btn');

// let savedPlaylists = []; (Moved to state.js)
// let allChannels = []; (Moved to state.js)
// let streamActive = false; (Moved to state.js)
// let currentPlayingChannelIndex = -1; (Moved to state.js)
// let editingPlaylistIndex = -1; (Moved to state.js)

// let savedEpgs = []; (Moved to state.js)
// let channelMappings = {}; (Moved to state.js)


// let savedReminders = JSON.parse(localStorage.getItem('iptv_reminders') || '[]'); (Moved to state.js)
// let clientActiveRecordings = []; (Moved to state.js)
// let clientScheduledRecordings = []; (Moved to state.js)

// window.isAutoplayEnabled = localStorage.getItem('iptv_autoplay_next') !== 'false'; (Moved to state.js)
// window.currentPlayingSeriesEpisodes = []; (Moved to state.js)

// Prevent forms from reloading the Electron application
document.addEventListener('submit', (e) => {
    e.preventDefault();
});

/**
 * Generates Windows-style spinning dots loading animation HTML.
 * @param {string} [label='Loading...'] - Text displayed below the spinner.
 * @param {object} [options] - Optional configuration.
 * @param {'normal'|'large'|'compact'} [options.size='normal'] - Size variant.
 * @param {boolean} [options.overlay=false] - Wrap in a full-area overlay.
 * @returns {string} HTML string.
 */


/**
 * Shows a global full-screen centered loading spinner overlay.
 * Used for background processes where the next view opens after completion.
 * @param {string} [label='Loading...'] - Text displayed below the spinner.
 */


/**
 * Hides the global full-screen loading spinner overlay.
 */


function saveReminders() {
    console.log('[REMINDER] Saving reminders to localStorage');
    localStorage.setItem('iptv_reminders', JSON.stringify(savedReminders));
}

function toggleReminder(channelTitle, progTitle, startTimeStr, stopTimeStr) {
    const existingIdx = savedReminders.findIndex(r => r.channelTitle === channelTitle && r.progTitle === progTitle && r.startTime === startTimeStr);
    if (existingIdx >= 0) {
        savedReminders.splice(existingIdx, 1);
    } else {
        savedReminders.push({ channelTitle, progTitle, startTime: startTimeStr, stopTime: stopTimeStr, notified: false });
    }
    saveReminders();
    if (document.getElementById('settings-view') && document.getElementById('settings-view').style.display === 'flex') {
        renderSettings();
    }
}





// Variables for the 2-column Mapping UI
let mappingSelectedPlaylist = 'all';
let mappingSelectedChannel = null;
let mappingSelectedEpg = null;
let epgChannelsData = null;

let epgSelectedPlaylist = 'all';
let epgSelectedGroup = 'all';

let playerEpgSelectedPlaylist = 'all';
let playerEpgSelectedGroup = 'all';

// Global variables for virtualized EPG Guide
let epgGridState = null;
let epgChannelsToRender = [];
let epgCache = {};
let epgLoadingSet = new Set();
let epgLastStartIndex = -1;
let epgLastEndIndex = -1;
let epgLastScrollLeft = -1;
let epgScrollTicking = false;



let mappingDebounceTimer;








// ─── Multi-Stage EPG Matching Pipeline ─────────────────────────────────────

/** Levenshtein edit-distance ratio → 0–100 */


/** Token overlap (Jaccard-like): common_tokens / max_tokens → 0–100 */


/** Token sort ratio: sort tokens alphabetically then Levenshtein → 0–100 */


/** Token set ratio (rapidfuzz-style): intersection vs each remainder → 0–100 */


/** Channel alias dictionary — common naming inconsistencies across IPTV providers */
const CHANNEL_ALIASES = {
    // Sony
    'sonymax':           ['sony max', 'max hd', 'max india'],
    'sonyliv':           ['sony liv'],
    'sonypix':           ['sony pix', 'pix hd'],
    'sonyentertainment': ['set india', 'sony entertainment television', 'sony et', 'sony entertainment', 'sony tv'],
    'sonysports1':       ['sony ten 1', 'ten sports 1', 'ten 1', 'sony ten1'],
    'sonysports2':       ['sony ten 2', 'ten sports 2', 'ten 2', 'sony ten2'],
    'sonysports3':       ['sony ten 3', 'ten sports 3', 'ten 3', 'sony ten3'],
    'sonysports5':       ['sony ten 5', 'ten sports 5', 'ten 5', 'sony ten5'],
    'sonysix':           ['sony six', 'six hd'],
    'sonymix':           ['sony mix', 'mix hd'],
    // Star
    'starplus':          ['star plus', 'starplus', 'star plus india'],
    'stargold':          ['star gold', 'gold india'],
    'starmovies':        ['star movies', 'fox star movies'],
    'startv':            ['star vijay', 'vijay tv', 'vijay'],
    'starutsav':         ['star utsav', 'utsav'],
    'starjalsha':        ['star jalsha', 'jalsha'],
    'starsports1':       ['star sports 1', 'starsports 1', 'star sports first', 'star sports hindi'],
    'starsports2':       ['star sports 2', 'starsports 2'],
    'starsports3':       ['star sports 3', 'starsports 3'],
    'starsports4':       ['star sports 4', 'starsports 4'],
    // Colors
    'colors':            ['colors tv', 'colors hd', 'colors india', 'colors viacom'],
    'colorsinfiniti':    ['colors infinity', 'infinity', 'colors infinity hd'],
    'colorsrishtey':     ['colors rishtey', 'rishtey'],
    'colorsbangla':      ['colors bangla'],
    'colorskannada':     ['colors kannada'],
    // Zee
    'zeetv':             ['zee entertainment', 'zee india', 'zee tv'],
    'zeecafe':           ['zee cafe'],
    'zeeclassic':        ['zee classic'],
    'zeebangla':         ['zee bangla'],
    'zeemarathi':        ['zee marathi'],
    'zeetelugu':         ['zee telugu'],
    'zeekannada':        ['zee kannada'],
    'zeecinema':         ['zee cinema', 'zee cinema hd'],
    // Discovery
    'discovery':         ['discovery channel', 'disc channel'],
    'discoveryscience':  ['discovery science', 'disc science'],
    'discoveryturbo':    ['discovery turbo', 'turbo'],
    'animalplanet':      ['animal planet', 'animal planet hd'],
    'tlc':               ['tlc india', 'tlc hd'],
    // Sports
    'espn':              ['espn us', 'espn america', 'espn sports'],
    'espn2':             ['espn 2', 'espnews'],
    'skysports1':        ['sky sports 1', 'sky sports main event', 'sky main event'],
    'skysports2':        ['sky sports 2', 'sky sports football'],
    'eurosport1':        ['eurosport 1', 'eurosport'],
    'eurosport2':        ['eurosport 2'],
    // UK
    'bbcone':            ['bbc 1', 'bbc one', 'bbc1'],
    'bbctwo':            ['bbc 2', 'bbc two', 'bbc2'],
    'bbcthree':          ['bbc 3', 'bbc three', 'bbc3'],
    'bbcfour':           ['bbc 4', 'bbc four', 'bbc4'],
    'bbcnews':           ['bbc world news', 'bbc news channel', 'bbc news 24'],
    'itv':               ['itv 1', 'itv1', 'itv hd'],
    'itv2':              ['itv 2'],
    'channel4':          ['ch4', 'c4', 'channel 4', 'ch 4'],
    'channel5':          ['ch5', 'c5', 'channel 5', 'ch 5', 'five'],
    'skyone':            ['sky 1', 'sky one'],
    'skyatlantic':       ['sky atlantic'],
    // News
    'cnn':               ['cnn international', 'cnn hd', 'cnn world'],
    'cnbcinternational': ['cnbc world', 'cnbc tv18', 'cnbc awaaz'],
    'bloomberg':         ['bloomberg tv', 'bloomberg hd'],
    'aljazeeraenglish':  ['al jazeera', 'aljazeera english', 'al jazeera english'],
    'ndtv24x7':          ['ndtv 24x7', 'ndtv', 'ndtv india'],
    'aajtak':            ['aaj tak', 'aajtak news'],
    'republicbharat':    ['republic bharat', 'republic tv india'],
    // Kids
    'cartoonnetwork':    ['cartoon network', 'cn'],
    'nickelodeon':       ['nick', 'nickelodeon hd', 'nick india'],
    'nickjr':            ['nick jr', 'nick junior'],
    'pogo':              ['pogo tv'],
    'disneyjunior':      ['disney junior', 'disney jr'],
    'disneyxd':          ['disney xd'],
    // Movies
    'hbo':               ['hbo asia', 'hbo hd'],
    'foxmovies':         ['fox movies', 'fox movies premium', 'star fox movies'],
    'romedy':            ['romedy now'],
    // Music
    'mtv':               ['mtv india', 'mtv hd'],
    'vh1':               ['vh1 india', 'vh1 hd'],
};

/** Build a flat normalized-alias → canonical key lookup (cached after first call) */
let _aliasLookupCache = null;


/**
 * Score a playlist channel title against an EPG channel (name + id).
 * Returns { score: 0–100, stage: string, detail: string }
 *
 * Weighted formula: 0.40×tokenSet + 0.25×tokenSort + 0.20×levenshtein + 0.15×tokenOverlap
 */


/** Legacy alias kept for any remaining call sites */








function updateNavLockState() {
    console.log('[UI] Updating navigation lock state.');
    const hasPlaylists = savedPlaylists.length > 0;
    const btnLiveTv = document.getElementById('btn-live-tv');
    const btnEpg = document.getElementById('btn-epg');
    const btnSettings = document.getElementById('btn-settings');

    if (btnLiveTv) {
        btnLiveTv.disabled = !hasPlaylists;
        btnLiveTv.style.opacity = hasPlaylists ? '1' : '0.3';
        btnLiveTv.style.cursor = hasPlaylists ? 'pointer' : 'not-allowed';
    }
    if (btnEpg) {
        btnEpg.disabled = !hasPlaylists;
        btnEpg.style.opacity = hasPlaylists ? '1' : '0.3';
        btnEpg.style.cursor = hasPlaylists ? 'pointer' : 'not-allowed';
    }
    if (btnSettings) {
        btnSettings.disabled = !hasPlaylists;
        btnSettings.style.opacity = hasPlaylists ? '1' : '0.3';
        btnSettings.style.cursor = hasPlaylists ? 'pointer' : 'not-allowed';
    }

    ['btn-movies', 'btn-vod', 'btn-recording'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
            btn.disabled = !hasPlaylists;
            btn.style.opacity = hasPlaylists ? '1' : '0.3';
            btn.style.cursor = hasPlaylists ? 'pointer' : 'not-allowed';
        }
    });
}







// ── Playlist structure version counter ────────────────────────────────────────
// Increment whenever playlist channels are structurally changed (add/remove/sort).
// updateState() skips the expensive allChannels rebuild if the version is the same.
window._playlistsVersion = window._playlistsVersion || 0;
window._lastBuiltVersion  = window._lastBuiltVersion  || -1;

/** Call when playlist structure changes: channel add/remove/reorder/disable. */
function markPlaylistsDirty() {
    window._playlistsVersion++;
    renderChannels._lastKey = null; // invalidate render guard
}

function updateState(skipSave = false) {
    console.log('[STATE] Updating global state and re-rendering.');

    const needsRebuild = (window._playlistsVersion !== window._lastBuiltVersion);

    if (needsRebuild) {
        allChannels = [];

        savedPlaylists.sort((a, b) => sortAlphaNum(a.name, b.name));

        const filterSelect = document.getElementById('playlist-filter');
        let currentFilter = 'all';
        if (filterSelect) {
            currentFilter = filterSelect.value;
            if (currentFilter === 'all' && !window.initialFilterLoaded) {
                currentFilter = localStorage.getItem('iptv_playlist_filter') || 'all';
                window.initialFilterLoaded = true;
            }
            filterSelect.innerHTML = '<option value="all">All Merged</option><option value="favs">Favourites</option>';
        }

        savedPlaylists.forEach(p => {
            if (p.channels) {
                p.channels.sort((a, b) => sortAlphaNum(a.title, b.title));
            }
            if (p.channels && !p.disabled) {
                if (filterSelect) {
                    const opt = document.createElement('option');
                    opt.value = p.id;
                    opt.textContent = p.name;
                    filterSelect.appendChild(opt);
                }

                // Group channels together as they appear in the playlist
                let groupedChannels = {};
                let groupOrder = [];

                p.channels.forEach(c => {
                    if (c.disabled) return;
                    // Segregate Stalker Movies/Series out of Live channels
                    const channelType = c.type || 'live';
                    if (channelType !== 'live') return;

                    c.playlistId = p.id; // Attach playlist ID for easy filtering
                    const groupName = c.group || 'Uncategorized';
                    if (!groupedChannels[groupName]) {
                        groupedChannels[groupName] = [];
                        groupOrder.push(groupName);
                    }
                    groupedChannels[groupName].push(c);
                });

                groupOrder.sort(sortAlphaNum).forEach(g => {
                    groupedChannels[g].forEach(c => allChannels.push(c));
                });
            }
        });

        window._lastBuiltVersion = window._playlistsVersion;
        renderChannels._lastKey = null; // force a DOM refresh after rebuild

        if (filterSelect && Array.from(filterSelect.options).some(o => o.value === currentFilter)) {
            filterSelect.value = currentFilter;
        } else if (filterSelect) {
            filterSelect.value = 'all';
            localStorage.setItem('iptv_playlist_filter', 'all');
        }

        let groupFilter = document.getElementById('group-filter');
        if (groupFilter) groupFilter.remove();

        let channelSearch = document.getElementById('channel-search');
        if (!channelSearch && filterSelect) {
            channelSearch = document.createElement('input');
            channelSearch.id = 'channel-search';
            channelSearch.type = 'text';
            channelSearch.placeholder = 'Search channels...';
            channelSearch.style.marginTop = '10px';
            channelSearch.style.width = '100%';
            channelSearch.style.padding = '8px';
            channelSearch.style.borderRadius = '4px';
            channelSearch.style.background = '#1e1e1e';
            channelSearch.style.color = '#fff';
            channelSearch.style.border = '1px solid #333';
            channelSearch.style.boxSizing = 'border-box';
            filterSelect.parentNode.insertBefore(channelSearch, filterSelect.nextSibling);
            channelSearch.addEventListener('input', () => {
                renderChannels();
                renderLiveEpgGrid();
            });
        }
    }

    // Always recalculate the playing index (it may have changed via favourite/logo/mapping)
    if (streamActive) {
        const currentUrl = localStorage.getItem('lastPlayedChannelUrl');
        const detailName = document.getElementById('detail-name');
        const currentTitle = detailName ? detailName.textContent : '';
        currentPlayingChannelIndex = allChannels.findIndex(c => c.url === currentUrl && (c.title || 'Unknown Channel') === currentTitle);
    } else {
        currentPlayingChannelIndex = -1;
    }

    renderChannels._lastKey = null; // Invalidate render guard so active-item highlight always refreshes
    renderChannels();
    renderPlaylists();
    if (!skipSave) {
        window.iptvAPI.saveChannels(savedPlaylists);
    }
    updateNavLockState();
}

function openManageChannelsModal(playlistIndex, pendingData = null) {
    console.log('[UI] Opening manage channels modal for playlist index:', playlistIndex, pendingData ? 'is new import' : '');
    const isNew = pendingData !== null;
    let playlist;
    let originalChannels = [];
    if (isNew) {
        playlist = pendingData;
        originalChannels = playlist.channels;
    } else {
        playlist = savedPlaylists[playlistIndex];
        originalChannels = playlist.channels;
    }

    if (!playlist || !originalChannels) return;

    let modal = document.getElementById('manage-channels-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'manage-channels-modal';
        modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(3, 0, 30, 0.72); backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); z-index: 1000; display: flex; align-items: center; justify-content: center;';
        document.body.appendChild(modal);
    }

    const isStalker = playlist.epg && playlist.epg.startsWith('stalker:');

    const groupsMap = {};
    const stalkerParents = {};

    originalChannels.forEach((c, idx) => {
        const isVod = c.type === 'movie' || c.type === 'series' || c.type === 'movie_category' || c.type === 'vod_category' || c.type === 'series_category';
        if (isVod) {
            return; // Skip adding to UI entirely
        }

        if (isStalker && c.type && c.type.endsWith('_category')) {
            const parent = c.group || 'Categories';
            if (!stalkerParents[parent]) stalkerParents[parent] = [];
            stalkerParents[parent].push(c.title);

            if (!groupsMap[c.title]) groupsMap[c.title] = { channels: [], category: c, categoryIndex: idx };
            else { groupsMap[c.title].category = c; groupsMap[c.title].categoryIndex = idx; }
        } else {
            const g = c.group || 'Ungrouped';
            if (!groupsMap[g]) groupsMap[g] = { channels: [] };
            groupsMap[g].channels.push({ channel: c, originalIndex: idx });
        }
    });

    const tempDisabled = new Set();

    originalChannels.forEach((c, idx) => {
        if (c.disabled !== false) tempDisabled.add(idx);
    });

    let currentGroupFilter = null;
    let sortedGroups = [];

    if (isStalker) {
        if (Object.keys(stalkerParents).length > 0) {
            const firstParent = Object.keys(stalkerParents).sort(sortAlphaNum)[0];
            if (stalkerParents[firstParent].length > 0) {
                currentGroupFilter = stalkerParents[firstParent].sort(sortAlphaNum)[0];
            }
        }
    } else {
        sortedGroups = Array.from(Object.keys(groupsMap)).sort(sortAlphaNum);
        currentGroupFilter = sortedGroups.length > 0 ? sortedGroups[0] : null;
    }

    const newCount = originalChannels.filter(c => c.isNew).length;
    const newTitleStr = newCount > 0 ? ` <span style="color: #FFD700; font-size: 0.85em; font-weight: normal;">(${newCount} New Channels Found)</span>` : '';

    let groupsHtml = '';
    if (isStalker) {
        Object.keys(stalkerParents).sort(sortAlphaNum).forEach(parent => {
            groupsHtml += `<div style="padding: 10px 16px; background: rgba(187, 134, 252, 0.06); font-weight: 700; color: rgba(187, 134, 252, 0.8); font-size: 0.76em; text-transform: uppercase; letter-spacing: 0.1em; border-bottom: 1px solid rgba(187, 134, 252, 0.08); border-top: 1px solid rgba(187, 134, 252, 0.08); font-family: 'Inter', sans-serif;">${parent.replace(/</g, '&lt;')}</div>`;

            stalkerParents[parent].sort(sortAlphaNum).forEach(g => {
                const total = groupsMap[g].channels.length;
                const enabled = groupsMap[g].channels.filter(item => !tempDisabled.has(item.originalIndex)).length;
                const hasNew = groupsMap[g].channels.some(item => item.channel.isNew);
                const newLabel = hasNew ? ' <span style="color: #FFD700; font-size: 0.85em;">(New)</span>' : '';

                groupsHtml += `
                <div class="modal-group-item" data-group="${g.replace(/"/g, '&quot;')}" style="padding: 10px 18px; cursor: pointer; border-left: 3px solid transparent; color: #d1d5db; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); font-family: 'Inter', sans-serif; font-size: 0.85em; border-radius: 0 6px 6px 0; margin: 1px 6px 1px 0; display: flex; align-items: center; justify-content: space-between; gap: 8px;">
                    <div style="display: flex; align-items: center; gap: 8px; min-width: 0; flex-grow: 1;">
                        <input type="checkbox" class="group-select-cb" data-group="${g.replace(/"/g, '&quot;')}" style="width: 14px; height: 14px; accent-color: #bb86fc; cursor: pointer; flex-shrink: 0;">
                        <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${g.replace(/</g, '&lt;')}</span>
                        ${newLabel}
                    </div>
                    <span class="group-count-span" style="color: rgba(255,255,255,0.3); font-size: 0.82em; flex-shrink: 0; margin-left: 6px;">${enabled}/${total}</span>
                </div>`;
            });
        });

        const looseGroups = Object.keys(groupsMap).filter(g => !Object.values(stalkerParents).flat().includes(g));
        if (looseGroups.length > 0) {
            groupsHtml += `<div style="padding: 10px 16px; background: rgba(187, 134, 252, 0.06); font-weight: 700; color: rgba(187, 134, 252, 0.8); font-size: 0.76em; text-transform: uppercase; letter-spacing: 0.1em; border-bottom: 1px solid rgba(187, 134, 252, 0.08); border-top: 1px solid rgba(187, 134, 252, 0.08); font-family: 'Inter', sans-serif;">Other Channels</div>`;
            looseGroups.sort(sortAlphaNum).forEach(g => {
                const total = groupsMap[g].channels.length;
                const enabled = groupsMap[g].channels.filter(item => !tempDisabled.has(item.originalIndex)).length;
                const hasNew = groupsMap[g].channels.some(item => item.channel.isNew);
                const newLabel = hasNew ? ' <span style="color: #FFD700; font-size: 0.85em;">(New)</span>' : '';

                groupsHtml += `
                <div class="modal-group-item" data-group="${g.replace(/"/g, '&quot;')}" style="padding: 10px 18px; cursor: pointer; border-left: 3px solid transparent; color: #d1d5db; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); font-family: 'Inter', sans-serif; font-size: 0.85em; border-radius: 0 6px 6px 0; margin: 1px 6px 1px 0; display: flex; align-items: center; justify-content: space-between; gap: 8px;">
                    <div style="display: flex; align-items: center; gap: 8px; min-width: 0; flex-grow: 1;">
                        <input type="checkbox" class="group-select-cb" data-group="${g.replace(/"/g, '&quot;')}" style="width: 14px; height: 14px; accent-color: #bb86fc; cursor: pointer; flex-shrink: 0;">
                        <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${g.replace(/</g, '&lt;')}</span>
                        ${newLabel}
                    </div>
                    <span class="group-count-span" style="color: rgba(255,255,255,0.3); font-size: 0.82em; flex-shrink: 0; margin-left: 6px;">${enabled}/${total}</span>
                </div>`;
            });
        }
    } else {
        sortedGroups.forEach(g => {
            const total = groupsMap[g].channels.length;
            const enabled = groupsMap[g].channels.filter(item => !tempDisabled.has(item.originalIndex)).length;
            const hasNew = groupsMap[g].channels.some(item => item.channel.isNew);
            const newLabel = hasNew ? ' <span style="color: #FFD700; font-size: 0.85em;">(New)</span>' : '';

            groupsHtml += `
            <div class="modal-group-item" data-group="${g.replace(/"/g, '&quot;')}" style="padding: 10px 18px; cursor: pointer; border-left: 3px solid transparent; color: #d1d5db; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); font-family: 'Inter', sans-serif; font-size: 0.85em; border-radius: 0 6px 6px 0; margin: 1px 6px 1px 0; display: flex; align-items: center; justify-content: space-between; gap: 8px;">
                <div style="display: flex; align-items: center; gap: 8px; min-width: 0; flex-grow: 1;">
                    <input type="checkbox" class="group-select-cb" data-group="${g.replace(/"/g, '&quot;')}" style="width: 14px; height: 14px; accent-color: #bb86fc; cursor: pointer; flex-shrink: 0;">
                    <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${g.replace(/</g, '&lt;')}</span>
                    ${newLabel}
                </div>
                <span class="group-count-span" style="color: rgba(255,255,255,0.3); font-size: 0.82em; flex-shrink: 0; margin-left: 6px;">${enabled}/${total}</span>
            </div>`;
        });
    }

    modal.innerHTML = `
        <div style="background: rgba(18, 18, 24, 0.88); backdrop-filter: blur(28px); -webkit-backdrop-filter: blur(28px); border: 1px solid rgba(187, 134, 252, 0.2); border-radius: 20px; width: 92%; max-width: 1050px; height: 88%; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 24px 80px rgba(0,0,0,0.7), 0 0 40px rgba(187, 134, 252, 0.08);">
            <div style="padding: 18px 24px; border-bottom: 1px solid rgba(187, 134, 252, 0.12); display: flex; justify-content: space-between; align-items: center; background: rgba(187, 134, 252, 0.04);">
                <h2 style="margin: 0; color: #bb86fc; font-size: 1.15em; font-family: 'Outfit', 'Inter', sans-serif; font-weight: 700; letter-spacing: -0.01em; text-shadow: 0 0 20px rgba(187, 134, 252, 0.3);">Manage Channels: ${playlist.name}${newTitleStr}</h2>
                <div style="display: flex; gap: 10px;">
                    <input type="text" id="modal-channel-search" placeholder="Search channels..." value="" style="background: rgba(255, 255, 255, 0.03); color: #fff; border: 1px solid rgba(255, 255, 255, 0.08); padding: 8px 16px; border-radius: 10px; outline: none; width: 260px; font-family: 'Inter', sans-serif; font-size: 0.85em; transition: all 0.25s ease; box-shadow: inset 0 2px 4px rgba(0,0,0,0.3);">
                </div>
            </div>
            
            <div style="display: flex; flex-grow: 1; overflow: hidden;">
                <!-- Left Column: Groups -->
                <div style="width: 280px; background: rgba(0, 0, 0, 0.15); border-right: 1px solid rgba(187, 134, 252, 0.08); display: flex; flex-direction: column;">
                    <div style="padding: 12px 18px; background: rgba(187, 134, 252, 0.06); border-bottom: 1px solid rgba(187, 134, 252, 0.08); font-weight: 700; color: rgba(187, 134, 252, 0.7); font-size: 0.78em; text-transform: uppercase; letter-spacing: 0.12em; font-family: 'Inter', sans-serif;">
                        Groups
                    </div>
                    <div id="modal-groups-list" style="flex-grow: 1; overflow-y: auto; padding: 8px 0;">
                        ${groupsHtml}
                    </div>
                </div>

                <!-- Right Column: Channels -->
                <div style="flex-grow: 1; display: flex; flex-direction: column; background: rgba(0, 0, 0, 0.08); min-width: 0;">
                    <div style="padding: 10px 20px; background: rgba(187, 134, 252, 0.04); border-bottom: 1px solid rgba(187, 134, 252, 0.08); display: flex; align-items: center; gap: 15px;">
                        <label style="display: flex; align-items: center; cursor: pointer; color: #bb86fc; font-weight: 600; margin-right: 10px; font-family: 'Inter', sans-serif; font-size: 0.88em; gap: 8px; user-select: none;">
                            <input type="checkbox" id="modal-select-all" style="margin: 0; width: 16px; height: 16px; accent-color: #bb86fc; cursor: pointer;">
                            Enable All Visible
                        </label>
                        <span id="modal-channels-count" style="color: rgba(255,255,255,0.4); font-size: 0.82em; flex-grow: 1; text-align: right; font-family: 'Inter', sans-serif;">Showing 0 channels</span>
                    </div>
                    <div id="modal-channels-list" style="flex-grow: 1; overflow-y: auto; padding: 8px 16px;">
                    </div>
                </div>
            </div>
            <div style="padding: 16px 24px; border-top: 1px solid rgba(187, 134, 252, 0.12); display: flex; justify-content: flex-end; gap: 12px; background: rgba(187, 134, 252, 0.04);">
                <button id="modal-cancel-btn" style="background: rgba(255, 255, 255, 0.04); color: #a1a1aa; border: 1px solid rgba(255, 255, 255, 0.08); padding: 8px 22px; border-radius: 10px; cursor: pointer; font-weight: 600; font-family: 'Inter', sans-serif; font-size: 0.88em; transition: all 0.25s ease;">Cancel</button>
                <button id="modal-save-btn" style="background: linear-gradient(135deg, #bb86fc, #9b59fc); color: #000; font-weight: 700; padding: 8px 26px; border-radius: 10px; border: none; cursor: pointer; font-family: 'Inter', sans-serif; font-size: 0.88em; box-shadow: 0 4px 18px rgba(187, 134, 252, 0.3); transition: all 0.25s ease;">${isNew ? 'Import Selected' : 'Save Changes'}</button>
            </div>
        </div>
    `;

    let currentFilteredChannels = [];
    const renderChannelsList = () => {
        const searchVal = (document.getElementById('modal-channel-search') ? document.getElementById('modal-channel-search').value : '').toLowerCase();

        let channelsToRender = (currentGroupFilter && groupsMap[currentGroupFilter]) ? groupsMap[currentGroupFilter].channels : [];

        if (searchVal) {
            channelsToRender = channelsToRender.filter(item => {
                const title = String(item.channel.title || 'Unknown Channel').toLowerCase();
                return title.includes(searchVal);
            });
        }

        const sorter = (a, b) => sortAlphaNum(a.channel.title, b.channel.title);

        const enabledList = [];
        const disabledList = [];

        channelsToRender.forEach(item => {
            if (tempDisabled.has(item.originalIndex)) {
                disabledList.push(item);
            } else {
                enabledList.push(item);
            }
        });

        enabledList.sort(sorter);
        disabledList.sort(sorter);

        currentFilteredChannels = [...enabledList, ...disabledList];
        let visibleCount = currentFilteredChannels.length;

        let channelsHtml = currentFilteredChannels.map(item => {
            const { channel, originalIndex } = item;
            const isDisabled = tempDisabled.has(originalIndex);
            const isNew = channel.isNew;
            const safeTitle = (channel.title || 'Unknown Channel').replace(/</g, "&lt;").replace(/>/g, "&gt;");

            const newLabel = isNew ? ' <span style="color: #FFD700;">(New)</span>' : '';
            const titleColor = isDisabled ? (isNew ? '#FFD700' : '#f0859a') : '#34d399';

            return `
                <label style="display: flex; align-items: center; padding: 9px 12px; border-bottom: 1px solid rgba(255, 255, 255, 0.03); cursor: pointer; background: ${!isDisabled ? 'rgba(52, 211, 153, 0.04)' : 'transparent'}; transition: all 0.15s ease; border-radius: 6px; margin-bottom: 2px; gap: 12px;">
                    <input type="checkbox" class="channel-select-cb" data-idx="${originalIndex}" ${!isDisabled ? 'checked' : ''} style="width: 16px; height: 16px; accent-color: #bb86fc; cursor: pointer; flex-shrink: 0;">
                    <span style="flex-grow: 1; color: ${titleColor}; font-weight: 600; font-size: 0.84em; font-family: 'Inter', sans-serif;">${safeTitle}${newLabel}</span>
                </label>
            `;
        }).join('');

        let allVisibleEnabled = visibleCount > 0;
        if (allVisibleEnabled) {
            currentFilteredChannels.forEach(item => {
                if (tempDisabled.has(item.originalIndex)) {
                    allVisibleEnabled = false;
                }
            });
        }

        const countSpan = document.getElementById('modal-channels-count');
        if (countSpan) countSpan.textContent = `Showing ${visibleCount} channels`;

        const selectAllCb = document.getElementById('modal-select-all');
        if (selectAllCb) selectAllCb.checked = allVisibleEnabled;

        const listDiv = document.getElementById('modal-channels-list');
        if (listDiv) listDiv.innerHTML = channelsHtml;

        document.querySelectorAll('.channel-select-cb').forEach(cb => {
            cb.addEventListener('change', (e) => {
                const idx = parseInt(e.target.getAttribute('data-idx'));
                if (e.target.checked) {
                    tempDisabled.delete(idx);
                } else {
                    tempDisabled.add(idx);
                }
                renderChannelsList();
            });
        });

        document.querySelectorAll('.modal-group-item').forEach(el => {
            const g = el.getAttribute('data-group');
            if (!groupsMap[g]) return;
            const total = groupsMap[g].channels.length;
            const enabled = groupsMap[g].channels.filter(item => !tempDisabled.has(item.originalIndex)).length;
            const countSpan = el.querySelector('.group-count-span');
            if (countSpan) countSpan.textContent = `${enabled}/${total}`;

            const cb = el.querySelector('.group-select-cb');
            if (cb) {
                if (enabled === 0) {
                    cb.checked = false;
                    cb.indeterminate = false;
                } else if (enabled === total) {
                    cb.checked = true;
                    cb.indeterminate = false;
                } else {
                    cb.checked = false;
                    cb.indeterminate = true;
                }
            }

            if (g === currentGroupFilter) {
                el.style.borderLeftColor = '#bb86fc';
                el.style.background = 'rgba(187, 134, 252, 0.1)';
                el.style.color = '#bb86fc';
                el.style.fontWeight = '600';
                el.style.boxShadow = 'inset 0 0 12px rgba(187, 134, 252, 0.05)';
            } else {
                el.style.borderLeftColor = 'transparent';
                el.style.background = 'transparent';
                el.style.color = '#d1d5db';
                el.style.fontWeight = 'normal';
                el.style.boxShadow = 'none';
            }
        });
    };

    document.querySelectorAll('.modal-group-item').forEach(el => {
        el.addEventListener('click', async (e) => {
            const g = el.getAttribute('data-group');
            currentGroupFilter = g;

            if (isStalker && groupsMap[g] && groupsMap[g].category && groupsMap[g].channels.length === 0) {
                const listDiv = document.getElementById('modal-channels-list');
                listDiv.innerHTML = getWinSpinnerHtml('Fetching channels...');

                try {
                    const cat = groupsMap[g].category;
                    const mac = playlist.epg.substring(8);
                    let categoryType = 'movie';
                    if (cat.type === 'itv_category') categoryType = 'itv';
                    else if (cat.type === 'series_category' || cat.type === 'vod_category') categoryType = 'series';

                    const fetched = await window.iptvAPI.loadStalkerCategory({
                        url: playlist.source,
                        mac: mac,
                        categoryId: cat.tvg_id,
                        categoryType: categoryType,
                        categoryName: cat.title,
                        isSeries: categoryType === 'series'
                    });

                    fetched.forEach(newCh => {
                        newCh.disabled = true;
                        newCh.isNew = true;

                        const newIdx = originalChannels.length;
                        originalChannels.push(newCh);
                        tempDisabled.add(newIdx);
                        groupsMap[g].channels.push({ channel: newCh, originalIndex: newIdx });
                    });

                } catch (err) {
                    showToast("Failed to fetch channels for category.");
                }
            }

            renderChannelsList();
        });
    });

    document.querySelectorAll('.group-select-cb').forEach(cb => {
        cb.addEventListener('click', (e) => {
            e.stopPropagation();
        });
        cb.addEventListener('change', (e) => {
            const g = e.target.getAttribute('data-group');
            const checked = e.target.checked;
            if (groupsMap[g]) {
                groupsMap[g].channels.forEach(item => {
                    if (checked) {
                        tempDisabled.delete(item.originalIndex);
                    } else {
                        tempDisabled.add(item.originalIndex);
                    }
                });
                renderChannelsList();
            }
        });
    });
    document.getElementById('modal-channel-search').addEventListener('input', renderChannelsList);

    document.getElementById('modal-select-all').addEventListener('change', (e) => {
        const checkAll = e.target.checked;
        currentFilteredChannels.forEach(item => {
            if (checkAll) tempDisabled.delete(item.originalIndex);
            else tempDisabled.add(item.originalIndex);
        });
        renderChannelsList();
    });

    document.getElementById('modal-cancel-btn').addEventListener('click', () => {
        modal.style.display = 'none';
        modal.innerHTML = '';
        if (isNew) {
            if (document.getElementById('import-submit-btn')) {
                document.getElementById('import-submit-btn').textContent = 'Import';
                document.getElementById('import-submit-btn').disabled = false;
            }
            if (document.getElementById('import-stalker-submit-btn')) {
                document.getElementById('import-stalker-submit-btn').textContent = 'Import';
                document.getElementById('import-stalker-submit-btn').disabled = false;
            }
        }
    });

    document.getElementById('modal-save-btn').addEventListener('click', async () => {
        modal.style.display = 'none';
        modal.innerHTML = '';

        showGlobalSpinner("Importing channels and VOD...");
        // Yield to allow UI spinner rendering
        await new Promise(resolve => setTimeout(resolve, 100));

        originalChannels.forEach((c, idx) => {
            c.disabled = tempDisabled.has(idx);
            delete c.isNew;
        });
        playlist.channels = originalChannels;
        const enabledChannels = originalChannels.filter(c => !c.disabled && c.type !== 'movie' && c.type !== 'series' && c.type !== 'movie_category' && c.type !== 'vod_category' && c.type !== 'series_category');
        const uniqueGroups = new Set(enabledChannels.map(c => c.group || 'Ungrouped'));
        const groupsCount = uniqueGroups.size;
        const channelsCount = enabledChannels.length;

        if (isNew) {
            if (playlist.editIndex >= 0) {
                savedPlaylists[playlist.editIndex] = playlist;
            } else {
                savedPlaylists.push(playlist);
            }
            markPlaylistsDirty();

            updateState(true);

            const isStalker = playlist.epg && playlist.epg.startsWith('stalker:');
            if (isStalker) {
                updateState();
            } else {
                let allEpgSources = savedEpgs.slice();
                if (playlist.epg && playlist.epg !== 'Not Configured' && !allEpgSources.includes(playlist.epg)) {
                    allEpgSources.push(playlist.epg);
                }

                if (!window.activeEpgParsing) window.activeEpgParsing = new Set();
                if (playlist.epg && playlist.epg !== 'Not Configured') {
                    window.activeEpgParsing.add(playlist.epg);
                }
                updateState(true);

                if (allEpgSources.length > 0) {
                    console.log('[API] Calling updateEpg after adding playlist.');
                    const combinedEpgs = allEpgSources.join(',');
                    await window.iptvAPI.updateEpg(combinedEpgs, null, true);
                    epgChannelsData = await window.iptvAPI.getEpgChannels(combinedEpgs);
                    await autoMapChannels(false, true);
                    // await loadEpgLogos(); removed
                    updateState();
                } else {
                    updateState();
                }

                if (playlist.epg && playlist.epg !== 'Not Configured') {
                    window.activeEpgParsing.delete(playlist.epg);
                }
                updateState();
            }

            editingPlaylistIndex = -1;
            const importCancelBtn = document.getElementById('import-cancel-btn');
            const importStalkerCancelBtn = document.getElementById('import-stalker-cancel-btn');
            if (importCancelBtn) importCancelBtn.style.display = 'none';
            if (importNameInput) importNameInput.value = '';
            if (importFilePath) importFilePath.value = '';
            if (importUrlPath) importUrlPath.value = '';
            if (importEpgInput) importEpgInput.value = '';
            if (importStalkerCancelBtn) importStalkerCancelBtn.style.display = 'none';
            if (importStalkerName) importStalkerName.value = '';
            if (importStalkerUrl) importStalkerUrl.value = '';
            if (importStalkerMac) importStalkerMac.value = '';

            if (document.getElementById('import-submit-btn')) {
                document.getElementById('import-submit-btn').textContent = 'Import';
                document.getElementById('import-submit-btn').disabled = false;
            }
            if (document.getElementById('import-stalker-submit-btn')) {
                document.getElementById('import-stalker-submit-btn').textContent = 'Import';
                document.getElementById('import-stalker-submit-btn').disabled = false;
            }

            hideGlobalSpinner();
            showToast(`Groups (${groupsCount}) and Channels (${channelsCount}) imported for playlist`);
            switchTab('playlist', document.getElementById('btn-playlist'));
        } else {
            markPlaylistsDirty();
            updateState();
            await autoMapChannels(false, true);
            hideGlobalSpinner();
            showToast("Playlist channels updated successfully.");
            switchTab('playlist', document.getElementById('btn-playlist'));
        }
    });

    renderChannelsList();
    modal.style.display = 'flex';
}

function renderPlaylists() {
    console.log('[UI] Rendering playlist cards.');
    const container = document.getElementById('playlist-cards');
    if (!container) return;
    container.innerHTML = '';

    if (clearBtn) {
        clearBtn.style.display = savedPlaylists.length > 0 ? 'block' : 'none';
    }

    savedPlaylists.forEach((playlist, index) => {
        if (!playlist.originalName) playlist.originalName = playlist.name;
        playlist.name = formatPlaylistName(playlist.originalName || playlist.name);

        const card = document.createElement('div');
        let epgInfo = '';
        let mappedChannels = 0;
        let totalPrograms = 0;
        if (playlist.channels) {
            playlist.channels.forEach(ch => {
                if (ch.type !== 'live') return;
                let isMapped = false;
                if (ch.title && channelMappings[ch.title]) {
                    isMapped = true;
                }
                if (ch.epg_programmes && ch.epg_programmes.length > 0) {
                    isMapped = true;
                    totalPrograms += ch.epg_programmes.length;
                }
                if (isMapped) mappedChannels++;
            });
        }
        if (totalPrograms > 0) {
            epgInfo = ` <span style="color: #43CB44; font-size: 0.9em;">(${mappedChannels} channels mapped, ${totalPrograms} programs)</span>`;
        } else if (mappedChannels > 0) {
            epgInfo = ` <span style="color: #43CB44; font-size: 0.9em;">(${mappedChannels} channels mapped)</span>`;
        } else if (window.activeEpgParsing && window.activeEpgParsing.has(playlist.epg)) {
            epgInfo = ` <span style="color: #bb86fc; font-size: 0.9em;">(Parsing EPG...)</span>`;
        } else if (playlist.epg && playlist.epg !== 'Not Configured') {
            const isEpgLoaded = epgChannelsData && epgChannelsData.some(e => e.source === playlist.epg);
            if (isEpgLoaded) {
                epgInfo = ` <span style="color: #bb86fc; font-size: 0.9em;">(0 channels mapped)</span>`;
            } else if (epgChannelsData) {
                epgInfo = ` <span style="color: #cf6679; font-size: 0.9em;">(EPG not loaded)</span>`;
            }
        }

        let totalChannels = 0;
        let enabledChannels = 0;
        let disabledChannels = 0;
        let groups = new Set();
        let enabledGroups = new Set();

        if (playlist.channels) {
            playlist.channels.forEach(ch => {
                if (ch.type !== 'live') return;
                totalChannels++;
                groups.add(ch.group || 'Uncategorized');
                if (ch.disabled) {
                    disabledChannels++;
                } else {
                    enabledChannels++;
                    enabledGroups.add(ch.group || 'Uncategorized');
                }
            });
        }

        let expInfo = '';
        if (playlist.exp_date) {
            const rawExp = String(playlist.exp_date).trim().toLowerCase();
            if (rawExp === 'never' || rawExp === 'unlimited' || rawExp === 'null' || rawExp === '0' || rawExp === '') {
                expInfo = `<span><strong>Expires:</strong> <span style="color: #43CB44; font-weight: bold;">Never</span></span>`;
            } else {
                let expStr = playlist.exp_date;
                if (/^\d{10}$/.test(expStr)) {
                    expStr = new Date(parseInt(expStr) * 1000).toLocaleDateString();
                } else if (/^\d{13}$/.test(expStr)) {
                    expStr = new Date(parseInt(expStr)).toLocaleDateString();
                } else {
                    const parsedDate = new Date(expStr);
                    if (!isNaN(parsedDate)) {
                        // Make sure we don't accidentally display 1970-01-01 or Unix epoch starting points as custom dates (often represents "Never")
                        if (parsedDate.getTime() <= 86400000) {
                            expStr = 'Never';
                        } else {
                            expStr = parsedDate.toLocaleDateString();
                        }
                    }
                }

                if (expStr.toLowerCase() === 'never') {
                    expInfo = `<span><strong>Expires:</strong> <span style="color: #43CB44; font-weight: bold;">Never</span></span>`;
                } else {
                    expInfo = `<span><strong>Expires:</strong> <span style="color: #FFD700; font-weight: bold;">${expStr}</span></span>`;
                }
            }
        }

        const isStalker = playlist.epg && playlist.epg.startsWith('stalker:');
        let statsHtml = '';

        if (isStalker) {
            const mac = playlist.epg.substring(8);
            statsHtml = `
                <span><strong>MAC:</strong> <span style="color: #bb86fc;">${mac}</span></span>
                <span><strong>Total Groups:</strong> ${groups.size}</span>
                <span><strong>Enabled Groups:</strong> <span style="color: #43CB44;">${enabledGroups.size}</span></span>
                <span><strong>Enabled Channels:</strong> <span style="color: #43CB44;">${enabledChannels}</span></span>
                ${expInfo}
            `;
        } else {
            statsHtml = `
                <span><strong>Total Channels:</strong> ${totalChannels}</span>
                <span><strong>Enabled:</strong> <span style="color: #43CB44;">${enabledChannels}</span></span>
                <span><strong>Disabled:</strong> <span style="color: #cf6679;">${disabledChannels}</span></span>
                <span><strong>Groups:</strong> ${groups.size}</span>
                ${expInfo}
            `;
        }

        card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <h3 style="margin: 0; color: ${playlist.disabled ? '#888' : '#e0e0e0'}; font-family: 'Outfit', 'Inter', sans-serif;">${playlist.name} ${playlist.disabled ? '<span style="color:#888; font-size: 0.8em;">(Disabled)</span>' : ''}</h3>
                <div style="display: flex; flex-direction: column; gap: 8px; align-items: flex-end;">
                    <div style="display: flex; gap: 10px;">
                        <button class="playlist-btn edit-btn" data-index="${index}">Edit</button>
                        <button class="playlist-btn manage-channels-btn" data-index="${index}">Manage Channels</button>
                        <button class="playlist-btn refresh-btn" data-index="${index}">Refresh</button>
                        <button class="playlist-btn delete delete-btn" data-index="${index}">Delete</button>
                    </div>
                    <div style="display: flex; gap: 10px;">
                        ${playlist.disabled
                ? `<button class="playlist-btn enable-btn" data-index="${index}" style="background: #43CB44; color: black; border: none; font-weight: bold;">Enable</button>`
                : `<button class="playlist-btn disable-btn" data-index="${index}">Disable</button>`
            }
                    </div>
                </div>
            </div>
            <div style="color: #888; font-size: 0.9em; word-break: break-all;"><strong>Location:</strong> ${playlist.source}</div>
            <div style="color: #aaa; font-size: 0.95em; margin-top: 5px;">
                <div style="margin-bottom: 5px; display: flex; flex-wrap: wrap; gap: 15px;">
                    ${statsHtml}
                </div>
                <div>
                    <span><strong>EPG:</strong> <span title="${playlist.epg || 'Not Configured'}">${getEpgName(playlist.epg)}</span>${epgInfo}</span>
                </div>
            </div>
        `;
        container.appendChild(card);
    });

    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = parseInt(e.target.getAttribute('data-index'), 10);
            console.log('[EVENT] Edit playlist button clicked for index:', idx);
            const playlist = savedPlaylists[idx];
            editingPlaylistIndex = idx;

            if (playlist.epg && playlist.epg.startsWith('stalker:')) {
                const stalkerTab = document.getElementById('tab-playlist-stalker');
                if (stalkerTab) stalkerTab.click();
                if (importStalkerName) importStalkerName.value = playlist.name;
                if (importStalkerUrl) importStalkerUrl.value = playlist.source;
                const mac = playlist.epg.substring(8);
                if (importStalkerMac) importStalkerMac.value = mac;

                if (importStalkerSubmitBtn) importStalkerSubmitBtn.textContent = 'Update';
                if (importStalkerCancelBtn) importStalkerCancelBtn.style.display = 'block';
            } else if (playlist.source.startsWith('http://') || playlist.source.startsWith('https://')) {
                const m3uTab = document.getElementById('tab-playlist-m3u');
                if (m3uTab) m3uTab.click();
                if (importNameInput) importNameInput.value = playlist.name;
                if (btnModeUrl) btnModeUrl.click();
                if (importUrlPath) importUrlPath.value = playlist.source;
                if (importFilePath) importFilePath.value = '';
                if (importEpgInput) {
                    importEpgInput.value = playlist.epg === 'Not Configured' ? '' : playlist.epg;
                }
                if (importSubmitBtn) importSubmitBtn.textContent = 'Update';
                if (importCancelBtn) importCancelBtn.style.display = 'block';
            } else {
                const m3uTab = document.getElementById('tab-playlist-m3u');
                if (m3uTab) m3uTab.click();
                if (importNameInput) importNameInput.value = playlist.name;
                if (btnModeFile) btnModeFile.click();
                if (importFilePath) importFilePath.value = playlist.source;
                if (importUrlPath) importUrlPath.value = '';
                if (importEpgInput) {
                    importEpgInput.value = playlist.epg === 'Not Configured' ? '' : playlist.epg;
                }
                if (importSubmitBtn) importSubmitBtn.textContent = 'Update';
                if (importCancelBtn) importCancelBtn.style.display = 'block';
            }

            const view = document.getElementById('playlist-view');
            if (view) view.scrollTo({ top: 0, behavior: 'smooth' });
        });
    });

    document.querySelectorAll('.manage-channels-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = parseInt(e.target.getAttribute('data-index'), 10);
            console.log('[EVENT] Manage channels button clicked for index:', idx);
            openManageChannelsModal(idx);
        });
    });

    document.querySelectorAll('.refresh-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const idx = parseInt(e.target.getAttribute('data-index'), 10);
            console.log('[EVENT] Refresh playlist button clicked for index:', idx);
            const targetPlaylist = savedPlaylists[idx];
            const source = targetPlaylist.source;
            const epgSource = targetPlaylist.epg !== 'Not Configured' ? targetPlaylist.epg : '';

            const isStalker = targetPlaylist.epg && targetPlaylist.epg.startsWith('stalker:');

            let allEpgSources = savedEpgs.slice();
            if (epgSource && !allEpgSources.includes(epgSource)) {
                allEpgSources.push(epgSource);
            }
            const combinedEpgs = allEpgSources.join(',');

            const originalText = e.target.textContent;
            e.target.textContent = 'Refreshing...';
            e.target.disabled = true;

            try {
                if (!isStalker) {
                    console.log('[API] Wiping cache before refresh for:', source);
                    if (window.iptvAPI.clearCache) await window.iptvAPI.clearCache(source);
                }

                let result;
                if (isStalker) {
                    console.log('[API] Calling parseStalker for refresh.');
                    result = await window.iptvAPI.parseStalker({ url: source, mac: targetPlaylist.epg.substring(8) });
                } else {
                    console.log('[API] Calling parseM3u for refresh.');
                    result = await window.iptvAPI.parseM3u(source, null, null, true);
                }

                if (result && !result.error && (Array.isArray(result) || result.channels)) {
                    let channels = Array.isArray(result) ? result : result.channels;

                    if (isStalker && targetPlaylist.channels) {
                        const existingLive = targetPlaylist.channels.filter(c =>
                            c.type !== 'itv_category' &&
                            c.type !== 'vod_category' &&
                            c.type !== 'movie_category' &&
                            c.type !== 'series_category'
                        );
                        channels = [...channels, ...existingLive];
                    }

                    const oldMap = new Map();
                    if (targetPlaylist.channels) {
                        targetPlaylist.channels.forEach(c => oldMap.set(c.title, c));
                    }
                    let newCount = 0;
                    channels.forEach(newCh => {
                        const old = oldMap.get(newCh.title);
                        if (old) {
                            newCh.disabled = old.disabled;
                            newCh.favourite = old.favourite;
                            if (old.isNew) newCh.isNew = true;
                        } else {
                            const isVod = newCh.type === 'movie' || newCh.type === 'series' || newCh.type === 'movie_category' || newCh.type === 'vod_category' || newCh.type === 'series_category';
                            newCh.disabled = isVod ? false : true;
                            if (!isVod) {
                                newCh.isNew = true;
                                newCount++;
                            }
                        }
                    });

                    if (newCount > 0) {
                        showToast(`Refresh complete: Found ${newCount} new channels.`);
                    } else {
                        showToast(`Refresh complete: No new channels found.`);
                    }

                    let finalEpgSource = targetPlaylist.epg;
                    if (!isStalker && result.epg_url && (!targetPlaylist.epg || targetPlaylist.epg === 'Not Configured')) {
                        finalEpgSource = result.epg_url;
                    }

                    const tempPlaylist = {
                        id: targetPlaylist.id,
                        source: targetPlaylist.source,
                        name: targetPlaylist.name,
                        channels: channels,
                        epg: finalEpgSource,
                        disabled: targetPlaylist.disabled,
                        editIndex: idx,
                        exp_date: result.exp_date || targetPlaylist.exp_date || null
                    };

                    if (newCount > 0) {
                        openManageChannelsModal(-1, tempPlaylist);
                    } else {
                        savedPlaylists[idx] = tempPlaylist;
                        markPlaylistsDirty();
                        updateState();
                    }
                } else {
                    showToast('Failed to refresh playlist: ' + (result ? result.error : 'Unknown error'));
                }
            } catch (err) {
                showToast('Refresh error: ' + err.message);
            }

            e.target.textContent = originalText;
            e.target.disabled = false;
        });
    });

    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = e.target.getAttribute('data-index');
            console.log('[EVENT] Delete playlist button clicked for index:', idx);
            const playlist = savedPlaylists[idx];
            if (!playlist) return;
            showConfirmToast(`Are you sure you want to delete the playlist "${playlist.name}"?`, async () => {
                if (playlist.source) window.iptvAPI.clearCache(playlist.source);
                await window.iptvAPI.deletePlaylist(playlist.id);
                savedPlaylists.splice(idx, 1);
                markPlaylistsDirty();
                updateState(true); // skip slow full-save since it's already deleted in the database
                showToast(`Playlist "${playlist.name}" deleted.`);
            });
        });
    });

    document.querySelectorAll('.enable-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = e.target.getAttribute('data-index');
            console.log('[EVENT] Enable playlist button clicked for index:', idx);
            savedPlaylists[idx].disabled = false;
            markPlaylistsDirty();
            updateState();
        });
    });

    document.querySelectorAll('.disable-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = e.target.getAttribute('data-index');
            console.log('[EVENT] Disable playlist button clicked for index:', idx);
            savedPlaylists[idx].disabled = true;
            markPlaylistsDirty();
            updateState();
        });
    });

    // Playlist side-menu click handlers (smooth scroll to card)
    const playlistView = document.getElementById('playlist-view');
    document.querySelectorAll('.playlist-menu-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-target');
            const targetEl = document.getElementById(targetId);
            if (targetEl && playlistView) {
                const containerRect = playlistView.getBoundingClientRect();
                const targetRect = targetEl.getBoundingClientRect();
                const relativeTop = targetRect.top - containerRect.top + playlistView.scrollTop;
                const targetScrollTop = Math.max(0, relativeTop - 30);
                playlistView.scrollTo({ top: targetScrollTop, behavior: 'smooth' });
            }
        });
    });

    // Scroll-spy: update active playlist menu button based on scroll position
    const updatePlaylistActiveMenuButton = () => {
        if (!playlistView || playlistView.style.display === 'none') return;
        const containerRect = playlistView.getBoundingClientRect();
        const cards = ['card-add-playlist', 'card-my-playlists'];
        let currentActive = 'card-add-playlist';
        for (const cardId of cards) {
            const el = document.getElementById(cardId);
            if (el) {
                const elRect = el.getBoundingClientRect();
                const triggerPoint = containerRect.top + 150;
                if (elRect.top <= triggerPoint) {
                    currentActive = cardId;
                }
            }
        }
        if (playlistView.scrollHeight - playlistView.scrollTop - playlistView.clientHeight < 10) {
            currentActive = 'card-my-playlists';
        }
        document.querySelectorAll('.playlist-menu-btn').forEach(btn => {
            if (btn.getAttribute('data-target') === currentActive) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    };

    if (playlistView) {
        playlistView.removeEventListener('scroll', window.updatePlaylistActiveMenu);
        window.updatePlaylistActiveMenu = updatePlaylistActiveMenuButton;
        playlistView.addEventListener('scroll', window.updatePlaylistActiveMenu);
        updatePlaylistActiveMenuButton();
    }
}

try {
    window.expandedGroups = new Set(JSON.parse(localStorage.getItem('iptv_expanded_groups') || '[]'));
} catch (e) {
    window.expandedGroups = new Set();
}













let channelVirtualList = null;



const filterElement = document.getElementById('playlist-filter');
if (filterElement) {
    console.log('[INIT] Attaching change listener to playlist filter.');
    filterElement.addEventListener('change', () => {
        localStorage.setItem('iptv_playlist_filter', filterElement.value);
        renderChannels();
        if (document.getElementById('epg-view') && document.getElementById('epg-view').style.display === 'flex') {
            renderFullEpg();
        }
        renderLiveEpgGrid();
    });
}

// Use Event Delegation to handle clicks for all channels efficiently
channelList.addEventListener('click', (e) => {
    console.log('[EVENT] Click detected on channel list.');

    const groupItem = e.target.closest('.group-item');
    if (groupItem) {
        const groupName = groupItem.getAttribute('data-group');
        if (window.expandedGroups.has(groupName)) {
            window.expandedGroups.delete(groupName);
        } else {
            window.expandedGroups.clear(); // Collapse all other groups
            window.expandedGroups.add(groupName);
        }
        localStorage.setItem('iptv_expanded_groups', JSON.stringify(Array.from(window.expandedGroups)));
        renderChannels();
        renderLiveEpgGrid();
        return;
    }

    const favBtn = e.target.closest('.fav-btn');
    if (favBtn) {
        const index = favBtn.getAttribute('data-fav-index');
        const channel = allChannels[index];
        if (channel) {
            const wasFocused = (document.activeElement === favBtn || favBtn.contains(document.activeElement));
            channel.favourite = !channel.favourite;
            updateState(); // Re-render lists and save state to background file
            if (wasFocused) {
                setTimeout(() => {
                    const newFavBtn = document.querySelector(`.fav-btn[data-fav-index="${index}"]`);
                    if (newFavBtn) {
                        newFavBtn.focus();
                    } else {
                        const firstChannel = document.querySelector('.channel-item');
                        if (firstChannel) firstChannel.focus();
                    }
                }, 10);
            }
        }
        return; // Stop event so video doesn't play
    }

    const item = e.target.closest('.channel-item');
    if (item) {
        const index = item.getAttribute('data-index');
        const channel = allChannels[index];
        if (channel) embedStream(channel, 'nearest');
    }
});

let sidebarScrollTimeout;
channelList.addEventListener('scroll', () => {
    clearTimeout(sidebarScrollTimeout);
    sidebarScrollTimeout = setTimeout(() => {
        if (window.initialScrollLoaded) {
            localStorage.setItem('iptv_sidebar_scroll', channelList.scrollTop);
        }
    }, 150);
});
if (clearBtn) {
    clearBtn.addEventListener('click', (e) => {
        e.preventDefault();
        console.log('[EVENT] Clear all playlists button clicked.');
        showConfirmToast("Are you sure you want to delete all playlists and cached data?", async () => {
            savedPlaylists.forEach(p => {
                if (p.source) window.iptvAPI.clearCache(p.source);
            });
            await window.iptvAPI.clearAllPlaylists();
            savedPlaylists = [];
            savedEpgs = [];
            channelMappings = {};
            markPlaylistsDirty();
            updateState(true); // skip slow full-save since database is already cleared
            switchTab('playlist', document.getElementById('btn-playlist'));
            showToast("All playlists and cached data deleted.");
        });
    });
}

// Listen for live hardware stats from MPV (Resolution display removed)
let allPlaybackProgress = [];










window.iptvAPI.onMpvFileLoaded(() => {
    console.log('[API RECV] onMpvFileLoaded');
    window.isFileLoaded = true;
    window.isSwitchingStream = false;
    settlePlayerBoundsAfterLayout();

    if (window.currentPlaybackChannel) {
        const isRecording = clientActiveRecordings.some(r => r.channelName === window.currentPlaybackChannel.title && r.status === 'recording');
        if (isRecording) {
            window.iptvAPI.sendMpvCommand(['script-message', 'update-recording-state', 'true']);
        } else {
            window.iptvAPI.sendMpvCommand(['script-message', 'update-recording-state', 'false']);
        }
    }

    if (window.pendingResumeSeekTime !== null && window.pendingResumeSeekTime !== undefined) {
        const seekTime = window.pendingResumeSeekTime;
        window.pendingResumeSeekTime = null; // Clear immediately
        console.log(`[STREAM] File loaded. Executing delayed seek to ${seekTime}`);
        window.iptvAPI.sendMpvCommand(`seek ${seekTime} absolute`);
    }
});

window.iptvAPI.onMpvPropChange((name, value) => {
    // console.log('[API RECV] onMpvPropChange', { name, value });

    if (name === 'duration' && value !== null) {
        window.currentPlaybackDuration = value;
    }

    if (name === 'playback-time') {
        if (!window.isFileLoaded) return; // Ignore stale values from previous streams

        const isFirstPlaybackFrame = !window.hasStartedPlayback;
        window.hasStartedPlayback = true;
        if (isFirstPlaybackFrame) {
            console.log('[BOUNDS] First playback frame received, settling bounds.');
            settlePlayerBoundsAfterLayout();
        }
        if (window.playbackTimeout) {
            clearTimeout(window.playbackTimeout);
            window.playbackTimeout = null;
        }

        if (value !== null) {
            window.currentPlaybackTime = value;

            if (window.pendingSeekPosition !== undefined && window.pendingSeekPosition !== null) {
                const targetSeek = window.pendingSeekPosition;
                window.pendingSeekPosition = null;
                console.log('[STREAM RESUME] Executing pending seek to:', targetSeek);
                window.iptvAPI.sendMpvCommand(['seek', targetSeek, 'absolute']);
            }

            // Throttle progress saves to once every 5 seconds
            const now = Date.now();
            if (!window.lastProgressSaveTime || (now - window.lastProgressSaveTime >= 5000)) {
                window.lastProgressSaveTime = now;
                saveCurrentPlaybackProgress();
            }

            // Check remaining time for autoplay trigger
            if (window.isAutoplayEnabled && window.currentPlaybackDuration > 0) {
                const remaining = window.currentPlaybackDuration - value;
                if (remaining <= 30 && remaining > 5) {
                    if (!window.isAutoplayBlockedForCurrentEpisode && !nextEpisodeToPlay && !autoplayInterval) {
                        const nextEp = findNextEpisode();
                        if (nextEp) {
                            console.log('[AUTOPLAY] Nearing end of episode. Next Episode:', nextEp);
                            showAutoplayOverlay(nextEp);
                        }
                    }
                } else {
                    // Hide overlay if user seeks backward
                    if (remaining > 30 && (autoplayInterval || nextEpisodeToPlay)) {
                        hideAutoplayOverlay();
                        nextEpisodeToPlay = null;
                    }
                }
            }
        }

        if (window.pendingEpgUpdate) {
            const encoded = encodeURIComponent(JSON.stringify(window.pendingEpgUpdate));
            window.iptvAPI.sendMpvCommand(`script-message update-epg ${encoded}`);
            setTimeout(() => window.iptvAPI.sendMpvCommand(`script-message update-epg ${encoded}`), 500);
            window.pendingEpgUpdate = null;
        }

        if (name === 'track-list') {
            window.currentMpvTrackList = value;
        }
        if (name === 'aid') {
            window.currentMpvAid = value;
        }
        if (name === 'sid') {
            window.currentMpvSid = value;
        }
    }
});



// Hook Stalker query / header fallback retries when MPV triggers unrecognized format error
window.iptvAPI.onStreamFailedRetry(async () => {
    if (!streamActive || !window.currentPlaybackChannel) return;

    window.playbackFallbackCount = (window.playbackFallbackCount || 0) + 1;
    let url = window.currentPlaybackFinalUrl || '';

    if (window.playbackFallbackCount > 3) {
        console.log('[MPV FALLBACK SYSTEM] Exceeded maximum fallback attempts (3). Halting stream.');
        // Show "not available" message for movie/episode/series types
        const ch = window.currentPlaybackChannel;
        const isVod = ch && (ch.type === 'movie' || ch.type === 'episode' || ch.type === 'series');
        if (isVod) {
            const playerOverlay = document.getElementById('player-overlay');
            if (playerOverlay) {
                playerOverlay.innerHTML = `
                    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; height: 100%;">
                        <img src="assets/logo.png" style="width: 128px; height: 128px; margin-bottom: 20px; border-radius: 15px; background: #2A2A2A;">
                        <span style="color: #cf6679; font-size: 1.2em; font-weight: bold;">Video not currently available</span>
                        <span style="color: #888; font-size: 0.9em; margin-top: 8px;">The portal could not deliver this stream.<br>Please try again later.</span>
                    </div>
                `;
            }
            streamActive = false;
            currentPlayingChannelIndex = -1;
            clearPlayingChannelIndicator();
            const fsBtn = document.getElementById('fullscreen-btn');
            if (fsBtn) fsBtn.style.display = 'none';
        }
        return;
    }

    console.log(`[MPV FALLBACK SYSTEM] Stream failed. Triggering recovery and fallback attempt #${window.playbackFallbackCount}`);

    // Rerun the resolver dynamically to get a fresh PlaybackSource if it's an Xtream Codes or Stalker stream
    let freshUrl = '';
    let freshHeaders = null;

    const channel = window.currentPlaybackChannel;
    const playlist = savedPlaylists.find(p => String(p.id) === String(channel.playlistId));

    if (channel.url.startsWith('xtream-stream:') && playlist && playlist.source.startsWith('xtream-credentials:')) {
        try {
            console.log('[MPV FALLBACK SYSTEM] Running dynamic Xtream Codes link re-resolver...');
            const parts = channel.url.substring(14).split('|');
            const type = parts[0];
            const streamId = parts[1];
            let extension = null;
            let directSourceUrl = null;

            if (type === 'live') {
                extension = null;
                if (parts[2]) directSourceUrl = decodeURIComponent(parts[2]);
            } else if (type === 'movie') {
                extension = parts[2] || null;
                if (parts[3]) directSourceUrl = decodeURIComponent(parts[3]);
            }

            const credParts = playlist.source.substring(19).split('|');
            const server = credParts[0];
            const username = credParts[1];
            const password = credParts[2];

            const resolvedSource = await window.iptvAPI.resolveXtreamLink({
                server,
                username,
                password,
                streamId,
                type,
                extension,
                directSourceUrl
            });

            if (resolvedSource && resolvedSource.url) {
                freshUrl = resolvedSource.url;
                freshHeaders = resolvedSource.headers || null;
                console.log('[MPV FALLBACK SYSTEM] Xtream Codes stream re-resolved successfully:', freshUrl);
            }
        } catch (err) {
            console.error('[MPV FALLBACK SYSTEM] Xtream Codes re-resolution failed:', err.message);
        }
    } else if (channel.url.startsWith('stalker-') || (playlist && playlist.epg && playlist.epg.startsWith('stalker:'))) {
        try {
            console.log('[MPV FALLBACK SYSTEM] Running dynamic Stalker link re-resolver...');
            let stalkerUrl = channel.url;
            if (playlist && playlist.epg && playlist.epg.startsWith('stalker:') && !stalkerUrl.startsWith('stalker-cmd:')) {
                stalkerUrl = `stalker-cmd:${channel.type === 'live' ? 'itv' : 'vod'}|${stalkerUrl}`;
            }

            if (stalkerUrl.startsWith('stalker-series-ep:')) {
                const parts = stalkerUrl.substring(18).split('|');
                const cmd = parts[0];
                const seriesNum = parts[1];
                const mac = playlist.epg.substring(8);
                freshUrl = await window.iptvAPI.resolveStalkerLink({ url: playlist.source, mac, type: 'vod', cmd, series: seriesNum });
            } else if (stalkerUrl.startsWith('stalker-cmd:')) {
                const parts = stalkerUrl.substring(12).split('|');
                const type = parts[0];
                const cmd = parts.slice(1).join('|');
                const mac = playlist.epg.substring(8);
                freshUrl = await window.iptvAPI.resolveStalkerLink({ url: playlist.source, mac, type, cmd });
            }
            if (freshUrl) {
                console.log('[MPV FALLBACK SYSTEM] Stalker stream re-resolved successfully:', freshUrl);
            }
        } catch (err) {
            console.error('[MPV FALLBACK SYSTEM] Stalker re-resolution failed:', err.message);
        }
    }

    if (freshUrl) {
        url = freshUrl;
        window.currentPlaybackFinalUrl = freshUrl;
        if (freshHeaders) {
            window.currentPlaybackHeaders = freshHeaders;
        }
    }

    // Strategy 1: If there is a play_token parameter in URL, strip it out or alter query formats
    if (window.playbackFallbackCount === 1) {
        if (url.includes('play_token=')) {
            url = url.replace(/([?&])play_token=[^&]+/i, '$1').replace(/[?&]&/g, '?').replace(/\?$/g, '');
            console.log('[MPV FALLBACK SYSTEM] Strategy 1: Stripped play_token from Stalker URL:', url);
        } else if (url.includes('&')) {
            // Strip all extra URL query parameters
            url = url.split('&')[0];
            console.log('[MPV FALLBACK SYSTEM] Strategy 1: Stripped extra query parameters:', url);
        } else {
            // Alter extension / append dummy parameter
            url = url + (url.includes('?') ? '&' : '?') + 'forced_auth=true';
            console.log('[MPV FALLBACK SYSTEM] Strategy 1: Append force_auth flag:', url);
        }
    }

    // Strategy 2: Strip standard transport extension (e.g. remove .mkv, .mp4, .ts, etc if portal is strict)
    if (window.playbackFallbackCount === 2) {
        if (url.includes('.mkv')) {
            url = url.replace('.mkv', '');
            console.log('[MPV FALLBACK SYSTEM] Strategy 2: Stripping .mkv extension:', url);
        } else if (url.includes('.ts')) {
            url = url.replace('.ts', '');
            console.log('[MPV FALLBACK SYSTEM] Strategy 2: Stripping .ts extension:', url);
        } else if (url.includes('.mp4')) {
            url = url.replace('.mp4', '');
            console.log('[MPV FALLBACK SYSTEM] Strategy 2: Stripping .mp4 extension:', url);
        } else {
            // Strip all queries entirely
            url = url.split('?')[0];
            console.log('[MPV FALLBACK SYSTEM] Strategy 2: Stripping all URL queries:', url);
        }
    }

    // Strategy 3: Attempt playing raw feed without Bearer authorization or with stripped MAC parameters
    if (window.playbackFallbackCount === 3) {
        if (url.includes('mac=')) {
            url = url.replace(/([?&])mac=[^&]+/i, '$1').replace(/[?&]&/g, '?').replace(/\?$/g, '');
            console.log('[MPV FALLBACK SYSTEM] Strategy 3: Stripping mac parameter from URL string:', url);
        } else {
            // Add custom Stalker direct command headers fallback parameter
            url = url + (url.includes('?') ? '&' : '?') + 'mag=mag250';
            console.log('[MPV FALLBACK SYSTEM] Strategy 3: Appended dummy MAG device tag parameter:', url);
        }
    }

    if (window.playbackTimeout) {
        clearTimeout(window.playbackTimeout);
        window.playbackTimeout = null;
    }

    const rect = playerContainer.getBoundingClientRect();
    window.iptvAPI.playMpvEmbedded({
        url: url,
        title: window.currentPlaybackChannel.title,
        headers: window.currentPlaybackHeaders || null,
        bounds: {
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
            scale: window.devicePixelRatio || 1
        }
    });

    settlePlayerBoundsAfterLayout();

    window.playbackTimeout = setTimeout(() => {
        if (!window.hasStartedPlayback && streamActive) {
            console.warn('[STREAM TIMEOUT] Fallback timeout.');
            window.isSwitchingStream = false;
        }
    }, 30000);
});

window.iptvAPI.onMpvExit((code) => {
    console.log('[API RECV] onMpvExit with code:', code);
    hideAutoplayOverlay();
    window.isSwitchingStream = false;

    if (window.playbackTimeout) {
        clearTimeout(window.playbackTimeout);
        window.playbackTimeout = null;
    }

    // Save current playback progress before cleanup
    saveCurrentPlaybackProgress();

    if (streamActive) {
        streamActive = false;
        currentPlayingChannelIndex = -1;
        clearPlayingChannelIndicator();

        const playerOverlay = document.getElementById('player-overlay');
        if (playerOverlay) {
            playerOverlay.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; height: 100%;">
                    <img src="assets/logo.png" style="width: 128px; height: 128px; margin-bottom: 20px; border-radius: 15px; background: #2A2A2A;">
                    <span style="color: #cf6679; font-size: 1.2em; font-weight: bold;">Channel currently not available</span>
                </div>
            `;
        }

        const fsBtn = document.getElementById('fullscreen-btn');
        if (fsBtn) fsBtn.style.display = 'none';
    }
});

window.iptvAPI.onMpvRestorePlayback(async () => {
    console.log('[RESTORE] Main process requested playback restore.');
    if (window.currentPlaybackChannel) {
        console.log('[RESTORE] Resuming last channel/video:', window.currentPlaybackChannel.title);
        try {
            const progId = getPlaybackProgressId(window.currentPlaybackChannel);
            if (progId) {
                const saved = await window.iptvAPI.getPlaybackProgress(progId);
                if (saved && saved.position) {
                    window.pendingSeekPosition = saved.position;
                    console.log('[RESTORE] Restoring progress position:', saved.position);
                }
            }
        } catch (e) {
            console.error('[RESTORE ERROR] Failed to fetch playback progress:', e);
        }
        embedStream(window.currentPlaybackChannel);
    }
});

window.iptvAPI.onMpvStopped(() => {
    console.log('[API RECV] onMpvStopped');
    hideAutoplayOverlay();

    if (window.isSwitchingStream) {
        console.log('[API RECV] Ignoring onMpvStopped because we are switching streams.');
        return;
    }

    if (streamActive && !window.hasStartedPlayback) {
        console.log('[API RECV] Ignoring onMpvStopped because a new stream is currently loading.');
        return;
    }

    if (window.playbackTimeout) {
        clearTimeout(window.playbackTimeout);
        window.playbackTimeout = null;
    }

    // Save current playback progress before cleanup
    saveCurrentPlaybackProgress();

    if (streamActive) {
        streamActive = false;
        currentPlayingChannelIndex = -1;
        clearPlayingChannelIndicator();

        const playerOverlay = document.getElementById('player-overlay');
        if (playerOverlay) {
            playerOverlay.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; height: 100%;">
                    <img src="assets/logo.png" style="width: 128px; height: 128px; margin-bottom: 20px; border-radius: 15px; background: #2A2A2A;">
                    <span style="color: #a1a1aa; font-size: 1.2em; font-weight: bold;">Playback Stopped</span>
                </div>
            `;
        }

        const fsBtn = document.getElementById('fullscreen-btn');
        if (fsBtn) fsBtn.style.display = 'none';
    }

    // Switch back to origin VOD details view if stopped from a movie or series
    if (window.activeDetailsStreamInfo) {
        const streamInfo = window.activeDetailsStreamInfo;
        const originTab = streamInfo.type === 'series' ? 'vod' : 'movies';
        const tabBtnId = originTab === 'series' || originTab === 'vod' ? 'btn-vod' : 'btn-movies';
        const tabBtn = document.getElementById(tabBtnId);

        if (tabBtn) {
            switchTab(originTab, tabBtn);
            // Re-open the movie details modal!
            setTimeout(() => {
                openMovieDetailsModal(streamInfo);
            }, 100);
        }
        window.activeDetailsStreamInfo = null;
    } else {
        // Switch to live TV view when stopped
        const btnLiveTv = document.getElementById('btn-live-tv');
        if (btnLiveTv) {
            switchTab('live-tv', btnLiveTv);
        }
    }
});

window.iptvAPI.onRemotePlayChannel(({ url, title, position, type, tmdbId, season, episodeNum }) => {
    console.log('[REMOTE] Received play request for:', { url, title, position, type, tmdbId });
    let targetChannel = allChannels.find(c => c.url === url && c.title === title);
    if (!targetChannel) {
        targetChannel = {
            url,
            title,
            type: type || 'movie',
            playlistId: 'all',
            tmdbId: tmdbId || null,
            season: season || null,
            episodeNum: episodeNum || null
        };
    }

    switchTab('live-tv', document.getElementById('btn-live-tv'));
    window.currentPlaybackChannel = targetChannel;

    embedStream(targetChannel);
    showToast(`Playing ${targetChannel.title}`);

    if (position && parseFloat(position) > 0) {
        window.pendingSeekPosition = parseFloat(position);
    }

});



// ── Debounced MPV bounds settling ────────────────────────────────────────────
// Replaces the old scatter-fire pattern (5 setTimeout × 2 rAF = 15 IPC calls)
// with a 2-shot approach: one immediate pass + one debounced final settle.
// This eliminates ~13 redundant IPC bridge crossings on every transition.
let _boundsSettleImmediate = null;
let _boundsSettleFinal     = null;


// Use ResizeObserver to track exact pixel coordinates perfectly.
// Debounce via rAF to coalesce rapid resize events into a single IPC call.
let _resizeRaf = null;
const resizeObserver = new ResizeObserver(() => {
    if (_resizeRaf) cancelAnimationFrame(_resizeRaf);
    _resizeRaf = requestAnimationFrame(() => {
        requestAnimationFrame(triggerBoundsUpdate);
        _resizeRaf = null;
    });
});
resizeObserver.observe(playerContainer);

// Forward mouse events directly to the embedded MPV Lua script (scaled by Device Pixel Ratio for High-DPI alignments)
let lastMouseMove = 0;
playerContainer.addEventListener('mousemove', (e) => {
    const now = Date.now();
    if (now - lastMouseMove > 30) {
        lastMouseMove = now;
        const rect = playerContainer.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        const x = Math.round((e.clientX - rect.left) * dpr);
        const y = Math.round((e.clientY - rect.top) * dpr);
        window.iptvAPI.sendMpvCommand(`script-message-to aivue electron-mouse-move ${x} ${y}`);
    }
});

playerContainer.addEventListener('mouseleave', () => {
    console.log('[EVENT] playerContainer mouseleave');
    window.iptvAPI.sendMpvCommand(`script-message-to aivue electron-mouse-leave`);
});

let lastClickTime = 0;
playerContainer.addEventListener('mousedown', (e) => {
    console.log('[EVENT] playerContainer mousedown, button:', e.button);
    const now = Date.now();
    if (now - lastClickTime < 400) {
        window.iptvAPI.toggleFullscreen();
        lastClickTime = 0; // Reset
        return; // Prevent passing the second click of the double-click to MPV
    } else {
        lastClickTime = now;
    }
    const btn = e.button === 0 ? 'mbtn_left' : (e.button === 2 ? 'mbtn_right' : 'mbtn_mid');
    window.iptvAPI.sendMpvCommand(`script-message-to aivue electron-mouse-click ${btn} down`);
});

playerContainer.addEventListener('mouseup', (e) => {
    console.log('[EVENT] playerContainer mouseup, button:', e.button);
    const btn = e.button === 0 ? 'mbtn_left' : (e.button === 2 ? 'mbtn_right' : 'mbtn_mid');
    window.iptvAPI.sendMpvCommand(`script-message-to aivue electron-mouse-click ${btn} up`);
});

playerContainer.addEventListener('wheel', (e) => {
    console.log('[EVENT] playerContainer wheel, deltaY:', e.deltaY);
    const btn = e.deltaY < 0 ? 'wheel_up' : 'wheel_down';
    window.iptvAPI.sendMpvCommand(`script-message-to aivue electron-mouse-click ${btn} press`);
});

// Wire up the Exit button to gracefully tear down the app
document.getElementById('btn-exit').addEventListener('click', () => {
    console.log('[EVENT] Exit button clicked.');
    window.iptvAPI.exitApp();
});

// Setup Tab Navigation Logic
const navButtons = document.querySelectorAll('.nav-btn');
const sidebar = document.getElementById('sidebar');
const mainView = document.getElementById('main-view');

let currentTabId = 'playlist';
let previousTabId = 'playlist';
let currentMoviePlaylistId = null;
let currentMovieCategory = null;
let movieGridScrollTop = 0; // saved scroll position for the movies category list
let currentVodPlaylistId = null;
let currentVodCategory = null;
let vodGridScrollTop = 0;   // saved scroll position for the vod category list

function switchTab(tabId, clickedBtn) {
    console.log('[UI] Switching tab to:', tabId);

    // Close any open overlay modals when navigating away
    const detailsModal = document.getElementById('premium-details-modal');
    if (detailsModal) detailsModal.style.display = 'none';
    const episodesModal = document.getElementById('episodes-modal');
    if (episodesModal) episodesModal.style.display = 'none';

    if (tabId === 'live-tv' && !streamActive) {
        window.activeDetailsStreamInfo = null;
    }

    // Reset Movies and VOD category selection on tab entry to open into the initial folder load views
    if (tabId === 'movies') {
        currentMoviePlaylistId = null;
        currentMovieCategory = null;
    }
    if (tabId === 'vod') {
        currentVodPlaylistId = null;
        currentVodCategory = null;
    }

    if (currentTabId !== tabId) {
        previousTabId = currentTabId;
        currentTabId = tabId;
    }
    // Update active styling
    navButtons.forEach(btn => btn.classList.remove('active'));
    if (clickedBtn) clickedBtn.classList.add('active');

    // Toggle visibility for "Live TV" / "Playlist" views
    const isLive = tabId === 'live-tv';
    const isPlaylist = tabId === 'playlist';
    const isEpg = tabId === 'epg';
    const isSettings = tabId === 'settings';
    const isMovies = tabId === 'movies';
    const isVod = tabId === 'vod';
    const isRecordingTab = tabId === 'recording';

    if (sidebar) sidebar.style.setProperty('display', isLive ? 'flex' : 'none', 'important');
    if (mainView) mainView.style.setProperty('display', isLive ? 'flex' : 'none', 'important');

    if (isLive) {
        setTimeout(() => {
            renderLiveEpgGrid();
            // renderChannels() has its own render guard — calling it here is always
            // safe; it will be a no-op if the list hasn't changed since last render.
            renderChannels();
            settlePlayerBoundsAfterLayout();
        }, 50);
    }

    const playlistView = document.getElementById('playlist-view');
    if (playlistView) playlistView.style.setProperty('display', isPlaylist ? 'flex' : 'none', 'important');

    const epgView = document.getElementById('epg-view');
    if (epgView) epgView.style.setProperty('display', isEpg ? 'flex' : 'none', 'important');

    if (isEpg) renderFullEpg();

    const settingsView = document.getElementById('settings-view');
    if (settingsView) settingsView.style.setProperty('display', isSettings ? 'flex' : 'none', 'important');

    if (isSettings) renderSettings();

    const moviesView = document.getElementById('movies-view');
    if (moviesView) moviesView.style.setProperty('display', isMovies ? 'flex' : 'none', 'important');
    if (isMovies) renderMovies();

    const vodView = document.getElementById('vod-view');
    if (vodView) vodView.style.setProperty('display', isVod ? 'flex' : 'none', 'important');
    if (isVod) renderVod();

    const recordingView = document.getElementById('recording-view');
    if (recordingView) recordingView.style.setProperty('display', isRecordingTab ? 'flex' : 'none', 'important');
    if (isRecordingTab) renderRecordings();

    // Explicitly hide or restore the video player bounds instantly when switching views
    if (isLive && streamActive && playerContainer) {
        const rect = playerContainer.getBoundingClientRect();
        window.iptvAPI.updateMpvBounds({
            x: Math.ceil(rect.x),
            y: Math.round(rect.y),
            width: Math.round(rect.width),
            height: Math.round(rect.height)
        });
    } else {
        window.iptvAPI.updateMpvBounds({ x: 0, y: 0, width: 0, height: 0 });
    }

    setTimeout(() => {
        const targetBtn = clickedBtn || document.getElementById('btn-' + tabId);
        if (targetBtn) {
            targetBtn.focus();
        } else {
            const focusables = getFocusableElements();
            if (focusables.length > 0) {
                focusables[0].focus();
            }
        }
    }, 100);
}

document.getElementById('btn-live-tv').addEventListener('click', function () { if (!this.disabled) switchTab('live-tv', this); });
document.getElementById('btn-playlist').addEventListener('click', function () { switchTab('playlist', this); });
document.getElementById('btn-epg').addEventListener('click', function () { if (!this.disabled) switchTab('epg', this); });
document.getElementById('btn-settings').addEventListener('click', function () { if (!this.disabled) switchTab('settings', this); });
document.getElementById('btn-movies').addEventListener('click', function () { if (!this.disabled) switchTab('movies', this); });
document.getElementById('btn-vod').addEventListener('click', function () { if (!this.disabled) switchTab('vod', this); });
document.getElementById('btn-recording').addEventListener('click', function () { switchTab('recording', this); });

let laneObserver = null;
let loadedMovieLanes = {};
let loadedVodLanes = {};

function applyAppTheme(themeName) {
    console.log('[Theme] Applying theme:', themeName);
    const themeClasses = ['theme-teal', 'theme-green', 'theme-black'];
    themeClasses.forEach(cls => document.body.classList.remove(cls));
    if (themeName !== 'default' && themeName !== 'purple') {
        document.body.classList.add(`theme-${themeName}`);
    }
    // Re-inject dynamic premium styles to ensure any var replacements resolve correctly
    injectPremiumStyles();
}

function injectPremiumStyles() {
    if (document.getElementById('premium-catalog-styles')) {
        document.getElementById('premium-catalog-styles').remove();
    }
    const style = document.createElement('style');
    style.id = 'premium-catalog-styles';
    let cssText = `
        /* Premium Global Purple to Black Seamless Background Gradient */
        body {
            background: linear-gradient(180deg, #3c096c 0%, #240046 35%, #10002b 70%, #03001e 100%) !important;
            background-attachment: fixed !important;
        }
        
        #top-header {
            background: rgba(12, 5, 20, 0.65) !important;
            backdrop-filter: blur(30px) !important;
            -webkit-backdrop-filter: blur(30px) !important;
            border-bottom: 1.5px solid rgba(187, 134, 252, 0.25) !important;
            border-bottom-left-radius: 20px !important;
            border-bottom-right-radius: 20px !important;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.65), 0 4px 20px rgba(187, 134, 252, 0.08) !important;
        }

        #movies-view, #vod-view, #playlist-view, #recording-view, #epg-view, #settings-view, #main-view {
            background: transparent !important;
            border: none !important;
        }
        
        #movies-view, #vod-view {
            padding: 40px 32px 32px 56px !important;
            box-sizing: border-box !important;
        }

        #live-bottom-half {
            background: rgba(10, 10, 15, 0.4) !important;
            backdrop-filter: blur(10px) !important;
            border-color: rgba(255,255,255,0.06) !important;
        }

        #movies-view::-webkit-scrollbar, #vod-view::-webkit-scrollbar, #episodes-modal *::-webkit-scrollbar, #premium-details-modal::-webkit-scrollbar {
            width: 12px !important;
            height: 12px !important;
        }
        #movies-view::-webkit-scrollbar-track, #vod-view::-webkit-scrollbar-track, #episodes-modal *::-webkit-scrollbar-track, #premium-details-modal::-webkit-scrollbar-track {
            background: #121212 !important;
            border-left: 1px solid rgba(255, 255, 255, 0.05) !important;
            border-top: 1px solid rgba(255, 255, 255, 0.05) !important;
        }
        #movies-view::-webkit-scrollbar-thumb, #vod-view::-webkit-scrollbar-thumb, #episodes-modal *::-webkit-scrollbar-thumb, #premium-details-modal::-webkit-scrollbar-thumb {
            background: #5c5c66 !important;
            border-radius: 6px !important;
            border: 3px solid #121212 !important;
        }
        #movies-view::-webkit-scrollbar-thumb:hover, #vod-view::-webkit-scrollbar-thumb:hover, #episodes-modal *::-webkit-scrollbar-thumb:hover, #premium-details-modal::-webkit-scrollbar-thumb:hover {
            background: #bb86fc !important;
        }

        /* Movie and Series Grid Cards (Premium Glass) */
        .catalog-folder-card {
            background: rgba(20, 16, 28, 0.5) !important;
            border: 1px solid rgba(187, 134, 252, 0.15) !important;
            border-radius: 16px !important;
            padding: 24px !important;
            cursor: pointer !important;
            backdrop-filter: blur(24px) !important;
            -webkit-backdrop-filter: blur(24px) !important;
            box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3) !important;
            transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1) !important;
            display: flex;
            flex-direction: column !important;
            align-items: center !important;
            justify-content: center !important;
            text-align: center !important;
            gap: 15px !important;
            aspect-ratio: 1 !important;
            box-sizing: border-box !important;
            font-family: 'Inter', sans-serif !important;
        }
        .catalog-folder-card:hover {
            transform: translateY(-6px) scale(1.03) !important;
            border-color: rgba(187, 134, 252, 0.45) !important;
            background: rgba(30, 20, 45, 0.25) !important;
            box-shadow: 0 16px 36px rgba(187, 134, 252, 0.15), 0 8px 24px rgba(0,0,0,0.5) !important;
        }
        .catalog-folder-icon {
            font-size: 3.2em !important;
            color: #bb86fc !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            filter: drop-shadow(0 4px 10px rgba(187, 134, 252, 0.3)) !important;
        }
        .catalog-folder-title {
            font-weight: 600 !important;
            font-size: 0.92rem !important;
            color: #ffffff !important;
            display: -webkit-box !important;
            -webkit-line-clamp: 2 !important;
            -webkit-box-orient: vertical !important;
            overflow: hidden !important;
            margin: 0 !important;
            line-height: 1.35 !important;
            letter-spacing: -0.01em !important;
            font-family: 'Inter', sans-serif !important;
        }
        .catalog-folder-count {
            font-size: 0.72rem !important;
            color: #a1a1aa !important;
            font-weight: 500 !important;
            font-family: 'Inter', sans-serif !important;
        }
        
        .catalog-card {
            background: rgba(20, 16, 28, 0.5) !important;
            border: 1px solid rgba(187, 134, 252, 0.1) !important;
            border-radius: 16px !important;
            overflow: hidden !important;
            cursor: pointer !important;
            backdrop-filter: blur(24px) !important;
            -webkit-backdrop-filter: blur(24px) !important;
            box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3) !important;
            transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1) !important;
            position: relative !important;
            display: flex;
            flex-direction: column !important;
            box-sizing: border-box !important;
            font-family: 'Inter', sans-serif !important;
        }
        .catalog-card:hover {
            transform: translateY(-6px) scale(1.03) !important;
            border-color: rgba(187, 134, 252, 0.45) !important;
            box-shadow: 0 16px 36px rgba(187, 134, 252, 0.15), 0 8px 24px rgba(0,0,0,0.5) !important;
            z-index: 2 !important;
        }
        .catalog-poster-wrapper {
            position: relative !important;
            width: 100% !important;
            padding-top: 150% !important;
            background: #09090b !important;
            overflow: hidden !important;
        }
        .catalog-poster {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: 100% !important;
            object-fit: cover !important;
            transition: opacity 0.3s ease !important;
        }
        .catalog-rating-badge {
            position: absolute !important;
            top: 8px !important;
            right: 8px !important;
            background: rgba(10, 10, 12, 0.85) !important;
            backdrop-filter: blur(8px) !important;
            -webkit-backdrop-filter: blur(8px) !important;
            border: 1px solid rgba(255, 193, 7, 0.35) !important;
            color: #ffc107 !important;
            font-weight: 700 !important;
            font-size: 0.72em !important;
            padding: 3px 7px !important;
            border-radius: 6px !important;
            z-index: 3 !important;
            display: flex !important;
            align-items: center !important;
            gap: 3px !important;
            box-shadow: 0 4px 10px rgba(0,0,0,0.5) !important;
        }
        .catalog-info {
            padding: 12px !important;
            display: flex !important;
            flex-direction: column !important;
            gap: 4px !important;
            background: rgba(15, 15, 20, 0.8) !important;
            border-top: 1px solid rgba(255,255,255,0.03) !important;
            flex-grow: 1 !important;
        }
        .catalog-title {
            margin: 0 !important;
            font-size: 0.85em !important;
            font-weight: 600 !important;
            color: #ffffff !important;
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            letter-spacing: -0.01em !important;
            font-family: 'Inter', sans-serif !important;
        }
        .catalog-meta {
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
            font-size: 0.72em !important;
            color: #a1a1aa !important;
            font-family: 'Inter', sans-serif !important;
        }
        .catalog-badge {
            background: rgba(187, 134, 252, 0.12) !important;
            color: var(--primary-accent) !important;
            padding: 2px 6px !important;
            border-radius: 4px !important;
            font-size: 0.8em !important;
            font-weight: 600 !important;
            border: 1px solid rgba(187, 134, 252, 0.2) !important;
        }

        /* Episodes Modal Screen (Frosted Glass Overlay Window) */
        #episodes-modal {
            position: fixed !important;
            top: 82px !important;
            left: 12px !important;
            width: calc(100vw - 24px) !important;
            height: calc(100vh - 94px) !important;
            background: rgba(10, 10, 12, 0.5) !important;
            backdrop-filter: blur(36px) !important;
            -webkit-backdrop-filter: blur(36px) !important;
            border: 1px solid rgba(255, 255, 255, 0.06) !important;
            border-radius: 16px !important;
            box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6) !important;
            z-index: 1000 !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
            display: flex;
        }
        #episodes-modal > div {
            background: transparent !important;
        }
        #episodes-modal div[style*="padding: 20px 25px"] {
            background: rgba(15, 15, 20, 0.4) !important;
            border-bottom: 1px solid rgba(255, 255, 255, 0.06) !important;
        }
        #seasons-sidebar-frame, #episodes-main-frame {
            background: rgba(255, 255, 255, 0.02) !important;
            border: 1px solid rgba(255, 255, 255, 0.04) !important;
            border-radius: 12px !important;
            box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.2) !important;
        }
        #seasons-sidebar-frame div[style*="background: rgba(0,0,0,0.2)"],
        #episodes-main-frame div[style*="background: rgba(0,0,0,0.2)"] {
            background: rgba(0, 0, 0, 0.15) !important;
            border-bottom: 1px solid rgba(255, 255, 255, 0.04) !important;
        }
        .season-tab {
            background: rgba(255, 255, 255, 0.02) !important;
            border: 1px solid rgba(255, 255, 255, 0.04) !important;
            color: #a1a1aa !important;
            border-radius: 8px !important;
            padding: 10px 14px !important;
            font-family: 'Inter', sans-serif !important;
            font-size: 0.85em !important;
            font-weight: 500 !important;
            transition: all 0.2s ease !important;
            text-align: left !important;
            cursor: pointer !important;
            outline: none !important;
        }
        .season-tab:hover {
            background: rgba(255, 255, 255, 0.06) !important;
            color: #ffffff !important;
            transform: translateX(3px) !important;
        }
        .season-tab.active {
            background: rgba(187, 134, 252, 0.12) !important;
            border-color: rgba(187, 134, 252, 0.25) !important;
            color: var(--primary-accent) !important;
            box-shadow: 0 4px 12px rgba(187, 134, 252, 0.15) !important;
            font-weight: 600 !important;
        }
        .episode-card {
            background: rgba(255, 255, 255, 0.02) !important;
            border: 1px solid rgba(255, 255, 255, 0.04) !important;
            border-radius: 10px !important;
            padding: 12px 16px !important;
            display: flex !important;
            align-items: center !important;
            gap: 12px !important;
            cursor: pointer !important;
            transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important;
            box-sizing: border-box !important;
            outline: none !important;
        }
        .episode-card:hover {
            background: rgba(255, 255, 255, 0.06) !important;
            border-color: rgba(187, 134, 252, 0.25) !important;
            transform: translateY(-2px) !important;
            box-shadow: 0 6px 16px rgba(0, 0, 0, 0.3) !important;
        }
        .episode-num {
            font-size: 1.1em !important;
            font-weight: 700 !important;
            color: var(--primary-accent) !important;
            min-width: 24px !important;
        }
        .episode-name {
            font-size: 0.85em !important;
            font-weight: 500 !important;
            color: #e4e4e7 !important;
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
        }

        /* Netflix-style Details Modal Screen (Frosted Glass Overlay Window) */
        #premium-details-modal {
            position: fixed !important;
            top: 82px !important;
            left: 12px !important;
            width: calc(100vw - 24px) !important;
            height: calc(100vh - 94px) !important;
            background: rgba(10, 10, 12, 0.5) !important;
            backdrop-filter: blur(36px) !important;
            -webkit-backdrop-filter: blur(36px) !important;
            border: 1px solid rgba(255, 255, 255, 0.06) !important;
            border-radius: 16px !important;
            box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6) !important;
            z-index: 1001 !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
            display: flex;
        }
        #premium-details-modal > div {
            background: transparent !important;
            scrollbar-width: none !important;
        }
        #premium-details-modal > div::-webkit-scrollbar {
            display: none !important;
        }
        #premium-details-modal div[style*="background: #181818"] {
            background: rgba(15, 15, 20, 0.4) !important;
        }
        #details-backdrop-banner div[style*="background: linear-gradient(to top, #181818"] {
            background: linear-gradient(to top, #0c0c0e 0%, rgba(12, 12, 14, 0.8) 40%, rgba(12, 12, 14, 0) 100%) !important;
        }
        #details-title {
            font-size: 2.2rem !important;
            font-family: 'Outfit', 'Inter', sans-serif !important;
            font-weight: 800 !important;
            color: #ffffff !important;
            text-shadow: 0 2px 12px rgba(0,0,0,0.8) !important;
        }
        #details-overview {
            font-size: 0.92rem !important;
            color: #a1a1aa !important;
            line-height: 1.6 !important;
        }
        #premium-details-modal div[style*="background: rgba(255,255,255,0.02)"] {
            background: rgba(255, 255, 255, 0.02) !important;
            border: 1px solid rgba(255, 255, 255, 0.04) !important;
            border-radius: 12px !important;
            padding: 20px !important;
        }
        #details-season-select {
            background: rgba(255, 255, 255, 0.03) !important;
            color: #ffffff !important;
            border: 1px solid rgba(255, 255, 255, 0.06) !important;
            padding: 6px 14px !important;
            border-radius: 8px !important;
            outline: none !important;
            cursor: pointer !important;
            font-family: 'Inter', sans-serif !important;
            font-size: 0.85em !important;
            transition: all 0.25s ease !important;
        }
        #details-season-select:hover {
            background: rgba(255, 255, 255, 0.06) !important;
            border-color: rgba(255, 255, 255, 0.12) !important;
        }
        #details-season-select:focus {
            border-color: var(--primary-accent) !important;
            box-shadow: 0 0 10px rgba(187, 134, 252, 0.15) !important;
        }
        
        .details-episode-card {
            background: rgba(255, 255, 255, 0.02) !important;
            border: 1px solid rgba(255, 255, 255, 0.04) !important;
            border-radius: 12px !important;
            overflow: hidden !important;
            cursor: pointer !important;
            transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important;
            display: flex !important;
            flex-direction: column !important;
            box-sizing: border-box !important;
        }
        .details-episode-card:hover {
            transform: translateY(-4px) !important;
            border-color: rgba(187, 134, 252, 0.25) !important;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4) !important;
        }
        .details-episode-thumbnail-wrapper {
            position: relative !important;
            width: 100% !important;
            padding-top: 56.25% !important;
            background: rgba(0, 0, 0, 0.3) !important;
            overflow: hidden !important;
            border-bottom: 1px solid rgba(255, 255, 255, 0.04) !important;
        }
        .details-episode-thumbnail {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: 100% !important;
            object-fit: cover !important;
        }
        .details-episode-play-overlay {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: 100% !important;
            background: rgba(0, 0, 0, 0.4) !important;
            opacity: 0 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            transition: all 0.25s ease !important;
        }
        .details-episode-card:hover .details-episode-play-overlay {
            opacity: 1 !important;
        }
        .details-episode-play-icon {
            background: var(--primary-accent) !important;
            color: #000000 !important;
            border-radius: 50% !important;
            width: 42px !important;
            height: 42px !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            box-shadow: 0 4px 12px rgba(187, 134, 252, 0.4) !important;
            transform: scale(0.9) !important;
            transition: all 0.25s ease !important;
        }
        .details-episode-card:hover .details-episode-play-icon {
            transform: scale(1) !important;
        }
        .details-episode-info {
            padding: 12px !important;
            display: flex !important;
            flex-direction: column !important;
            gap: 6px !important;
        }
        .details-episode-title-row {
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
            gap: 10px !important;
        }
        .details-episode-title {
            margin: 0 !important;
            font-size: 0.85rem !important;
            font-weight: 600 !important;
            color: #ffffff !important;
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            flex-grow: 1 !important;
        }
        .details-episode-num-badge {
            background: rgba(187, 134, 252, 0.12) !important;
            color: var(--primary-accent) !important;
            padding: 1px 5px !important;
            border-radius: 4px !important;
            font-size: 0.72em !important;
            font-weight: 600 !important;
            border: 1px solid rgba(187, 134, 252, 0.2) !important;
        }
        .details-episode-overview {
            margin: 0 !important;
            font-size: 0.75rem !important;
            color: #a1a1aa !important;
            line-height: 1.45 !important;
            display: -webkit-box !important;
            -webkit-line-clamp: 3 !important;
            -webkit-box-orient: vertical !important;
            overflow: hidden !important;
        }

        /* High-contrast floating close & back buttons inside dynamic catalog elements */
        #premium-details-close, #episodes-modal-close, .category-back-btn {
            background: rgba(10, 10, 12, 0.85) !important;
            border: 1px solid var(--primary-accent) !important;
            color: #ffffff !important;
            box-shadow: 0 4px 14px rgba(187, 134, 252, 0.2) !important;
            font-family: 'Inter', sans-serif !important;
            font-weight: 600 !important;
            border-radius: 8px !important;
            transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important;
        }
        #premium-details-close:hover, #episodes-modal-close:hover, .category-back-btn:hover {
            background: linear-gradient(135deg, #bb86fc, #905cfc) !important;
            color: #000000 !important;
            border-color: #ffffff !important;
            box-shadow: 0 6px 20px rgba(187, 134, 252, 0.45) !important;
            transform: scale(1.04) !important;
        }

        .catalog-progress-bar-wrapper {
            position: absolute !important;
            bottom: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: 4px !important;
            background: rgba(255, 255, 255, 0.2) !important;
            z-index: 4 !important;
        }
        .catalog-progress-bar {
            height: 100% !important;
            background: #bb86fc !important;
            width: 0% !important;
        }
        .catalog-watched-badge {
            position: absolute !important;
            top: 8px !important;
            left: 8px !important;
            background: rgba(46, 125, 50, 0.95) !important;
            backdrop-filter: blur(8px) !important;
            -webkit-backdrop-filter: blur(8px) !important;
            border: 1px solid rgba(76, 175, 80, 0.5) !important;
            color: #fff !important;
            font-weight: bold !important;
            font-size: 0.72em !important;
            padding: 3px 6px !important;
            border-radius: 6px !important;
            z-index: 3 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            box-shadow: 0 4px 10px rgba(0,0,0,0.5) !important;
        }

        /* Playback Settings Premium Toggle Switch */
        .autoplay-toggle-container input:checked + .slider {
            background-color: #bb86fc !important;
        }
        .autoplay-toggle-container .slider:before {
            position: absolute;
            content: "";
            height: 16px;
            width: 16px;
            left: 4px;
            bottom: 4px;
            background-color: white;
            transition: .3s;
            border-radius: 50%;
        }
        .autoplay-toggle-container input:checked + .slider:before {
            transform: translateX(22px);
        }

        /* Playlist Tab Styles */
        .playlist-tab-btn {
            font-family: 'Inter', sans-serif !important;
            transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important;
        }
        .playlist-tab-btn:hover {
            color: #ffffff !important;
            background: rgba(255, 255, 255, 0.05) !important;
        }
        .playlist-tab-btn.active {
            color: #ffffff !important;
            background: rgba(187, 134, 252, 0.15) !important;
            border: 1px solid rgba(187, 134, 252, 0.3) !important;
            box-shadow: 0 4px 12px rgba(187, 134, 252, 0.15) !important;
        }

        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        @keyframes scaleUp {
            from { transform: scale(0.92); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
        }
    `;
    cssText = cssText.replace(/#bb86fc/g, 'var(--primary-accent)');
    cssText = cssText.replace(/187,\s*134,\s*252/g, 'var(--primary-accent-rgb)');
    cssText = cssText.replace(/linear-gradient\(180deg,\s*#3c096c[^)]*\)/gi, 'var(--bg-gradient)');
    style.innerHTML = cssText;
    document.head.appendChild(style);
}

async function getEpisodesForSeries(streamInfo) {
    try {
        if (!streamInfo) return [];
        const playlistId = streamInfo.playlistId;
        if (!playlistId && savedPlaylists.length === 0) return [];
        const playlist = savedPlaylists.find(p => p.id.toString() === (playlistId ? playlistId.toString() : '')) || savedPlaylists[0];
        if (!playlist) return [];

        let episodes = [];

        if (playlist.epg && playlist.epg.startsWith('stalker:')) {
            const url = playlist.source;
            const mac = playlist.epg.substring(8);
            const seriesId = streamInfo.tvg_id || streamInfo.id;
            episodes = await window.iptvAPI.getStalkerEpisodes({ url, mac, seriesId });
        } else if (playlist.epg && playlist.epg.startsWith('xtream-epg:')) {
            if (playlist.source && playlist.source.startsWith('xtream-credentials:')) {
                const credParts = playlist.source.substring(19).split('|');
                const server = credParts[0];
                const username = credParts[1];
                const password = credParts[2];
                const seriesId = streamInfo.tvg_id || streamInfo.id;
                episodes = await window.iptvAPI.getXtreamEpisodes({ server, username, password, seriesId });
            }
        } else {
            const parsedClicked = parseM3uSeriesName(streamInfo.seriesTitle || streamInfo.title || streamInfo.name || '');
            if (playlist.channels) {
                playlist.channels.forEach(item => {
                    if (item.disabled) return;
                    if (item.type === 'series' || item.type === 'vod') {
                        const parsedItem = parseM3uSeriesName(item.name || item.title);
                        if (parsedItem.seriesTitle.toLowerCase() === parsedClicked.seriesTitle.toLowerCase()) {
                            episodes.push({
                                id: item.id || item.tvg_id || item.tvgId,
                                name: item.name || item.title,
                                season: parsedItem.season,
                                episodeNum: parsedItem.episode,
                                url: item.url,
                                logo: item.logo || streamInfo.logo
                            });
                        }
                    }
                });
            }
        }

        // Sort episodes by season then episode number
        episodes.sort((a, b) => {
            const aS = parseInt(a.season || 1);
            const bS = parseInt(b.season || 1);
            if (aS !== bS) return aS - bS;
            return parseInt(a.episodeNum || 1) - parseInt(b.episodeNum || 1);
        });

        return episodes;
    } catch (e) {
        console.error('[AUTOPLAY] Error fetching series episodes:', e);
        return [];
    }
}


let autoplayCountdown = 15;











function parseM3uSeriesName(title) {
    let name = (title || '').trim();

    // Pattern 1: S01E02 or similar
    let match = name.match(/^(.*?)\s*[-_.]?\s*s(\d+)\s*[-_.]?\s*e(\d+)/i);
    if (match) {
        return {
            seriesTitle: match[1].replace(/[-_.\s]+$/, '').trim(),
            season: parseInt(match[2]),
            episode: parseInt(match[3])
        };
    }

    // Pattern 2: Season 1 Episode 2
    match = name.match(/^(.*?)\s+season\s+(\d+)\s+episode\s+(\d+)/i);
    if (match) {
        return {
            seriesTitle: match[1].trim(),
            season: parseInt(match[2]),
            episode: parseInt(match[3])
        };
    }

    // Pattern 3: Ep 1 or Episode 1
    match = name.match(/^(.*?)\s+(?:ep|episode)\s*(\d+)/i);
    if (match) {
        return {
            seriesTitle: match[1].trim(),
            season: 1, // Fallback to season 1
            episode: parseInt(match[2])
        };
    }

    // Pattern 4: 1x02 (season 1, episode 2)
    match = name.match(/^(.*?)\s+(\d+)x(\d+)/i);
    if (match) {
        return {
            seriesTitle: match[1].trim(),
            season: parseInt(match[2]),
            episode: parseInt(match[3])
        };
    }

    // Pattern 5: Ending with S01 or Season 1
    match = name.match(/^(.*?)\s*[-_.]?\s*s(\d+)$/i);
    if (match) {
        return {
            seriesTitle: match[1].replace(/[-_.\s]+$/, '').trim(),
            season: parseInt(match[2]),
            episode: 1
        };
    }

    return {
        seriesTitle: name,
        season: 1,
        episode: 1
    };
}

async function openMovieDetailsModal(streamInfo) {
    const modal = document.getElementById('premium-details-modal');
    if (!modal) return;

    window.activeDetailsStreamInfo = streamInfo;

    document.getElementById('details-title').textContent = streamInfo.title;
    document.getElementById('details-rating').textContent = '★ --';
    document.getElementById('details-year').textContent = '----';
    document.getElementById('details-duration').textContent = '--';
    document.getElementById('details-type-badge').textContent = streamInfo.type === 'series' ? 'Series' : 'Movie';
    document.getElementById('details-overview').textContent = 'Scraping details...';
    document.getElementById('details-genres').textContent = '-';
    document.getElementById('details-crew').textContent = '-';
    document.getElementById('details-cast').textContent = '-';

    const bannerUrl = streamInfo.logo || 'assets/logo.ico';
    document.getElementById('details-backdrop-banner').style.backgroundImage = `linear-gradient(to top, #181818, rgba(24, 24, 24, 0.7) 40%, rgba(24, 24, 24, 0) 80%), url(${bannerUrl})`;

    const playBtn = document.getElementById('details-play-btn');
    const resumeBtn = document.getElementById('details-resume-btn');
    const episodesSection = document.getElementById('details-episodes-section');

    episodesSection.style.display = 'none';
    playBtn.style.display = 'flex';
    if (resumeBtn) resumeBtn.style.display = 'none';

    playBtn.replaceWith(playBtn.cloneNode(true));
    if (resumeBtn) resumeBtn.replaceWith(resumeBtn.cloneNode(true));
    const newPlayBtn = document.getElementById('details-play-btn');
    const newResumeBtn = document.getElementById('details-resume-btn');

    let savedProgress = null;
    const progId = getPlaybackProgressId(streamInfo);

    newPlayBtn.addEventListener('click', async () => {
        modal.style.display = 'none';
        switchTab('live-tv', document.getElementById('btn-live-tv'));
        embedStream(streamInfo);
    });

    if (newResumeBtn) {
        newResumeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
            switchTab('live-tv', document.getElementById('btn-live-tv'));
            if (savedProgress) {
                window.pendingResumeSeekTime = savedProgress.position;
            }
            embedStream(streamInfo);
        });
    }

    if (progId && streamInfo.type !== 'series') {
        window.iptvAPI.getPlaybackProgress(progId).then(saved => {
            if (saved && saved.position > 0 && !saved.completed) {
                savedProgress = saved;
                if (newResumeBtn) newResumeBtn.style.display = 'flex';
            }
        });
    }

    modal.style.display = 'flex';

    let tmdbData = null;
    if (streamInfo.tmdbData) {
        tmdbData = streamInfo.tmdbData;
    } else {
        const type = streamInfo.type === 'series' ? 'tv' : 'movie';
        let res;
        if (streamInfo.tmdbId) {
            res = await window.iptvAPI.fetchTmdbById({ tmdbId: streamInfo.tmdbId, type });
        } else {
            res = await window.iptvAPI.fetchTmdbByTitle({ title: streamInfo.title, type });
        }
        if (res && !res.error) {
            tmdbData = res;
        }
    }

    if (tmdbData) {
        if (tmdbData.logo_path) {
            document.getElementById('details-title').innerHTML = `<img src="${tmdbData.logo_path}" alt="${(tmdbData.title || streamInfo.title).replace(/"/g, '&quot;')}" style="max-height: 120px; max-width: 100%; object-fit: contain; filter: drop-shadow(0 4px 15px rgba(0,0,0,0.8));">`;
        } else if (tmdbData.title) {
            document.getElementById('details-title').textContent = tmdbData.title;
        }

        if (tmdbData.backdrop_path) {
            document.getElementById('details-backdrop-banner').style.backgroundImage = `linear-gradient(to top, #181818, rgba(24, 24, 24, 0.7) 40%, rgba(24, 24, 24, 0) 80%), url(${tmdbData.backdrop_path})`;
        }

        if (tmdbData.vote_average) {
            document.getElementById('details-rating').textContent = `★ ${parseFloat(tmdbData.vote_average).toFixed(1)}`;
        }

        const releaseDate = tmdbData.release_date || tmdbData.first_air_date;
        if (releaseDate) {
            document.getElementById('details-year').textContent = new Date(releaseDate).getFullYear();
        }

        if (tmdbData.runtime) {
            document.getElementById('details-duration').textContent = `${tmdbData.runtime}m`;
        } else if (tmdbData.episode_run_time && tmdbData.episode_run_time.length > 0) {
            document.getElementById('details-duration').textContent = `${tmdbData.episode_run_time[0]}m`;
        }

        document.getElementById('details-overview').textContent = tmdbData.overview || 'No synopsis available.';

        if (tmdbData.genres && tmdbData.genres.length > 0) {
            document.getElementById('details-genres').textContent = tmdbData.genres.map(g => g.name).join(', ');
        }

        if (tmdbData.credits) {
            const crew = tmdbData.credits.crew || [];
            const directors = crew.filter(c => c.job === 'Director').map(c => c.name);
            if (directors.length > 0) {
                document.getElementById('details-crew').textContent = directors.join(', ');
            } else {
                const creators = tmdbData.created_by || [];
                if (creators.length > 0) {
                    document.getElementById('details-crew').textContent = creators.map(c => c.name).join(', ');
                }
            }

            const cast = tmdbData.credits.cast || [];
            if (cast.length > 0) {
                document.getElementById('details-cast').textContent = cast.slice(0, 5).map(c => c.name).join(', ');
            }
        }
    } else {
        document.getElementById('details-overview').textContent = 'No detailed information found on TMDB.';
    }

    if (streamInfo.type === 'series') {
        episodesSection.style.display = 'block';

        const epGrid = document.getElementById('details-episodes-grid');
        const seasonSelect = document.getElementById('details-season-select');

        epGrid.innerHTML = getWinSpinnerHtml('Loading episodes...');
        seasonSelect.innerHTML = '';

        // Re-clone play button to support series-specific first episode playback
        const seriesPlayBtn = document.getElementById('details-play-btn');
        seriesPlayBtn.replaceWith(seriesPlayBtn.cloneNode(true));
        const finalPlayBtn = document.getElementById('details-play-btn');

        try {
            const playlist = savedPlaylists.find(p => p.id.toString() === streamInfo.playlistId.toString());
            let episodes = [];

            if (playlist && playlist.epg && playlist.epg.startsWith('stalker:')) {
                const url = playlist.source;
                const mac = playlist.epg.substring(8);
                const seriesId = streamInfo.tvg_id;

                episodes = await window.iptvAPI.getStalkerEpisodes({ url, mac, seriesId });
            } else {
                // Group related flat M3U series channels
                const parsedClicked = parseM3uSeriesName(streamInfo.title);
                if (playlist && playlist.channels) {
                    playlist.channels.forEach(item => {
                        if (item.disabled) return;
                        if (item.type === 'series' || item.type === 'vod') {
                            const parsedItem = parseM3uSeriesName(item.name || item.title);
                            if (parsedItem.seriesTitle.toLowerCase() === parsedClicked.seriesTitle.toLowerCase()) {
                                episodes.push({
                                    id: item.id || item.tvg_id || item.tvgId,
                                    name: item.name || item.title,
                                    season: parsedItem.season,
                                    episodeNum: parsedItem.episode,
                                    url: item.url,
                                    logo: item.logo || streamInfo.logo
                                });
                            }
                        }
                    });
                }

                // Fallback: clicked item itself is the only episode
                if (episodes.length === 0) {
                    episodes.push({
                        id: streamInfo.tvg_id || streamInfo.id,
                        name: streamInfo.title,
                        season: 1,
                        episodeNum: 1,
                        url: streamInfo.url,
                        logo: streamInfo.logo
                    });
                }
            }

            if (!episodes || episodes.length === 0) {
                epGrid.innerHTML = '<div style="color: #888; padding: 20px;">No episodes found.</div>';

                // Default click to play the whole series details entry
                finalPlayBtn.addEventListener('click', async () => {
                    modal.style.display = 'none';
                    switchTab('live-tv', document.getElementById('btn-live-tv'));

                    const progId = getPlaybackProgressId(streamInfo);
                    if (progId) {
                        const saved = await window.iptvAPI.getPlaybackProgress(progId);
                        if (saved && saved.position > 0 && !saved.completed) {
                            showResumePromptModal(saved.position, (resume) => {
                                if (resume) {
                                    window.pendingResumeSeekTime = saved.position;
                                }
                                embedStream(streamInfo);
                            });
                            return;
                        }
                    }
                    embedStream(streamInfo);
                });
                return;
            }

            const seasons = {};
            episodes.forEach(ep => {
                const sNum = ep.season || 1;
                if (!seasons[sNum]) seasons[sNum] = [];
                seasons[sNum].push(ep);
            });

            Object.keys(seasons).forEach(sNum => {
                seasons[sNum].sort((a, b) => parseInt(a.episodeNum || 0) - parseInt(b.episodeNum || 0));
            });

            const sortedSeasons = Object.keys(seasons).sort((a, b) => parseInt(a) - parseInt(b));

            // Reconfigure Play Button to play the first episode of the first season
            const firstSeason = sortedSeasons[0];
            const firstEp = seasons[firstSeason] ? seasons[firstSeason][0] : null;
            if (firstEp) {
                let firstEpDisplayName = firstEp.name || `Episode ${firstEp.episodeNum}`;
                if (firstEp.name && playlist && !playlist.epg?.startsWith('stalker:')) {
                    const cleanPrefix = new RegExp(`^.*?\\b(s\\d+e\\d+|\\d+x\\d+|episode\\s*\\d+|ep\\s*\\d+)\\b\\s*[-_.:]?\\s*`, 'i');
                    const cleaned = firstEp.name.replace(cleanPrefix, '').trim();
                    if (cleaned) firstEpDisplayName = cleaned;
                }
                finalPlayBtn.addEventListener('click', async () => {
                    modal.style.display = 'none';
                    switchTab('live-tv', document.getElementById('btn-live-tv'));

                    const episodeChannel = {
                        title: `${streamInfo.title} - S${firstSeason}E${firstEp.episodeNum} - ${firstEpDisplayName}`,
                        url: firstEp.url,
                        logo: streamInfo.logo,
                        playlistId: streamInfo.playlistId,
                        type: 'episode',
                        tmdbId: streamInfo.tmdbId,
                        seriesTitle: streamInfo.title,
                        season: firstSeason,
                        episodeNum: firstEp.episodeNum,
                        tmdbData: tmdbData
                    };

                    const progId = getPlaybackProgressId(episodeChannel);
                    if (progId) {
                        const saved = await window.iptvAPI.getPlaybackProgress(progId);
                        if (saved && saved.position > 0 && !saved.completed) {
                            showResumePromptModal(saved.position, (resume) => {
                                if (resume) {
                                    window.pendingResumeSeekTime = saved.position;
                                }
                                embedStream(episodeChannel);
                            });
                            return;
                        }
                    }
                    embedStream(episodeChannel);
                });
            } else {
                finalPlayBtn.addEventListener('click', async () => {
                    modal.style.display = 'none';
                    switchTab('live-tv', document.getElementById('btn-live-tv'));

                    const progId = getPlaybackProgressId(streamInfo);
                    if (progId) {
                        const saved = await window.iptvAPI.getPlaybackProgress(progId);
                        if (saved && saved.position > 0 && !saved.completed) {
                            showResumePromptModal(saved.position, (resume) => {
                                if (resume) {
                                    window.pendingResumeSeekTime = saved.position;
                                }
                                embedStream(streamInfo);
                            });
                            return;
                        }
                    }
                    embedStream(streamInfo);
                });
            }

            const renderSeason = async (seasonNum) => {
                epGrid.innerHTML = '';
                const eps = seasons[seasonNum] || [];
                const cardsMap = {};

                eps.forEach(ep => {
                    const card = document.createElement('div');
                    card.className = 'details-episode-card';
                    card.style.flex = '1 1 calc(33.33% - 10px)';
                    card.style.minWidth = '220px';

                    let epDisplayName = ep.name || `Episode ${ep.episodeNum}`;
                    if (ep.name && playlist && !playlist.epg?.startsWith('stalker:')) {
                        const cleanPrefix = new RegExp(`^.*?\\b(s\\d+e\\d+|\\d+x\\d+|episode\\s*\\d+|ep\\s*\\d+)\\b\\s*[-_.:]?\\s*`, 'i');
                        const cleaned = ep.name.replace(cleanPrefix, '').trim();
                        if (cleaned) epDisplayName = cleaned;
                    }

                    card.innerHTML = `
                        <div class="details-episode-thumbnail-wrapper">
                            <div style="position: absolute; top:0; left:0; width:100%; height:100%; display:flex; align-items:center; justify-content:center; background: rgba(255,255,255,0.03); color: #bb86fc; font-size: 1.8em; font-weight: bold; font-family: 'Outfit', sans-serif;">
                                E${ep.episodeNum}
                            </div>
                            <img class="details-episode-thumbnail" src="" style="display: none;" onerror="this.style.display='none';">
                            <div class="details-episode-play-overlay">
                                <div class="details-episode-play-icon">
                                    <svg viewBox="0 0 24 24" style="width: 24px; height: 24px; fill: currentColor;"><path d="M8 5v14l11-7z"/></svg>
                                </div>
                            </div>
                        </div>
                        <div class="details-episode-info">
                            <div class="details-episode-title-row">
                                <h4 class="details-episode-title" title="${epDisplayName}">${epDisplayName}</h4>
                                <span class="details-episode-num-badge">E${ep.episodeNum}</span>
                            </div>
                            <p class="details-episode-overview">Episode details loading...</p>
                        </div>
                    `;

                    card.addEventListener('click', async () => {
                        modal.style.display = 'none';
                        switchTab('live-tv', document.getElementById('btn-live-tv'));

                        const episodeChannel = {
                            title: `${streamInfo.title} - S${seasonNum}E${ep.episodeNum} - ${epDisplayName}`,
                            url: ep.url,
                            logo: streamInfo.logo,
                            playlistId: streamInfo.playlistId,
                            type: 'episode',
                            tmdbId: streamInfo.tmdbId,
                            seriesTitle: streamInfo.title,
                            season: seasonNum,
                            episodeNum: ep.episodeNum,
                            tmdbData: tmdbData
                        };

                        const progId = getPlaybackProgressId(episodeChannel);
                        if (progId) {
                            const saved = await window.iptvAPI.getPlaybackProgress(progId);
                            if (saved && saved.position > 0 && !saved.completed) {
                                showResumePromptModal(saved.position, (resume) => {
                                    if (resume) {
                                        window.pendingResumeSeekTime = saved.position;
                                    }
                                    embedStream(episodeChannel);
                                });
                                return;
                            }
                        }
                        embedStream(episodeChannel);
                    });

                    epGrid.appendChild(card);
                    cardsMap[ep.episodeNum] = card;
                });

                // Asynchronously request TMDB season details
                if (tmdbData && tmdbData.tmdbId) {
                    try {
                        console.log(`[UI] Requesting TMDB metadata for TV ID: ${tmdbData.tmdbId}, Season: ${seasonNum}`);
                        const tmdbSeason = await window.iptvAPI.fetchTmdbSeasonEpisodes({
                            tmdbId: tmdbData.tmdbId,
                            seasonNumber: seasonNum
                        });

                        if (tmdbSeason && tmdbSeason.episodes && !tmdbSeason.error) {
                            tmdbSeason.episodes.forEach(tmdbEp => {
                                const card = cardsMap[tmdbEp.episode_number];
                                if (card) {
                                    if (tmdbEp.name) {
                                        card.querySelector('.details-episode-title').textContent = tmdbEp.name;
                                        card.querySelector('.details-episode-title').setAttribute('title', tmdbEp.name);
                                    }
                                    if (tmdbEp.overview) {
                                        card.querySelector('.details-episode-overview').textContent = tmdbEp.overview;
                                    } else {
                                        card.querySelector('.details-episode-overview').textContent = 'No description available.';
                                    }
                                    if (tmdbEp.still_path) {
                                        const img = card.querySelector('.details-episode-thumbnail');
                                        img.src = tmdbEp.still_path;
                                        img.style.display = 'block';
                                    }
                                }
                            });

                            eps.forEach(ep => {
                                const card = cardsMap[ep.episodeNum];
                                if (card) {
                                    const overview = card.querySelector('.details-episode-overview');
                                    if (overview && overview.textContent === 'Episode details loading...') {
                                        overview.textContent = 'No description available.';
                                    }
                                }
                            });
                        } else {
                            eps.forEach(ep => {
                                const card = cardsMap[ep.episodeNum];
                                if (card) {
                                    const overview = card.querySelector('.details-episode-overview');
                                    if (overview) overview.textContent = 'No description available.';
                                }
                            });
                        }
                    } catch (tmdbErr) {
                        console.error('[UI TMDB EPISODES LOAD ERR]', tmdbErr);
                        eps.forEach(ep => {
                            const card = cardsMap[ep.episodeNum];
                            if (card) {
                                const overview = card.querySelector('.details-episode-overview');
                                if (overview) overview.textContent = 'No description available.';
                            }
                        });
                    }
                } else {
                    eps.forEach(ep => {
                        const card = cardsMap[ep.episodeNum];
                        if (card) {
                            const overview = card.querySelector('.details-episode-overview');
                            if (overview) overview.textContent = 'No description available.';
                        }
                    });
                }
            };

            seasonSelect.innerHTML = '';
            sortedSeasons.forEach(sNum => {
                const opt = document.createElement('option');
                opt.value = sNum;
                opt.textContent = `Season ${sNum}`;
                seasonSelect.appendChild(opt);
            });

            seasonSelect.replaceWith(seasonSelect.cloneNode(true));
            const newSeasonSelect = document.getElementById('details-season-select');
            newSeasonSelect.addEventListener('change', (e) => {
                renderSeason(e.target.value);
            });

            if (sortedSeasons.length > 0) {
                renderSeason(sortedSeasons[0]);
            }
        } catch (e) {
            console.error('[DETAILS EPISODES ERR]', e);
            epGrid.innerHTML = '<div style="color: #cf6679; padding: 20px;">Failed to load episodes list.</div>';
        }
    }
}

function initDetailsModalEvents() {
    if (window.detailsModalEventsInitialized) return;
    window.detailsModalEventsInitialized = true;

    const closeBtn = document.getElementById('premium-details-close');
    const modal = document.getElementById('premium-details-modal');
    if (closeBtn && modal) {
        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    }
}

async function renderMovies() {
    console.log('[CATALOG] Rendering Movies Catalog');
    injectPremiumStyles();
    initTmdbObserver();

    const grid = document.getElementById('movies-grid');
    const empty = document.getElementById('movies-empty');
    if (!grid) return;
    grid.innerHTML = '';

    const headerContainer = document.getElementById('movies-header-container');
    if (headerContainer) headerContainer.remove();

    let hasMovies = false;
    let playlistsWithMovies = [];
    savedPlaylists.forEach(p => {
        if (p.channels && !p.disabled) {
            let count = 0;
            p.channels.forEach(c => {
                if (c.disabled) return;
                if (c.type === 'movie_category' || c.type === 'movie') {
                    count++;
                }
            });
            if (count > 0) {
                playlistsWithMovies.push(p);
                hasMovies = true;
            }
        }
    });

    if (!hasMovies) {
        if (empty) empty.style.display = 'block';
        return;
    }
    if (empty) empty.style.display = 'none';

    const renderFolder = (title, count, onClick) => {
        const card = document.createElement('div');
        card.className = 'catalog-folder-card';
        card.innerHTML = `
            <div class="catalog-folder-icon">
                <svg viewBox="0 0 24 24" width="56" height="56" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
            </div>
            <div class="catalog-folder-title" title="${title.replace(/"/g, '&quot;')}">${title}</div>
            ${count !== null ? `<div class="catalog-folder-count">${count} Items</div>` : ''}
        `;
        card.addEventListener('click', onClick);
        grid.appendChild(card);
    };

    if (!currentMoviePlaylistId) {
        const backContainer = document.getElementById('movies-back-btn-container');
        if (backContainer) backContainer.style.display = 'none';
        const titleHeader = document.getElementById('movies-title-header');
        if (titleHeader) titleHeader.textContent = 'Movies';

        grid.style.display = 'grid';
        grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(180px, 1fr))';
        grid.style.gap = '20px';
        grid.style.padding = '20px';

        playlistsWithMovies.forEach(p => {
            renderFolder(p.name, null, () => {
                movieGridScrollTop = document.getElementById('movies-view')?.scrollTop || 0;
                currentMoviePlaylistId = p.id;
                renderMovies();
                const moviesView = document.getElementById('movies-view');
                if (moviesView) moviesView.scrollTop = 0;
            });
        });

        const searchInput = document.getElementById('movies-search');
        if (searchInput) {
            searchInput.replaceWith(searchInput.cloneNode(true));
            const newSearchInput = document.getElementById('movies-search');
            newSearchInput.value = '';
            newSearchInput.addEventListener('keyup', (e) => {
                const query = e.target.value.toLowerCase().trim();
                const cards = grid.querySelectorAll('.catalog-folder-card');
                cards.forEach(card => {
                    const title = card.querySelector('.catalog-folder-title').textContent.toLowerCase();
                    if (title.includes(query)) {
                        card.style.display = 'flex';
                    } else {
                        card.style.display = 'none';
                    }
                });
            });
        }
        return;
    }

    const selectedPlaylist = savedPlaylists.find(p => p.id === currentMoviePlaylistId);
    if (!selectedPlaylist) {
        currentMoviePlaylistId = null;
        renderMovies();
        return;
    }

    let stalkerCategories = [];
    let m3uGroups = {};

    selectedPlaylist.channels.forEach(c => {
        if (c.disabled) return;
        if (c.type === 'movie_category') {
            c.playlistId = selectedPlaylist.id;
            stalkerCategories.push(c);
        } else if (c.type === 'movie') {
            c.playlistId = selectedPlaylist.id;
            const groupName = c.group || 'Movies';
            if (!m3uGroups[groupName]) m3uGroups[groupName] = [];
            m3uGroups[groupName].push(c);
        }
    });

    if (!currentMovieCategory) {
        const backContainer = document.getElementById('movies-back-btn-container');
        if (backContainer) {
            backContainer.style.display = 'block';
            backContainer.innerHTML = `
                <button class="playlist-btn category-back-btn" style="background: #2a2a2a; color: white; display: flex; align-items: center; gap: 8px; transition: all 0.2s ease;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                    Back
                </button>
            `;
            const backBtn = backContainer.querySelector('button');
            backBtn.addEventListener('click', () => {
                const savedScroll = movieGridScrollTop;
                currentMoviePlaylistId = null;
                renderMovies();
                requestAnimationFrame(() => {
                    const moviesView = document.getElementById('movies-view');
                    if (moviesView) moviesView.scrollTop = savedScroll;
                });
            });
        }
        const titleHeader = document.getElementById('movies-title-header');
        if (titleHeader) titleHeader.textContent = `Movies - ${selectedPlaylist.name}`;

        grid.style.display = 'grid';
        grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(180px, 1fr))';
        grid.style.gap = '20px';
        grid.style.padding = '20px';

        stalkerCategories.forEach(cat => {
            renderFolder(cat.title || cat.name, null, () => {
                movieGridScrollTop = document.getElementById('movies-view')?.scrollTop || 0;
                currentMovieCategory = {
                    type: 'stalker',
                    playlistId: cat.playlistId,
                    categoryId: cat.tvg_id,
                    title: cat.title || cat.name
                };
                renderMovies();
            });
        });

        Object.keys(m3uGroups).sort(sortAlphaNum).forEach(groupName => {
            renderFolder(groupName, m3uGroups[groupName].length, () => {
                movieGridScrollTop = document.getElementById('movies-view')?.scrollTop || 0;
                currentMovieCategory = {
                    type: 'm3u',
                    playlistId: m3uGroups[groupName][0].playlistId,
                    categoryId: groupName,
                    title: groupName,
                    items: m3uGroups[groupName]
                };
                renderMovies();
            });
        });

        const searchInput = document.getElementById('movies-search');
        if (searchInput) {
            searchInput.replaceWith(searchInput.cloneNode(true));
            const newSearchInput = document.getElementById('movies-search');
            newSearchInput.value = '';
            newSearchInput.addEventListener('keyup', (e) => {
                const query = e.target.value.toLowerCase().trim();
                const cards = grid.querySelectorAll('.catalog-folder-card');
                cards.forEach(card => {
                    const title = card.querySelector('.catalog-folder-title').textContent.toLowerCase();
                    if (title.includes(query)) {
                        card.style.display = 'flex';
                    } else {
                        card.style.display = 'none';
                    }
                });
            });
        }
    } else {
        const backContainer = document.getElementById('movies-back-btn-container');
        if (backContainer) {
            backContainer.style.display = 'block';
            backContainer.innerHTML = `
                <button class="playlist-btn category-back-btn" style="background: #2a2a2a; color: white; display: flex; align-items: center; gap: 8px; transition: all 0.2s ease;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                    Back
                </button>
            `;
            const backBtn = backContainer.querySelector('button');
            backBtn.addEventListener('click', () => {
                const savedScroll = movieGridScrollTop;
                currentMovieCategory = null;
                renderMovies();
                // Restore scroll after render completes
                requestAnimationFrame(() => {
                    const moviesView = document.getElementById('movies-view');
                    if (moviesView) moviesView.scrollTop = savedScroll;
                });
            });
        }
        const titleHeader = document.getElementById('movies-title-header');
        if (titleHeader) titleHeader.textContent = `Movies - ${selectedPlaylist.name} - ${currentMovieCategory.title}`;

        grid.style.display = 'grid';
        grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(160px, 1fr))';
        grid.style.gap = '20px';
        grid.style.padding = '20px';

        const renderItems = async (items) => {
            await loadAllPlaybackProgress();
            items.sort((a, b) => sortAlphaNum(a.name || a.title, b.name || b.title));
            items.forEach(item => {
                const card = document.createElement('div');
                card.className = 'catalog-card';

                const title = item.name || item.title;
                const logoUrl = item.logo || 'assets/logo.ico';
                const tmdbId = item.tmdb_id || item.tmdbId || '';

                card.dataset.title = title;
                card.dataset.type = 'movie';
                if (tmdbId) {
                    card.dataset.tmdbId = tmdbId;
                }

                let progressOverlayHtml = '';
                const progress = getItemProgress(item, 'movie');
                if (progress) {
                    if (progress.completed === 1) {
                        progressOverlayHtml = `
                            <div class="catalog-watched-badge" title="Fully Watched">
                                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 3px;"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                Watched
                            </div>
                        `;
                    } else if (progress.position > 0 && progress.duration > 0) {
                        const pct = Math.min(100, Math.max(0, (progress.position / progress.duration) * 100));
                        progressOverlayHtml = `
                            <div class="catalog-progress-bar-wrapper">
                                <div class="catalog-progress-bar" style="width: ${pct}%;"></div>
                            </div>
                        `;
                    }
                }

                card.innerHTML = `
                    <div class="catalog-poster-wrapper">
                        <img class="catalog-poster" src="${logoUrl}" alt="${title}" onerror="this.onerror=null; this.src='assets/logo.ico';">
                        ${progressOverlayHtml}
                    </div>
                    <div class="catalog-info">
                        <h4 class="catalog-title" title="${title.replace(/"/g, '&quot;')}">${title}</h4>
                        <div class="catalog-meta">
                            <span class="catalog-badge">Movie</span>
                        </div>
                    </div>
                `;

                card.addEventListener('click', () => {
                    const streamInfo = {
                        title: title,
                        url: item.url,
                        logo: logoUrl,
                        playlistId: currentMovieCategory.playlistId,
                        type: 'movie',
                        tvg_id: item.id || item.tvg_id,
                        tmdbId: tmdbId
                    };

                    if (card.dataset.tmdbLoaded === 'true' && card.dataset.tmdbData) {
                        streamInfo.tmdbData = JSON.parse(card.dataset.tmdbData);
                    }

                    openMovieDetailsModal(streamInfo);
                });

                grid.appendChild(card);
                if (tmdbObserver) tmdbObserver.observe(card);
            });

            const searchInput = document.getElementById('movies-search');
            if (searchInput) {
                searchInput.replaceWith(searchInput.cloneNode(true));
                const newSearchInput = document.getElementById('movies-search');
                newSearchInput.value = '';
                newSearchInput.addEventListener('keyup', (e) => {
                    const query = e.target.value.toLowerCase().trim();
                    const cards = grid.querySelectorAll('.catalog-card');
                    cards.forEach(card => {
                        const title = card.dataset.title.toLowerCase();
                        if (title.includes(query)) {
                            card.style.display = 'flex';
                        } else {
                            card.style.display = 'none';
                        }
                    });
                });
            }
        };

        if (currentMovieCategory.type === 'm3u') {
            renderItems(currentMovieCategory.items);
        } else if (currentMovieCategory.type === 'stalker') {
            const loadingDiv = document.createElement('div');
            loadingDiv.style.gridColumn = '1 / -1';
            loadingDiv.innerHTML = getWinSpinnerHtml('Loading movies...', { size: 'large' });
            grid.appendChild(loadingDiv);

            try {
                const playlist = savedPlaylists.find(p => p.id.toString() === currentMovieCategory.playlistId.toString());
                window.iptvAPI.loadStalkerCategory({
                    url: playlist.source,
                    mac: playlist.epg.substring(8),
                    categoryId: currentMovieCategory.categoryId,
                    isSeries: false,
                    categoryType: 'movie',
                    categoryName: currentMovieCategory.title
                }).then(items => {
                    loadingDiv.remove();
                    if (!items || items.length === 0) {
                        grid.innerHTML += '<div style="grid-column: 1 / -1; color: #888; text-align: center; padding: 40px;">No movies found in this folder.</div>';
                    } else {
                        renderItems(items);
                    }
                }).catch(e => {
                    loadingDiv.innerHTML = '<h2 style="color: #cf6679;">Failed to load movies.</h2>';
                });
            } catch (e) {
                loadingDiv.innerHTML = '<h2 style="color: #cf6679;">Failed to load movies.</h2>';
            }
        }
    }
}



async function renderVod() {
    console.log('[CATALOG] Rendering VOD/Series Catalog');
    injectPremiumStyles();
    initTmdbObserver();

    const grid = document.getElementById('vod-grid');
    const empty = document.getElementById('vod-empty');
    if (!grid) return;
    grid.innerHTML = '';

    const headerContainer = document.getElementById('vod-header-container');
    if (headerContainer) headerContainer.remove();

    let hasSeries = false;
    let playlistsWithSeries = [];
    savedPlaylists.forEach(p => {
        if (p.channels && !p.disabled) {
            let count = 0;
            p.channels.forEach(c => {
                if (c.disabled) return;
                if (c.type === 'vod_category' || c.type === 'series_category' || c.type === 'vod' || c.type === 'series') {
                    count++;
                }
            });
            if (count > 0) {
                playlistsWithSeries.push(p);
                hasSeries = true;
            }
        }
    });

    if (!hasSeries) {
        if (empty) empty.style.display = 'block';
        return;
    }
    if (empty) empty.style.display = 'none';

    const renderFolder = (title, count, onClick) => {
        const card = document.createElement('div');
        card.className = 'catalog-folder-card';
        card.innerHTML = `
            <div class="catalog-folder-icon">
                <svg viewBox="0 0 24 24" width="56" height="56" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
            </div>
            <div class="catalog-folder-title" title="${title.replace(/"/g, '&quot;')}">${title}</div>
            ${count !== null ? `<div class="catalog-folder-count">${count} Items</div>` : ''}
        `;
        card.addEventListener('click', onClick);
        grid.appendChild(card);
    };

    if (!currentVodPlaylistId) {
        const backContainer = document.getElementById('vod-back-btn-container');
        if (backContainer) backContainer.style.display = 'none';
        const titleHeader = document.getElementById('vod-title-header');
        if (titleHeader) titleHeader.textContent = 'TV Series';

        grid.style.display = 'grid';
        grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(180px, 1fr))';
        grid.style.gap = '20px';
        grid.style.padding = '20px';

        playlistsWithSeries.forEach(p => {
            renderFolder(p.name, null, () => {
                vodGridScrollTop = document.getElementById('vod-view')?.scrollTop || 0;
                currentVodPlaylistId = p.id;
                renderVod();
                const vodView = document.getElementById('vod-view');
                if (vodView) vodView.scrollTop = 0;
            });
        });

        const searchInput = document.getElementById('vod-search');
        if (searchInput) {
            searchInput.replaceWith(searchInput.cloneNode(true));
            const newSearchInput = document.getElementById('vod-search');
            newSearchInput.value = '';
            newSearchInput.addEventListener('keyup', (e) => {
                const query = e.target.value.toLowerCase().trim();
                const cards = grid.querySelectorAll('.catalog-folder-card');
                cards.forEach(card => {
                    const title = card.querySelector('.catalog-folder-title').textContent.toLowerCase();
                    if (title.includes(query)) {
                        card.style.display = 'flex';
                    } else {
                        card.style.display = 'none';
                    }
                });
            });
        }
        return;
    }

    const selectedPlaylist = savedPlaylists.find(p => p.id === currentVodPlaylistId);
    if (!selectedPlaylist) {
        currentVodPlaylistId = null;
        renderVod();
        return;
    }

    let stalkerCategories = [];
    let m3uGroups = {};

    selectedPlaylist.channels.forEach(c => {
        if (c.disabled) return;
        if (c.type === 'vod_category' || c.type === 'series_category') {
            c.playlistId = selectedPlaylist.id;
            stalkerCategories.push(c);
        } else if (c.type === 'vod' || c.type === 'series') {
            c.playlistId = selectedPlaylist.id;
            const groupName = c.group || 'Series';
            if (!m3uGroups[groupName]) m3uGroups[groupName] = [];
            m3uGroups[groupName].push(c);
        }
    });

    if (!currentVodCategory) {
        const backContainer = document.getElementById('vod-back-btn-container');
        if (backContainer) {
            backContainer.style.display = 'block';
            backContainer.innerHTML = `
                <button class="playlist-btn category-back-btn" style="background: #2a2a2a; color: white; display: flex; align-items: center; gap: 8px; transition: all 0.2s ease;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                    Back
                </button>
            `;
            const backBtn = backContainer.querySelector('button');
            backBtn.addEventListener('click', () => {
                const savedScroll = vodGridScrollTop;
                currentVodPlaylistId = null;
                renderVod();
                requestAnimationFrame(() => {
                    const vodView = document.getElementById('vod-view');
                    if (vodView) vodView.scrollTop = savedScroll;
                });
            });
        }
        const titleHeader = document.getElementById('vod-title-header');
        if (titleHeader) titleHeader.textContent = `TV Series - ${selectedPlaylist.name}`;

        grid.style.display = 'grid';
        grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(180px, 1fr))';
        grid.style.gap = '20px';
        grid.style.padding = '20px';

        stalkerCategories.forEach(cat => {
            renderFolder(cat.title || cat.name, null, () => {
                vodGridScrollTop = document.getElementById('vod-view')?.scrollTop || 0;
                currentVodCategory = {
                    type: 'stalker',
                    playlistId: cat.playlistId,
                    categoryId: cat.tvg_id,
                    title: cat.title || cat.name
                };
                renderVod();
            });
        });

        Object.keys(m3uGroups).sort(sortAlphaNum).forEach(groupName => {
            renderFolder(groupName, m3uGroups[groupName].length, () => {
                vodGridScrollTop = document.getElementById('vod-view')?.scrollTop || 0;
                currentVodCategory = {
                    type: 'm3u',
                    playlistId: m3uGroups[groupName][0].playlistId,
                    categoryId: groupName,
                    title: groupName,
                    items: m3uGroups[groupName]
                };
                renderVod();
            });
        });

        const searchInput = document.getElementById('vod-search');
        if (searchInput) {
            searchInput.replaceWith(searchInput.cloneNode(true));
            const newSearchInput = document.getElementById('vod-search');
            newSearchInput.value = '';
            newSearchInput.addEventListener('keyup', (e) => {
                const query = e.target.value.toLowerCase().trim();
                const cards = grid.querySelectorAll('.catalog-folder-card');
                cards.forEach(card => {
                    const title = card.querySelector('.catalog-folder-title').textContent.toLowerCase();
                    if (title.includes(query)) {
                        card.style.display = 'flex';
                    } else {
                        card.style.display = 'none';
                    }
                });
            });
        }
    } else {
        const backContainer = document.getElementById('vod-back-btn-container');
        if (backContainer) {
            backContainer.style.display = 'block';
            backContainer.innerHTML = `
                <button class="playlist-btn category-back-btn" style="background: #2a2a2a; color: white; display: flex; align-items: center; gap: 8px; transition: all 0.2s ease;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                    Back
                </button>
            `;
            const backBtn = backContainer.querySelector('button');
            backBtn.addEventListener('click', () => {
                const savedScroll = vodGridScrollTop;
                currentVodCategory = null;
                renderVod();
                // Restore scroll after render completes
                requestAnimationFrame(() => {
                    const vodView = document.getElementById('vod-view');
                    if (vodView) vodView.scrollTop = savedScroll;
                });
            });
        }
        const titleHeader = document.getElementById('vod-title-header');
        if (titleHeader) titleHeader.textContent = `TV Series - ${selectedPlaylist.name} - ${currentVodCategory.title}`;

        grid.style.display = 'grid';
        grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(160px, 1fr))';
        grid.style.gap = '20px';
        grid.style.padding = '20px';

        const renderItems = async (items) => {
            await loadAllPlaybackProgress();
            items.sort((a, b) => sortAlphaNum(a.name || a.title, b.name || b.title));
            items.forEach(item => {
                const card = document.createElement('div');
                card.className = 'catalog-card';

                const title = item.name || item.title;
                const logoUrl = item.logo || 'assets/logo.ico';
                const tmdbId = item.tmdb_id || item.tmdbId || '';

                card.dataset.title = title;
                card.dataset.type = 'series';
                if (tmdbId) {
                    card.dataset.tmdbId = tmdbId;
                }

                let progressOverlayHtml = '';
                const progress = getItemProgress(item, 'vod');
                if (progress) {
                    if (progress.completed === 1) {
                        progressOverlayHtml = `
                            <div class="catalog-watched-badge" title="All Episodes Watched">
                                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 3px;"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                Watched
                            </div>
                        `;
                    } else if (progress.position > 0 && progress.duration > 0) {
                        const pct = Math.min(100, Math.max(0, (progress.position / progress.duration) * 100));
                        progressOverlayHtml = `
                            <div class="catalog-progress-bar-wrapper">
                                <div class="catalog-progress-bar" style="width: ${pct}%;"></div>
                            </div>
                        `;
                    }
                }

                card.innerHTML = `
                    <div class="catalog-poster-wrapper">
                        <img class="catalog-poster" src="${logoUrl}" alt="${title}" onerror="this.onerror=null; this.src='assets/logo.ico';">
                        ${progressOverlayHtml}
                    </div>
                    <div class="catalog-info">
                        <h4 class="catalog-title" title="${title.replace(/"/g, '&quot;')}">${title}</h4>
                        <div class="catalog-meta">
                            <span class="catalog-badge">Series</span>
                        </div>
                    </div>
                `;

                card.addEventListener('click', () => {
                    const streamInfo = {
                        title: title,
                        url: item.url,
                        logo: logoUrl,
                        playlistId: currentVodCategory.playlistId,
                        type: 'series',
                        tvg_id: item.id || item.tvg_id,
                        tmdbId: tmdbId
                    };

                    if (card.dataset.tmdbLoaded === 'true' && card.dataset.tmdbData) {
                        streamInfo.tmdbData = JSON.parse(card.dataset.tmdbData);
                    }

                    openMovieDetailsModal(streamInfo);
                });

                grid.appendChild(card);
                if (tmdbObserver) tmdbObserver.observe(card);
            });

            const searchInput = document.getElementById('vod-search');
            if (searchInput) {
                searchInput.replaceWith(searchInput.cloneNode(true));
                const newSearchInput = document.getElementById('vod-search');
                newSearchInput.value = '';
                newSearchInput.addEventListener('keyup', (e) => {
                    const query = e.target.value.toLowerCase().trim();
                    const cards = grid.querySelectorAll('.catalog-card');
                    cards.forEach(card => {
                        const title = card.dataset.title.toLowerCase();
                        if (title.includes(query)) {
                            card.style.display = 'flex';
                        } else {
                            card.style.display = 'none';
                        }
                    });
                });
            }
        };

        if (currentVodCategory.type === 'm3u') {
            renderItems(currentVodCategory.items);
        } else if (currentVodCategory.type === 'stalker') {
            const loadingDiv = document.createElement('div');
            loadingDiv.style.gridColumn = '1 / -1';
            loadingDiv.innerHTML = getWinSpinnerHtml('Loading series...', { size: 'large' });
            grid.appendChild(loadingDiv);

            try {
                const playlist = savedPlaylists.find(p => p.id.toString() === currentVodCategory.playlistId.toString());
                window.iptvAPI.loadStalkerCategory({
                    url: playlist.source,
                    mac: playlist.epg.substring(8),
                    categoryId: currentVodCategory.categoryId,
                    isSeries: true,
                    categoryType: 'series',
                    categoryName: currentVodCategory.title
                }).then(items => {
                    loadingDiv.remove();
                    if (!items || items.length === 0) {
                        grid.innerHTML += '<div style="grid-column: 1 / -1; color: #888; text-align: center; padding: 40px;">No series found in this folder.</div>';
                    } else {
                        renderItems(items);
                    }
                }).catch(e => {
                    loadingDiv.innerHTML = '<h2 style="color: #cf6679;">Failed to load series.</h2>';
                });
            } catch (e) {
                loadingDiv.innerHTML = '<h2 style="color: #cf6679;">Failed to load series.</h2>';
            }
        }
    }
}

async function openEpisodesModal(playlistId, seriesId, seriesTitle, seriesPosterUrl = null) {
    console.log('[UI] Opening episodes modal for:', seriesTitle, 'playlist:', playlistId, 'seriesId:', seriesId);

    const modal = document.getElementById('episodes-modal');
    const modalTitle = document.getElementById('episodes-modal-title');
    const seasonsSidebar = document.getElementById('seasons-sidebar');
    const episodesGrid = document.getElementById('episodes-grid');
    const loader = document.getElementById('episodes-loading');
    const countBadge = document.getElementById('episodes-count-badge');

    if (!modal) return;

    modalTitle.textContent = seriesTitle;
    if (seasonsSidebar) seasonsSidebar.innerHTML = '';
    if (episodesGrid) episodesGrid.innerHTML = '';
    if (loader) loader.style.display = 'block';
    if (countBadge) countBadge.textContent = '0 Episodes';

    modal.style.display = 'flex';

    try {
        const playlist = savedPlaylists.find(p => p.id.toString() === playlistId.toString());
        if (!playlist || !playlist.epg || !playlist.epg.startsWith('stalker:')) {
            throw new Error("Stalker playlist credentials not found.");
        }

        const url = playlist.source;
        const mac = playlist.epg.substring(8);

        console.log('[API] Fetching episodes for series:', seriesId);
        const episodes = await window.iptvAPI.getStalkerEpisodes({ url, mac, seriesId });

        if (loader) loader.style.display = 'none';

        if (!episodes || episodes.length === 0) {
            if (episodesGrid) episodesGrid.innerHTML = '<div style="color: #888; padding: 20px;">No episodes found for this series.</div>';
            if (countBadge) countBadge.textContent = '0 Episodes';
            return;
        }

        const seasons = {};
        episodes.forEach(ep => {
            const sNum = ep.season || 1;
            if (!seasons[sNum]) {
                seasons[sNum] = [];
            }
            seasons[sNum].push(ep);
        });

        Object.keys(seasons).forEach(sNum => {
            seasons[sNum].sort((a, b) => parseInt(a.episodeNum || 0) - parseInt(b.episodeNum || 0));
        });

        const sortedSeasons = Object.keys(seasons).sort((a, b) => parseInt(a) - parseInt(b));

        const renderSeasonEpisodes = (seasonNum) => {
            if (!episodesGrid) return;
            episodesGrid.innerHTML = '';

            const seasonEpisodes = seasons[seasonNum] || [];
            if (countBadge) {
                countBadge.textContent = `${seasonEpisodes.length} Episode${seasonEpisodes.length === 1 ? '' : 's'}`;
            }

            seasonEpisodes.forEach(ep => {
                const epCard = document.createElement('button');
                epCard.className = 'episode-card';
                epCard.style.width = '100%';
                epCard.style.textAlign = 'left';

                epCard.innerHTML = `
                    <div class="episode-num">${ep.episodeNum || ''}</div>
                    <div class="episode-name" title="${ep.name}">${ep.name || `Episode ${ep.episodeNum}`}</div>
                `;

                epCard.addEventListener('click', async () => {
                    console.log('[CATALOG] Playing Series Episode:', ep.name, ep.url);
                    modal.style.display = 'none';
                    switchTab('live-tv', document.getElementById('btn-live-tv'));

                    const seriesPoster = seriesPosterUrl || playlist.channels.find(c => c.tvg_id === seriesId)?.logo || 'assets/logo.ico';
                    const episodeChannel = {
                        title: `${seriesTitle} - S${seasonNum}E${ep.episodeNum} - ${ep.name || 'Episode'}`,
                        url: ep.url,
                        logo: seriesPoster,
                        playlistId: playlist.id,
                        type: 'episode',
                        seriesTitle: seriesTitle,
                        season: seasonNum,
                        episodeNum: ep.episodeNum
                    };

                    const progId = getPlaybackProgressId(episodeChannel);
                    if (progId) {
                        const saved = await window.iptvAPI.getPlaybackProgress(progId);
                        if (saved && saved.position > 0 && !saved.completed) {
                            showResumePromptModal(saved.position, (resume) => {
                                if (resume) {
                                    window.pendingResumeSeekTime = saved.position;
                                }
                                embedStream(episodeChannel);
                            });
                            return;
                        }
                    }
                    embedStream(episodeChannel);
                });

                episodesGrid.appendChild(epCard);
            });
        };

        if (seasonsSidebar) {
            sortedSeasons.forEach((seasonNum, index) => {
                const tab = document.createElement('button');
                tab.className = `season-tab ${index === 0 ? 'active' : ''}`;
                tab.textContent = `Season ${seasonNum}`;

                tab.addEventListener('click', () => {
                    document.querySelectorAll('.season-tab').forEach(t => t.classList.remove('active'));
                    tab.classList.add('active');
                    renderSeasonEpisodes(seasonNum);
                });

                seasonsSidebar.appendChild(tab);
            });
        }

        if (sortedSeasons.length > 0) {
            renderSeasonEpisodes(sortedSeasons[0]);
        }

    } catch (err) {
        console.error('[UI ERR] Failed to open episodes modal:', err);
        if (loader) loader.style.display = 'none';
        if (episodesGrid) episodesGrid.innerHTML = `<div style="color: #cf6679; padding: 20px;">Error: ${err.message}</div>`;
        if (countBadge) countBadge.textContent = 'Error';
    }
}

// Modal closing setup
document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('episodes-modal');
    const closeBtn = document.getElementById('episodes-modal-close');
    if (closeBtn && modal) {
        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    }

    // Custom Window Control actions
    const winMinimize = document.getElementById('win-btn-minimize');
    const winMaximize = document.getElementById('win-btn-maximize');
    const winClose = document.getElementById('win-btn-close');

    if (winMinimize) {
        winMinimize.addEventListener('click', () => {
            window.iptvAPI.minimizeWindow();
        });
    }
    if (winMaximize) {
        winMaximize.addEventListener('click', () => {
            window.iptvAPI.maximizeWindow();
        });
    }
    if (winClose) {
        winClose.addEventListener('click', () => {
            window.iptvAPI.closeWindow();
        });
    }

    // Autoplay Overlay buttons setup
    const playNowBtn = document.getElementById('autoplay-play-now-btn');
    const cancelBtn = document.getElementById('autoplay-cancel-btn');
    if (playNowBtn) {
        playNowBtn.addEventListener('click', () => {
            playNextEpisode();
        });
    }
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            hideAutoplayOverlay();
            window.isAutoplayBlockedForCurrentEpisode = true;
            showToast('Auto-play cancelled');
        });
    }
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (modal && modal.style.display === 'flex') {
                modal.style.display = 'none';
            }
            try {
                window.iptvAPI.closeMpvTrackSelector();
            } catch (err) { }
        }
    });
});

function updateHeaderTime() {
    const el = document.getElementById('header-time-date');
    if (!el) return;
    const now = new Date();

    const weekday = now.toLocaleDateString('en-US', { weekday: 'short' });
    const month = now.toLocaleDateString('en-US', { month: 'short' });
    const day = now.getDate();

    let hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;

    el.textContent = `${weekday} • ${month} ${day} • ${hours}:${minutes} ${ampm}`;
}

let mouseHideTimer = null;

/** Returns (creating on first call) the floating window-controls overlay shown in fullscreen. */
function getFullscreenWinControls() {
    let el = document.getElementById('fs-win-controls');
    if (!el) {
        el = document.createElement('div');
        el.id = 'fs-win-controls';
        el.className = 'fs-win-controls';
        el.innerHTML = `
            <button class="win-btn win-minimize fs-win-btn" id="fs-win-btn-minimize" title="Minimize">
                <svg viewBox="0 0 10.2 10.2"><line x1="1" y1="5.1" x2="9.2" y2="5.1"></line></svg>
            </button>
            <button class="win-btn win-maximize fs-win-btn" id="fs-win-btn-maximize" title="Maximize / Restore">
                <svg viewBox="0 0 10.2 10.2"><rect x="1" y="1" width="8.2" height="8.2" rx="1"></rect></svg>
            </button>
            <button class="win-btn win-close fs-win-btn" id="fs-win-btn-close" title="Close App">
                <svg viewBox="0 0 10.2 10.2"><line x1="1" y1="1" x2="9.2" y2="9.2"></line><line x1="9.2" y1="1" x2="1" y2="9.2"></line></svg>
            </button>
        `;
        document.body.appendChild(el);

        el.querySelector('#fs-win-btn-minimize').addEventListener('click', () => window.iptvAPI.minimizeWindow());
        el.querySelector('#fs-win-btn-maximize').addEventListener('click', () => window.iptvAPI.maximizeWindow());
        el.querySelector('#fs-win-btn-close').addEventListener('click', () => window.iptvAPI.closeWindow());

        // Keep cursor & overlay visible while hovering over the overlay itself
        el.addEventListener('mouseenter', () => {
            if (mouseHideTimer) { clearTimeout(mouseHideTimer); mouseHideTimer = null; }
            document.body.style.cursor = 'default';
        });
        el.addEventListener('mouseleave', () => handleFullscreenMouseCursor());
    }
    return el;
}

function handleFullscreenMouseCursor() {
    if (window.isAppFullscreen) {
        document.body.style.cursor = 'default';
        // Show the floating window controls
        const fsCtrl = getFullscreenWinControls();
        fsCtrl.classList.add('visible');
        if (mouseHideTimer) clearTimeout(mouseHideTimer);
        mouseHideTimer = setTimeout(() => {
            if (window.isAppFullscreen) {
                document.body.style.cursor = 'none';
                // Hide the floating window controls
                fsCtrl.classList.remove('visible');
            }
        }, 3000);
    } else {
        if (mouseHideTimer) {
            clearTimeout(mouseHideTimer);
            mouseHideTimer = null;
        }
        document.body.style.cursor = 'default';
        // Hide the overlay when not in fullscreen (in case it exists)
        const fsCtrl = document.getElementById('fs-win-controls');
        if (fsCtrl) fsCtrl.classList.remove('visible');
    }
}
window.addEventListener('mousemove', handleFullscreenMouseCursor);

// Hide the sidebar & title when the app goes fullscreen so the video takes up 100% of the monitor
window.iptvAPI.onFullscreenChange((isFullscreen) => {
    console.log('[API RECV] onFullscreenChange, isFullscreen:', isFullscreen);
    window.isAppFullscreen = isFullscreen;
    handleFullscreenMouseCursor();
    document.body.classList.toggle('fullscreen-active', isFullscreen);
    const navBar = document.getElementById('nav-bar');
    const sidebar = document.getElementById('sidebar');
    const channelDetails = document.getElementById('channel-details');
    const liveBottomHalf = document.getElementById('live-bottom-half');
    const liveTopHalf = document.getElementById('live-top-half');
    const playerWrapper = document.getElementById('player-wrapper');
    const topHeader = document.getElementById('top-header');

    const isLiveViewActive = document.getElementById('btn-live-tv').classList.contains('active');

    if (sidebar) sidebar.style.setProperty('display', (isFullscreen || !isLiveViewActive) ? 'none' : 'flex', 'important');
    if (navBar) navBar.style.setProperty('display', 'none', 'important');
    if (topHeader) topHeader.style.setProperty('display', isFullscreen ? 'none' : 'flex', 'important');

    if (channelDetails) channelDetails.style.setProperty('display', isFullscreen ? 'none' : 'flex', 'important');
    if (liveBottomHalf) liveBottomHalf.style.setProperty('display', isFullscreen ? 'none' : 'flex', 'important');

    if (liveTopHalf) liveTopHalf.style.setProperty('height', isFullscreen ? '100%' : '50%', 'important');

    if (playerWrapper) {
        if (isFullscreen) {
            playerWrapper.style.setProperty('padding', '0', 'important');
            playerWrapper.style.setProperty('background-color', 'transparent', 'important');
            playerWrapper.style.setProperty('border-radius', '0', 'important');
            playerWrapper.style.setProperty('flex', '1', 'important');
            playerWrapper.style.setProperty('aspect-ratio', 'auto', 'important');
            playerWrapper.style.setProperty('width', '100%', 'important');
            playerWrapper.style.setProperty('margin-left', '0', 'important');
            document.body.style.setProperty('padding', '0', 'important');
            document.body.style.setProperty('gap', '0', 'important');
            if (liveTopHalf) liveTopHalf.style.setProperty('gap', '0', 'important');
        } else {
            // Add transitioning state to mask layout jumps
            document.body.classList.add('fullscreen-transitioning');

            playerWrapper.style.setProperty('padding', '1px', 'important');
            playerWrapper.style.setProperty('background-color', '#050507', 'important');
            playerWrapper.style.setProperty('border-radius', '24px', 'important');
            playerWrapper.style.setProperty('flex', 'none', 'important');
            playerWrapper.style.setProperty('aspect-ratio', '16 / 9', 'important');
            playerWrapper.style.setProperty('width', 'auto', 'important');
            playerWrapper.style.setProperty('margin-left', '0', 'important');
            document.body.style.setProperty('padding', '82px 4px 4px 4px', 'important');
            document.body.style.setProperty('gap', '4px', 'important');
            if (liveTopHalf) liveTopHalf.style.setProperty('gap', '4px', 'important');

            // Force a DOM style reflow to ensure styles are updated before starting transition
            document.body.offsetHeight;

            // Fade the layout back in cleanly
            requestAnimationFrame(() => {
                setTimeout(() => {
                    document.body.classList.remove('fullscreen-transitioning');
                }, 40);
            });
        }
    }

    // Settle native MPV bounds around Electron's fullscreen animation without late visible jumps.
    settlePlayerBoundsAfterLayout();

    if (!isFullscreen && mainView) {
        const syncAfterMainViewSettles = (event) => {
            if (event.target !== mainView || event.propertyName !== 'margin-left') return;
            mainView.removeEventListener('transitionend', syncAfterMainViewSettles);
            settlePlayerBoundsAfterLayout();
        };
        mainView.addEventListener('transitionend', syncAfterMainViewSettles);
        setTimeout(() => {
            mainView.removeEventListener('transitionend', syncAfterMainViewSettles);
            settlePlayerBoundsAfterLayout();
        }, 260);
    }
});

async function backgroundAutoUpdate() {
    console.log('[BACKGROUND] Starting background auto-update process.');
    let hasUpdates = false;
    let epgSourcesToUpdate = new Set(savedEpgs);

    for (let i = 0; i < savedPlaylists.length; i++) {
        const p = savedPlaylists[i];
        console.log(`[BACKGROUND] Checking playlist for update: ${p.name}`);
        if (p.disabled || !p.source) continue;

        const isStalker = p.epg && p.epg.startsWith('stalker:');
        if (!isStalker && !p.source.startsWith('http') && !p.source.startsWith('https')) continue;

        let result;
        if (isStalker) {
            console.log(`[BACKGROUND] Calling parseStalker for background update: ${p.name}`);
            result = await window.iptvAPI.parseStalker({ url: p.source, mac: p.epg.substring(8) });
        } else {
            result = await window.iptvAPI.parseM3u(p.source);
        }

        if (result && !result.error && (Array.isArray(result) || result.channels)) {
            let channels = Array.isArray(result) ? result : result.channels;
            if (isStalker && p.channels) {
                const existingLive = p.channels.filter(c =>
                    c.type !== 'itv_category' &&
                    c.type !== 'vod_category' &&
                    c.type !== 'movie_category' &&
                    c.type !== 'series_category'
                );
                channels = [...channels, ...existingLive];
            }
            const oldMap = new Map();
            if (p.channels) p.channels.forEach(c => oldMap.set(c.title, c));

            channels.forEach(newCh => {
                const old = oldMap.get(newCh.title);
                if (old) {
                    newCh.disabled = old.disabled;
                    newCh.favourite = old.favourite;
                    if (old.isNew) newCh.isNew = true;
                } else {
                    const isVod = newCh.type === 'movie' || newCh.type === 'series' || newCh.type === 'movie_category' || newCh.type === 'vod_category' || newCh.type === 'series_category';
                    newCh.disabled = isVod ? false : true;
                    if (!isVod) {
                        newCh.isNew = true;
                    }
                }
            });

            savedPlaylists[i].channels = channels;
            markPlaylistsDirty();
            if (!isStalker && result.epg_url && (!savedPlaylists[i].epg || savedPlaylists[i].epg === 'Not Configured')) {
                savedPlaylists[i].epg = result.epg_url;
            }
            if (result.exp_date) {
                savedPlaylists[i].exp_date = result.exp_date;
            }
            hasUpdates = true;

            if (!isStalker && p.epg && p.epg !== 'Not Configured') epgSourcesToUpdate.add(p.epg);
        }
    }

    console.log('[BACKGROUND] Playlist updates found:', hasUpdates);

    if (hasUpdates) {
        if (epgSourcesToUpdate.size > 0) {
            if (!window.activeEpgParsing) window.activeEpgParsing = new Set();
            epgSourcesToUpdate.forEach(epg => window.activeEpgParsing.add(epg));
            updateState(true); // Skip save if EPG will be updated next

            const combinedEpgs = Array.from(epgSourcesToUpdate).join(',');
            await window.iptvAPI.updateEpg(combinedEpgs, null, true);
            epgChannelsData = await window.iptvAPI.getEpgChannels(combinedEpgs);
            await autoMapChannels(false, true); // SKIP SAVE
            console.log('[BACKGROUND] EPG data updated.');
            // await loadEpgLogos(); removed

            epgSourcesToUpdate.forEach(epg => window.activeEpgParsing.delete(epg));
            // EPG preloading skipped to load only on view.
            updateState(); // FINAL SAVE
        } else {
            updateState(); // FINAL SAVE
        }
    }
}

// Load saved channels on startup
window.addEventListener('DOMContentLoaded', async () => {
    console.log('[LIFECYCLE] DOMContentLoaded event fired.');

    // Load and apply the saved application theme
    const savedTheme = localStorage.getItem('iptv_app_theme') || 'default';
    applyAppTheme(savedTheme);

    // Initialize premium details modal events
    initDetailsModalEvents();

    // Initialize premium top header clock
    updateHeaderTime();
    setInterval(updateHeaderTime, 1000);

    // Settings and Power button are now defined directly in index.html in the central header navigation row.
    // They maintain their capsule styles, alignment, and hover physics perfectly.

    // Hide all main view containers initially to prevent UI flash before data loads
    ['sidebar', 'main-view', 'playlist-view', 'epg-view', 'settings-view'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
        if (el) el.style.setProperty('display', 'none', 'important');
    });

    // Add custom fullscreen button to the player container
    const fsBtn = document.createElement('button');
    fsBtn.id = 'fullscreen-btn';
    fsBtn.innerHTML = '<svg viewBox="0 0 24 24" width="54" height="54" fill="currentColor"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>';
    fsBtn.title = 'Toggle Fullscreen';
    fsBtn.style.display = 'none'; // Initially hidden
    playerContainer.appendChild(fsBtn);
    fsBtn.addEventListener('click', () => {
        window.iptvAPI.toggleFullscreen();
    });

    // Rename the EPG button dynamically on load
    const epgBtn = document.getElementById('btn-epg');
    if (epgBtn) {
        epgBtn.title = 'Programme Guide';
        epgBtn.innerHTML = epgBtn.innerHTML.replace('EPG', 'Guide');
        // Safely update text node to avoid overwriting nested SVG icons
        Array.from(epgBtn.childNodes).forEach(node => {
            if (node.nodeType === Node.TEXT_NODE && /epg/i.test(node.nodeValue)) {
                node.nodeValue = node.nodeValue.replace(/epg/i, 'Guide');
            }
        });
        // Fallback 
    if (epgBtn.innerHTML.includes('EPG')) epgBtn.innerHTML = epgBtn.innerHTML.replace(/\bEPG\b/i, 'Guide');
    }

    console.log('[API] Calling getMappings on startup.');
    channelMappings = await window.iptvAPI.getMappings();
    console.log('[API] Calling getExternalEpgs on startup.');
    savedEpgs = await window.iptvAPI.getExternalEpgs();
    console.log('[API] Calling loadChannels on startup.');
    const data = await window.iptvAPI.loadChannels();
    if (data && data.length > 0) {
        // Migration for old raw channel list format
        if (data[0].url && !data[0].source && !data[0].channels) {
            savedPlaylists = [{
                id: 1,
                source: 'Legacy/Imported',
                name: 'Imported Playlist',
                channels: data,
                epg: 'Not Configured',
                disabled: false
            }];
            markPlaylistsDirty();
        } else {
            savedPlaylists = data;
            savedPlaylists.forEach(p => { p.name = formatPlaylistName(p.name); });
            markPlaylistsDirty();
        }

        // Load EPG logo mapping on startup
        // await loadEpgLogos(); removed

        console.log('[STARTUP] EPG pre-loading skipped to load only on view.');
        updateState();

        if (allChannels.length > 0) {
            switchTab('live-tv', document.getElementById('btn-live-tv'));
            // Autoplay last played channel
            const lastUrl = localStorage.getItem('lastPlayedChannelUrl');
            let startedPlayback = false;
            if (lastUrl) {
                const lastChannel = allChannels.find(c => c.url === lastUrl);
                if (lastChannel) {
                    // Signal renderChannels to skip saved-scroll restoration so we
                    // can position the playing channel at the top of the list.
                    window.startupAutoplayPending = true;
                    embedStream(lastChannel);
                    window.startupAutoplayPending = false;
                    // After the DOM settles, force the active channel to the top row.
                    setTimeout(() => updatePlayingChannelIndicator({ scroll: true, block: 'start' }), 300);
                    startedPlayback = true;
                }
            }
            if (!startedPlayback) {
                // Determine the first channel according to the sidebar sorting/groups
                const filterVal = localStorage.getItem('iptv_playlist_filter') || 'all';
                const groupedChannels = {};
                allChannels.forEach(channel => {
                    if (filterVal === 'favs' && !channel.favourite) return;
                    if (filterVal !== 'all' && filterVal !== 'favs' && String(channel.playlistId) !== String(filterVal)) return;

                    const channelGroup = channel.group || 'Uncategorized';
                    if (!groupedChannels[channelGroup]) {
                        groupedChannels[channelGroup] = [];
                    }
                    groupedChannels[channelGroup].push(channel);
                });
                const sortedGroups = Object.keys(groupedChannels).sort(sortAlphaNum);
                if (sortedGroups.length > 0 && groupedChannels[sortedGroups[0]].length > 0) {
                    const firstChannel = groupedChannels[sortedGroups[0]][0];
                    embedStream(firstChannel);
                    startedPlayback = true;
                } else if (allChannels.length > 0) {
                    embedStream(allChannels[0]);
                    startedPlayback = true;
                }
            }
            if (!startedPlayback && window.iptvAPI.hideSplash) {
                window.iptvAPI.hideSplash();
            }
        } else {
            switchTab('playlist', document.getElementById('btn-playlist'));
            if (window.iptvAPI.hideSplash) window.iptvAPI.hideSplash();
        }
    } else {
        updateState(); // Initialize empty states
        switchTab('playlist', document.getElementById('btn-playlist'));
        if (window.iptvAPI.hideSplash) window.iptvAPI.hideSplash();
    }

    // Begin non-blocking background auto-update process (Delayed to allow the UI to finish rendering first)
    setTimeout(() => {
        const lastUpdate = localStorage.getItem('lastBackgroundUpdate');
        const now = Date.now();
        if (!lastUpdate || (now - parseInt(lastUpdate)) > 12 * 60 * 60 * 1000) {
            backgroundAutoUpdate();
            localStorage.setItem('lastBackgroundUpdate', now.toString());
        }

        setInterval(() => {
            backgroundAutoUpdate();
            localStorage.setItem('lastBackgroundUpdate', Date.now().toString());
        }, 4 * 60 * 60 * 1000); // Check every 4 hours, actual web fetch limited to 24h by python cache
    }, 5000);



    // Handle dynamically cached logos from background
    if (window.iptvAPI && window.iptvAPI.onLogoCached) {
        window.iptvAPI.onLogoCached((originalUrl, cachedUrl) => {
            // 1. Update savedPlaylists — the source of truth for renderChannels()
            // Without this, the next renderChannels() call re-injects the stale remote URL
            if (typeof savedPlaylists !== 'undefined') {
                savedPlaylists.forEach(p => {
                    if (p.channels) {
                        p.channels.forEach(ch => {
                            if (ch.logo === originalUrl) ch.logo = cachedUrl;
                        });
                    }
                });
            }

            // 2. Update allChannels in-memory array (populated from savedPlaylists at render time)
            if (typeof allChannels !== 'undefined') {
                allChannels.forEach(ch => {
                    if (ch.logo === originalUrl) ch.logo = cachedUrl;
                });
            }

            // 3. Dynamically replace any currently visible image elements in the DOM
            // CSS escapes are needed for URLs in querySelector attributes
            try {
                const safeUrl = originalUrl.replace(/"/g, '\\"');
                const images = document.querySelectorAll(`img[src="${safeUrl}"]`);
                images.forEach(img => {
                    img.src = cachedUrl;
                });
            } catch (e) {
                console.warn('Failed to dynamically replace cached logo in DOM', e);
            }
        });
    }

// Update stream info overlay periodically
    setInterval(() => {
        // console.log('[REMINDER] Checking for upcoming reminders.'); // Too noisy
        const now = new Date();
        let changed = false;
        savedReminders.forEach(r => {
            if (r.notified) return;
            const startTime = parseEpgTime(r.startTime);
            const diffMs = startTime - now;
            // Notify if starting within 1 minute or already started (up to 1 hr past)
            if (diffMs <= 1 * 60 * 1000 && diffMs > -60 * 60 * 1000) {
                console.log('[REMINDER] Firing notification for program:', r.progTitle);
                showToast(`Programme Reminder: ${r.progTitle}\n${r.channelTitle}`);
                const notif = new Notification("Programme Reminder", {
                    body: `${r.progTitle} is starting soon on ${r.channelTitle}. Click to watch.`,
                    icon: 'assets/logo.ico'
                });

                notif.onclick = () => {
                    const targetChannel = allChannels.find(c => c.title === r.channelTitle);
                    if (targetChannel) {
                        switchTab('live-tv', document.getElementById('btn-live-tv'));
                        embedStream(targetChannel);
                    }
                };

                r.notified = true;
                changed = true;
            }
        });
        if (changed) saveReminders();
    }, 10 * 1000); // Check every 10 seconds to ensure we hit the 1 minute window

    document.addEventListener('click', (e) => {
        const btn = e.target.closest('.reminder-btn-sidebar');
        if (btn) console.log('[EVENT] Sidebar reminder button clicked.');
        if (btn) {
            e.stopPropagation();
            const progTitle = btn.getAttribute('data-prog');
            const start = btn.getAttribute('data-start');
            const stop = btn.getAttribute('data-stop');
            const channelTitle = document.getElementById('detail-name').textContent;
            toggleReminder(channelTitle, progTitle, start, stop);
            const isSet = savedReminders.some(r => r.progTitle === progTitle && r.startTime === start && r.channelTitle === channelTitle);
            if (isSet) {
                btn.style.opacity = '1';
                btn.style.filter = 'drop-shadow(0 0 4px #bb86fc)';
                showToast('Reminder Set: ' + progTitle);
            } else {
                btn.style.opacity = '0.3';
                btn.style.filter = 'grayscale(100%)';
                showToast('Reminder Removed');
            }
        }
    });

    setTimeout(() => {
        const focusables = getFocusableElements();
        if (focusables.length > 0) {
            focusables[0].focus();
        }

        window.addEventListener('focus', () => {
            if (!document.activeElement || document.activeElement === document.body) {
                const focusables = getFocusableElements();
                if (focusables.length > 0) focusables[0].focus();
            }
        });

        window.addEventListener('keydown', () => {
            if (!document.activeElement || document.activeElement === document.body) {
                const focusables = getFocusableElements();
                if (focusables.length > 0) focusables[0].focus();
            }
        });
    }, 1000);
});

function updateMpvEpgPayload(title, overview, time) {
    const epgUpdatePayload = {
        title: title || '',
        progTitle: title || '',
        progDesc: overview || '',
        progTime: time || ''
    };

    if (window.hasStartedPlayback) {
        const encoded = encodeURIComponent(JSON.stringify(epgUpdatePayload));
        window.iptvAPI.sendMpvCommand(`script-message update-epg ${encoded}`);
    } else {
        window.pendingEpgUpdate = epgUpdatePayload;
    }
}

async function updatePlayingChannelEpg(channel) {
    if (!channel || channel.type === 'movie' || channel.type === 'series' || channel.type === 'episode') return;

    const mappedId = channelMappings[channel.title];
    const epgIds = [mappedId, channel.tvg_id, channel.tvg_name].filter(Boolean);
    if (epgIds.length === 0) return;

    try {
        const epgData = await window.iptvAPI.getEpg(epgIds, null, null);

        let programmes = [];
        for (const id of epgIds) {
            const lowId = id.toLowerCase();
            if (epgData[lowId] && epgData[lowId].length > 0) { programmes = epgData[lowId]; break; }
        }

        const currentProg = getCurrentProgram(programmes);
        if (!currentProg) return;

        const pStart = parseEpgTime(currentProg.start);
        const pEnd = parseEpgTime(currentProg.stop);
        const timeStr = `${pStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${pEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

        const detailProgram = document.getElementById('detail-program');
        if (detailProgram && detailProgram.textContent !== currentProg.title) {
            console.log('[EPG TRACKER] Program changed to:', currentProg.title);

            detailProgram.textContent = currentProg.title || 'No Title';

            const detailTimeslot = document.getElementById('detail-timeslot');
            if (detailTimeslot) {
                detailTimeslot.textContent = timeStr;
                detailTimeslot.style.display = 'block';
            }

            const detailDescription = document.getElementById('detail-description');
            if (detailDescription) {
                detailDescription.textContent = currentProg.desc || 'No description available.';
                detailDescription.style.display = 'block';
            }

            // Also update the OSC inside MPV
            updateMpvEpgPayload(currentProg.title, currentProg.desc || '', timeStr);

            // Also update pendingEpgUpdate payload
            window.pendingEpgUpdate = {
                title: channel.title || '',
                progTitle: currentProg.title || '',
                progDesc: currentProg.desc || '',
                progTime: timeStr
            };
        }
    } catch (e) {
        console.error('[EPG TRACKER ERR] Failed to update playing channel EPG:', e);
    }
}

async function resolveChannelStreamUrl(channel) {
    let finalStreamUrl = channel.stream_url || channel.url || '';
    if (finalStreamUrl.startsWith('stalker-cmd:')) {
        const playlist = savedPlaylists.find(p => p.id === channel.playlist_id || p.id === channel.playlistId);
        if (playlist && playlist.epg && playlist.epg.startsWith('stalker:')) {
            const mac = playlist.epg.substring(8);
            const parts = finalStreamUrl.substring(12).split('|');
            const type = parts[0];
            const cmd = parts.slice(1).join('|');
            const resolved = await window.iptvAPI.resolveStalkerLink({ url: playlist.source, mac, type, cmd });
            if (resolved) finalStreamUrl = resolved;
        }
    }
    return finalStreamUrl;
}

// ----------------------------------------------------
// Custom Premium Glassmorphic Track Selection Overlay
// ----------------------------------------------------
try {
    window.iptvAPI.onMpvSelectAid(() => {
        console.log('[TRACK SELECTOR] Triggered premium selector for audio tracks.');
        showPremiumTrackSelector('audio');
    });
    window.iptvAPI.onMpvSelectSid(() => {
        console.log('[TRACK SELECTOR] Triggered premium selector for subtitles.');
        showPremiumTrackSelector('sub');
    });
} catch (e) {
    console.error('[TRACK SELECTOR ERR] Failed to register electron track selection listeners:', e);
}

function showPremiumTrackSelector(type) {
    const playerContainer = document.getElementById('player-container');
    if (!playerContainer) return;

    // Remove any existing track selector overlay
    const oldOverlay = document.getElementById('premium-track-selector-overlay');
    if (oldOverlay) oldOverlay.remove();

    const tracks = window.currentMpvTrackList || [];
    const filteredTracks = tracks.filter(t => t.type === (type === 'audio' ? 'audio' : 'sub'));
    const currentId = type === 'audio' ? window.currentMpvAid : window.currentMpvSid;

    const overlay = document.createElement('div');
    overlay.id = 'premium-track-selector-overlay';
    overlay.style.cssText = `
        position: absolute;
        inset: 0;
        background: rgba(12, 5, 20, 0.78);
        backdrop-filter: blur(25px);
        -webkit-backdrop-filter: blur(25px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        animation: fadeIn 0.3s ease forwards;
        font-family: 'Outfit', 'Inter', sans-serif;
        pointer-events: auto !important;
    `;

    // Click outside container to close
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.remove();
        }
    });

    const container = document.createElement('div');
    container.style.cssText = `
        width: 380px;
        background: rgba(25, 15, 38, 0.65);
        border: 1px solid rgba(187, 134, 252, 0.25);
        border-radius: 20px;
        padding: 24px;
        box-shadow: 0 20px 50px rgba(0, 0, 0, 0.8), 0 0 30px rgba(187, 134, 252, 0.05);
        display: flex;
        flex-direction: column;
        gap: 18px;
        animation: scaleUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        pointer-events: auto !important;
    `;

    const titleRow = document.createElement('div');
    titleRow.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
    `;

    const title = document.createElement('span');
    title.textContent = type === 'audio' ? 'Audio Track' : 'Subtitles';
    title.style.cssText = `
        color: #ffffff;
        font-size: 1.25rem;
        font-weight: 700;
        letter-spacing: -0.02em;
    `;

    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
    closeBtn.style.cssText = `
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        color: rgba(255, 255, 255, 0.6);
        width: 32px;
        height: 32px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.2s ease;
    `;
    closeBtn.addEventListener('mouseenter', () => {
        closeBtn.style.background = 'rgba(255, 255, 255, 0.1)';
        closeBtn.style.color = '#ffffff';
    });
    closeBtn.addEventListener('mouseleave', () => {
        closeBtn.style.background = 'rgba(255, 255, 255, 0.05)';
        closeBtn.style.color = 'rgba(255, 255, 255, 0.6)';
    });
    closeBtn.addEventListener('click', () => overlay.remove());

    titleRow.appendChild(title);
    titleRow.appendChild(closeBtn);
    container.appendChild(titleRow);

    const list = document.createElement('div');
    list.style.cssText = `
        display: flex;
        flex-direction: column;
        gap: 8px;
        max-height: 280px;
        overflow-y: auto;
        padding-right: 4px;
    `;

    // For subtitles, add a "Disable/Off" option
    const finalTracks = [...filteredTracks];
    if (type === 'sub') {
        const offOption = {
            id: 'no',
            lang: '',
            title: 'Subtitles Off',
            selected: currentId === 'no' || !currentId
        };
        finalTracks.unshift(offOption);
    }

    if (finalTracks.length === 0) {
        const emptyMsg = document.createElement('div');
        emptyMsg.textContent = 'No tracks available';
        emptyMsg.style.cssText = `
            color: rgba(255, 255, 255, 0.4);
            font-size: 0.95rem;
            text-align: center;
            padding: 20px;
        `;
        list.appendChild(emptyMsg);
    } else {
        finalTracks.forEach(t => {
            const isSelected = t.selected || (type === 'sub' && t.id === 'no' && (currentId === 'no' || !currentId));
            const item = document.createElement('div');
            item.style.cssText = `
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 12px 16px;
                background: ${isSelected ? 'rgba(187, 134, 252, 0.12)' : 'rgba(255, 255, 255, 0.03)'};
                border: 1.5px solid ${isSelected ? 'rgba(187, 134, 252, 0.35)' : 'rgba(255, 255, 255, 0.06)'};
                border-radius: 12px;
                cursor: pointer;
                transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
            `;

            const label = document.createElement('span');
            let trackName = t.title || t.lang || (t.id === 'no' ? 'Subtitles Off' : `Track ${t.id}`);
            if (t.lang) trackName += ` [${t.lang.toUpperCase()}]`;
            label.textContent = trackName;
            label.style.cssText = `
                color: ${isSelected ? '#bb86fc' : 'rgba(255, 255, 255, 0.85)'};
                font-weight: ${isSelected ? '700' : '500'};
                font-size: 0.95rem;
            `;

            item.appendChild(label);

            if (isSelected) {
                const check = document.createElement('span');
                check.innerHTML = `✔️`;
                check.style.cssText = `
                    color: #bb86fc;
                    font-size: 0.9rem;
                    text-shadow: 0 0 10px rgba(187, 134, 252, 0.5);
                `;
                item.appendChild(check);
            }

            item.addEventListener('mouseenter', () => {
                if (!isSelected) {
                    item.style.background = 'rgba(255, 255, 255, 0.08)';
                    item.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                }
            });
            item.addEventListener('mouseleave', () => {
                if (!isSelected) {
                    item.style.background = 'rgba(255, 255, 255, 0.03)';
                    item.style.borderColor = 'rgba(255, 255, 255, 0.06)';
                }
            });

            item.addEventListener('click', () => {
                if (type === 'audio') {
                    window.iptvAPI.sendMpvCommand(['set', 'aid', t.id]);
                } else {
                    window.iptvAPI.sendMpvCommand(['set', 'sid', t.id]);
                }
                overlay.remove();
            });

            list.appendChild(item);
        });
    }

    container.appendChild(list);
    overlay.appendChild(container);
    playerContainer.appendChild(overlay);
}

// System Tray navigation listener to open the DVR/Recording page
try {
    if (window.iptvAPI && typeof window.iptvAPI.onOpenDvrPage === 'function') {
        window.iptvAPI.onOpenDvrPage(() => {
            console.log('[TRAY IPC] Navigating to DVR page...');
            const recordingBtn = document.getElementById('btn-recording');
            if (recordingBtn) {
                switchTab('recording', recordingBtn);
            } else {
                console.error('[TRAY IPC] btn-recording not found in DOM');
            }
        });
    }
} catch (e) {
    console.error('Failed to register onOpenDvrPage listener:', e);
}

// Monitor DPI and display changes to re-sync native bounds
try {
    if (window.iptvAPI && typeof window.iptvAPI.onTriggerRendererBoundsSync === 'function') {
        window.iptvAPI.onTriggerRendererBoundsSync(() => {
            console.log('[BOUNDS] Display metrics changed or screen drag occurred. Resyncing layout.');
            settlePlayerBoundsAfterLayout();
        });
    }
} catch (e) {
    console.error('Failed to register display metrics change listener:', e);
}
