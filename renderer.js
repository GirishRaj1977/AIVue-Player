// Inject Aero styles for buttons, hover text size increase, and global font colour tinge
const aeroStyles = document.createElement('style');
aeroStyles.textContent = `
    /* Custom Fonts mapping from /assets/Font */
    @font-face {
        font-family: 'Inter';
        src: url('assets/Font/inter_18pt-Regular.ttf') format('truetype');
        font-weight: normal;
        font-style: normal;
    }
    @font-face {
        font-family: 'Inter';
        src: url('assets/Font/inter_18pt-Medium.ttf') format('truetype');
        font-weight: 500;
        font-style: normal;
    }
    @font-face {
        font-family: 'Inter';
        src: url('assets/Font/inter_18pt-SemiBold.ttf') format('truetype');
        font-weight: 600;
        font-style: normal;
    }
    @font-face {
        font-family: 'Inter';
        src: url('assets/Font/inter_18pt-Bold.ttf') format('truetype');
        font-weight: bold;
        font-style: normal;
    }

    body { font-family: 'Inter', sans-serif; font-weight: normal; }

    /* Headings and Titles */
    h1, h2, h3, h4, h5, h6, #detail-name { 
        font-weight: 600 !important; 
    }

    /* Standard List Items */
    .channel-item, .group-item, .mapping-ch-item, .mapping-epg-item, .epg-program-cell, .epg-play-channel { 
        font-weight: normal; 
    }

    /* Hover and Focus States */
    *:focus, .active, .channel-item:hover, .epg-program-cell:hover, .epg-play-channel:hover, .mapping-ch-item:hover, .mapping-epg-item:hover { 
        font-weight: bold !important; 
    }

    /* Spatial Navigation Focus */
    *:focus {
        outline: 2px solid #bb86fc !important;
        outline-offset: 2px;
    }

    .channel-item:focus, .group-item:focus, .mapping-ch-item:focus, .playlist-btn:focus, .nav-btn:focus, button:focus, input:focus, select:focus {
        background-color: rgba(187, 134, 252, 0.3) !important;
        outline: 2px solid #bb86fc !important;
        outline-offset: -2px;
    }
    
    .mapping-epg-item:focus, .epg-program-cell:focus, .epg-play-channel:focus {
        background-color: #bb86fc !important;
        outline: 2px solid #bb86fc !important;
        outline-offset: -2px;
        color: #000 !important;
    }

    .epg-program-cell:focus {
        z-index: 5 !important;
    }

    .mapping-epg-item:focus span, .epg-program-cell:focus div, .epg-play-channel:focus span {
        color: #000 !important;
    }

    select.remote-open {
        background-color: rgba(187, 134, 252, 0.2) !important;
        border: 1px solid #bb86fc !important;
        outline: 2px solid #bb86fc !important;
    }

    /* Fix dropdown option colors */
    select option {
        background-color: #1e1e1e !important;
        color: #e0e0e0 !important;
    }

    /* Modern sleek style for side menu buttons */
    .nav-btn {
        font-weight: 500; /* Menu text: Inter Medium */
        background-color: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.05);
        border-radius: 8px;
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        color: #e0e0e0 !important;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        cursor: pointer;
    }

    /* Enhance hover effect */
    .nav-btn:hover {
        background-color: rgba(255, 255, 255, 0.1);
        border-color: rgba(255, 255, 255, 0.15);
        box-shadow: 0 6px 12px rgba(0, 0, 0, 0.2);
        color: #ffffff !important;
        transform: translateY(-2px);
    }

    /* Active state for side menu */
    .nav-btn.active {
        background-color: rgba(187, 134, 252, 0.15);
        border-color: rgba(187, 134, 252, 0.3);
        box-shadow: 0 4px 12px rgba(187, 134, 252, 0.2);
        color: #bb86fc !important;
    }

    /* Active state for channel items */
    .channel-item {
        border-left: 4px solid transparent;
        transition: background-color 0.2s, border-left-color 0.2s;
    }
    .channel-item.active {
        background-color: rgba(187, 134, 252, 0.15) !important;
        border-left: 4px solid #bb86fc !important;
    }

    /* General modern flat styling for playlist buttons, preserving inline colors */
    .playlist-btn {
        background-color: #2a2a2a; /* Default background for those without inline styles */
        color: #e0e0e0;
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 6px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2) !important;
        backdrop-filter: blur(4px);
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        cursor: pointer;
        opacity: 0.95;
        padding: 6px 12px;
    }
    .playlist-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 8px rgba(0,0,0,0.4) !important;
        opacity: 1;
        filter: brightness(1.2);
    }
    .playlist-btn:active {
        transform: translateY(0);
        box-shadow: 0 1px 2px rgba(0,0,0,0.2) !important;
        filter: brightness(0.9);
    }

    /* Sidebar Layout Adjustments */
    #nav-bar {
        display: flex !important;
        flex-direction: column !important;
        justify-content: flex-start !important;
        padding-top: 20px !important;
        gap: 10px !important;
    }
    .nav-btn {
        margin-bottom: 0 !important;
        width: 100% !important;
        box-sizing: border-box !important;
    }
    #btn-exit {
        color: #cf6679 !important;
    }
    #btn-exit:hover {
        background-color: rgba(207, 102, 121, 0.15) !important;
        border-color: rgba(207, 102, 121, 0.3) !important;
        color: #ffb4c1 !important;
        box-shadow: 0 4px 12px rgba(207, 102, 121, 0.2) !important;
    }

    /* Prevent overlays from stealing mouse clicks */
    #player-overlay {
        pointer-events: none !important;
    }

    /* Live TV Screen Split Layout */
    #sidebar {
        flex: 0 0 22.5% !important;
        max-width: 22.5% !important;
        width: 22.5% !important;
        min-width: 0 !important;
        min-height: 0 !important;
        overflow: hidden !important;
        box-sizing: border-box !important;
    }
    #main-view {
        flex: 1 !important;
        display: flex !important;
        flex-direction: column !important;
        min-width: 0 !important;
        min-height: 0 !important;
        overflow: hidden !important;
    }
    #live-top-half {
        display: flex !important;
        flex-direction: row !important;
        height: 50% !important;
        width: 100% !important;
        gap: 12px !important;
        min-width: 0 !important;
        min-height: 0 !important;
    }
    #live-bottom-half {
        height: 50% !important;
        width: 100% !important;
        overflow-y: auto !important;
        min-width: 0 !important;
        min-height: 0 !important;
    }
    #player-wrapper {
        flex: 5 !important;
        order: 2 !important;
        background-color: #333 !important;
        padding: 1px !important;
        box-sizing: border-box !important;
        border-radius: 0 !important;
        position: relative !important;
        display: flex !important;
        flex-direction: column !important;
        overflow: hidden !important;
        min-width: 0 !important;
        min-height: 0 !important;
    }
    #player-container {
        flex: 1 !important;
        position: relative !important;
        width: 100% !important;
        height: 100% !important;
        min-width: 0 !important;
        min-height: 0 !important;
        background: #000 !important;
    }
    #channel-details {
        flex: 2 !important;
        order: 1 !important;
        overflow-y: auto !important;
        min-width: 0 !important;
        min-height: 0 !important;
    }

    /* Custom Fullscreen button overlay */
    #fullscreen-btn {
        position: absolute;
        top: 10px;
        right: 10px;
        background: rgba(0,0,0,0.5);
        color: white;
        border: 1px solid rgba(255,255,255,0.2);
        border-radius: 5px;
        width: 32px;
        height: 32px;
        font-size: 20px;
        line-height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        z-index: 100;
        transition: opacity 0.3s;
        opacity: 0;
    }
    #player-container:hover #fullscreen-btn {
        opacity: 1;
    }

    #import-submit-btn, #import-cancel-btn {
        padding: 8px 16px !important;
        font-size: 0.9em !important;
        height: auto !important;
        width: fit-content !important;
        min-width: 100px;
        white-space: nowrap;
    }
`;
document.head.appendChild(aeroStyles);

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

let savedPlaylists = [];
let allChannels = [];
let streamActive = false;
let currentPlayingChannelIndex = -1;
let editingPlaylistIndex = -1;

let savedEpgs = [];
let channelMappings = {};

let savedReminders = JSON.parse(localStorage.getItem('iptv_reminders') || '[]');

// Prevent forms from reloading the Electron application
document.addEventListener('submit', (e) => {
    e.preventDefault();
});

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

function showToast(message) {
    console.log(`[UI] showToast: "${message}"`);
    let toast = document.getElementById('toast-notification');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast-notification';
        toast.style.cssText = 'position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%); background: #bb86fc; color: #000; padding: 12px 24px; border-radius: 30px; z-index: 10000; font-weight: bold; font-family: "Inter", sans-serif; box-shadow: 0 5px 15px rgba(0,0,0,0.5); transition: opacity 0.3s; opacity: 0; pointer-events: none;';
        toast.style.cssText = 'position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%); background: #bb86fc; color: #000; padding: 12px 24px; border-radius: 30px; z-index: 10000; font-weight: bold; font-family: "Inter", sans-serif; box-shadow: 0 5px 15px rgba(0,0,0,0.5); transition: opacity 0.3s; opacity: 0; pointer-events: none; white-space: pre-wrap; text-align: center;';
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.style.opacity = '1';
    
    if (toast.hideTimeout) clearTimeout(toast.hideTimeout);
    toast.hideTimeout = setTimeout(() => {
        toast.style.opacity = '0';
    }, 3000);
}

// Variables for the 2-column Mapping UI
let mappingSelectedPlaylist = 'all';
let mappingSelectedChannel = null;
let mappingSelectedEpg = null;
let epgChannelsData = null;

let epgSelectedPlaylist = 'all';
let epgSelectedGroup = 'all';

// Global variables for virtualized EPG Guide
let epgGridState = null;
let epgChannelsToRender = [];
let epgCache = {};
let epgLoadingSet = new Set();
let epgLastStartIndex = -1;
let epgLastEndIndex = -1;
let epgLastScrollLeft = -1;
let epgScrollTicking = false;

function formatDateToEpgString(date) {
    const pad = n => n.toString().padStart(2, '0');
    return `${date.getUTCFullYear()}${pad(date.getUTCMonth()+1)}${pad(date.getUTCDate())}${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}`;
}

let mappingDebounceTimer;
function debouncedRenderMappingColumns() {
    clearTimeout(mappingDebounceTimer);
    mappingDebounceTimer = setTimeout(renderMappingColumns, 200);
}

function getEpgName(url) {
    if (!url || url === 'Not Configured') return 'Not Configured';
    try {
        return new URL(url).hostname;
    } catch (e) {
        return url.split('\\').pop().split('/').pop();
    }
}

function sortAlphaNum(a, b) {
    return (a || '').toString().localeCompare((b || '').toString(), undefined, { numeric: true, sensitivity: 'base' });
}

async function autoMapChannels(showSummaryAlert = false, skipSave = false) {
    console.log('[MAPPING] Starting auto-map process...');
    let mappedCount = 0;
    const epgLookup = {};
    if (epgChannelsData) {
        epgChannelsData.forEach(epg => {
            if (epg.id) epgLookup[epg.id.toLowerCase()] = epg.id;
            if (epg.name) epgLookup[epg.name.toLowerCase()] = epg.id;
        });
    }

    const uniqueTitles = new Set();
    for (const ch of allChannels) {
        const title = ch.title || 'Unknown Channel';
        if (uniqueTitles.has(title)) continue;
        uniqueTitles.add(title);
        
        if (channelMappings[title]) continue; // Skip already mapped channels

        let matchedEpgId = null;
        const tvgIdLow = ch.tvg_id ? String(ch.tvg_id).toLowerCase() : null;
        const tvgNameLow = ch.tvg_name ? String(ch.tvg_name).toLowerCase() : null;
        const titleLow = ch.title ? String(ch.title).toLowerCase() : null;

        if (tvgIdLow && epgLookup[tvgIdLow]) matchedEpgId = epgLookup[tvgIdLow];
        else if (tvgNameLow && epgLookup[tvgNameLow]) matchedEpgId = epgLookup[tvgNameLow];
        else if (titleLow && epgLookup[titleLow]) matchedEpgId = epgLookup[titleLow];

        if (matchedEpgId) {
            channelMappings[title] = matchedEpgId;
            await window.iptvAPI.saveMapping(title, matchedEpgId);
            mappedCount++;
        }
    }

    if (mappedCount > 0) {
        console.log(`[MAPPING] Auto-mapped ${mappedCount} new channels.`);
        updateState(skipSave);
        renderMappingColumns();
        if (showSummaryAlert) showToast(`Successfully auto-mapped ${mappedCount} channels!`);
    } else {
        console.log('[MAPPING] No new channels could be auto-mapped.');
        if (showSummaryAlert) showToast("No new channels could be auto-mapped.");
    }
}

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

function renderMappingColumns() {
    console.log('[MAPPING] Rendering mapping columns.');
    const channelListEl = document.getElementById('mapping-channel-list');
    const epgListEl = document.getElementById('mapping-epg-list');
    const mappedListEl = document.getElementById('mapping-mapped-list');
    if (!channelListEl || !epgListEl || !mappedListEl) return;

    const chSearch = (document.getElementById('mapping-channel-search').value || '').toLowerCase();
    const epgSearch = (document.getElementById('mapping-epg-search').value || '').toLowerCase();
    const mappedSearch = (document.getElementById('mapping-mapped-search').value || '').toLowerCase();
    const epgSourceFilter = document.getElementById('mapping-epg-filter').value;

    const playlistNameLookup = {};
    savedPlaylists.forEach(p => { playlistNameLookup[p.id] = p.name; });

    const titleToPlaylistId = {};
    allChannels.forEach(c => { if (!titleToPlaylistId[c.title]) titleToPlaylistId[c.title] = c.playlistId; });

    // 1. Render Left Column (Channels)
    let chHtmlArr = [];
    let filteredChannels = mappingSelectedPlaylist === 'all' ? allChannels : allChannels.filter(c => String(c.playlistId) === String(mappingSelectedPlaylist));
    const validTitlesForPlaylist = new Set(filteredChannels.map(c => c.title));

    const matchingChannels = [];
    const seenTitles = new Set();
    for (let c of filteredChannels) {
        if (c.title && !channelMappings[c.title] && !seenTitles.has(c.title)) {
            if (!chSearch || String(c.title).toLowerCase().includes(chSearch)) {
                matchingChannels.push(c);
                seenTitles.add(c.title);
            }
        }
    }

    matchingChannels.sort((a, b) => sortAlphaNum(a.title, b.title));

    const maxChDisplay = 300;
    const displayChannels = matchingChannels.slice(0, maxChDisplay);

    displayChannels.forEach(c => {
        const title = c.title || 'Unknown Channel';
        const safeTitle = title.replace(/</g, "&lt;").replace(/>/g, "&gt;");

        let bg = 'transparent';
        let color = '#e0e0e0';
        let border = '1px solid #333';
        
        if (mappingSelectedChannel === title) {
            bg = '#1a3a1a'; // Selected: Green highlight
            border = '1px solid #43CB44';
            color = '#43CB44';
        }

        let playlistNameStr = '';
        if (mappingSelectedPlaylist === 'all' && c.playlistId && playlistNameLookup[c.playlistId]) {
            playlistNameStr = ` <span style="color: #888; font-size: 0.9em; font-weight: normal;">[${playlistNameLookup[c.playlistId]}]</span>`;
        }

        chHtmlArr.push(`
            <div class="mapping-ch-item" tabindex="0" data-title="${safeTitle.replace(/"/g, '&quot;')}" style="padding: 10px; margin-bottom: 6px; background: ${bg}; border: ${border}; border-radius: 4px; cursor: pointer; transition: 0.1s; outline: none;">
                <div style="color: ${color}; font-weight: ${mappingSelectedChannel === title ? 'bold' : 'normal'}; pointer-events: none; font-size: 0.8em; font-family: 'Inter', sans-serif;">${safeTitle}${playlistNameStr}</div>
            </div>
        `);
    });
    
    let chHtml = chHtmlArr.join('');
    if (matchingChannels.length > maxChDisplay) {
        chHtml += `<div style="color: #888; text-align: center; margin-top: 10px; font-size: 0.9em;">Showing ${maxChDisplay} of ${matchingChannels.length} channels. Use search to find more.</div>`;
    } else if (!chHtml) {
        chHtml = '<div style="color: #888; text-align: center; margin-top: 20px;">No channels found.</div>';
    }
    channelListEl.innerHTML = chHtml;

    // 2. Render Right Column (EPG)
    let epgHtmlArr = [];
    let filteredEpgs = (epgChannelsData || []).filter(e => {
        if (epgSourceFilter !== 'all' && e.source !== epgSourceFilter) return false;
        if (epgSearch && !String(e.name || '').toLowerCase().includes(epgSearch) && !String(e.id || '').toLowerCase().includes(epgSearch)) return false;
        return true;
    });
    
    filteredEpgs.sort((a, b) => sortAlphaNum(a.name || a.id, b.name || b.id));

    const maxEpgDisplay = 300; // Limits DOM nodes for massive XML files
    let displayEpgs = filteredEpgs.slice(0, maxEpgDisplay);

    displayEpgs.forEach(epg => {
        const isSelected = mappingSelectedEpg === epg.id;
        let bg = isSelected ? '#1a3a1a' : 'transparent';
        let color = isSelected ? '#43CB44' : '#e0e0e0';
        let border = isSelected ? '1px solid #43CB44' : '1px solid #333';

        const safeName = (epg.name || epg.id).replace(/</g, "&lt;").replace(/>/g, "&gt;");
        const safeId = epg.id.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        const sourceDomain = epgSourceFilter === 'all' && epg.source ? `<span style="color: #888; font-size: 0.8em; margin-left: 8px;">(${getEpgName(epg.source)})</span>` : '';

        epgHtmlArr.push(`
            <div class="mapping-epg-item" tabindex="0" data-id="${safeId.replace(/"/g, '&quot;')}" style="display: flex; justify-content: space-between; align-items: center; padding: 10px; margin-bottom: 6px; background: ${bg}; border: ${border}; border-radius: 4px; cursor: pointer; transition: 0.1s; outline: none;">
                <span style="color: ${color}; font-weight: ${isSelected ? 'bold' : 'normal'}; pointer-events: none; font-size: 0.8em; font-family: 'Inter', sans-serif;">${safeName}${sourceDomain}</span>
                ${isSelected ? `<button class="mapping-confirm-btn playlist-btn" style="background: #43CB44; color: black; border: none; font-size: 0.9em; padding: 2px 8px; cursor: pointer; border-radius: 4px; font-weight: bold;">✔️</button>` : ''}
            </div>
        `);
    });
    
    let epgHtml = epgHtmlArr.join('');
    if (filteredEpgs.length > maxEpgDisplay) {
        epgHtml += `<div style="color: #888; text-align: center; margin-top: 10px; font-size: 0.9em;">Showing ${maxEpgDisplay} of ${filteredEpgs.length} EPGs. Use search to find more.</div>`;
    } else if (!epgHtml) {
        epgHtml = '<div style="color: #888; text-align: center; margin-top: 20px;">No EPG channels found.</div>';
    }
    epgListEl.innerHTML = epgHtml;

    // 3. Render Right Column (Mapped List)
    let mappedHtmlArr = [];
    
    // Quick lookup for EPG names
    const epgNameLookup = {};
    const epgSourceLookup = {};
    if (epgChannelsData) {
        epgChannelsData.forEach(e => { 
            epgNameLookup[e.id] = e.name || e.id; 
            epgSourceLookup[e.id] = e.source;
        });
    }

    Object.entries(channelMappings).sort((a, b) => sortAlphaNum(a[0], b[0])).forEach(([chTitle, epgId]) => {
        if (!epgId) return;
        
        if (mappingSelectedPlaylist !== 'all' && !validTitlesForPlaylist.has(chTitle)) return;

        const safeTitle = String(chTitle).replace(/</g, "&lt;").replace(/>/g, "&gt;");
        const epgName = epgNameLookup[epgId] || epgId;
        const safeEpgName = String(epgName).replace(/</g, "&lt;").replace(/>/g, "&gt;");

        if (mappedSearch && !safeTitle.toLowerCase().includes(mappedSearch) && !safeEpgName.toLowerCase().includes(mappedSearch)) return;

        let sourceDomainStr = '';
        const rawSource = epgSourceLookup[epgId];
        if (rawSource) {
            let domain = getEpgName(rawSource);
            if (domain && domain !== 'Not Configured') {
                sourceDomainStr = `<span style="color: #888; font-size: 0.8em; margin-left: 8px;">(${domain})</span>`;
            }
        }

        let playlistNameStr = '';
        if (mappingSelectedPlaylist === 'all') {
            const pId = titleToPlaylistId[chTitle];
            if (pId && playlistNameLookup[pId]) {
                playlistNameStr = ` <span style="color: #888; font-size: 0.9em; font-weight: normal;">[${playlistNameLookup[pId]}]</span>`;
            }
        }

        mappedHtmlArr.push(`
            <div class="mapping-mapped-item" style="display: flex; justify-content: space-between; align-items: center; padding: 10px; margin-bottom: 6px; background: transparent; border: 1px solid #333; border-radius: 4px;">
                <div style="font-size: 0.8em; color: #e0e0e0; font-family: 'Inter', sans-serif; flex-grow: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-right: 10px;" title="${safeTitle} ⇄ ${safeEpgName}">
                    ${safeTitle}${playlistNameStr} <span style="color: #bb86fc; font-weight: bold; margin: 0 4px;">⇄</span> ${safeEpgName}${sourceDomainStr}
                </div>
                <button class="mapping-unmap-btn playlist-btn" data-title="${safeTitle.replace(/"/g, '&quot;')}" style="background: transparent; color: #cf6679; border: none; font-size: 1.2em; padding: 0 5px; cursor: pointer;">&times;</button>
            </div>
        `);
    });
    mappedListEl.innerHTML = mappedHtmlArr.length ? mappedHtmlArr.join('') : '<div style="color: #888; text-align: center; margin-top: 20px;">No mappings yet.</div>';

    // 4. Attach Event Listeners for the dynamic items
    document.querySelectorAll('.mapping-ch-item').forEach(el => {
        el.addEventListener('click', (e) => {
            mappingSelectedChannel = el.getAttribute('data-title');
            renderMappingColumns();
        });
    });

    document.querySelectorAll('.mapping-epg-item').forEach(el => {
        el.addEventListener('click', (e) => {
            if (e.target.closest('.mapping-confirm-btn')) return;
            mappingSelectedEpg = el.getAttribute('data-id');
            renderMappingColumns();
        });
    });

    document.querySelectorAll('.mapping-confirm-btn').forEach(el => {
        el.addEventListener('click', async (e) => {
            e.stopPropagation();
            if (!mappingSelectedChannel || !mappingSelectedEpg) {
                showToast("Select a channel and an EPG source first.");
                return;
            }
            
            const btn = e.target;
            btn.innerHTML = '⏳';
            btn.disabled = true;

            await applySingleMapping(mappingSelectedChannel, mappingSelectedEpg);
            
            mappingSelectedChannel = null;
            mappingSelectedEpg = null;
            renderMappingColumns();
        });
    });

    document.querySelectorAll('.mapping-unmap-btn').forEach(el => {
        el.addEventListener('click', async (e) => {
            e.stopPropagation();
            const title = el.getAttribute('data-title');
            
            const btn = e.target;
            btn.innerHTML = '⏳';
            btn.disabled = true;

            await applySingleMapping(title, null); // null unmaps
            
            if (mappingSelectedChannel === title) mappingSelectedChannel = null;
            renderMappingColumns();
        });
    });
}

async function renderSettings() {
    const settingsView = document.getElementById('settings-view');
    console.log('[UI] Rendering settings view.');
    if (!settingsView) return;

    savedEpgs.sort((a, b) => sortAlphaNum(getEpgName(a), getEpgName(b)));

    let epgListHtml = savedEpgs.map((epg, idx) => `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; background: #2a2a2a; margin-bottom: 8px; border-radius: 6px;">
            <div style="display: flex; flex-direction: column; flex-grow: 1; margin-right: 15px; overflow: hidden; min-width: 0;">
                <span style="color: #bb86fc; font-weight: bold; margin-bottom: 4px;">${getEpgName(epg)}</span>
                <span style="color: #888; font-size: 0.85em; word-break: break-all;">${epg}</span>
            </div>
            <div style="display: flex; gap: 8px; align-items: center;">
                <button class="playlist-btn refresh-epg-btn" data-idx="${idx}" style="background: #43CB44; color: black; padding: 6px 12px; border-radius: 4px; font-weight: bold;">Refresh</button>
                <button class="playlist-btn remove-epg-btn" data-idx="${idx}" style="background: #cf6679; color: black; padding: 6px 12px; border-radius: 4px;">Remove</button>
            </div>
        </div>
    `).join('');

    const now = new Date();
    const futureReminders = (savedReminders || []).filter(r => parseEpgTime(r.startTime) > now).sort((a,b) => parseEpgTime(a.startTime) - parseEpgTime(b.startTime));
    
    let remindersHtml = futureReminders.length ? futureReminders.map((r, i) => {
        const st = parseEpgTime(r.startTime).toLocaleString([], {weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'});
        return `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; background: #2a2a2a; margin-bottom: 8px; border-radius: 6px;">
            <div style="display: flex; flex-direction: column; flex-grow: 1; overflow: hidden; min-width: 0;">
                <span style="color: #bb86fc; font-weight: bold; margin-bottom: 4px;">${r.progTitle}</span>
                <span style="color: #888; font-size: 0.85em;">${r.channelTitle} &bull; ${st}</span>
            </div>
            <button class="playlist-btn remove-reminder-btn" data-idx="${i}" style="background: transparent; color: #cf6679; border: none; font-size: 1.2em; padding: 0 5px; cursor: pointer;" title="Remove Reminder">&times;</button>
        </div>`;
    }).join('') : '<div style="color:#666; font-style: italic;">No upcoming reminders.</div>';

    const remoteSettings = await window.iptvAPI.getRemoteSettings();
    const ipAddress = await window.iptvAPI.getIpAddress();
    
    const port = remoteSettings.port || 8088;
    const remoteUrl = `http://${ipAddress}:${port}/remote`;
    let remoteUrlWithAuth = remoteUrl;
    if (remoteSettings.username && remoteSettings.password) {
        remoteUrlWithAuth = `http://${encodeURIComponent(remoteSettings.username)}:${encodeURIComponent(remoteSettings.password)}@${ipAddress}:${port}/remote`;
    }

    settingsView.innerHTML = `
        <div style="padding: 20px; width: 100%; max-width: 1000px; margin: 0 auto; box-sizing: border-box; overflow-y: auto; overflow-x: hidden; min-width: 0;">
            <h2 style="color: #bb86fc; border-bottom: 1px solid #333; padding-bottom: 15px; margin-top: 0;">Settings</h2>
            
            <div style="margin-top: 30px; background: #1e1e1e; padding: 25px; border-radius: 8px; border: 1px solid #333; min-width: 0;">
                <h3 style="color: #e0e0e0; margin-top: 0; margin-bottom: 5px;">External EPG Sources</h3>
                <p style="color: #888; font-size: 0.9em; margin-bottom: 20px;">Add multiple XMLTV EPG URLs to load automatically for your playlists. (Requires refreshing your playlist to take effect).</p>
                <div style="display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap;">
                    <input type="text" id="settings-new-epg" placeholder="http://.../epg.xml" style="flex: 1; min-width: 250px; background: #121212; border: 1px solid #444; color: white; padding: 10px; border-radius: 4px; outline: none; box-sizing: border-box;">
                    <button id="settings-add-epg-btn" class="playlist-btn" style="background: #bb86fc; color: black; font-weight: bold; padding: 10px 20px; white-space: nowrap;">Add EPG</button>
                </div>
                <div id="settings-epg-list">${epgListHtml || '<div style="color:#666; font-style: italic;">No external EPGs added.</div>'}</div>
            </div>

            <!-- Reminders Card -->
            <div style="margin-top: 30px; background: #1e1e1e; padding: 25px; border-radius: 8px; border: 1px solid #333; min-width: 0;">
                <h3 style="color: #e0e0e0; margin-top: 0; margin-bottom: 5px;">Upcoming Reminders</h3>
                <p style="color: #888; font-size: 0.9em; margin-bottom: 20px;">Manage your scheduled program notifications.</p>
                <div id="settings-reminders-list" style="max-height: 300px; overflow-y: auto;">
                    ${remindersHtml}
                </div>
            </div>

            <!-- 3-Column Channel Mapping UI -->
            <div style="margin-top: 30px; background: #1e1e1e; padding: 25px; border-radius: 8px; border: 1px solid #333; display: flex; flex-direction: column; height: 600px; min-width: 0;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 10px;">
                    <div style="flex: 1; min-width: 250px;">
                        <h3 style="color: #e0e0e0; margin: 0;">Channel Mapping</h3>
                        <p style="color: #888; font-size: 0.9em; margin: 5px 0 15px 0;">Select a channel on the left and an EPG on the right. Instant apply updates Live TV/Guide immediately.</p>
                    </div>
                    <button id="mapping-auto-map-btn" class="playlist-btn" style="background: #43CB44; color: black; font-weight: bold; padding: 6px 12px; border-radius: 4px; font-size: 0.9em; cursor: pointer; white-space: nowrap;">Auto Map</button>
                </div>
                
                <div style="display: flex; gap: 15px; flex-grow: 1; min-height: 0; min-width: 0;">
                    <!-- Left Column: Playlist Channels -->
                    <div style="flex: 28; display: flex; flex-direction: column; background: #121212; border: 1px solid #444; border-radius: 6px; overflow: hidden; min-width: 0;">
                        <div style="padding: 10px; background: #252525; border-bottom: 1px solid #444;">
                            <select id="mapping-playlist-filter" style="width: 100%; background: #121212; color: white; border: 1px solid #555; padding: 6px; border-radius: 4px; outline: none; margin-bottom: 8px;">
                                <option value="all">All Playlists</option>
                                ${savedPlaylists.map(p => `<option value="${p.id}" ${mappingSelectedPlaylist === String(p.id) ? 'selected' : ''}>${p.name}</option>`).join('')}
                            </select>
                            <input type="text" id="mapping-channel-search" placeholder="Search Channels..." style="width: 100%; background: #121212; color: white; border: 1px solid #555; padding: 6px; border-radius: 4px; outline: none; box-sizing: border-box;">
                        </div>
                        <div id="mapping-channel-list" style="flex-grow: 1; overflow-y: auto; padding: 10px;"></div>
                    </div>
                    
                    <!-- Right Column: Available EPG Channels -->
                    <div style="flex: 28; display: flex; flex-direction: column; background: #121212; border: 1px solid #444; border-radius: 6px; overflow: hidden; min-width: 0;">
                        <div style="padding: 10px; background: #252525; border-bottom: 1px solid #444;">
                            <select id="mapping-epg-filter" style="width: 100%; background: #121212; color: white; border: 1px solid #555; padding: 6px; border-radius: 4px; outline: none; margin-bottom: 8px;">
                                <option value="all">All EPG Sources</option>
                            </select>
                            <input type="text" id="mapping-epg-search" placeholder="Search EPG..." style="width: 100%; background: #121212; color: white; border: 1px solid #555; padding: 6px; border-radius: 4px; outline: none; box-sizing: border-box;">
                        </div>
                        <div id="mapping-epg-list" style="flex-grow: 1; overflow-y: auto; padding: 10px;">
                            <div style="padding: 20px; text-align: center; color: #888;">Fetching EPG Data...</div>
                        </div>
                    </div>

                    <!-- Right Column: Mapped List -->
                    <div style="flex: 44; display: flex; flex-direction: column; background: #121212; border: 1px solid #444; border-radius: 6px; overflow: hidden; min-width: 0;">
                        <div style="padding: 10px; background: #252525; border-bottom: 1px solid #444;">
                            <h3 style="color: #e0e0e0; margin: 0; font-size: 1em; padding: 6px 0; margin-bottom: 6px;">Mapped Channels</h3>
                            <input type="text" id="mapping-mapped-search" placeholder="Search Mapped..." style="width: 100%; background: #121212; color: white; border: 1px solid #555; padding: 6px; border-radius: 4px; outline: none; box-sizing: border-box;">
                        </div>
                        <div id="mapping-mapped-list" style="flex-grow: 1; overflow-y: auto; padding: 10px;"></div>
                    </div>
                </div>
            </div>

            <!-- Remote Control -->
            <div style="margin-top: 30px; background: #1e1e1e; padding: 25px; border-radius: 8px; border: 1px solid #333; min-width: 0;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; flex-wrap: wrap; gap: 10px;">
                    <div>
                        <h3 style="color: #e0e0e0; margin-top: 0; margin-bottom: 5px;">Remote Control</h3>
                        <p style="color: #888; font-size: 0.9em; margin: 0;">Control AIVue Player from your smartphone or tablet on the same Wi-Fi network.</p>
                    </div>
                    <label style="display: flex; align-items: center; cursor: pointer; background: #121212; padding: 8px 12px; border-radius: 6px; border: 1px solid #444;">
                        <input type="checkbox" id="settings-remote-toggle" ${remoteSettings.enabled ? 'checked' : ''} style="margin-right: 10px; width: 18px; height: 18px; cursor: pointer;">
                        <span id="settings-remote-status" style="color: ${remoteSettings.enabled ? '#43CB44' : '#cf6679'}; font-weight: bold;">${remoteSettings.enabled ? 'Enabled' : 'Disabled'}</span>
                    </label>
                </div>
                
                <div id="settings-remote-config" style="display: ${remoteSettings.enabled ? 'block' : 'none'}; border-top: 1px solid #333; padding-top: 20px; margin-top: 10px;">
                    <div style="display: flex; gap: 15px; flex-wrap: wrap; margin-bottom: 20px;">
                        <div style="flex: 1; min-width: 150px;">
                            <label style="color: #bbb; font-size: 0.9em; display: block; margin-bottom: 5px;">Port</label>
                            <input type="number" id="settings-remote-port" value="${port}" placeholder="8088" style="width: 100%; background: #121212; border: 1px solid #444; color: white; padding: 10px; border-radius: 4px; outline: none; box-sizing: border-box;">
                        </div>
                        <div style="flex: 2; min-width: 200px;">
                            <label style="color: #bbb; font-size: 0.9em; display: block; margin-bottom: 5px;">Username (min 5 chars)</label>
                            <input type="text" id="settings-remote-user" value="${remoteSettings.username || ''}" placeholder="Username" style="width: 100%; background: #121212; border: 1px solid #444; color: white; padding: 10px; border-radius: 4px; outline: none; box-sizing: border-box;">
                        </div>
                        <div style="flex: 2; min-width: 200px;">
                            <label style="color: #bbb; font-size: 0.9em; display: block; margin-bottom: 5px;">Password (min 5 chars)</label>
                            <input type="password" id="settings-remote-pass" value="${remoteSettings.password || ''}" placeholder="Password" style="width: 100%; background: #121212; border: 1px solid #444; color: white; padding: 10px; border-radius: 4px; outline: none; box-sizing: border-box;">
                        </div>
                        <div style="display: flex; align-items: flex-end;">
                            <button id="settings-save-remote-btn" class="playlist-btn" style="background: #bb86fc; color: black; font-weight: bold; padding: 10px 24px; height: 39px; white-space: nowrap;">Save Credentials</button>
                        </div>
                    </div>
                    
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; padding: 10px; background: #252525; border: 1px solid #444; border-radius: 4px;">
                        <span style="color: #bbb; font-size: 0.9em;">Paired Device: <strong style="color: ${remoteSettings.activeDeviceId ? '#43CB44' : '#888'};">${remoteSettings.activeDeviceId ? 'Connected' : 'None'}</strong></span>
                        <button id="settings-revoke-device-btn" class="playlist-btn" style="background: ${remoteSettings.activeDeviceId ? '#cf6679' : '#333'}; color: ${remoteSettings.activeDeviceId ? 'black' : '#888'}; font-weight: bold; padding: 6px 12px; border-radius: 4px;" ${!remoteSettings.activeDeviceId ? 'disabled' : ''}>Revoke Access</button>
                    </div>

                    <label style="color: #bbb; font-size: 0.9em; display: block; margin-bottom: 5px;">Remote URL</label>
                    <div style="display: flex; align-items: center; justify-content: space-between; background: #121212; border: 1px solid #444; border-radius: 4px; padding: 10px 15px; gap: 15px; flex-wrap: wrap;">
                        <span style="font-family: monospace; color: #bb86fc; font-size: 1.1em; word-break: break-all; flex: 1; min-width: 200px;">${remoteUrl}</span>
                        <button id="settings-copy-remote-btn" class="playlist-btn" data-url="${remoteUrlWithAuth}" style="background: #2a2a2a; color: #e0e0e0; padding: 8px 16px; border-radius: 4px; font-weight: bold; white-space: nowrap; flex-shrink: 0;" title="Copies a link with embedded login credentials">Copy Auto-Login URL</button>
                    </div>
                </div>
            </div>

            <!-- Danger Zone -->
            <div style="margin-top: 30px; background: #1e1e1e; padding: 25px; border-radius: 8px; border: 1px solid #cf6679; min-width: 0;">
                <h3 style="color: #cf6679; margin-top: 0; margin-bottom: 5px;">Danger Zone</h3>
                <p style="color: #888; font-size: 0.9em; margin-bottom: 15px;">Completely wipe the database and reset the application to its default state. This action cannot be undone.</p>
                <button id="settings-factory-reset-btn" class="playlist-btn" style="background: #cf6679; color: black; font-weight: bold; padding: 8px 16px;">Factory Reset</button>
            </div>
        </div>
    `;

    document.getElementById('settings-add-epg-btn').addEventListener('click', () => {
        const val = document.getElementById('settings-new-epg').value.trim();
        console.log('[SETTINGS] Add EPG button clicked. Value:', val);
        if (val && !savedEpgs.includes(val)) {
            savedEpgs.push(val);
            window.iptvAPI.addExternalEpg(val);
            renderSettings();
        }
    });

    document.querySelectorAll('.refresh-epg-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const idx = parseInt(e.target.getAttribute('data-idx'));
            console.log('[SETTINGS] Refresh EPG button clicked for index:', idx);
            const epgSource = savedEpgs[idx];
            
            const originalText = e.target.textContent;
            e.target.textContent = '⏳';
            e.target.disabled = true;

            // 1. Wipe local file cache and Node.js memory cache for this URL
            console.log('[API] Calling clearCache for', epgSource);
            await window.iptvAPI.clearCache(epgSource);

            // 2. Fetch fresh EPG list (this triggers python to download since cache is gone)
            let allEpgSources = savedEpgs.slice();
            console.log('[API] Calling getEpgChannels for all sources.');
            savedPlaylists.forEach(p => {
                if (p.epg && p.epg !== 'Not Configured' && !allEpgSources.includes(p.epg)) {
                    allEpgSources.push(p.epg);
                }
            });
            const combinedEpgs = allEpgSources.join(',');
            epgChannelsData = await window.iptvAPI.getEpgChannels(combinedEpgs);

            // 3. Re-render the mapping view so new EPG channels appear
            renderMappingColumns();
            
            e.target.textContent = 'Refreshed ✔️';
            setTimeout(() => {
                e.target.textContent = originalText;
                e.target.disabled = false;
            }, 2000);
        });
    });

    document.querySelectorAll('.remove-epg-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const idx = parseInt(e.target.getAttribute('data-idx'));
            console.log('[SETTINGS] Remove EPG button clicked for index:', idx);
            const epgSource = savedEpgs[idx];
            
            // 1. Unmap all channels mapped to this EPG source
            const epgIdsToRemove = new Set();
            if (epgChannelsData) {
                epgChannelsData.forEach(epg => {
                    if (epg.source === epgSource) {
                        epgIdsToRemove.add(epg.id);
                    }
                });
            }

            const titlesToUnmap = [];
            Object.entries(channelMappings).forEach(([chTitle, epgId]) => {
                if (epgIdsToRemove.has(epgId)) {
                    titlesToUnmap.push(chTitle);
                }
            });

            if (titlesToUnmap.length > 0) {
                console.log(`[MAPPING] Unmapping ${titlesToUnmap.length} channels associated with removed EPG.`);
                for (const title of titlesToUnmap) {
                    delete channelMappings[title];
                    await window.iptvAPI.saveMapping(title, null);
                }
                updateState(true); // Update the channels without forcing a DB save of the playlist
            }

            // Check if this EPG is still actively used by an imported playlist
            const isUsedByPlaylist = savedPlaylists.some(p => p.epg === epgSource);
            
            // Only wipe the physical cache files if it's completely unused
            if (epgSource && !isUsedByPlaylist) {
                await window.iptvAPI.clearCache(epgSource);
                console.log('[API] Cache cleared for unused EPG:', epgSource);
            }
            
            savedEpgs.splice(idx, 1);
            await window.iptvAPI.removeExternalEpg(epgSource);
            
            if (epgChannelsData) {
                epgChannelsData = epgChannelsData.filter(epg => epg.source !== epgSource);
            }

            renderSettings();
        });
    });

    document.querySelectorAll('.remove-reminder-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = parseInt(e.currentTarget.getAttribute('data-idx'));
            console.log('[SETTINGS] Remove reminder button clicked for index:', idx);
            const reminderToRemove = futureReminders[idx];
            const realIdx = savedReminders.findIndex(r => r.channelTitle === reminderToRemove.channelTitle && r.progTitle === reminderToRemove.progTitle && r.startTime === reminderToRemove.startTime);
            if (realIdx > -1) {
                savedReminders.splice(realIdx, 1);
                saveReminders();
                renderSettings();
            }
        });
    });

    document.getElementById('settings-copy-remote-btn').addEventListener('click', (e) => {
        const url = e.target.getAttribute('data-url');
        console.log('[SETTINGS] Copy remote URL clicked:', url);
        window.iptvAPI.copyToClipboard(url);
        
        const originalText = e.target.textContent;
        e.target.textContent = 'Copied!';
        setTimeout(() => { e.target.textContent = originalText; }, 2000);
    });

    document.getElementById('settings-remote-toggle').addEventListener('change', async (e) => {
        const isEnabled = e.target.checked;
        const configDiv = document.getElementById('settings-remote-config');
        const statusSpan = document.getElementById('settings-remote-status');
        
        configDiv.style.display = isEnabled ? 'block' : 'none';
        statusSpan.textContent = isEnabled ? 'Enabled' : 'Disabled';
        statusSpan.style.color = isEnabled ? '#43CB44' : '#cf6679';
        
        remoteSettings.enabled = isEnabled;
        await window.iptvAPI.saveRemoteSettings(remoteSettings);
        showToast(`Remote Control ${isEnabled ? 'Enabled' : 'Disabled'}`);
    });

    document.getElementById('settings-save-remote-btn').addEventListener('click', async (e) => {
        const newPort = parseInt(document.getElementById('settings-remote-port').value) || 8088;
        const user = document.getElementById('settings-remote-user').value.trim();
        const pass = document.getElementById('settings-remote-pass').value.trim();
        
        if ((user.length > 0 || pass.length > 0) && (user.length < 5 || pass.length < 5)) {
            showToast('Username and Password must be at least 5 characters long, or completely blank to disable password protection.');
            document.getElementById('settings-remote-user').focus();
            return;
        }
        
        remoteSettings.port = newPort;
        remoteSettings.username = user;
        remoteSettings.password = pass;
        await window.iptvAPI.saveRemoteSettings(remoteSettings);
        
        const originalText = e.target.textContent;
        e.target.textContent = 'Saved ✔️';
        setTimeout(() => { 
            renderSettings(); // Re-render to update the Auto-Login URL securely
        }, 1000);
    });

    const revokeBtn = document.getElementById('settings-revoke-device-btn');
    if (revokeBtn) {
        revokeBtn.addEventListener('click', async () => {
            remoteSettings.activeDeviceId = null;
            await window.iptvAPI.saveRemoteSettings(remoteSettings);
            renderSettings();
            showToast('Paired device revoked.');
        });
    }

    // Extract all necessary EPG files dynamically through the Python bridge
    const allEpgSources = savedPlaylists.map(p => p.epg).filter(e => e && e !== 'Not Configured');
    savedEpgs.forEach(e => { if (!allEpgSources.includes(e)) allEpgSources.push(e); });
    const combinedEpgs = allEpgSources.join(',');
    console.log('[API] Calling getEpgChannels for settings view.');
    
    epgChannelsData = await window.iptvAPI.getEpgChannels(combinedEpgs);

    // Populate EPG Sources Filter Dropdown
    const epgFilter = document.getElementById('mapping-epg-filter');
    const epgSourcesSet = new Set();
    if (epgChannelsData) epgChannelsData.forEach(e => { if (e.source) epgSourcesSet.add(e.source); });
    Array.from(epgSourcesSet).sort((a, b) => sortAlphaNum(getEpgName(a), getEpgName(b))).forEach(src => {
        const opt = document.createElement('option');
        opt.value = src;
        opt.textContent = getEpgName(src);
        epgFilter.appendChild(opt);
    });
    
    // Once loaded, populate the mapping UI
    renderMappingColumns();

    document.getElementById('mapping-auto-map-btn').addEventListener('click', async (e) => {
        const btn = e.target;
        console.log('[SETTINGS] Auto-map button clicked.');
        const originalText = btn.textContent;
        btn.textContent = '⏳';
        btn.disabled = true;

        await autoMapChannels(true);

        btn.textContent = originalText;
        btn.disabled = false;
    });

    document.getElementById('settings-factory-reset-btn').addEventListener('click', async () => {
        console.log('[SETTINGS] Factory reset button clicked.');
        if (confirm("Are you sure you want to completely wipe all data? The application will restart.")) {
            await window.iptvAPI.factoryReset();
        }
    });

    // Mapping Filter Events
    document.getElementById('mapping-playlist-filter').addEventListener('change', (e) => {
        mappingSelectedPlaylist = e.target.value;
        console.log('[MAPPING] Playlist filter changed to:', mappingSelectedPlaylist);
        mappingSelectedChannel = null;
        renderMappingColumns();
    });
    document.getElementById('mapping-channel-search').addEventListener('input', debouncedRenderMappingColumns);
    document.getElementById('mapping-epg-filter').addEventListener('change', renderMappingColumns);
    document.getElementById('mapping-epg-search').addEventListener('input', debouncedRenderMappingColumns);
    document.getElementById('mapping-mapped-search').addEventListener('input', debouncedRenderMappingColumns);
}

async function applySingleMapping(channelTitle, epgId) {
    console.log('[MAPPING] Applying single mapping:', { channelTitle, epgId });
    if (epgId) channelMappings[channelTitle] = epgId;
    else delete channelMappings[channelTitle];
    
    await window.iptvAPI.saveMapping(channelTitle, epgId);

    updateState();

    // Update active Live TV sidebar detail view
    if (streamActive) {
        const currentUrl = localStorage.getItem('lastPlayedChannelUrl');
        if (currentUrl) {
            const currentChannel = allChannels.find(c => c.url === currentUrl);
            if (currentChannel && currentChannel.title === channelTitle) {
                embedStream(currentChannel);
            }
        }
    }
    
    // Update Guide if we happen to switch over to it or if it is currently visible
    const epgView = document.getElementById('epg-view');
    if (epgView && epgView.style.display === 'flex') {
        renderFullEpg();
    }
}

function updateState(skipSave = false) {
    console.log('[STATE] Updating global state and re-rendering.');
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
    
    allChannels.sort((a, b) => sortAlphaNum(a.title, b.title));

    if (streamActive) {
        const currentUrl = localStorage.getItem('lastPlayedChannelUrl');
        const detailName = document.getElementById('detail-name');
        const currentTitle = detailName ? detailName.textContent : '';
        currentPlayingChannelIndex = allChannels.findIndex(c => c.url === currentUrl && (c.title || 'Unknown Channel') === currentTitle);
    } else {
        currentPlayingChannelIndex = -1;
    }

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
        channelSearch.addEventListener('input', () => renderChannels());
    }

    renderChannels();
    renderPlaylists();
    if (!skipSave) {
        window.iptvAPI.saveChannels(savedPlaylists);
    }
    updateNavLockState();
}

async function addPlaylist(source, customName, epgSource, editIndex = -1) {
    console.log('[PLAYLIST] Adding/editing playlist:', { source, customName, epgSource, editIndex });
    try {
        const isStalker = epgSource && epgSource.startsWith('stalker:');
        let result;
        if (isStalker) {
            console.log('[API] Calling parseStalker for new playlist.');
            result = await window.iptvAPI.parseStalker({ url: source, mac: epgSource.substring(8) });
        } else {
            console.log('[API] Calling parseM3u for new playlist.');
            result = await window.iptvAPI.parseM3u(source);
        }
        if (result && result.error) {
            showToast(`Failed to import.\nReason: ${result.error}`);
            return false;
        } else if (!result || (!Array.isArray(result) && !result.channels)) {
            showToast(`Failed to import.\nReason: Received invalid data from source.`);
            return false;
        } else {
            const channels = Array.isArray(result) ? result : result.channels;
            let finalEpgSource = epgSource || 'Not Configured';
            
            if (!isStalker && (!epgSource || epgSource === 'Not Configured') && result.epg_url) {
                finalEpgSource = result.epg_url;
            }

            if (editIndex >= 0 && savedPlaylists[editIndex] && savedPlaylists[editIndex].channels) {
                const oldMap = new Map();
            let newCount = 0;
                savedPlaylists[editIndex].channels.forEach(c => oldMap.set(c.title, c));
                channels.forEach(newCh => {
                    const old = oldMap.get(newCh.title);
                    if (old) {
                        newCh.disabled = old.disabled;
                        newCh.favourite = old.favourite;
                        if (old.isNew) newCh.isNew = true;
                    } else {
                        newCh.disabled = true;
                        newCh.isNew = true;
                        newCount++;
                    }
                });
            if (newCount > 0) showToast(`Update complete: Found ${newCount} new channels.`);
            } else {
                channels.forEach(newCh => {
                    newCh.disabled = true;
                    newCh.isNew = true;
                });
            }

            const tempPlaylist = {
                id: editIndex >= 0 ? savedPlaylists[editIndex].id : (Date.now() + Math.random()),
                source: source,
                name: customName,
                channels: channels,
                epg: finalEpgSource,
                disabled: false,
                editIndex: editIndex
            };
            
            openManageChannelsModal(-1, tempPlaylist);
            return 'pending';
        }
    } catch (err) {
        showToast(`UI Error (${source}):\n${err.message}`);
        return false;
    }
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
        modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 1000; display: flex; align-items: center; justify-content: center;';
        document.body.appendChild(modal);
    }
    
    const groupsMap = {};
    originalChannels.forEach((c, idx) => {
        const g = c.group || 'Ungrouped';
        if (!groupsMap[g]) groupsMap[g] = [];
        groupsMap[g].push({ channel: c, originalIndex: idx });
    });
    
    const sortedGroups = Array.from(Object.keys(groupsMap)).sort(sortAlphaNum);

    const tempDisabled = new Set();
    const tempSelected = new Set();
    
    originalChannels.forEach((c, idx) => {
        if (c.disabled !== false) tempDisabled.add(idx);
    });

    let currentGroupFilter = sortedGroups.length > 0 ? sortedGroups[0] : null;

    const newCount = originalChannels.filter(c => c.isNew).length;
    const newTitleStr = newCount > 0 ? ` <span style="color: #FFD700; font-size: 0.85em; font-weight: normal;">(${newCount} New Channels Found)</span>` : '';

    modal.innerHTML = `
        <div style="background: #1e1e1e; border: 1px solid #333; border-radius: 8px; width: 90%; max-width: 1000px; height: 85%; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
            <div style="padding: 15px 20px; border-bottom: 1px solid #333; display: flex; justify-content: space-between; align-items: center; background: #252525;">
                <h2 style="margin: 0; color: #bb86fc; font-size: 1.2em;">Manage Channels: ${playlist.name}${newTitleStr}</h2>
                <div style="display: flex; gap: 10px;">
                    <input type="text" id="modal-channel-search" placeholder="Search channels..." value="" style="background: #121212; color: #fff; border: 1px solid #444; padding: 6px 12px; border-radius: 4px; outline: none; width: 250px;">
                </div>
            </div>
            
            <div style="display: flex; flex-grow: 1; overflow: hidden;">
                <!-- Left Column: Groups -->
                <div style="width: 250px; background: #121212; border-right: 1px solid #333; display: flex; flex-direction: column;">
                    <div style="padding: 10px; background: #1a1a1a; border-bottom: 1px solid #333; font-weight: bold; color: #888; font-size: 0.9em; text-transform: uppercase;">
                        Groups
                    </div>
                    <div id="modal-groups-list" style="flex-grow: 1; overflow-y: auto; padding: 10px 0;">
                        ${sortedGroups.map(g => {
                            const total = groupsMap[g].length;
                            const enabled = groupsMap[g].filter(item => !tempDisabled.has(item.originalIndex)).length;
                            const hasNew = groupsMap[g].some(item => item.channel.isNew);
                            const newLabel = hasNew ? ' <span style="color: #FFD700; font-size: 0.85em;">(New)</span>' : '';
                            return `
                            <div class="modal-group-item" data-group="${g.replace(/"/g, '&quot;')}" style="padding: 10px 20px; cursor: pointer; border-left: 4px solid transparent; color: #e0e0e0; transition: 0.2s; font-family: 'Inter', sans-serif; font-size: 0.9em;">
                                ${g.replace(/</g, '&lt;').replace(/>/g, '&gt;')}${newLabel} <span class="group-count-span" style="color: #666; font-size: 0.85em; float: right;">${enabled} (${total})</span>
                            </div>
                            `;
                        }).join('')}
                    </div>
                </div>

                <!-- Right Column: Channels -->
                <div style="flex-grow: 1; display: flex; flex-direction: column; background: #1a1a1a; min-width: 0;">
                    <div style="padding: 10px 20px; background: #252525; border-bottom: 1px solid #333; display: flex; align-items: center; gap: 15px;">
                        <label style="display: flex; align-items: center; cursor: pointer; color: #bb86fc; font-weight: bold; margin-right: 10px;">
                            <input type="checkbox" id="modal-select-all" style="margin-right: 10px; width: 18px; height: 18px;">
                            Select All
                        </label>
                        <button id="modal-enable-btn" class="playlist-btn" style="background: #43CB44; color: black; font-weight: bold; padding: 4px 12px; border-radius: 4px;">Enable</button>
                        <button id="modal-disable-btn" class="playlist-btn" style="background: #cf6679; color: black; font-weight: bold; padding: 4px 12px; border-radius: 4px;">Disable</button>
                        <span id="modal-channels-count" style="color: #888; font-size: 0.9em; flex-grow: 1; text-align: right;">Showing 0 channels</span>
                    </div>
                    <div id="modal-channels-list" style="flex-grow: 1; overflow-y: auto; padding: 10px 20px;">
                    </div>
                </div>
            </div>
            <div style="padding: 15px 20px; border-top: 1px solid #333; display: flex; justify-content: flex-end; gap: 10px; background: #252525;">
                <button id="modal-cancel-btn" class="playlist-btn" style="background: #333;">Cancel</button>
                <button id="modal-save-btn" class="playlist-btn" style="background: #bb86fc; color: #000; font-weight: bold;">${isNew ? 'Import Selected' : 'Save Changes'}</button>
            </div>
        </div>
    `;

    let currentFilteredChannels = [];
    const renderChannelsList = () => {
        const searchVal = (document.getElementById('modal-channel-search') ? document.getElementById('modal-channel-search').value : '').toLowerCase();

        let channelsToRender = currentGroupFilter ? groupsMap[currentGroupFilter] : [];

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
            const isSelected = tempSelected.has(originalIndex);
            const isNew = channel.isNew;
            const safeTitle = (channel.title || 'Unknown Channel').replace(/</g, "&lt;").replace(/>/g, "&gt;");
            
            const newLabel = isNew ? ' <span style="color: #FFD700;">(New)</span>' : '';
            const titleColor = isNew ? '#FFD700' : (isDisabled ? '#cf6679' : '#43CB44');

            return `
                <label style="display: flex; align-items: center; padding: 8px; border-bottom: 1px solid #333; cursor: pointer; background: ${isSelected ? '#2a2a2a' : 'transparent'};">
                    <input type="checkbox" class="channel-select-cb" data-idx="${originalIndex}" ${isSelected ? 'checked' : ''} style="margin-right: 15px; width: 18px; height: 18px;">
                    <span style="flex-grow: 1; color: ${titleColor}; font-weight: bold; font-size: 0.85em; font-family: 'Inter', sans-serif;">${safeTitle}${newLabel}</span>
                </label>
            `;
        }).join('');

        let allVisibleSelectedCalc = visibleCount > 0;
        if (allVisibleSelectedCalc) {
            currentFilteredChannels.forEach(item => {
                if (!tempSelected.has(item.originalIndex)) {
                    allVisibleSelectedCalc = false;
                }
            });
        }

        const countSpan = document.getElementById('modal-channels-count');
        if (countSpan) countSpan.textContent = `Showing ${visibleCount} channels`;

        const selectAllCb = document.getElementById('modal-select-all');
        if (selectAllCb) selectAllCb.checked = allVisibleSelectedCalc;

        const listDiv = document.getElementById('modal-channels-list');
        if (listDiv) listDiv.innerHTML = channelsHtml;

        document.querySelectorAll('.channel-select-cb').forEach(cb => {
            cb.addEventListener('change', (e) => {
                const idx = parseInt(e.target.getAttribute('data-idx'));
                if (e.target.checked) tempSelected.add(idx);
                else tempSelected.delete(idx);
                
                const label = e.target.closest('label');
                if (e.target.checked) {
                    label.style.background = '#2a2a2a';
                } else {
                    label.style.background = 'transparent';
                }
                let allVisibleSelectedCheck = true;
                document.querySelectorAll('.channel-select-cb').forEach(c => {
                    if (!c.checked) allVisibleSelectedCheck = false;
                });
                document.getElementById('modal-select-all').checked = allVisibleSelectedCheck;
            });
        });
        
        document.querySelectorAll('.modal-group-item').forEach(el => {
            const g = el.getAttribute('data-group');
            const total = groupsMap[g].length;
            const enabled = groupsMap[g].filter(item => !tempDisabled.has(item.originalIndex)).length;
            const countSpan = el.querySelector('.group-count-span');
            if (countSpan) countSpan.textContent = `${enabled} (${total})`;

            if (g === currentGroupFilter) {
                el.style.borderLeftColor = '#bb86fc';
                el.style.background = '#2a2a2a';
                el.style.color = '#bb86fc';
                el.style.fontWeight = 'bold';
            } else {
                el.style.borderLeftColor = 'transparent';
                el.style.background = 'transparent';
                el.style.color = '#e0e0e0';
                el.style.fontWeight = 'normal';
            }
        });
    };

    document.querySelectorAll('.modal-group-item').forEach(el => {
        el.addEventListener('click', (e) => {
            currentGroupFilter = el.getAttribute('data-group');
            renderChannelsList();
        });
    });

    document.getElementById('modal-channel-search').addEventListener('input', renderChannelsList);

    document.getElementById('modal-select-all').addEventListener('change', (e) => {
        const checkAll = e.target.checked;
        currentFilteredChannels.forEach(item => {
            if (checkAll) tempSelected.add(item.originalIndex);
            else tempSelected.delete(item.originalIndex);
        });
        renderChannelsList();
    });

    document.getElementById('modal-enable-btn').addEventListener('click', () => {
        if (tempSelected.size === 0) return;
        tempSelected.forEach(idx => tempDisabled.delete(idx));
        tempSelected.clear();
        renderChannelsList();
    });

    document.getElementById('modal-disable-btn').addEventListener('click', () => {
        if (tempSelected.size === 0) return;
        tempSelected.forEach(idx => tempDisabled.add(idx));
        tempSelected.clear();
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
        
        originalChannels.forEach((c, idx) => {
            c.disabled = tempDisabled.has(idx);
            delete c.isNew;
        });
        playlist.channels = originalChannels;

        if (isNew) {
            if (playlist.editIndex >= 0) {
                savedPlaylists[playlist.editIndex] = playlist;
            } else {
                savedPlaylists.push(playlist);
            }
            
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

        } else {
            updateState();
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
        const card = document.createElement('div');
        card.style.cssText = "border: 1px solid #333; border-radius: 12px; padding: 20px; background: #1e1e1e; display: flex; flex-direction: column; gap: 10px;";
        
        let epgInfo = '';
        let mappedChannels = 0;
        let totalPrograms = 0;
        if (playlist.channels) {
            playlist.channels.forEach(ch => {
                if (ch.epg_programmes && ch.epg_programmes.length > 0) {
                    mappedChannels++;
                    totalPrograms += ch.epg_programmes.length;
                }
            });
        }
        if (totalPrograms > 0) {
            epgInfo = ` <span style="color: #43CB44; font-size: 0.9em;">(${mappedChannels} channels mapped, ${totalPrograms} programs)</span>`;
        } else if (window.activeEpgParsing && window.activeEpgParsing.has(playlist.epg)) {
            epgInfo = ` <span style="color: #bb86fc; font-size: 0.9em;">(Parsing EPG...)</span>`;
        } else if (playlist.epg && playlist.epg !== 'Not Configured') {
            const isEpgLoaded = epgChannelsData && epgChannelsData.some(e => e.source === playlist.epg);
            if (isEpgLoaded) {
                epgInfo = ` <span style="color: #bb86fc; font-size: 0.9em;">(0 channels mapped)</span>`;
            } else {
                epgInfo = ` <span style="color: #cf6679; font-size: 0.9em;">(EPG not loaded)</span>`;
            }
        }

        let totalChannels = playlist.channels ? playlist.channels.length : 0;
        let enabledChannels = 0;
        let disabledChannels = 0;
        let groups = new Set();
        
        if (playlist.channels) {
            playlist.channels.forEach(ch => {
                if (ch.disabled) disabledChannels++;
                else enabledChannels++;
                groups.add(ch.group || 'Uncategorized');
            });
        }

        card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <h3 style="margin: 0; color: ${playlist.disabled ? '#888' : '#bb86fc'};">${playlist.name} ${playlist.disabled ? '(Disabled)' : ''}</h3>
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
                    <span><strong>Total Channels:</strong> ${totalChannels}</span>
                    <span><strong>Enabled:</strong> <span style="color: #43CB44;">${enabledChannels}</span></span>
                    <span><strong>Disabled:</strong> <span style="color: #cf6679;">${disabledChannels}</span></span>
                    <span><strong>Groups:</strong> ${groups.size}</span>
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
                if (importStalkerName) importStalkerName.value = playlist.name;
                if (importStalkerUrl) importStalkerUrl.value = playlist.source;
                const mac = playlist.epg.substring(8);
                if (importStalkerMac) importStalkerMac.value = mac;
                
                if (importStalkerSubmitBtn) importStalkerSubmitBtn.textContent = 'Update';
                if (importStalkerCancelBtn) importStalkerCancelBtn.style.display = 'block';
            } else if (playlist.source.startsWith('http://') || playlist.source.startsWith('https://')) {
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
                    const channels = Array.isArray(result) ? result : result.channels;
                    
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
                            newCh.disabled = true;
                            newCh.isNew = true;
                            newCount++;
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
                        editIndex: idx
                    };
                    
                    openManageChannelsModal(-1, tempPlaylist);
                } else {
                    showToast('Failed to refresh playlist: ' + (result ? result.error : 'Unknown error'));
                }
            } catch(err) {
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
            if (playlist && playlist.source) window.iptvAPI.clearCache(playlist.source);
            savedPlaylists.splice(idx, 1);
            updateState();
        });
    });

    document.querySelectorAll('.enable-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = e.target.getAttribute('data-index');
            console.log('[EVENT] Enable playlist button clicked for index:', idx);
            savedPlaylists[idx].disabled = false;
            updateState();
        });
    });

    document.querySelectorAll('.disable-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = e.target.getAttribute('data-index');
            console.log('[EVENT] Disable playlist button clicked for index:', idx);
            savedPlaylists[idx].disabled = true;
            updateState();
        });
    });
}

try {
    window.expandedGroups = new Set(JSON.parse(localStorage.getItem('iptv_expanded_groups') || '[]'));
} catch (e) {
    window.expandedGroups = new Set();
}

function renderChannels() {
    console.log('[UI] Rendering channel list.');
    const filterSelect = document.getElementById('playlist-filter');
    const filterVal = filterSelect ? filterSelect.value : 'all';

    const channelSearch = document.getElementById('channel-search');
    const searchVal = channelSearch ? channelSearch.value.toLowerCase() : '';

    const previousScroll = channelList.scrollTop;

    let html = '';
    
    const groupedChannels = {};

    allChannels.forEach((channel, index) => {
        if (filterVal === 'favs' && !channel.favourite) return;
        if (filterVal !== 'all' && filterVal !== 'favs' && String(channel.playlistId) !== String(filterVal)) return;
        
        const rawTitle = channel.title || 'Unknown Channel';
        if (searchVal && !rawTitle.toLowerCase().includes(searchVal)) return;
        
        const channelGroup = channel.group || 'Uncategorized';
        if (!groupedChannels[channelGroup]) {
            groupedChannels[channelGroup] = [];
        }
        groupedChannels[channelGroup].push({ channel, index });
    });

    const sortedGroups = Object.keys(groupedChannels).sort(sortAlphaNum);

    if (sortedGroups.length === 0) {
        html = `<div style="padding: 20px; color: #888; text-align: center;">No channels found.</div>`;
    } else {
        sortedGroups.forEach(groupName => {
            const channelsInGroup = groupedChannels[groupName];
            const safeGroupName = groupName.replace(/</g, "&lt;").replace(/>/g, "&gt;");
            
            const isExpanded = searchVal ? true : window.expandedGroups.has(groupName);
            const expandIcon = isExpanded ? '▼' : '▶';
            
            const attrGroupName = String(groupName).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            html += `<div class="group-item" data-group="${attrGroupName}" tabindex="0" style="display: flex; align-items: center; justify-content: space-between; width: 100%; box-sizing: border-box; padding: 10px; background: #252525; border-bottom: 1px solid #1e1e1e; cursor: pointer; outline: none; font-weight: bold; color: #bb86fc;">
                <span>${safeGroupName} <span style="color:#888;font-size:0.8em;font-weight:normal;">(${channelsInGroup.length})</span></span>
                <span class="group-expand-icon" style="color:#888;font-size:0.8em;">${expandIcon}</span>
            </div>`;
            
            if (isExpanded) {
                html += `<div class="group-channels-container" style="background: #1a1a1a;">`;
                channelsInGroup.forEach(({channel, index}) => {
                    const rawTitle = channel.title || 'Unknown Channel';
                    const safeTitle = rawTitle.replace(/</g, "&lt;").replace(/>/g, "&gt;");
                    const imgSrc = (channel.logo && channel.logo.trim() !== '') ? channel.logo : 'assets/logo.ico';
                    
                    const logoHtml = `<img src="${imgSrc}" style="width: 40px; height: 40px; min-width: 40px; object-fit: contain; margin-right: 10px; border-radius: 4px; background: #ffffff;">`;
                    
                    const favClass = channel.favourite ? 'fav-btn active' : 'fav-btn';
                    const favBtnHtml = `<button class="${favClass}" data-fav-index="${index}" title="Toggle Favourite"><svg viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg></button>`;

                    const activeClass = (index === currentPlayingChannelIndex) ? ' active' : '';
                    html += `<div class="channel-item${activeClass}" tabindex="0" data-index="${index}" title="${safeTitle.replace(/"/g, '&quot;')}" style="display: flex; align-items: center; width: 100%; box-sizing: border-box; padding: 5px 10px 5px 20px; border-bottom: 1px solid #1e1e1e; cursor: pointer; outline: none;">
                        ${logoHtml}
                        <span style="flex-grow: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding-right: 10px; color: #e0e0e0; font-size: 0.8em; font-weight: bold; font-family: 'Inter', sans-serif;">${safeTitle}</span>
                        ${favBtnHtml}
                    </div>`;
                });
                html += `</div>`;
            }
        });
    }

    channelList.innerHTML = html;

    // Attach error handlers after inserting into DOM to bypass CSP inline restrictions
    channelList.querySelectorAll('img').forEach(img => {
        img.onerror = function() {
            this.onerror = null;
            this.src = 'assets/logo.ico';
        };
    });
    
    if (!window.initialScrollLoaded) {
        const savedScroll = parseInt(localStorage.getItem('iptv_sidebar_scroll'), 10);
        if (!isNaN(savedScroll)) channelList.scrollTop = savedScroll;
        window.initialScrollLoaded = true;
    } else {
        channelList.scrollTop = previousScroll;
    }
}

const filterElement = document.getElementById('playlist-filter');
if (filterElement) {
    console.log('[INIT] Attaching change listener to playlist filter.');
    filterElement.addEventListener('change', () => {
        localStorage.setItem('iptv_playlist_filter', filterElement.value);
        renderChannels();
        if (document.getElementById('epg-view') && document.getElementById('epg-view').style.display === 'flex') {
            renderFullEpg();
        }
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
            window.expandedGroups.add(groupName);
        }
        localStorage.setItem('iptv_expanded_groups', JSON.stringify(Array.from(window.expandedGroups)));
        renderChannels();
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
        if (channel) embedStream(channel);
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

let currentImportMode = 'file';

if (btnModeFile) {
    btnModeFile.addEventListener('click', (e) => {
        e.preventDefault();
        console.log('[EVENT] Import mode changed to file.');
        currentImportMode = 'file';
        btnModeFile.classList.add('active');
        btnModeUrl.classList.remove('active');
        containerFile.style.display = 'flex';
        containerUrl.style.display = 'none';
    });
}

if (btnModeUrl) {
    btnModeUrl.addEventListener('click', (e) => {
        e.preventDefault();
        console.log('[EVENT] Import mode changed to url.');
        currentImportMode = 'url';
        btnModeUrl.classList.add('active');
        btnModeFile.classList.remove('active');
        containerUrl.style.display = 'block';
        containerFile.style.display = 'none';
    });
}

if (importBrowseBtn) {
    importBrowseBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        console.log('[API] Calling openFileDialog.');
        const filePaths = await window.iptvAPI.openFileDialog();
        if (filePaths && filePaths.length > 0) {
            importFilePath.value = filePaths[0];
            const source = filePaths[0];
            if (importEpgInput && !importEpgInput.value.trim()) {
                try {
                    console.log('[API] Calling parseM3u to pre-fill EPG from file.');
                    const result = await window.iptvAPI.parseM3u(source);
                    if (result && !result.error && result.epg_url && !importEpgInput.value.trim()) {
                        importEpgInput.value = result.epg_url;
                    }
                } catch (e) { console.error(e); }
            }
        }
    });
}

if (importUrlPath) {
    importUrlPath.addEventListener('change', async () => {
        const source = importUrlPath.value.trim();
        if (source && importEpgInput && !importEpgInput.value.trim()) {
            try {
                console.log('[API] Calling parseM3u to pre-fill EPG from URL.');
                const result = await window.iptvAPI.parseM3u(source);
                if (result && !result.error && result.epg_url && !importEpgInput.value.trim()) {
                    importEpgInput.value = result.epg_url;
                }
            } catch (e) { console.error(e); }
        }
    });
}

if (importSubmitBtn) {
    importSubmitBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        console.log('[EVENT] M3U Import/Update submit button clicked.');
        const name = importNameInput.value.trim();
        if (!name) {
            showToast("Playlist name is mandatory.");
            importNameInput.focus();
            return;
        }

        let source = '';
        let epgSource = '';

        if (currentImportMode === 'file') {
            source = importFilePath.value.trim();
            if (!source) {
                showToast("Please select a file location.");
                return;
            }
            epgSource = importEpgInput ? importEpgInput.value.trim() : '';
        } else {
            source = importUrlPath.value.trim();
            if (!source) {
                showToast("Please enter a valid M3U URL.");
                importUrlPath.focus();
                return;
            }
            epgSource = importEpgInput ? importEpgInput.value.trim() : '';
        }
        
        const originalText = importSubmitBtn.textContent;
        importSubmitBtn.textContent = 'Importing...';
        importSubmitBtn.disabled = true;
        if (loadingMsg) loadingMsg.style.display = 'none';

        const success = await addPlaylist(source, name, epgSource, editingPlaylistIndex);
        
        if (importSubmitBtn) {
            importSubmitBtn.textContent = originalText;
            importSubmitBtn.disabled = false;
        }

        if (success) {
            editingPlaylistIndex = -1;
            if (importCancelBtn) importCancelBtn.style.display = 'none';
            if (importNameInput) importNameInput.value = '';
            if (importFilePath) importFilePath.value = '';
            if (importUrlPath) importUrlPath.value = '';
            if (importEpgInput) importEpgInput.value = '';
        }
    });
}

if (importStalkerSubmitBtn) {
    importStalkerSubmitBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        console.log('[EVENT] Stalker Import/Update submit button clicked.');
        const name = importStalkerName.value.trim();
        if (!name) {
            showToast("Playlist name is mandatory.");
            importStalkerName.focus();
            return;
        }

        let source = importStalkerUrl.value.trim();
        const mac = importStalkerMac.value.trim();
        if (!source) {
            showToast("Please enter Stalker Portal URL.");
            importStalkerUrl.focus();
            return;
        }
        if (!mac) {
            showToast("Please enter MAC Address.");
            importStalkerMac.focus();
            return;
        }
        const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
        if (!macRegex.test(mac)) {
            showToast("Invalid MAC Address format.\nExample: 00:1A:79:00:11:22");
            importStalkerMac.focus();
            return;
        }
        let epgSource = `stalker:${mac.toUpperCase()}`;
        
        const originalText = importStalkerSubmitBtn.textContent;
        importStalkerSubmitBtn.textContent = 'Importing...';
        importStalkerSubmitBtn.disabled = true;
        if (loadingMsg) loadingMsg.style.display = 'none';

        const success = await addPlaylist(source, name, epgSource, editingPlaylistIndex);
        
        if (success !== 'pending') {
            if (importStalkerSubmitBtn) {
                importStalkerSubmitBtn.textContent = originalText;
                importStalkerSubmitBtn.disabled = false;
            }

            if (success) {
                editingPlaylistIndex = -1;
                if (importStalkerCancelBtn) importStalkerCancelBtn.style.display = 'none';
                if (importStalkerName) importStalkerName.value = '';
                if (importStalkerUrl) importStalkerUrl.value = '';
                if (importStalkerMac) importStalkerMac.value = '';
            }
        }
    });
}

if (importXtremeSubmitBtn) {
    importXtremeSubmitBtn.addEventListener('click', (e) => {
        e.preventDefault();
        showToast('Coming in Next Version');
    });
}

if (importCancelBtn) {
    importCancelBtn.addEventListener('click', (e) => {
        e.preventDefault();
        console.log('[EVENT] Import cancel button clicked.');
        editingPlaylistIndex = -1;
        if (importSubmitBtn) importSubmitBtn.textContent = 'Import';
        if (importCancelBtn) importCancelBtn.style.display = 'none';
        if (importNameInput) importNameInput.value = '';
        if (importFilePath) importFilePath.value = '';
        if (importUrlPath) importUrlPath.value = '';
        if (importEpgInput) importEpgInput.value = '';
    });
}

if (importStalkerCancelBtn) {
    importStalkerCancelBtn.addEventListener('click', (e) => {
        e.preventDefault();
        console.log('[EVENT] Stalker cancel button clicked.');
        editingPlaylistIndex = -1;
        if (importStalkerSubmitBtn) importStalkerSubmitBtn.textContent = 'Import';
        if (importStalkerCancelBtn) importStalkerCancelBtn.style.display = 'none';
        if (importStalkerName) importStalkerName.value = '';
        if (importStalkerUrl) importStalkerUrl.value = '';
        if (importStalkerMac) importStalkerMac.value = '';
    });
}

if (clearBtn) {
    clearBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        console.log('[EVENT] Clear all playlists button clicked.');
        savedPlaylists.forEach(p => {
            if (p.source) window.iptvAPI.clearCache(p.source);
        });
        savedPlaylists = [];
        savedEpgs = [];
        channelMappings = {};
        if (window.iptvAPI.clearAllMappings) await window.iptvAPI.clearAllMappings();
        updateState();
        switchTab('playlist', document.getElementById('btn-playlist'));
    });
}

// Listen for live hardware stats from MPV (Resolution display removed)
window.iptvAPI.onMpvPropChange((name, value) => {
    console.log('[API RECV] onMpvPropChange', { name, value });
    // Can be used for other MPV properties in the future
    if (name === 'playback-time' && window.pendingEpgUpdate) {
        const encoded = encodeURIComponent(JSON.stringify(window.pendingEpgUpdate));
        // Broadcast to all scripts instead of modernz specifically, bypassing script naming issues
        window.iptvAPI.sendMpvCommand(`script-message update-epg ${encoded}`);
        setTimeout(() => window.iptvAPI.sendMpvCommand(`script-message update-epg ${encoded}`), 500); // Failsafe delivery
        window.pendingEpgUpdate = null; // Only send once per playback
    }
});

function parseEpgTime(timeStr) {
    if (!timeStr || timeStr.length < 14) return new Date();
    // Format is usually "YYYYMMDDHHmmss +Z" -> "20231024000000 +0000"
    const year = timeStr.substring(0, 4);
    const month = timeStr.substring(4, 6);
    const day = timeStr.substring(6, 8);
    const hour = timeStr.substring(8, 10);
    const min = timeStr.substring(10, 12);
    const sec = timeStr.substring(12, 14);
    const offset = timeStr.substring(15).trim();
    const sign = (offset.charAt(0) === '-' || offset.charAt(0) === '+') ? offset.charAt(0) : '+';
    const offHours = offset.length >= 3 ? offset.substring(1, 3) : '00';
    const offMins = offset.length >= 5 ? offset.substring(3, 5) : '00';
    
    const isoStr = `${year}-${month}-${day}T${hour}:${min}:${sec}${sign}${offHours}:${offMins}`;
    const d = new Date(isoStr);
    return isNaN(d.getTime()) ? new Date() : d;
}

function getCurrentProgram(programmes) {
    if (!programmes || !programmes.length) return null;
    const now = new Date();
    for (const prog of programmes) {
        const start = parseEpgTime(prog.start);
        const stop = parseEpgTime(prog.stop);
        if (now >= start && now <= stop) return prog;
    }
    return programmes[0]; // fallback to first if none match
}

function renderEpg(programmes) {
    console.log('[UI] Rendering sidebar EPG.');
    const container = document.getElementById('epg-container');
    if (!container) return;
    
    if (!programmes || programmes.length === 0) {
        container.innerHTML = '<div style="color: #cf6679;">No EPG data available for this channel.</div>';
        return;
    }

    const now = new Date();
    // Sort by start time so we can linearly find the current/next programs
    const sortedProgs = [...programmes].sort((a, b) => parseEpgTime(a.start) - parseEpgTime(b.start));
    
    let currentIdx = -1;
    for (let i = 0; i < sortedProgs.length; i++) {
        const start = parseEpgTime(sortedProgs[i].start);
        const stop = parseEpgTime(sortedProgs[i].stop);
        if (now >= start && now < stop) {
            currentIdx = i;
            break;
        } else if (start >= now && currentIdx === -1) {
            currentIdx = i; // Fallback to next upcoming program if exact current is missed
            break;
        }
    }

    if (currentIdx === -1) {
        container.innerHTML = '<div style="color: #cf6679;">No upcoming EPG data available for this channel.</div>';
        return;
    }

    let html = '<div style="display: flex; flex-direction: column; gap: 10px;">';
    
    for (let i = currentIdx; i < Math.min(currentIdx + 11, sortedProgs.length); i++) {
        const prog = sortedProgs[i];
        const start = parseEpgTime(prog.start);
        const stop = parseEpgTime(prog.stop);
        
        const startTimeStr = start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const stopTimeStr = stop.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        const isCurrent = i === currentIdx;
        const isFuture = start > now;
        const color = isCurrent ? '#43CB44' : '#e0e0e0';
        
        const title = (prog.title || 'Unknown Program').replace(/</g, "&lt;").replace(/>/g, "&gt;");
        const desc = (prog.desc || '').replace(/</g, "&lt;").replace(/>/g, "&gt;");
        
        const channelTitle = document.getElementById('detail-name') ? document.getElementById('detail-name').textContent : '';
        const isReminderSet = typeof savedReminders !== 'undefined' && savedReminders.some(r => r.progTitle === prog.title && r.startTime === prog.start && r.channelTitle === channelTitle);
        const reminderStyle = isReminderSet ? 'opacity: 1; filter: drop-shadow(0 0 4px #bb86fc);' : 'opacity: 0.3; filter: grayscale(100%);';
        const reminderHtml = isFuture ? `<button class="reminder-btn-sidebar" data-prog="${title.replace(/"/g, '&quot;')}" data-start="${prog.start}" data-stop="${prog.stop}" style="background: transparent; border: none; padding: 0; font-size: 1.2em; cursor: pointer; margin-right: 5px; transition: 0.2s; ${reminderStyle}" title="Set Reminder">🔔</button>` : '';
        
        html += `
            <div class="live-epg-item" tabindex="0" style="background: #1e1e1e; padding: 12px; border-radius: 8px; border-left: 4px solid ${isCurrent ? '#43CB44' : '#444'}; outline: none; cursor: default; transition: 0.2s;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 15px;">
                    <div style="font-weight: ${isCurrent ? 'bold' : 'normal'}; color: ${color}; font-size: 1.1em; margin-bottom: 5px; display: flex; align-items: center;">${reminderHtml}<span>${title}</span></div>
                    <div style="color: #bb86fc; white-space: nowrap; font-size: 0.9em; margin-top: 2px;">${startTimeStr} - ${stopTimeStr}</div>
                </div>
                ${desc ? `<div style="color: #888; font-size: 0.9em; margin-top: 5px; line-height: 1.4;">${desc}</div>` : ''}
            </div>
        `;
    }
    
    html += '</div>';
    container.innerHTML = html;
}

async function fetchEpgDataForChannels(channels) {
    const epgIdsToFetch = new Set();
    channels.forEach(ch => {
        if (!ch) return;
        const mappedId = channelMappings[ch.title];
        const epgId = mappedId || ch.tvg_id || ch.tvg_name;
        if (epgId && !epgCache[epgId] && !epgLoadingSet.has(epgId)) {
            epgIdsToFetch.add(epgId);
            epgLoadingSet.add(epgId);
        }
    });
    
    const epgIdsArr = Array.from(epgIdsToFetch);
    if (epgIdsArr.length === 0) return;
    
    const { gridStart, gridEnd } = epgGridState;
    const startLimit = formatDateToEpgString(gridStart);
    const endLimit = formatDateToEpgString(gridEnd);
    
    console.log(`[API] Fetching EPG for ${epgIdsArr.length} channel IDs...`);
    const epgData = await window.iptvAPI.getEpg(epgIdsArr, startLimit, endLimit);
    
    Object.keys(epgData).forEach(id => {
        epgCache[id] = epgData[id] || [];
    });

    // Mark as loaded even if no data was returned to prevent re-fetching
    epgIdsArr.forEach(id => {
        if (!epgCache[id]) epgCache[id] = [];
    });
    
    renderVisibleEpgRows(true); // Force re-render with new data
}

function onEpgScroll() {
    if (!epgScrollTicking) {
        window.requestAnimationFrame(() => {
            const scrollContainer = document.getElementById('epg-scroll-container');
            const headerScroll = document.getElementById('epg-header-scroll');
            const channelsCol = document.getElementById('epg-channels-col');
            
            if (scrollContainer && headerScroll && channelsCol) {
                headerScroll.scrollLeft = scrollContainer.scrollLeft;
                channelsCol.scrollTop = scrollContainer.scrollTop;
            }
            
            renderVisibleEpgRows();
            epgScrollTicking = false;
        });
        epgScrollTicking = true;
    }
}

function renderVisibleEpgRows(force = false) {
    const scrollContainer = document.getElementById('epg-scroll-container');
    const rowsLayer = document.getElementById('epg-rows-layer');
    const channelsInner = document.getElementById('epg-channels-inner');
    if (!scrollContainer || !rowsLayer || !channelsInner || !epgGridState) return;
    
    const scrollTop = scrollContainer.scrollTop;
    const scrollLeft = scrollContainer.scrollLeft;
    const viewportHeight = scrollContainer.clientHeight;
    const viewportWidth = scrollContainer.clientWidth;
    const rowHeight = 60;
    
    const timeIndicator = document.getElementById('epg-time-indicator');
    if (timeIndicator) {
        timeIndicator.style.top = `${scrollTop}px`;
        timeIndicator.style.height = `${viewportHeight}px`;
    }

    const overscan = 5; 
    let startIndex = Math.floor(scrollTop / rowHeight) - overscan;
    let endIndex = Math.ceil((scrollTop + viewportHeight) / rowHeight) + overscan;
    
    startIndex = Math.max(0, startIndex);
    endIndex = Math.min(epgChannelsToRender.length - 1, endIndex);
    
    if (!force && startIndex === epgLastStartIndex && endIndex === epgLastEndIndex && Math.abs(scrollLeft - epgLastScrollLeft) < (viewportWidth / 2)) {
        return; 
    }
    
    epgLastStartIndex = startIndex;
    epgLastEndIndex = endIndex;
    epgLastScrollLeft = scrollLeft;
    
    const { gridStart, totalWidth, pxPerMinute, now } = epgGridState;
    let gridHtml = '';
    let channelsHtml = '';
    const channelsToFetch = [];
    
    const horizontalOverscanPx = viewportWidth; 
    const viewStartPx = scrollLeft - horizontalOverscanPx;
    const viewEndPx = scrollLeft + viewportWidth + horizontalOverscanPx;

    for (let i = startIndex; i <= endIndex; i++) {
        const channel = epgChannelsToRender[i];
        if (!channel) continue;

        const globalIdx = allChannels.findIndex(c => c.url === channel.url && c.title === channel.title);
        const topPos = i * rowHeight;
        const safeTitle = (channel.title || 'Unknown Channel').replace(/</g, "&lt;").replace(/>/g, "&gt;");
        const imgSrc = (channel.logo && channel.logo.trim() !== '') ? channel.logo : 'assets/logo.png';
        
        let programsHtml = '';
        const mappedId = channelMappings[channel.title];
        const epgId = mappedId || channel.tvg_id || channel.tvg_name;
        
        let programmes = null;
        if (epgId) {
            if (epgCache[epgId]) {
                programmes = epgCache[epgId];
            } else {
                channelsToFetch.push(channel);
            }
        }

        if (programmes) {
            if (programmes.length > 0) {
                for (const prog of programmes) {
                    const pStart = parseEpgTime(prog.start);
                    const pEnd = parseEpgTime(prog.stop);
                    
                    let startMin = (pStart.getTime() - gridStart.getTime()) / 60000;
                    let endMin = (pEnd.getTime() - gridStart.getTime()) / 60000;
                    
                    let left = Math.max(0, startMin * pxPerMinute);
                    let right = Math.min(totalWidth, endMin * pxPerMinute);
                    let width = right - left;

                    if (right < viewStartPx || left > viewEndPx) {
                        continue;
                    }

                    const isCurrent = (now >= pStart && now <= pEnd);
                    const isFuture = pStart > now;
                    const bg = isCurrent ? '#2c2c2c' : '#1e1e1e';
                    const borderCol = isCurrent ? '#bb86fc' : '#444';
                    const pTitle = (prog.title || 'Unknown').replace(/</g, "&lt;").replace(/>/g, "&gt;");
                    const timeStr = `${pStart.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - ${pEnd.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
                    const isReminderSet = savedReminders.some(r => r.progTitle === prog.title && r.startTime === prog.start && r.channelTitle === channel.title);
                    const reminderStyle = isReminderSet ? 'opacity: 1; filter: drop-shadow(0 0 4px #bb86fc);' : 'opacity: 0.3; filter: grayscale(100%);';
                    const reminderHtml = isFuture ? `<span class="reminder-btn-full" data-channel="${safeTitle.replace(/"/g, '&quot;')}" data-prog="${pTitle.replace(/"/g, '&quot;')}" data-start="${prog.start}" data-stop="${prog.stop}" style="cursor: pointer; margin-right: 4px; display: inline-block; transition: 0.2s; ${reminderStyle}" title="Set/Remove Reminder">🔔</span>` : '';

                    programsHtml += `
                    <div class="epg-play-channel epg-program-cell" tabindex="0" data-index="${globalIdx}" style="position: absolute; left: ${left}px; top: 0; width: ${width}px; height: 60px; background: ${bg}; border-right: 1px solid #111; border-top: 2px solid ${borderCol}; border-bottom: 1px solid #2a2a2a; box-sizing: border-box; padding: 6px 10px; overflow: hidden; cursor: pointer; transition: background 0.2s; outline: none;" title="${pTitle}\n${timeStr}\n${(prog.desc || '').replace(/</g, "&lt;").replace(/>/g, "&gt;")}">
                        <div style="font-size: 0.85em; font-weight: bold; color: ${isCurrent ? '#fff' : '#ccc'}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${reminderHtml}${pTitle}</div>
                        <div style="font-size: 0.75em; color: #888; margin-top: 4px;">${timeStr}</div>
                    </div>`;
                }
            } else {
                programsHtml = `<div class="epg-play-channel" data-index="${globalIdx}" style="position: absolute; top: 0; left: 0; display: flex; align-items: center; padding-left: 20px; height: 60px; border-bottom: 1px solid #2a2a2a; box-sizing: border-box; color: #555; font-size: 0.9em; width: 100%; cursor: pointer;">No EPG Data</div>`;
            }
        } else {
            programsHtml = `<div class="epg-play-channel" data-index="${globalIdx}" style="position: absolute; top: 0; left: 0; display: flex; align-items: center; padding-left: 20px; height: 60px; border-bottom: 1px solid #2a2a2a; box-sizing: border-box; color: #888; font-size: 0.9em; width: 100%; cursor: pointer;">Loading...</div>`;
        }
        
        channelsHtml += `
        <div class="epg-play-channel" tabindex="0" data-index="${globalIdx}" style="position: absolute; top: ${topPos}px; left: 0; width: 250px; height: 60px; background: #1e1e1e; border-bottom: 1px solid #2a2a2a; display: flex; align-items: center; padding: 10px; box-sizing: border-box; cursor: pointer; outline: none;">
            <img src="${imgSrc}" data-eh="0" style="width: 40px; height: 40px; min-width: 40px; object-fit: contain; margin-right: 15px; background: #ffffff; border-radius: 4px;">
            <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 0.8em; font-weight: bold; font-family: 'Inter', sans-serif; color: #e0e0e0;" title="${safeTitle}">${safeTitle}</span>
        </div>`;
        
        gridHtml += `
        <div style="position: absolute; top: ${topPos}px; left: 0; width: ${totalWidth}px; height: 60px;">
            ${programsHtml}
        </div>`;
    }
    
    channelsInner.innerHTML = channelsHtml;
    rowsLayer.innerHTML = gridHtml;

    channelsInner.querySelectorAll('img[data-eh="0"]').forEach(img => {
        img.setAttribute('data-eh', '1');
        img.onerror = function() {
            this.onerror = null;
            this.src = 'assets/logo.ico';
        };
    });

    if (channelsToFetch.length > 0) {
        fetchEpgDataForChannels(channelsToFetch);
    }
}

async function renderFullEpg() {
    const epgView = document.getElementById('epg-view');
    console.log('[UI] Rendering full EPG view.');
    if (!epgView) return;

    if (allChannels.length === 0) {
        epgView.innerHTML = '<div style="color: #888; text-align: center; margin-top: 50px;">No channels available.</div>';
        return;
    }
    
    let playlistOptionsHtml = `<option value="all">All Playlists</option><option value="favs" ${epgSelectedPlaylist === 'favs' ? 'selected' : ''}>Favourites</option>`;
    savedPlaylists.forEach(p => {
        playlistOptionsHtml += `<option value="${p.id}" ${epgSelectedPlaylist === String(p.id) ? 'selected' : ''}>${p.name}</option>`;
    });

    let epgGroupOptions = new Set();
    allChannels.forEach(c => {
        if (epgSelectedPlaylist === 'favs' && !c.favourite) return;
        if (epgSelectedPlaylist !== 'all' && epgSelectedPlaylist !== 'favs' && String(c.playlistId) !== String(epgSelectedPlaylist)) return;
        epgGroupOptions.add(c.group || 'Uncategorized');
    });
    const sortedEpgGroups = Array.from(epgGroupOptions).sort(sortAlphaNum);
    
    let groupOptionsHtml = `<option value="all">All Groups</option>`;
    sortedEpgGroups.forEach(g => {
        groupOptionsHtml += `<option value="${g.replace(/"/g, '&quot;')}" ${epgSelectedGroup === g ? 'selected' : ''}>${g.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</option>`;
    });

    const topBarHtml = `
        <div style="width: 100%; display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
            <div style="display: flex; gap: 10px;">
                <select id="epg-playlist-filter" style="background: #121212; color: white; border: 1px solid #555; padding: 6px; border-radius: 4px; outline: none;">
                    ${playlistOptionsHtml}
                </select>
                <select id="epg-group-filter" style="background: #121212; color: white; border: 1px solid #555; padding: 6px; border-radius: 4px; outline: none;">
                    ${groupOptionsHtml}
                </select>
            </div>
            <button id="epg-now-btn" class="playlist-btn" style="background: #bb86fc; color: black; font-weight: bold; padding: 8px 16px; border-radius: 4px;">Now</button>
        </div>
    `;
    
    epgView.innerHTML = topBarHtml + '<div id="epg-content-area" style="flex-grow: 1; display: flex; flex-direction: column; min-height: 0;"><div style="color: #888; text-align: center; margin-top: 50px;">Loading Guide Data...</div></div>';
    
    document.getElementById('epg-playlist-filter').addEventListener('change', (e) => {
        epgSelectedPlaylist = e.target.value;
        epgSelectedGroup = 'all';
        renderFullEpg();
    });
    
    document.getElementById('epg-group-filter').addEventListener('change', (e) => {
        epgSelectedGroup = e.target.value;
        renderFullEpg();
    });

    if (window.epgTimeIndicatorInterval) clearInterval(window.epgTimeIndicatorInterval);

    const pxPerMinute = 6;
    const hourWidth = 60 * pxPerMinute;
    const now = new Date();
    
    const gridStart = new Date(now.getTime());
    gridStart.setMinutes(0, 0, 0);
    gridStart.setHours(gridStart.getHours() - 1); // -1 hour
    
    const gridEnd = new Date(gridStart.getTime() + 9 * 60 * 60 * 1000); // +8 hours from now (9 hours total duration)
    const totalWidth = 9 * hourWidth;

    epgChannelsToRender = allChannels.filter(channel => {
        if (epgSelectedPlaylist === 'favs' && !channel.favourite) return false;
        if (epgSelectedPlaylist !== 'all' && epgSelectedPlaylist !== 'favs' && String(channel.playlistId) !== String(epgSelectedPlaylist)) return false;
        const channelGroup = channel.group || 'Uncategorized';
        if (epgSelectedGroup !== 'all' && channelGroup !== epgSelectedGroup) return false;
        return true;
    });

    epgChannelsToRender.sort((a, b) => sortAlphaNum(a.title, b.title));

    epgGridState = { gridStart, gridEnd, totalWidth, pxPerMinute, now };
    epgLastStartIndex = -1;
    epgLastEndIndex = -1;
    epgLastScrollLeft = -1;
    epgCache = {};
    epgLoadingSet.clear();

    let headerHtml = '';
    for (let i = 0; i < 9; i++) {
        const headerTime = new Date(gridStart.getTime() + i * 60 * 60 * 1000);
        const timeStr = headerTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        headerHtml += `<div style="position: absolute; left: ${i * hourWidth}px; width: ${hourWidth}px; height: 100%; border-right: 1px solid rgba(0,0,0,0.2); border-bottom: 2px solid #333; display: flex; align-items: center; padding-left: 10px; color: #000; font-weight: bold; box-sizing: border-box;">${timeStr}</div>`;
    }

    const minutesSinceStart = (now.getTime() - gridStart.getTime()) / 60000;
    const nowPx = minutesSinceStart * pxPerMinute;
    let redLineHtml = '';
    if (nowPx > 0 && nowPx < totalWidth) {
        redLineHtml = `<div id="epg-time-indicator" style="position: absolute; left: ${nowPx}px; top: 0; height: 100%; width: 2px; background: #cf6679; z-index: 15; pointer-events: none;"></div>`;
    }

    let html = `
    <div id="epg-layout-wrapper" style="display: flex; flex-direction: column; flex-grow: 1; width: 100%; height: 100%; overflow: hidden; background: #121212; border: 1px solid #333; border-radius: 8px;">
        <!-- Header Row -->
        <div style="display: flex; width: 100%; background: #bb86fc; z-index: 20;">
            <div style="width: 250px; min-width: 250px; background: #bb86fc; border-bottom: 2px solid #333; border-right: 2px solid rgba(0,0,0,0.2); display: flex; align-items: center; justify-content: center; font-weight: bold; color: #000; box-sizing: border-box; height: 30px;">Channels</div>
            <div id="epg-header-scroll" style="flex-grow: 1; overflow: hidden; position: relative; height: 30px;">
                <div style="width: ${totalWidth}px; height: 100%; position: relative;">
                    ${headerHtml}
                </div>
            </div>
            <!-- Scrollbar Spacer -->
            <div id="epg-header-spacer" style="width: 14px; min-width: 14px; background: #bb86fc; border-bottom: 2px solid #333; flex-shrink: 0; box-sizing: border-box;"></div>
        </div>
        
        <!-- Content Area -->
        <div style="display: flex; flex-grow: 1; overflow: hidden; width: 100%;">
            <!-- Left Pinned Channels -->
            <div id="epg-channels-col" style="width: 250px; min-width: 250px; background: #1a1a1a; overflow: hidden; border-right: 2px solid #333; z-index: 10; position: relative;">
                <div id="epg-channels-inner" style="position: relative; width: 100%; height: ${epgChannelsToRender.length * 60}px;"></div>
            </div>
            
            <!-- Right Scrolling Grid -->
            <div id="epg-scroll-container" style="flex-grow: 1; overflow-y: scroll; overflow-x: auto; position: relative; background: #121212;">
                <div id="epg-grid-inner" style="width: ${totalWidth}px; height: ${epgChannelsToRender.length * 60}px; position: relative;">
                    <div id="epg-rows-layer" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"></div>
                    ${redLineHtml}
                </div>
            </div>
        </div>
    </div>`;

    const contentArea = document.getElementById('epg-content-area');
    if (contentArea) {
        contentArea.innerHTML = html;
    }

    const channelsContainer = document.getElementById('epg-channels-col');
    const gridContainer = document.getElementById('epg-scroll-container');
    
    const handleEpgClick = (e) => {
            const reminderBtn = e.target.closest('.reminder-btn-full');
            if (reminderBtn) {
                e.stopPropagation();
                const channelTitle = reminderBtn.getAttribute('data-channel');
                const progTitle = reminderBtn.getAttribute('data-prog');
                const start = reminderBtn.getAttribute('data-start');
                const stop = reminderBtn.getAttribute('data-stop');
                toggleReminder(channelTitle, progTitle, start, stop);
                const isSet = savedReminders.some(r => r.progTitle === progTitle && r.startTime === start && r.channelTitle === channelTitle);
                if (isSet) {
                    reminderBtn.style.opacity = '1';
                    reminderBtn.style.filter = 'drop-shadow(0 0 4px #bb86fc)';
                    showToast('Reminder Set: ' + progTitle);
                } else {
                    reminderBtn.style.opacity = '0.3';
                    reminderBtn.style.filter = 'grayscale(100%)';
                    showToast('Reminder Removed');
                }
                return;
            }

            const playChannel = e.target.closest('.epg-play-channel');
            if (playChannel) {
                const internalReminderBtn = playChannel.querySelector('.reminder-btn-full');
                if (internalReminderBtn && playChannel.classList.contains('epg-program-cell')) {
                    internalReminderBtn.click();
                    return;
                }

                const idx = playChannel.getAttribute('data-index');
                const targetChannel = allChannels[idx];
                if (targetChannel) {
                    switchTab('live-tv', document.getElementById('btn-live-tv'));
                    embedStream(targetChannel);
                }
            }
    };
    
    if (channelsContainer) channelsContainer.addEventListener('click', handleEpgClick);
    if (gridContainer) gridContainer.addEventListener('click', handleEpgClick);
    
    const handleEpgWheel = (e) => {
        if (gridContainer) {
            gridContainer.scrollTop += e.deltaY;
            gridContainer.scrollLeft += e.deltaX;
        }
        e.preventDefault();
    };

    if (channelsContainer) channelsContainer.addEventListener('wheel', handleEpgWheel, { passive: false });
    if (gridContainer) gridContainer.addEventListener('wheel', handleEpgWheel, { passive: false });

    const scrollContainer = document.getElementById('epg-scroll-container');
    if (scrollContainer) {
        scrollContainer.addEventListener('scroll', onEpgScroll);
    }

    renderVisibleEpgRows(true);

    if (!document.getElementById('epg-styles')) {
        const style = document.createElement('style');
        style.id = 'epg-styles';
        style.textContent = `
            .epg-program-cell:hover { background: #333 !important; }
            .epg-play-channel:hover { background-color: #2a2a2a !important; }
            #epg-scroll-container::-webkit-scrollbar { width: 14px; height: 14px; }
            #epg-scroll-container::-webkit-scrollbar-track { background: #121212; border-left: 1px solid #333; border-top: 1px solid #333; }
            #epg-scroll-container::-webkit-scrollbar-thumb { background: #444; border-radius: 7px; border: 3px solid #121212; }
            #epg-scroll-container::-webkit-scrollbar-corner { background: #121212; }
        `;
        document.head.appendChild(style);
    }

    const nowBtn = document.getElementById('epg-now-btn');
    if (scrollContainer) {
        const targetScroll = Math.max(0, nowPx - (30 * pxPerMinute)); // Pad back 30 mins from red line
        setTimeout(() => {
            scrollContainer.scrollLeft = targetScroll;
            const headerScroll = document.getElementById('epg-header-scroll');
            if (headerScroll) headerScroll.scrollLeft = targetScroll;
        }, 10);
        if (nowBtn) {
            nowBtn.onclick = () => {
                scrollContainer.scrollTo({ left: targetScroll, behavior: 'smooth' });
            };
        }
    }

    window.epgTimeIndicatorInterval = setInterval(() => {
        const indicator = document.getElementById('epg-time-indicator');
        if (indicator && epgGridState) {
            const newNow = new Date();
            const newMinutesSinceStart = (newNow.getTime() - epgGridState.gridStart.getTime()) / 60000;
            const newNowPx = newMinutesSinceStart * epgGridState.pxPerMinute;
            indicator.style.left = `${newNowPx}px`;
        }
    }, 60000);
}

async function embedStream(channel) {
    console.log('[STREAM] Embedding stream for channel:', channel.title);
    streamActive = true;
    
    currentPlayingChannelIndex = allChannels.findIndex(c => c.url === channel.url && c.title === channel.title);

    document.querySelectorAll('.channel-item').forEach(el => el.classList.remove('active'));
    const activeEl = document.querySelector(`.channel-item[data-index="${currentPlayingChannelIndex}"]`);
    if (activeEl) {
        activeEl.classList.add('active');
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    const fsBtn = document.getElementById('fullscreen-btn');
    if (fsBtn) fsBtn.style.display = 'block';
    
    localStorage.setItem('lastPlayedChannelUrl', channel.url);
    
    let finalStreamUrl = channel.url;
    const playlist = savedPlaylists.find(p => String(p.id) === String(channel.playlistId));

    if (playlist && playlist.epg && playlist.epg.startsWith('stalker:') && !finalStreamUrl.startsWith('stalker-cmd:') && !finalStreamUrl.startsWith('stalker-series:')) {
        finalStreamUrl = `stalker-cmd:${channel.type === 'live' ? 'itv' : 'vod'}|${finalStreamUrl}`;
    }

    if (finalStreamUrl.startsWith('stalker-cmd:')) {
        const parts = finalStreamUrl.substring(12).split('|');
        const type = parts[0];
        const cmd = parts.slice(1).join('|');
        
        if (playlist && playlist.epg && playlist.epg.startsWith('stalker:')) {
            const mac = playlist.epg.substring(8);
            const resolved = await window.iptvAPI.resolveStalkerLink({ url: playlist.source, mac, type, cmd });
            if (resolved) finalStreamUrl = resolved;
            else {
                showToast("Failed to authenticate stream link.");
                return;
            }
        }
    }

    const detailInfo = document.getElementById('detail-info');
    if (detailInfo) detailInfo.style.display = 'block';

    const detailName = document.getElementById('detail-name');
    if (detailName) {
        detailName.textContent = channel.title || 'Unknown Channel';
        // Ensure text wraps properly and remains visible
        detailName.style.display = 'block';
        detailName.style.wordBreak = 'break-word';
        detailName.style.whiteSpace = 'normal';
        detailName.style.fontSize = '0.8em';
        detailName.style.fontWeight = 'bold';
        detailName.style.fontFamily = "'Inter', sans-serif";
    }
    const detailLogo = document.getElementById('detail-logo');
    if (detailLogo) {
        // Enforce a strict size so the large default logo doesn't push the channel name out of view
        detailLogo.style.width = '100px';
        detailLogo.style.height = '100px';
        detailLogo.style.maxWidth = '100px';
        detailLogo.style.maxHeight = '100px';
        detailLogo.style.objectFit = 'contain';
        detailLogo.onerror = function() {
            this.onerror = null;
            this.src = 'assets/logo.ico';
        };
        detailLogo.src = (channel.logo && channel.logo.trim() !== '') ? channel.logo : 'assets/logo.ico';
    }
    const detailRes = document.getElementById('detail-res');
    if (detailRes) {
        detailRes.style.display = 'none'; // Hide the resolution display entirely
        // Safely hide the parent label container ("Resolution:") if it exists
        if (detailRes.parentElement && detailRes.parentElement.tagName === 'DIV') {
            detailRes.parentElement.style.display = 'none'; 
        }
    }
    
    const mappedId = channelMappings[channel.title];
    const epgIds = [mappedId, channel.tvg_id, channel.tvg_name].filter(Boolean);
    console.log('[API] Calling getEpg for current stream.');
    const epgData = await window.iptvAPI.getEpg(epgIds, null, null);
    
    let programmes = [];
    for (const id of epgIds) {
        if (epgData[id] && epgData[id].length > 0) { programmes = epgData[id]; break; }
    }
    
    const detailProgram = document.getElementById('detail-program');
    const currentProg = getCurrentProgram(programmes);
    if (detailProgram) {
        if (currentProg) {
            const pStart = parseEpgTime(currentProg.start);
            const pEnd = parseEpgTime(currentProg.stop);
            const timeStr = `${pStart.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - ${pEnd.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
            detailProgram.innerHTML = `${currentProg.title} <span style="font-size: 0.9em; color: #bb86fc; margin-left: 8px;">(${timeStr})</span>`;
        } else {
            detailProgram.textContent = '--';
        }
    }
    
    renderEpg(programmes);
    
    // Setup pending EPG payload to send to MPV Lua script
    let progTitle = '', progDesc = '', progTime = '';
    if (currentProg) {
        progTitle = currentProg.title || '';
        progDesc = currentProg.desc || '';
        const pStart = parseEpgTime(currentProg.start);
        const pEnd = parseEpgTime(currentProg.stop);
        progTime = `${pStart.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - ${pEnd.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
    }
    
    window.pendingEpgUpdate = {
        title: channel.title || '',
        progTitle: progTitle,
        progDesc: progDesc,
        progTime: progTime
    };

    const safeTitle = (channel.title || 'Unknown Channel').replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const playerOverlay = document.getElementById('player-overlay');
    if (playerOverlay) playerOverlay.innerHTML = `<span style="color: #bb86fc;">Loading...</span><br><span style="font-size: 0.6em; color: #888;">${safeTitle}</span>`;

    const rect = playerContainer.getBoundingClientRect();
    console.log('[API] Calling playMpvEmbedded.');
    window.iptvAPI.playMpvEmbedded({
        url: finalStreamUrl,
        title: channel.title,
        bounds: {
            x: Math.round(rect.x),
            y: Math.round(rect.y),
            width: Math.round(rect.width),
            height: Math.round(rect.height)
        }
    });
}

window.iptvAPI.onMpvExit((code) => {
    console.log('[API RECV] onMpvExit with code:', code);
    if (streamActive) {
        streamActive = false;
        currentPlayingChannelIndex = -1;
        document.querySelectorAll('.channel-item').forEach(el => el.classList.remove('active'));

        const playerOverlay = document.getElementById('player-overlay');
        if (playerOverlay) {
            playerOverlay.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; height: 100%;">
                    <img src="assets/logo.png" style="width: 128px; height: 128px; margin-bottom: 20px; border-radius: 15px; background: #fff;">
                    <span style="color: #cf6679; font-size: 1.2em; font-weight: bold;">Channel not available at the moment</span>
                </div>
            `;
        }

        const fsBtn = document.getElementById('fullscreen-btn');
        if (fsBtn) fsBtn.style.display = 'none';
    }
});

window.iptvAPI.onRemotePlayChannel(({ url, title }) => {
    console.log('[REMOTE] Received play request for:', { url, title });
    const targetChannel = allChannels.find(c => c.url === url && c.title === title);
    if (targetChannel) {
        switchTab('live-tv', document.getElementById('btn-live-tv'));
        embedStream(targetChannel);
        showToast(`Playing ${targetChannel.title}`);
        
        if (mainWindow && !mainWindow.isMinimized()) {
            mainWindow.focus();
        }
    }
});

window.iptvAPI.onRemoteSettingsUpdated(() => {
    if (document.getElementById('settings-view') && document.getElementById('settings-view').style.display === 'flex') {
        renderSettings();
    }
});

window.iptvAPI.onRemoteError((msg) => {
    showToast("Remote Server Error: " + msg + "\n\nPlease choose a different port in Settings and try again.");
});

function getVisibleChannels() {
    const filterSelect = document.getElementById('playlist-filter');
    const filterVal = filterSelect ? filterSelect.value : 'all';

    const channelSearch = document.getElementById('channel-search');
    const searchVal = channelSearch ? channelSearch.value.toLowerCase() : '';

    return allChannels.filter(channel => {
        if (filterVal === 'favs' && !channel.favourite) return false;
        if (filterVal !== 'all' && filterVal !== 'favs' && String(channel.playlistId) !== String(filterVal)) return false;
        
        const rawTitle = channel.title || 'Unknown Channel';
        if (searchVal && !rawTitle.toLowerCase().includes(searchVal)) return false;

        return true;
    });
}

window.iptvAPI.onPreviousChannel(() => {
    const currentUrl = localStorage.getItem('lastPlayedChannelUrl');
    const detailName = document.getElementById('detail-name');
    const currentTitle = detailName ? detailName.textContent : '';
    
    let visibleChannels = getVisibleChannels();
    if (visibleChannels.length === 0) visibleChannels = allChannels;

    const idx = visibleChannels.findIndex(c => c.url === currentUrl && (c.title || 'Unknown Channel') === currentTitle);
    if (idx > 0) {
        embedStream(visibleChannels[idx - 1]);
    } else if (idx === 0 && visibleChannels.length > 0) {
        embedStream(visibleChannels[visibleChannels.length - 1]); // Wrap around
    } else if (idx === -1 && visibleChannels.length > 0) {
        embedStream(visibleChannels[0]);
    }
});

window.iptvAPI.onNextChannel(() => {
    const currentUrl = localStorage.getItem('lastPlayedChannelUrl');
    const detailName = document.getElementById('detail-name');
    const currentTitle = detailName ? detailName.textContent : '';

    let visibleChannels = getVisibleChannels();
    if (visibleChannels.length === 0) visibleChannels = allChannels;

    const idx = visibleChannels.findIndex(c => c.url === currentUrl && (c.title || 'Unknown Channel') === currentTitle);
    if (idx >= 0 && idx < visibleChannels.length - 1) {
        embedStream(visibleChannels[idx + 1]);
    } else if (idx === visibleChannels.length - 1 && visibleChannels.length > 0) {
        embedStream(visibleChannels[0]); // Wrap around
    } else if (idx === -1 && visibleChannels.length > 0) {
        embedStream(visibleChannels[0]);
    }
});

function getFocusableElements() {
    const exitToast = document.getElementById('remote-exit-toast');
    const overrideToast = document.getElementById('remote-override-toast');
    const activeToast = exitToast || overrideToast;

    const focusableSelectors = [
        'button', 'a[href]', 'input', 'select', 'textarea', '[tabindex]:not([tabindex="-1"])'
    ];
    
    let rootNode = activeToast ? activeToast : document;

    return Array.from(rootNode.querySelectorAll(focusableSelectors.join(', ')))
        .filter(el => {
            if (!el) return false;
                if (!activeToast && el.closest('#nav-bar')) return false;
            if (!activeToast && (el.closest('#channel-details') || el.closest('#player-wrapper'))) return false;
            const rect = el.getBoundingClientRect();
            const style = window.getComputedStyle(el);
            return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.opacity !== '0' && !el.disabled;
        });
}

function getCenter(rect) {
    return {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
    };
}

function navigateDirection(direction) {
    const focusables = getFocusableElements();
    if (focusables.length === 0) return;

    let current = document.activeElement;

    if (current && current.tagName === 'SELECT' && current.classList.contains('remote-open')) {
        const options = Array.from(current.options);
        let selectedIndex = current.selectedIndex;
        if (direction === 'down' || direction === 'right') {
            selectedIndex = Math.min(options.length - 1, selectedIndex + 1);
        } else if (direction === 'up' || direction === 'left') {
            selectedIndex = Math.max(0, selectedIndex - 1);
        }
        if (selectedIndex !== current.selectedIndex) {
            current.selectedIndex = selectedIndex;
            current.dispatchEvent(new Event('change', { bubbles: true }));
        }
        return;
    }

    if (!current || !focusables.includes(current) || current === document.body) {
        const activeToast = document.getElementById('remote-exit-toast') || document.getElementById('remote-override-toast');
        
        const firstChannel = document.querySelector('.channel-item');
        if (!activeToast && firstChannel && firstChannel.getBoundingClientRect().width > 0) {
            firstChannel.focus();
            return;
        }

        focusables[0].focus();
        return;
    }

    const currentRect = current.getBoundingClientRect();
    const currentCenter = getCenter(currentRect);

    let bestMatch = null;
    let minDistance = Infinity;

    focusables.forEach(el => {
        if (el === current) return;
        const rect = el.getBoundingClientRect();
        const center = getCenter(rect);

        let dx = center.x - currentCenter.x;
        let dy = center.y - currentCenter.y;

        let isDirectionMatch = false;
        if (direction === 'up') isDirectionMatch = dy < 0 && Math.abs(dy) >= Math.abs(dx);
        if (direction === 'down') isDirectionMatch = dy > 0 && Math.abs(dy) >= Math.abs(dx);
        if (direction === 'left') isDirectionMatch = dx < 0 && Math.abs(dx) >= Math.abs(dy);
        if (direction === 'right') isDirectionMatch = dx > 0 && Math.abs(dx) >= Math.abs(dy);

        if (!isDirectionMatch) {
            if (direction === 'up' && dy < 0) isDirectionMatch = true;
            if (direction === 'down' && dy > 0) isDirectionMatch = true;
            if (direction === 'left' && dx < 0) isDirectionMatch = true;
            if (direction === 'right' && dx > 0) isDirectionMatch = true;
        }

        if (isDirectionMatch) {
            const distance = Math.sqrt(dx * dx + dy * dy);
            let score = distance;
            
            if (direction === 'up' || direction === 'down') {
                score += Math.abs(dx) * 2; 
            } else {
                score += Math.abs(dy) * 2; 
            }

            if (score < minDistance) {
                minDistance = score;
                bestMatch = el;
            }
        }
    });

    if (bestMatch) {
        bestMatch.focus();
        bestMatch.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }
}

function handleOkPress() {
    const current = document.activeElement;
    if (current && current.tagName === 'SELECT') {
        if (current.classList.contains('remote-open')) {
            current.classList.remove('remote-open');
        } else {
            current.classList.add('remote-open');
            current.addEventListener('blur', function onBlur() {
                current.classList.remove('remote-open');
                current.removeEventListener('blur', onBlur);
            });
        }
    } else if (current && current.tagName === 'INPUT' && ['text', 'password', 'number', 'search'].includes(current.type)) {
        if (window.iptvAPI.focusRemoteSearch) window.iptvAPI.focusRemoteSearch();
        current.click();
    } else if (current && ['BUTTON', 'A', 'INPUT'].includes(current.tagName)) {
        current.click();
    } else if (current && (current.classList.contains('channel-item') || current.classList.contains('group-item') || current.classList.contains('mapping-ch-item') || current.classList.contains('mapping-epg-item') || current.classList.contains('epg-play-channel') || current.classList.contains('live-epg-item'))) {
        const reminderBtn = current.querySelector('.reminder-btn-sidebar');
        if (current.classList.contains('live-epg-item')) {
            if (reminderBtn) reminderBtn.click();
        } else {
            current.click();
        }
    } else {
        if (streamActive) {
            window.iptvAPI.sendMpvCommand('cycle pause');
        }
    }
}

window.iptvAPI.onRemoteSearch((text) => {
    let activeSearch = null;
    
    if (document.activeElement && document.activeElement.tagName === 'INPUT' && ['text', 'password', 'number', 'search'].includes(document.activeElement.type)) {
        activeSearch = document.activeElement;
    } else {
        const manageModal = document.getElementById('manage-channels-modal');
        const settingsView = document.getElementById('settings-view');
        
        if (manageModal && manageModal.style.display !== 'none') {
            activeSearch = document.getElementById('modal-channel-search');
        } else if (settingsView && settingsView.style.display !== 'none') {
            activeSearch = document.getElementById('mapping-channel-search');
        } else {
            activeSearch = document.getElementById('channel-search');
        }
    }

    if (activeSearch) {
        if (document.activeElement !== activeSearch) activeSearch.focus();
        activeSearch.value = text;
        activeSearch.dispatchEvent(new Event('input', { bubbles: true }));
    }
});

document.addEventListener('input', (e) => {
    if (e.isTrusted && e.target.tagName === 'INPUT' && ['channel-search', 'modal-channel-search', 'mapping-channel-search', 'mapping-epg-search', 'mapping-mapped-search'].includes(e.target.id)) {
        if (window.iptvAPI.syncRemoteSearch) window.iptvAPI.syncRemoteSearch(e.target.value);
    }
});

window.iptvAPI.onRemoteAction((cmd) => {
    console.log('[REMOTE] Action received:', cmd);
    switch (cmd) {
        case 'up':
        case 'down':
        case 'left':
        case 'right':
            if (streamActive && (!document.activeElement || document.activeElement === document.body)) {
                if (cmd === 'up') window.iptvAPI.sendMpvCommand('add volume 5');
                if (cmd === 'down') window.iptvAPI.sendMpvCommand('add volume -5');
                if (cmd === 'right') window.iptvAPI.sendMpvCommand('seek 10');
                if (cmd === 'left') window.iptvAPI.sendMpvCommand('seek -10');
            } else {
                navigateDirection(cmd);
            }
            break;
        case 'ok':
            handleOkPress();
            break;
        case 'power':
            let exitToast = document.getElementById('remote-exit-toast');
            if (exitToast) exitToast.remove();
            
            exitToast = document.createElement('div');
            exitToast.id = 'remote-exit-toast';
            exitToast.style.cssText = 'position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%); background: #1e1e1e; border: 1px solid #cf6679; color: #fff; padding: 20px; border-radius: 12px; z-index: 2147483647; box-shadow: 0 10px 30px rgba(0,0,0,0.8); text-align: center; font-family: "Inter", sans-serif; min-width: 300px; transition: opacity 0.3s; opacity: 1;';
            exitToast.innerHTML = `
                <div style="font-weight: bold; margin-bottom: 10px; color: #cf6679; font-size: 1.1em;">Exit Application</div>
                <div style="margin-bottom: 20px; font-size: 0.9em; color: #ccc;">Do you want to exit?</div>
                <div style="display: flex; gap: 10px; justify-content: center;">
                    <button id="btn-remote-exit-yes" class="playlist-btn" style="background: #cf6679; color: black; font-weight: bold; padding: 10px 16px; flex: 1;">Yes</button>
                    <button id="btn-remote-exit-no" class="playlist-btn" style="background: #333; color: white; font-weight: bold; padding: 10px 16px; flex: 1;">No</button>
                </div>
            `;
            document.body.appendChild(exitToast);
            
            document.getElementById('btn-remote-exit-yes').addEventListener('click', () => {
                window.close(); // Gracefully closes the window and terminates MPV
            });
            document.getElementById('btn-remote-exit-no').addEventListener('click', () => {
                exitToast.style.pointerEvents = 'none';
                exitToast.style.opacity = '0';
                if (document.activeElement) document.activeElement.blur();
                setTimeout(() => exitToast.remove(), 300);
            });

            setTimeout(() => {
                const btnNo = document.getElementById('btn-remote-exit-no');
                if (btnNo) btnNo.focus();
            }, 50);
            break;
        case 'home':
            switchTab('live-tv', document.getElementById('btn-live-tv'));
            break;
        case 'back':
            switchTab(previousTabId, document.getElementById('btn-' + previousTabId));
            break;
        case 'guide':
            switchTab('epg', document.getElementById('btn-epg'));
            break;
        case 'livetv':
            switchTab('live-tv', document.getElementById('btn-live-tv'));
            break;
        case 'playlist':
            switchTab('playlist', document.getElementById('btn-playlist'));
            break;
        case 'settings':
            switchTab('settings', document.getElementById('btn-settings'));
            break;
        case 'fullscreen':
            window.iptvAPI.toggleFullscreen();
            break;
        case 'favorites':
            const filter = document.getElementById('playlist-filter');
            if (filter) {
                filter.value = filter.value === 'favs' ? 'all' : 'favs';
                filter.dispatchEvent(new Event('change'));
            }
            break;
        case 'search':
            const search = document.getElementById('channel-search');
            if (search) search.focus();
            break;
    }
});

window.iptvAPI.onShowRemoteOverrideToast((deviceId) => {
    let toast = document.getElementById('remote-override-toast');
    if (toast) toast.remove();
    
    toast = document.createElement('div');
    toast.id = 'remote-override-toast';
    toast.style.cssText = 'position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%); background: #1e1e1e; border: 1px solid #bb86fc; color: #fff; padding: 20px; border-radius: 12px; z-index: 2147483647; box-shadow: 0 10px 30px rgba(0,0,0,0.8); text-align: center; font-family: "Inter", sans-serif; min-width: 300px; transition: opacity 0.3s; opacity: 1;';
    toast.innerHTML = `
        <div style="font-weight: bold; margin-bottom: 10px; color: #bb86fc; font-size: 1.1em;">New Remote Connection</div>
        <div style="margin-bottom: 20px; font-size: 0.9em; color: #ccc;">A new device is trying to connect.<br>Allow the new device and disconnect the old one?</div>
        <div style="display: flex; gap: 10px; justify-content: center;">
            <button id="btn-remote-allow" class="playlist-btn" style="background: #43CB44; color: black; font-weight: bold; padding: 10px 16px; flex: 1;">Allow</button>
            <button id="btn-remote-deny" class="playlist-btn" style="background: #cf6679; color: black; font-weight: bold; padding: 10px 16px; flex: 1;">Keep Old</button>
        </div>
    `;
    document.body.appendChild(toast);
    
    document.getElementById('btn-remote-allow').addEventListener('click', () => {
        window.iptvAPI.sendRemoteOverrideResponse(true);
        toast.style.pointerEvents = 'none';
        toast.style.opacity = '0';
        if (document.activeElement) document.activeElement.blur();
        setTimeout(() => toast.remove(), 300);
    });
    document.getElementById('btn-remote-deny').addEventListener('click', () => {
        window.iptvAPI.sendRemoteOverrideResponse(false);
        toast.style.pointerEvents = 'none';
        toast.style.opacity = '0';
        if (document.activeElement) document.activeElement.blur();
        setTimeout(() => toast.remove(), 300);
    });

    setTimeout(() => {
        const btnDeny = document.getElementById('btn-remote-deny');
        if (btnDeny) btnDeny.focus();
    }, 50);
});

// Use ResizeObserver to track exact pixel coordinates perfectly
const resizeObserver = new ResizeObserver(() => {
    if (streamActive) {
        console.log('[EVENT] ResizeObserver triggered, updating MPV bounds.');
        const rect = playerContainer.getBoundingClientRect();
        window.iptvAPI.updateMpvBounds({
            x: Math.round(rect.x),
            y: Math.round(rect.y),
            width: Math.round(rect.width),
            height: Math.round(rect.height)
        });
    }
});
resizeObserver.observe(playerContainer);

// Forward mouse events directly to the embedded MPV Lua script
let lastMouseMove = 0;
playerContainer.addEventListener('mousemove', (e) => {
    const now = Date.now();
    if (now - lastMouseMove > 30) {
        lastMouseMove = now;
        const rect = playerContainer.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        const x = Math.round((e.clientX - rect.left) * dpr);
        const y = Math.round((e.clientY - rect.top) * dpr);
        window.iptvAPI.sendMpvCommand(`script-message-to modernz electron-mouse-move ${x} ${y}`);
    }
});

playerContainer.addEventListener('mouseleave', () => {
    console.log('[EVENT] playerContainer mouseleave');
    window.iptvAPI.sendMpvCommand(`script-message-to modernz electron-mouse-leave`);
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
    window.iptvAPI.sendMpvCommand(`script-message-to modernz electron-mouse-click ${btn} down`);
});

playerContainer.addEventListener('mouseup', (e) => {
    console.log('[EVENT] playerContainer mouseup, button:', e.button);
    const btn = e.button === 0 ? 'mbtn_left' : (e.button === 2 ? 'mbtn_right' : 'mbtn_mid');
    window.iptvAPI.sendMpvCommand(`script-message-to modernz electron-mouse-click ${btn} up`);
});

playerContainer.addEventListener('wheel', (e) => {
    console.log('[EVENT] playerContainer wheel, deltaY:', e.deltaY);
    const btn = e.deltaY < 0 ? 'wheel_up' : 'wheel_down';
    window.iptvAPI.sendMpvCommand(`script-message-to modernz electron-mouse-click ${btn} press`);
});

// Wire up the Exit button to gracefully tear down the app
document.getElementById('btn-exit').addEventListener('click', () => {
    console.log('[EVENT] Exit button clicked.');
    window.close();
});

// Setup Tab Navigation Logic
const navButtons = document.querySelectorAll('.nav-btn:not(#btn-exit)');
const sidebar = document.getElementById('sidebar');
const mainView = document.getElementById('main-view');

let currentTabId = 'playlist';
let previousTabId = 'playlist';

function switchTab(tabId, clickedBtn) {
    console.log('[UI] Switching tab to:', tabId);
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

    if (sidebar) sidebar.style.setProperty('display', isLive ? 'flex' : 'none', 'important');
    if (mainView) mainView.style.setProperty('display', isLive ? 'flex' : 'none', 'important');
    
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

    // Explicitly hide or restore the video player bounds instantly when switching views
    if (streamActive) {
        if (isLive) {
            const rect = playerContainer.getBoundingClientRect();
            window.iptvAPI.updateMpvBounds({
                x: Math.round(rect.x),
                y: Math.round(rect.y),
                width: Math.round(rect.width),
                height: Math.round(rect.height)
            });
        } else {
            window.iptvAPI.updateMpvBounds({ x: 0, y: 0, width: 0, height: 0 });
        }
    }

    setTimeout(() => {
        const focusables = getFocusableElements();
        if (focusables.length > 0) {
            focusables[0].focus();
        }
    }, 100);
}

document.getElementById('btn-live-tv').addEventListener('click', function() { if (!this.disabled) switchTab('live-tv', this); });
document.getElementById('btn-playlist').addEventListener('click', function() { switchTab('playlist', this); });
document.getElementById('btn-epg').addEventListener('click', function() { if (!this.disabled) switchTab('epg', this); });
document.getElementById('btn-settings').addEventListener('click', function() { if (!this.disabled) switchTab('settings', this); });
document.getElementById('btn-movies').addEventListener('click', function() { if (!this.disabled) switchTab('movies', this); });
document.getElementById('btn-vod').addEventListener('click', function() { if (!this.disabled) switchTab('vod', this); });
document.getElementById('btn-recording').addEventListener('click', function() { showToast('Coming in Next Version'); });

let currentMovieCategory = null;

async function renderMovies() {
    console.log('[CATALOG] Rendering Movies Catalog');
    const grid = document.getElementById('movies-grid');
    const empty = document.getElementById('movies-empty');
    if (!grid) return;
    grid.innerHTML = '';
    
    let headerContainer = document.getElementById('movies-header-container');
    if (!headerContainer) {
        headerContainer = document.createElement('div');
        headerContainer.id = 'movies-header-container';
        headerContainer.style.display = 'flex';
        headerContainer.style.alignItems = 'center';
        headerContainer.style.gap = '15px';
        headerContainer.style.marginBottom = '20px';
        
        const backBtn = document.createElement('button');
        backBtn.className = 'playlist-btn';
        backBtn.innerHTML = '&larr; Back to Categories';
        backBtn.style.display = 'none';
        backBtn.id = 'movies-back-btn';
        backBtn.onclick = () => {
            currentMovieCategory = null;
            renderMovies();
        };
        
        const titleLabel = document.createElement('h3');
        titleLabel.id = 'movies-category-title';
        titleLabel.style.margin = '0';
        titleLabel.style.color = '#bb86fc';
        
        headerContainer.appendChild(backBtn);
        headerContainer.appendChild(titleLabel);
        
        grid.parentNode.insertBefore(headerContainer, grid);
    }
    
    const backBtn = document.getElementById('movies-back-btn');
    const titleLabel = document.getElementById('movies-category-title');
    
    if (currentMovieCategory) {
        backBtn.style.display = 'block';
        titleLabel.textContent = currentMovieCategory.title;
        
        grid.innerHTML = '<div style="color: #888; text-align: center; padding: 50px; grid-column: 1 / -1;">Loading movies...</div>';
        
        const playlist = savedPlaylists.find(p => p.id === currentMovieCategory.playlistId);
        if (playlist) {
            const items = await window.iptvAPI.loadStalkerCategory({
                url: playlist.source,
                mac: playlist.epg.substring(8),
                categoryId: currentMovieCategory.tvg_id,
                isSeries: false
            });
            
            grid.innerHTML = '';
            if (items.length === 0) {
                grid.innerHTML = '<div style="color: #888; text-align: center; padding: 50px; grid-column: 1 / -1;">No movies found in this category.</div>';
                return;
            }
            
            items.forEach(movie => {
                const card = document.createElement('div');
                card.className = 'catalog-card';
                const logoUrl = movie.logo || 'assets/logo.ico';
                card.innerHTML = `
                    <div class="catalog-poster-wrapper">
                        <img class="catalog-poster" src="${logoUrl}" alt="${movie.name}" onerror="this.onerror=null; this.src='assets/logo.ico';">
                    </div>
                    <div class="catalog-info">
                        <h4 class="catalog-title" title="${movie.name}">${movie.name}</h4>
                        <div class="catalog-meta">
                            <span class="catalog-badge">Movie</span>
                        </div>
                    </div>
                `;
                card.addEventListener('click', () => {
                    switchTab('live-tv', document.getElementById('btn-live-tv'));
                    embedStream({
                        title: movie.name,
                        url: movie.url,
                        logo: movie.logo,
                        playlistId: playlist.id,
                        type: 'movie'
                    });
                });
                grid.appendChild(card);
            });
        }
        return;
    }
    
    backBtn.style.display = 'none';
    titleLabel.textContent = 'Movie Categories';

    let movies = [];
    savedPlaylists.forEach(p => {
        if (p.channels && !p.disabled) {
            p.channels.forEach(c => {
                if ((c.type === 'movie' || c.type === 'movie_category') && !c.disabled) {
                    c.playlistId = p.id;
                    movies.push(c);
                }
            });
        }
    });

    if (movies.length === 0) {
        if (empty) empty.style.display = 'block';
        return;
    }
    if (empty) empty.style.display = 'none';

    movies.sort((a, b) => sortAlphaNum(a.title, b.title));

    movies.forEach(movie => {
        const card = document.createElement('div');
        card.className = 'catalog-card';
        const logoUrl = movie.logo || 'assets/logo.ico';
        const isCategory = movie.type === 'movie_category';
        card.innerHTML = `
            <div class="catalog-poster-wrapper" style="${isCategory ? 'padding-top: 100%;' : ''}">
                ${isCategory ? `<div style="position:absolute; top:0; left:0; width:100%; height:100%; display:flex; align-items:center; justify-content:center; font-size: 3em; color: #bb86fc; background: #1a1a1a;">📁</div>` : `<img class="catalog-poster" src="${logoUrl}" alt="${movie.title}" onerror="this.onerror=null; this.src='assets/logo.ico';">`}
            </div>
            <div class="catalog-info">
                <h4 class="catalog-title" title="${movie.title}">${movie.title}</h4>
                <div class="catalog-meta">
                    <span class="catalog-badge">${isCategory ? 'Folder' : 'Movie'}</span>
                </div>
            </div>
        `;
        card.addEventListener('click', () => {
            if (isCategory) {
                currentMovieCategory = movie;
                renderMovies();
            } else {
                console.log('[CATALOG] Playing Movie:', movie.title);
                switchTab('live-tv', document.getElementById('btn-live-tv'));
                embedStream(movie);
            }
        });
        grid.appendChild(card);
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
                const title = card.querySelector('.catalog-title').textContent.toLowerCase();
                if (title.includes(query)) {
                    card.style.display = 'flex';
                } else {
                    card.style.display = 'none';
                }
            });
        });
    }
}

let currentVodCategory = null;

function renderVod() {
    console.log('[CATALOG] Rendering VOD/Series Catalog');
    const grid = document.getElementById('vod-grid');
    const empty = document.getElementById('vod-empty');
    if (!grid) return;
    grid.innerHTML = '';
    
    let headerContainer = document.getElementById('vod-header-container');
    if (!headerContainer) {
        headerContainer = document.createElement('div');
        headerContainer.id = 'vod-header-container';
        headerContainer.style.display = 'flex';
        headerContainer.style.alignItems = 'center';
        headerContainer.style.gap = '15px';
        headerContainer.style.marginBottom = '20px';
        
        const backBtn = document.createElement('button');
        backBtn.className = 'playlist-btn';
        backBtn.innerHTML = '&larr; Back to Categories';
        backBtn.style.display = 'none';
        backBtn.id = 'vod-back-btn';
        backBtn.onclick = () => {
            currentVodCategory = null;
            renderVod();
        };
        
        const titleLabel = document.createElement('h3');
        titleLabel.id = 'vod-category-title';
        titleLabel.style.margin = '0';
        titleLabel.style.color = '#bb86fc';
        
        headerContainer.appendChild(backBtn);
        headerContainer.appendChild(titleLabel);
        
        grid.parentNode.insertBefore(headerContainer, grid);
    }
    
    const backBtn = document.getElementById('vod-back-btn');
    const titleLabel = document.getElementById('vod-category-title');
    
    if (currentVodCategory) {
        backBtn.style.display = 'block';
        titleLabel.textContent = currentVodCategory.title;
        
        grid.innerHTML = '<div style="color: #888; text-align: center; padding: 50px; grid-column: 1 / -1;">Loading series...</div>';
        
        const playlist = savedPlaylists.find(p => p.id === currentVodCategory.playlistId);
        if (playlist) {
            window.iptvAPI.loadStalkerCategory({
                url: playlist.source,
                mac: playlist.epg.substring(8),
                categoryId: currentVodCategory.tvg_id,
                isSeries: true
            }).then(items => {
                grid.innerHTML = '';
                if (items.length === 0) {
                    grid.innerHTML = '<div style="color: #888; text-align: center; padding: 50px; grid-column: 1 / -1;">No series found in this category.</div>';
                    return;
                }
                
                items.forEach(s => {
                    const card = document.createElement('div');
                    card.className = 'catalog-card';
                    const logoUrl = s.logo || 'assets/logo.ico';
                    card.innerHTML = `
                        <div class="catalog-poster-wrapper">
                            <img class="catalog-poster" src="${logoUrl}" alt="${s.name}" onerror="this.onerror=null; this.src='assets/logo.ico';">
                        </div>
                        <div class="catalog-info">
                            <h4 class="catalog-title" title="${s.name}">${s.name}</h4>
                            <div class="catalog-meta">
                                <span class="catalog-badge">Series</span>
                            </div>
                        </div>
                    `;
                    card.addEventListener('click', () => {
                        console.log('[CATALOG] Opening Series Episodes:', s.name);
                        openEpisodesModal(playlist.id, s.id, s.name);
                    });
                    grid.appendChild(card);
                });
            });
        }
        return;
    }
    
    backBtn.style.display = 'none';
    titleLabel.textContent = 'Series Categories';

    let series = [];
    savedPlaylists.forEach(p => {
        if (p.channels && !p.disabled) {
            p.channels.forEach(c => {
                if ((c.type === 'vod' || c.type === 'vod_category') && !c.disabled) {
                    c.playlistId = p.id;
                    series.push(c);
                }
            });
        }
    });

    if (series.length === 0) {
        if (empty) empty.style.display = 'block';
        return;
    }
    if (empty) empty.style.display = 'none';

    series.sort((a, b) => sortAlphaNum(a.title, b.title));

    series.forEach(s => {
        const card = document.createElement('div');
        card.className = 'catalog-card';
        const logoUrl = s.logo || 'assets/logo.ico';
        const isCategory = s.type === 'vod_category';
        card.innerHTML = `
            <div class="catalog-poster-wrapper" style="${isCategory ? 'padding-top: 100%;' : ''}">
                ${isCategory ? `<div style="position:absolute; top:0; left:0; width:100%; height:100%; display:flex; align-items:center; justify-content:center; font-size: 3em; color: #bb86fc; background: #1a1a1a;">📁</div>` : `<img class="catalog-poster" src="${logoUrl}" alt="${s.title}" onerror="this.onerror=null; this.src='assets/logo.ico';">`}
            </div>
            <div class="catalog-info">
                <h4 class="catalog-title" title="${s.title}">${s.title}</h4>
                <div class="catalog-meta">
                    <span class="catalog-badge">${isCategory ? 'Folder' : 'Series'}</span>
                </div>
            </div>
        `;
        card.addEventListener('click', () => {
            if (isCategory) {
                currentVodCategory = s;
                renderVod();
            } else {
                console.log('[CATALOG] Opening Series Episodes:', s.title);
                openEpisodesModal(s.playlistId, s.tvg_id, s.title);
            }
        });
        grid.appendChild(card);
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
                const title = card.querySelector('.catalog-title').textContent.toLowerCase();
                if (title.includes(query)) {
                    card.style.display = 'flex';
                } else {
                    card.style.display = 'none';
                }
            });
        });
    }
}

async function openEpisodesModal(playlistId, seriesId, seriesTitle) {
    console.log('[UI] Opening episodes modal for:', seriesTitle, 'playlist:', playlistId, 'seriesId:', seriesId);
    
    const modal = document.getElementById('episodes-modal');
    const modalTitle = document.getElementById('episodes-modal-title');
    const seasonsSidebar = document.getElementById('seasons-sidebar');
    const episodesGrid = document.getElementById('episodes-grid');
    const loader = document.getElementById('episodes-loading');
    
    if (!modal) return;
    
    modalTitle.textContent = seriesTitle;
    if (seasonsSidebar) seasonsSidebar.innerHTML = '';
    if (episodesGrid) episodesGrid.innerHTML = '';
    if (loader) loader.style.display = 'block';
    
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
            seasonEpisodes.forEach(ep => {
                const epCard = document.createElement('button');
                epCard.className = 'episode-card';
                epCard.style.width = '100%';
                epCard.style.textAlign = 'left';
                
                epCard.innerHTML = `
                    <div class="episode-num">${ep.episodeNum || ''}</div>
                    <div class="episode-name" title="${ep.name}">${ep.name || `Episode ${ep.episodeNum}`}</div>
                `;
                
                epCard.addEventListener('click', () => {
                    console.log('[CATALOG] Playing Series Episode:', ep.name, ep.url);
                    modal.style.display = 'none';
                    switchTab('live-tv', document.getElementById('btn-live-tv'));
                    
                    const seriesPoster = playlist.channels.find(c => c.tvg_id === seriesId)?.logo || 'assets/logo.ico';
                    embedStream({
                        title: `${seriesTitle} - S${seasonNum}E${ep.episodeNum} - ${ep.name || 'Episode'}`,
                        url: ep.url,
                        logo: seriesPoster,
                        playlistId: playlist.id
                    });
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
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (modal && modal.style.display === 'flex') {
                modal.style.display = 'none';
            }
        }
    });
});

// Hide the sidebar & title when the app goes fullscreen so the video takes up 100% of the monitor
window.iptvAPI.onFullscreenChange((isFullscreen) => {
    console.log('[API RECV] onFullscreenChange, isFullscreen:', isFullscreen);
    const navBar = document.getElementById('nav-bar');
    const sidebar = document.getElementById('sidebar');
    const channelDetails = document.getElementById('channel-details');
    const liveBottomHalf = document.getElementById('live-bottom-half');
    const liveTopHalf = document.getElementById('live-top-half');
    const playerWrapper = document.getElementById('player-wrapper');
    
    const isLiveViewActive = document.getElementById('btn-live-tv').classList.contains('active');

    if (sidebar) sidebar.style.setProperty('display', (isFullscreen || !isLiveViewActive) ? 'none' : 'flex', 'important');
    if (navBar) navBar.style.setProperty('display', isFullscreen ? 'none' : 'flex', 'important');
    
    if (channelDetails) channelDetails.style.setProperty('display', isFullscreen ? 'none' : 'flex', 'important');
    if (liveBottomHalf) liveBottomHalf.style.setProperty('display', isFullscreen ? 'none' : 'block', 'important');
    
    if (liveTopHalf) liveTopHalf.style.setProperty('height', isFullscreen ? '100%' : '50%', 'important');
    
    if (playerWrapper) {
        if (isFullscreen) {
            playerWrapper.style.setProperty('padding', '0', 'important');
            playerWrapper.style.setProperty('background-color', 'transparent', 'important');
            playerWrapper.style.setProperty('border-radius', '0', 'important');
            document.body.style.setProperty('padding', '0', 'important');
            document.body.style.setProperty('gap', '0', 'important');
            if (liveTopHalf) liveTopHalf.style.setProperty('gap', '0', 'important');
        } else {
            playerWrapper.style.setProperty('padding', '1px', 'important');
            playerWrapper.style.setProperty('background-color', '#333', 'important');
            playerWrapper.style.setProperty('border-radius', '0', 'important');
            document.body.style.setProperty('padding', '12px', 'important');
            document.body.style.setProperty('gap', '12px', 'important');
            if (liveTopHalf) liveTopHalf.style.setProperty('gap', '12px', 'important');
        }
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
            const channels = Array.isArray(result) ? result : result.channels;
            const oldMap = new Map();
            if (p.channels) p.channels.forEach(c => oldMap.set(c.title, c));

            channels.forEach(newCh => {
                const old = oldMap.get(newCh.title);
                if (old) {
                    newCh.disabled = old.disabled;
                    newCh.favourite = old.favourite;
                    if (old.isNew) newCh.isNew = true;
                } else {
                    newCh.disabled = true;
                    newCh.isNew = true;
                }
            });

            savedPlaylists[i].channels = channels;
            if (!isStalker && result.epg_url && (!savedPlaylists[i].epg || savedPlaylists[i].epg === 'Not Configured')) {
                savedPlaylists[i].epg = result.epg_url;
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

    // Hide all main view containers initially to prevent UI flash before data loads
    ['sidebar', 'main-view', 'playlist-view', 'epg-view', 'settings-view'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
        if (el) el.style.setProperty('display', 'none', 'important');
    });

    // Add custom fullscreen button to the player container
    const fsBtn = document.createElement('button');
    fsBtn.id = 'fullscreen-btn';
    fsBtn.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>';
    fsBtn.title = 'Toggle Fullscreen';
    fsBtn.style.display = 'none'; // Initially hidden
    playerContainer.appendChild(fsBtn);
    fsBtn.addEventListener('click', () => {
        window.iptvAPI.toggleFullscreen();
    });

    // Increase side menu (nav-bar) width by 25%
    const navBar = document.getElementById('nav-bar');
    if (navBar) {
        const currentWidth = parseFloat(window.getComputedStyle(navBar).width);
        if (!isNaN(currentWidth) && currentWidth > 0) {
            const newWidth = currentWidth * 1.25;
            navBar.style.width = newWidth + 'px';
            navBar.style.minWidth = newWidth + 'px';
            navBar.style.maxWidth = newWidth + 'px';
            navBar.style.flex = `0 0 ${newWidth}px`;
        }
    }

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
        } else {
            savedPlaylists = data;
        }
        
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
                    embedStream(lastChannel);
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

    // Check for Reminders periodically
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
        
        setInterval(() => {
            if (!document.hasFocus()) return;
            if (!document.activeElement || document.activeElement === document.body) {
                const focusables = getFocusableElements();
                if (focusables.length > 0) {
                    focusables[0].focus();
                }
            }
        }, 500);
    }, 1000);
});
