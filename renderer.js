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
    .channel-item, .mapping-ch-item, .mapping-epg-item, .epg-program-cell, .epg-play-channel { 
        font-weight: normal; 
    }

    /* Hover and Focus States */
    *:focus, .active, .channel-item:hover, .epg-program-cell:hover, .epg-play-channel:hover, .mapping-ch-item:hover, .mapping-epg-item:hover { 
        font-weight: bold !important; 
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

    /* Force square corners on player to prevent native window bleed */
    #player-wrapper {
        border-radius: 0 !important;
    }

    /* Live TV Screen Split Layout */
    #sidebar {
        flex: 3 !important;
        max-width: none !important;
        width: auto !important;
    }
    #main-view {
        flex: 7 !important;
        flex-direction: column !important;
    }
    #live-top-half {
        display: flex !important;
        flex-direction: row !important;
        height: 50% !important;
        width: 100% !important;
        gap: 12px !important;
    }
    #live-bottom-half {
        height: 50% !important;
        width: 100% !important;
        overflow-y: auto !important;
    }
    #player-wrapper {
        flex: 2 !important;
    }
    #channel-details {
        flex: 1 !important;
        overflow-y: auto !important;
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

let savedPlaylists = [];
let allChannels = [];
let streamActive = false;
let editingPlaylistIndex = -1;

let savedEpgs = [];
let channelMappings = {};

let savedReminders = JSON.parse(localStorage.getItem('iptv_reminders') || '[]');

function saveReminders() {
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
    let toast = document.getElementById('toast-notification');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast-notification';
        toast.style.cssText = 'position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%); background: #bb86fc; color: #000; padding: 12px 24px; border-radius: 30px; z-index: 10000; font-weight: bold; font-family: "Inter", sans-serif; box-shadow: 0 5px 15px rgba(0,0,0,0.5); transition: opacity 0.3s; opacity: 0; pointer-events: none;';
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

async function autoMapChannels(showSummaryAlert = false) {
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
        updateState();
        renderMappingColumns();
        if (showSummaryAlert) alert(`Successfully auto-mapped ${mappedCount} channels!`);
    } else {
        if (showSummaryAlert) alert("No new channels could be auto-mapped.");
    }
}

function updateNavLockState() {
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
            <div class="mapping-ch-item" data-title="${safeTitle.replace(/"/g, '&quot;')}" style="padding: 10px; margin-bottom: 6px; background: ${bg}; border: ${border}; border-radius: 4px; cursor: pointer; transition: 0.1s;">
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
            <div class="mapping-epg-item" data-id="${safeId.replace(/"/g, '&quot;')}" style="display: flex; justify-content: space-between; align-items: center; padding: 10px; margin-bottom: 6px; background: ${bg}; border: ${border}; border-radius: 4px; cursor: pointer; transition: 0.1s;">
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
            if (!mappingSelectedChannel || !mappingSelectedEpg) return alert("Select a channel and an EPG source first.");
            
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
    if (!settingsView) return;

    savedEpgs.sort((a, b) => sortAlphaNum(getEpgName(a), getEpgName(b)));

    let epgListHtml = savedEpgs.map((epg, idx) => `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; background: #2a2a2a; margin-bottom: 8px; border-radius: 6px;">
            <div style="display: flex; flex-direction: column; flex-grow: 1; margin-right: 15px; overflow: hidden;">
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
            <div style="display: flex; flex-direction: column; flex-grow: 1; overflow: hidden;">
                <span style="color: #bb86fc; font-weight: bold; margin-bottom: 4px;">${r.progTitle}</span>
                <span style="color: #888; font-size: 0.85em;">${r.channelTitle} &bull; ${st}</span>
            </div>
            <button class="playlist-btn remove-reminder-btn" data-idx="${i}" style="background: transparent; color: #cf6679; border: none; font-size: 1.2em; padding: 0 5px; cursor: pointer;" title="Remove Reminder">&times;</button>
        </div>`;
    }).join('') : '<div style="color:#666; font-style: italic;">No upcoming reminders.</div>';

    settingsView.innerHTML = `
        <div style="padding: 10px; width: 100%; box-sizing: border-box; overflow-y: auto;">
            <h2 style="color: #bb86fc; border-bottom: 1px solid #333; padding-bottom: 15px; margin-top: 0;">Settings</h2>
            
            <div style="margin-top: 30px; background: #1e1e1e; padding: 25px; border-radius: 8px; border: 1px solid #333;">
                <h3 style="color: #e0e0e0; margin-top: 0; margin-bottom: 5px;">External EPG Sources</h3>
                <p style="color: #888; font-size: 0.9em; margin-bottom: 20px;">Add multiple XMLTV EPG URLs to load automatically for your playlists. (Requires refreshing your playlist to take effect).</p>
                <div style="display: flex; gap: 10px; margin-bottom: 20px;">
                    <input type="text" id="settings-new-epg" placeholder="http://.../epg.xml" style="flex: 1; background: #121212; border: 1px solid #444; color: white; padding: 10px; border-radius: 4px; outline: none;">
                    <button id="settings-add-epg-btn" class="playlist-btn" style="background: #bb86fc; color: black; font-weight: bold; padding: 10px 20px;">Add EPG</button>
                </div>
                <div id="settings-epg-list">${epgListHtml || '<div style="color:#666; font-style: italic;">No external EPGs added.</div>'}</div>
            </div>

            <!-- Reminders Card -->
            <div style="margin-top: 30px; background: #1e1e1e; padding: 25px; border-radius: 8px; border: 1px solid #333;">
                <h3 style="color: #e0e0e0; margin-top: 0; margin-bottom: 5px;">Upcoming Reminders</h3>
                <p style="color: #888; font-size: 0.9em; margin-bottom: 20px;">Manage your scheduled program notifications.</p>
                <div id="settings-reminders-list" style="max-height: 300px; overflow-y: auto;">
                    ${remindersHtml}
                </div>
            </div>

            <!-- 3-Column Channel Mapping UI -->
            <div style="margin-top: 30px; background: #1e1e1e; padding: 25px; border-radius: 8px; border: 1px solid #333; display: flex; flex-direction: column; height: 600px;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div>
                        <h3 style="color: #e0e0e0; margin: 0;">Channel Mapping</h3>
                        <p style="color: #888; font-size: 0.9em; margin: 5px 0 15px 0;">Select a channel on the left and an EPG on the right. Instant apply updates Live TV/Guide immediately.</p>
                    </div>
                    <button id="mapping-auto-map-btn" class="playlist-btn" style="background: #43CB44; color: black; font-weight: bold; padding: 6px 12px; border-radius: 4px; font-size: 0.9em; cursor: pointer;">Auto Map</button>
                </div>
                
                <div style="display: flex; gap: 15px; flex-grow: 1; min-height: 0;">
                    <!-- Left Column: Playlist Channels -->
                    <div style="flex: 28; display: flex; flex-direction: column; background: #121212; border: 1px solid #444; border-radius: 6px; overflow: hidden;">
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
                    <div style="flex: 28; display: flex; flex-direction: column; background: #121212; border: 1px solid #444; border-radius: 6px; overflow: hidden;">
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
                    <div style="flex: 44; display: flex; flex-direction: column; background: #121212; border: 1px solid #444; border-radius: 6px; overflow: hidden;">
                        <div style="padding: 10px; background: #252525; border-bottom: 1px solid #444;">
                            <h3 style="color: #e0e0e0; margin: 0; font-size: 1em; padding: 6px 0; margin-bottom: 6px;">Mapped Channels</h3>
                            <input type="text" id="mapping-mapped-search" placeholder="Search Mapped..." style="width: 100%; background: #121212; color: white; border: 1px solid #555; padding: 6px; border-radius: 4px; outline: none; box-sizing: border-box;">
                        </div>
                        <div id="mapping-mapped-list" style="flex-grow: 1; overflow-y: auto; padding: 10px;"></div>
                    </div>
                </div>
            </div>

            <!-- Danger Zone -->
            <div style="margin-top: 30px; background: #1e1e1e; padding: 25px; border-radius: 8px; border: 1px solid #cf6679;">
                <h3 style="color: #cf6679; margin-top: 0; margin-bottom: 5px;">Danger Zone</h3>
                <p style="color: #888; font-size: 0.9em; margin-bottom: 15px;">Completely wipe the database and reset the application to its default state. This action cannot be undone.</p>
                <button id="settings-factory-reset-btn" class="playlist-btn" style="background: #cf6679; color: black; font-weight: bold; padding: 8px 16px;">Factory Reset</button>
            </div>
        </div>
    `;

    document.getElementById('settings-add-epg-btn').addEventListener('click', () => {
        const val = document.getElementById('settings-new-epg').value.trim();
        if (val && !savedEpgs.includes(val)) {
            savedEpgs.push(val);
            window.iptvAPI.addExternalEpg(val);
            renderSettings();
        }
    });

    document.querySelectorAll('.refresh-epg-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const idx = parseInt(e.target.getAttribute('data-idx'));
            const epgSource = savedEpgs[idx];
            
            const originalText = e.target.textContent;
            e.target.textContent = '⏳';
            e.target.disabled = true;

            // 1. Wipe local file cache and Node.js memory cache for this URL
            await window.iptvAPI.clearCache(epgSource);

            // 2. Fetch fresh EPG list (this triggers python to download since cache is gone)
            let allEpgSources = savedEpgs.slice();
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
            const epgSource = savedEpgs[idx];
            
            // Check if this EPG is still actively used by an imported playlist
            const isUsedByPlaylist = savedPlaylists.some(p => p.epg === epgSource);
            
            // Only wipe the physical cache files if it's completely unused
            if (epgSource && !isUsedByPlaylist) {
                await window.iptvAPI.clearCache(epgSource);
            }
            
            savedEpgs.splice(idx, 1);
            window.iptvAPI.removeExternalEpg(epgSource);
            renderSettings();
        });
    });

    document.querySelectorAll('.remove-reminder-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = parseInt(e.currentTarget.getAttribute('data-idx'));
            const reminderToRemove = futureReminders[idx];
            const realIdx = savedReminders.findIndex(r => r.channelTitle === reminderToRemove.channelTitle && r.progTitle === reminderToRemove.progTitle && r.startTime === reminderToRemove.startTime);
            if (realIdx > -1) {
                savedReminders.splice(realIdx, 1);
                saveReminders();
                renderSettings();
            }
        });
    });

    // Extract all necessary EPG files dynamically through the Python bridge
    const allEpgSources = savedPlaylists.map(p => p.epg).filter(e => e && e !== 'Not Configured');
    savedEpgs.forEach(e => { if (!allEpgSources.includes(e)) allEpgSources.push(e); });
    const combinedEpgs = allEpgSources.join(',');
    
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
        const originalText = btn.textContent;
        btn.textContent = '⏳';
        btn.disabled = true;

        await autoMapChannels(true);

        btn.textContent = originalText;
        btn.disabled = false;
    });

    document.getElementById('settings-factory-reset-btn').addEventListener('click', async () => {
        if (confirm("Are you sure you want to completely wipe all data? The application will restart.")) {
            await window.iptvAPI.factoryReset();
        }
    });

    // Mapping Filter Events
    document.getElementById('mapping-playlist-filter').addEventListener('change', (e) => {
        mappingSelectedPlaylist = e.target.value;
        mappingSelectedChannel = null;
        renderMappingColumns();
    });
    document.getElementById('mapping-channel-search').addEventListener('input', debouncedRenderMappingColumns);
    document.getElementById('mapping-epg-filter').addEventListener('change', renderMappingColumns);
    document.getElementById('mapping-epg-search').addEventListener('input', debouncedRenderMappingColumns);
    document.getElementById('mapping-mapped-search').addEventListener('input', debouncedRenderMappingColumns);
}

async function applySingleMapping(channelTitle, epgId) {
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

// Populates the group filter dropdown dynamically based on the current playlist
function updateGroupFilterOptions() {
    const groupFilter = document.getElementById('group-filter');
    const filterSelect = document.getElementById('playlist-filter');
    
    if (groupFilter) {
        const currentGroup = groupFilter.value || 'all';
        groupFilter.innerHTML = '<option value="all">All Groups</option>';
        
        let visibleGroups = new Set();
        const currentPlaylistFilter = filterSelect ? filterSelect.value : 'all';
        
        allChannels.forEach(c => {
            if (currentPlaylistFilter === 'favs' && !c.favourite) return;
            if (currentPlaylistFilter !== 'all' && currentPlaylistFilter !== 'favs' && String(c.playlistId) !== String(currentPlaylistFilter)) return;
            const groupName = c.group || 'Uncategorized';
            visibleGroups.add(groupName);
        });
        
        Array.from(visibleGroups).sort(sortAlphaNum).forEach(g => {
            const opt = document.createElement('option');
            opt.value = g;
            opt.textContent = g;
            groupFilter.appendChild(opt);
        });
        
        if (Array.from(groupFilter.options).some(o => o.value === currentGroup)) {
            groupFilter.value = currentGroup;
        } else {
            groupFilter.value = 'all';
        }
    }
}

function updateState() {
    allChannels = [];
    
    savedPlaylists.sort((a, b) => sortAlphaNum(a.name, b.name));

    const filterSelect = document.getElementById('playlist-filter');
    const currentFilter = filterSelect ? filterSelect.value : 'all';
    if (filterSelect) {
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
    
    allChannels.sort((a, b) => {
        const groupA = a.group || 'Uncategorized';
        const groupB = b.group || 'Uncategorized';
        if (groupA !== groupB) return sortAlphaNum(groupA, groupB);
        return sortAlphaNum(a.title, b.title);
    });

    if (filterSelect && Array.from(filterSelect.options).some(o => o.value === currentFilter)) {
        filterSelect.value = currentFilter;
    }

    let groupFilter = document.getElementById('group-filter');
    if (!groupFilter && filterSelect) {
        groupFilter = document.createElement('select');
        groupFilter.id = 'group-filter';
        groupFilter.style.marginTop = '10px';
        groupFilter.style.width = '100%';
        groupFilter.style.padding = '8px';
        groupFilter.style.borderRadius = '4px';
        groupFilter.style.background = '#1e1e1e';
        groupFilter.style.color = '#fff';
        groupFilter.style.border = '1px solid #333';
        groupFilter.style.boxSizing = 'border-box';
        filterSelect.parentNode.insertBefore(groupFilter, filterSelect.nextSibling);
        groupFilter.addEventListener('change', () => {
            renderChannels();
            if (document.getElementById('epg-view') && document.getElementById('epg-view').style.display === 'flex') {
                renderFullEpg();
            }
        });
    }

    updateGroupFilterOptions();
    
    renderChannels();
    renderPlaylists();
    window.iptvAPI.saveChannels(savedPlaylists);
    updateNavLockState();
}

async function addPlaylist(source, customName, epgSource, editIndex = -1) {
    try {
        const result = await window.iptvAPI.parseM3u(source);
        if (result && result.error) {
            alert(`Failed to import.\nReason: ${result.error}`);
        } else if (!result || (!Array.isArray(result) && !result.channels)) {
            alert(`Failed to import.\nReason: Received invalid data from source.`);
        } else {
            const channels = Array.isArray(result) ? result : result.channels;
            let finalEpgSource = epgSource || 'Not Configured';
            
            if ((!epgSource || epgSource === 'Not Configured') && result.epg_url) {
                finalEpgSource = result.epg_url;
            }

            if (editIndex >= 0) {
                savedPlaylists[editIndex].source = source;
                savedPlaylists[editIndex].name = customName;
                savedPlaylists[editIndex].channels = channels;
                savedPlaylists[editIndex].epg = finalEpgSource;
            } else {
                savedPlaylists.push({
                    id: Date.now() + Math.random(),
                    source: source,
                    name: customName,
                    channels: channels,
                    epg: finalEpgSource,
                    disabled: false
                });
            }
            updateState();
            
            // Auto-fetch EPG data in background to cache in SQLite
            let allEpgSources = savedEpgs.slice();
            if (finalEpgSource && finalEpgSource !== 'Not Configured' && !allEpgSources.includes(finalEpgSource)) {
                allEpgSources.push(finalEpgSource);
            }
            if (allEpgSources.length > 0) {
                const combinedEpgs = allEpgSources.join(',');
                await window.iptvAPI.updateEpg(combinedEpgs, null, true);
                epgChannelsData = await window.iptvAPI.getEpgChannels(combinedEpgs);
                await autoMapChannels(false);
            }
        }
    } catch (err) {
        alert(`UI Error (${source}):\n${err.message}`);
    }
}

function openManageChannelsModal(playlistIndex) {
    const playlist = savedPlaylists[playlistIndex];
    if (!playlist || !playlist.channels) return;

    let modal = document.getElementById('manage-channels-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'manage-channels-modal';
        modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 1000; display: flex; align-items: center; justify-content: center;';
        document.body.appendChild(modal);
    }
    
    const groups = new Set();
    playlist.channels.forEach(c => groups.add(c.group || 'Uncategorized'));
    const sortedGroups = Array.from(groups).sort(sortAlphaNum);

    const tempDisabled = new Set();
    const tempSelected = new Set();
    playlist.channels.forEach((c, idx) => {
        if (c.disabled) tempDisabled.add(idx);
    });

    let currentGroupFilter = 'all';
    let sortedChannels = [];

    let groupOptions = '<option value="all">All Groups</option>';
    sortedGroups.forEach(g => {
        groupOptions += `<option value="${g.replace(/"/g, '&quot;')}" ${currentGroupFilter === g ? 'selected' : ''}>${g.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</option>`;
    });

    modal.innerHTML = `
        <div style="background: #1e1e1e; border: 1px solid #333; border-radius: 8px; width: 80%; max-width: 800px; height: 80%; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
            <div style="padding: 15px 20px; border-bottom: 1px solid #333; display: flex; justify-content: space-between; align-items: center; background: #252525;">
                <h2 style="margin: 0; color: #bb86fc; font-size: 1.2em;">Manage Channels: ${playlist.name}</h2>
                <div style="display: flex; gap: 10px;">
                    <input type="text" id="modal-channel-search" placeholder="Search channels..." value="" style="background: #121212; color: #fff; border: 1px solid #444; padding: 6px 12px; border-radius: 4px; outline: none; width: 200px;">
                    <select id="modal-group-filter" style="background: #121212; color: #fff; border: 1px solid #444; padding: 6px 12px; border-radius: 4px; outline: none; width: 200px;">
                        ${groupOptions}
                    </select>
                </div>
            </div>
            <div style="padding: 10px 20px; background: #1a1a1a; border-bottom: 1px solid #333; display: flex; align-items: center; gap: 15px;">
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
            <div style="padding: 15px 20px; border-top: 1px solid #333; display: flex; justify-content: flex-end; gap: 10px; background: #252525;">
                <button id="modal-cancel-btn" class="playlist-btn" style="background: #333;">Cancel</button>
                <button id="modal-save-btn" class="playlist-btn" style="background: #bb86fc; color: #000; font-weight: bold;">Save Changes</button>
            </div>
        </div>
    `;

    const renderChannelsList = () => {
        const searchVal = (document.getElementById('modal-channel-search') ? document.getElementById('modal-channel-search').value : '').toLowerCase();

        const enabledList = [];
        const disabledList = [];

        playlist.channels.forEach((c, idx) => {
            const cGroup = c.group || 'Uncategorized';
            const title = String(c.title || 'Unknown Channel');
            if (currentGroupFilter !== 'all' && cGroup !== currentGroupFilter) return;
            if (searchVal && !title.toLowerCase().includes(searchVal)) return;

            const item = { channel: c, originalIndex: idx };
            if (tempDisabled.has(idx)) {
                disabledList.push(item);
            } else {
                enabledList.push(item);
            }
        });

        const sorter = (a, b) => sortAlphaNum(a.channel.title, b.channel.title);
        enabledList.sort(sorter);
        disabledList.sort(sorter);

        sortedChannels = [...enabledList, ...disabledList];
        let visibleCount = sortedChannels.length;

        let channelsHtml = sortedChannels.map(item => {
            const { channel, originalIndex } = item;
            const isDisabled = tempDisabled.has(originalIndex);
            const isSelected = tempSelected.has(originalIndex);
            const safeTitle = (channel.title || 'Unknown Channel').replace(/</g, "&lt;").replace(/>/g, "&gt;");
            const cGroup = channel.group || 'Uncategorized';

            return `
                <label style="display: flex; align-items: center; padding: 8px; border-bottom: 1px solid #333; cursor: pointer; background: ${isSelected ? '#2a2a2a' : 'transparent'};">
                    <input type="checkbox" class="channel-select-cb" data-idx="${originalIndex}" ${isSelected ? 'checked' : ''} style="margin-right: 15px; width: 18px; height: 18px;">
                    <span style="flex-grow: 1; color: ${isDisabled ? '#cf6679' : '#43CB44'}; font-weight: bold; font-size: 0.8em; font-family: 'Inter', sans-serif;">${safeTitle}</span>
                    <span style="color: #666; font-size: 0.85em; width: 150px; text-align: right; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${cGroup}</span>
                </label>
            `;
        }).join('');

        let allVisibleSelectedCalc = visibleCount > 0;
        if (allVisibleSelectedCalc) {
            sortedChannels.forEach(item => {
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
    };

    document.getElementById('modal-group-filter').addEventListener('change', (e) => {
        currentGroupFilter = e.target.value;
        renderChannelsList();
    });

    document.getElementById('modal-channel-search').addEventListener('input', renderChannelsList);

    document.getElementById('modal-select-all').addEventListener('change', (e) => {
        const checkAll = e.target.checked;
        sortedChannels.forEach(item => {
            if (checkAll) tempSelected.add(item.originalIndex);
            else tempSelected.delete(item.originalIndex);
        });
        renderChannelsList();
    });

    document.getElementById('modal-enable-btn').addEventListener('click', () => {
        if (tempSelected.size === 0) return;
        tempSelected.forEach(idx => tempDisabled.delete(idx));
        renderChannelsList();
    });

    document.getElementById('modal-disable-btn').addEventListener('click', () => {
        if (tempSelected.size === 0) return;
        tempSelected.forEach(idx => tempDisabled.add(idx));
        renderChannelsList();
    });

    document.getElementById('modal-cancel-btn').addEventListener('click', () => {
        modal.style.display = 'none';
        modal.innerHTML = '';
    });

    document.getElementById('modal-save-btn').addEventListener('click', () => {
        playlist.channels.forEach((c, idx) => {
            c.disabled = tempDisabled.has(idx);
        });
        modal.style.display = 'none';
        modal.innerHTML = '';
        updateState();
    });

    renderChannelsList();
    modal.style.display = 'flex';
}

function renderPlaylists() {
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
        if (playlist.epg && playlist.epg !== 'Not Configured') {
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
            const playlist = savedPlaylists[idx];
            editingPlaylistIndex = idx;
            
            if (importNameInput) importNameInput.value = playlist.name;
            if (playlist.source.startsWith('http://') || playlist.source.startsWith('https://')) {
                currentImportMode = 'url';
                if (btnModeUrl) btnModeUrl.classList.add('active');
                if (btnModeFile) btnModeFile.classList.remove('active');
                if (containerUrl) containerUrl.style.display = 'block';
                if (containerFile) containerFile.style.display = 'none';
                if (importUrlPath) importUrlPath.value = playlist.source;
                if (importFilePath) importFilePath.value = '';
            } else {
                currentImportMode = 'file';
                if (btnModeFile) btnModeFile.classList.add('active');
                if (btnModeUrl) btnModeUrl.classList.remove('active');
                if (containerFile) containerFile.style.display = 'flex';
                if (containerUrl) containerUrl.style.display = 'none';
                if (importFilePath) importFilePath.value = playlist.source;
                if (importUrlPath) importUrlPath.value = '';
            }
            
            if (importEpgInput) importEpgInput.value = playlist.epg === 'Not Configured' ? '' : playlist.epg;
            if (importSubmitBtn) importSubmitBtn.textContent = 'Update';
            if (importCancelBtn) importCancelBtn.style.display = 'block';
            
            const view = document.getElementById('playlist-view');
            if (view) view.scrollTo({ top: 0, behavior: 'smooth' });
        });
    });

    document.querySelectorAll('.manage-channels-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = parseInt(e.target.getAttribute('data-index'), 10);
            openManageChannelsModal(idx);
        });
    });

    document.querySelectorAll('.refresh-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const idx = e.target.getAttribute('data-index');
            const source = savedPlaylists[idx].source;
            const epgSource = savedPlaylists[idx].epg !== 'Not Configured' ? savedPlaylists[idx].epg : '';
            
            let allEpgSources = savedEpgs.slice();
            if (epgSource && !allEpgSources.includes(epgSource)) {
                allEpgSources.push(epgSource);
            }
            const combinedEpgs = allEpgSources.join(',');
            const mappingsJson = JSON.stringify(channelMappings);

            if (loadingMsg) loadingMsg.style.display = 'block';
            try {
                const result = await window.iptvAPI.parseM3u(source, combinedEpgs, mappingsJson, true);
                if (result && !result.error && (Array.isArray(result) || result.channels)) {
                    const channels = Array.isArray(result) ? result : result.channels;
                    savedPlaylists[idx].channels = channels;
                    if (result.epg_url && (!savedPlaylists[idx].epg || savedPlaylists[idx].epg === 'Not Configured')) {
                        savedPlaylists[idx].epg = result.epg_url;
                    }
                    updateState();
                    
                    // Trigger EPG update and auto-map
                    if (allEpgSources.length > 0) {
                        await window.iptvAPI.updateEpg(combinedEpgs, null, true);
                        epgChannelsData = await window.iptvAPI.getEpgChannels(combinedEpgs);
                        await autoMapChannels(false);
                    }
                } else {
                    alert('Failed to refresh playlist: ' + (result ? result.error : 'Unknown error'));
                }
            } catch(err) {
                alert('Refresh error: ' + err.message);
            }
            if (loadingMsg) loadingMsg.style.display = 'none';
        });
    });

    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = e.target.getAttribute('data-index');
            const playlist = savedPlaylists[idx];
            if (playlist && playlist.source) window.iptvAPI.clearCache(playlist.source);
            savedPlaylists.splice(idx, 1);
            updateState();
        });
    });

    document.querySelectorAll('.enable-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = e.target.getAttribute('data-index');
            savedPlaylists[idx].disabled = false;
            updateState();
        });
    });

    document.querySelectorAll('.disable-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = e.target.getAttribute('data-index');
            savedPlaylists[idx].disabled = true;
            updateState();
        });
    });
}

function renderChannels() {
    const filterSelect = document.getElementById('playlist-filter');
    const filterVal = filterSelect ? filterSelect.value : 'all';

    const groupFilter = document.getElementById('group-filter');
    const groupVal = groupFilter ? groupFilter.value : 'all';

    let html = '';
    
    allChannels.forEach((channel, index) => {
        if (filterVal === 'favs' && !channel.favourite) return;
        if (filterVal !== 'all' && filterVal !== 'favs' && String(channel.playlistId) !== String(filterVal)) return;
        
        const channelGroup = channel.group || 'Uncategorized';
        if (groupVal !== 'all' && channelGroup !== groupVal) return;

        const safeTitle = (channel.title || 'Unknown Channel').replace(/</g, "&lt;").replace(/>/g, "&gt;");
        const imgSrc = (channel.logo && channel.logo.trim() !== '') ? channel.logo : 'assets/logo.png';
        
        const logoHtml = `<img src="${imgSrc}" style="width: 40px; height: 40px; min-width: 40px; object-fit: contain; margin-right: 10px; border-radius: 4px; background: #ffffff;">`;
        
        const favClass = channel.favourite ? 'fav-btn active' : 'fav-btn';
        const favBtnHtml = `<button class="${favClass}" data-fav-index="${index}" title="Toggle Favourite"><svg viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg></button>`;

        html += `<div class="channel-item" data-index="${index}" title="${safeTitle.replace(/"/g, '&quot;')}" style="display: flex; align-items: center; width: 100%; box-sizing: border-box; padding: 5px 10px; border-bottom: 1px solid #1e1e1e; cursor: pointer;">
            ${logoHtml}
            <span style="flex-grow: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding-right: 10px; color: #e0e0e0; font-size: 0.8em; font-weight: bold; font-family: 'Inter', sans-serif;">${safeTitle}</span>
            ${favBtnHtml}
        </div>`;
    });

    if (!html) {
        html = `<div style="padding: 20px; color: #888; text-align: center;">No channels found.</div>`;
    }

    channelList.innerHTML = html;

    // Attach error handlers after inserting into DOM to bypass CSP inline restrictions
    channelList.querySelectorAll('img').forEach(img => {
        img.onerror = function() {
            this.onerror = null;
            this.src = 'assets/logo.png';
        };
    });
}

const filterElement = document.getElementById('playlist-filter');
if (filterElement) {
    filterElement.addEventListener('change', () => {
        updateGroupFilterOptions();
        renderChannels();
        if (document.getElementById('epg-view') && document.getElementById('epg-view').style.display === 'flex') {
            renderFullEpg();
        }
    });
}

// Use Event Delegation to handle clicks for all channels efficiently
channelList.addEventListener('click', (e) => {
    const favBtn = e.target.closest('.fav-btn');
    if (favBtn) {
        const index = favBtn.getAttribute('data-fav-index');
        const channel = allChannels[index];
        if (channel) {
            channel.favourite = !channel.favourite;
            updateState(); // Re-render lists and save state to background file
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

let currentImportMode = 'file';

if (btnModeFile) {
    btnModeFile.addEventListener('click', () => {
        currentImportMode = 'file';
        btnModeFile.classList.add('active');
        btnModeUrl.classList.remove('active');
        containerFile.style.display = 'flex';
        containerUrl.style.display = 'none';
    });
}

if (btnModeUrl) {
    btnModeUrl.addEventListener('click', () => {
        currentImportMode = 'url';
        btnModeUrl.classList.add('active');
        btnModeFile.classList.remove('active');
        containerUrl.style.display = 'block';
        containerFile.style.display = 'none';
    });
}

if (importBrowseBtn) {
    importBrowseBtn.addEventListener('click', async () => {
        const filePaths = await window.iptvAPI.openFileDialog();
        if (filePaths && filePaths.length > 0) {
            importFilePath.value = filePaths[0];
            const source = filePaths[0];
            if (importEpgInput && !importEpgInput.value.trim()) {
                try {
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
                const result = await window.iptvAPI.parseM3u(source);
                if (result && !result.error && result.epg_url && !importEpgInput.value.trim()) {
                    importEpgInput.value = result.epg_url;
                }
            } catch (e) { console.error(e); }
        }
    });
}

if (importSubmitBtn) {
    importSubmitBtn.addEventListener('click', async () => {
        const name = importNameInput.value.trim();
        if (!name) return alert("Playlist name is mandatory.");

        let source = '';
        if (currentImportMode === 'file') {
            source = importFilePath.value.trim();
            if (!source) return alert("Please select a file location.");
        } else {
            source = importUrlPath.value.trim();
            if (!source) return alert("Please enter a valid M3U URL.");
        }

        let epgSource = importEpgInput ? importEpgInput.value.trim() : '';
        if (loadingMsg) loadingMsg.style.display = 'block';
        await addPlaylist(source, name, epgSource, editingPlaylistIndex);
        if (loadingMsg) loadingMsg.style.display = 'none';
        
        editingPlaylistIndex = -1;
        if (importSubmitBtn) importSubmitBtn.textContent = 'Import';
        if (importCancelBtn) importCancelBtn.style.display = 'none';

        importNameInput.value = '';
        importFilePath.value = '';
        importUrlPath.value = '';
        if (importEpgInput) importEpgInput.value = '';
    });
}

if (importCancelBtn) {
    importCancelBtn.addEventListener('click', () => {
        editingPlaylistIndex = -1;
        if (importSubmitBtn) importSubmitBtn.textContent = 'Import';
        if (importCancelBtn) importCancelBtn.style.display = 'none';
        if (importNameInput) importNameInput.value = '';
        if (importFilePath) importFilePath.value = '';
        if (importUrlPath) importUrlPath.value = '';
        if (importEpgInput) importEpgInput.value = '';
    });
}

if (clearBtn) {
    clearBtn.addEventListener('click', async () => {
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
            <div style="background: #1e1e1e; padding: 12px; border-radius: 8px; border-left: 4px solid ${isCurrent ? '#43CB44' : '#444'};">
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

async function renderFullEpg() {
    const epgView = document.getElementById('epg-view');
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

    const pxPerMinute = 6;
    const hourWidth = 60 * pxPerMinute;
    const now = new Date();
    
    // Let the timeline begin 2 hours before "now" to give users perspective
    const gridStart = new Date(now.getTime());
    gridStart.setMinutes(0, 0, 0);
    gridStart.setHours(gridStart.getHours() - 2);
    
    // Generate 24-hour total scope
    const gridEnd = new Date(gridStart.getTime() + 24 * 60 * 60 * 1000);
    const totalWidth = 24 * hourWidth;

    const channelsToRender = allChannels.filter(channel => {
        if (epgSelectedPlaylist === 'favs' && !channel.favourite) return false;
        if (epgSelectedPlaylist !== 'all' && epgSelectedPlaylist !== 'favs' && String(channel.playlistId) !== String(epgSelectedPlaylist)) return false;
        const channelGroup = channel.group || 'Uncategorized';
        if (epgSelectedGroup !== 'all' && channelGroup !== epgSelectedGroup) return false;
        return true;
    });

    channelsToRender.sort((a, b) => sortAlphaNum(a.title, b.title));

    // Estimate scroll height down for the current time indicator redline
    const gridHeight = 50 + (channelsToRender.length * 60);


    // Dynamically retrieve EPG for visible channels from SQLite
    const epgIdsToFetch = new Set();
    channelsToRender.forEach(ch => {
        const mappedId = channelMappings[ch.title];
        if (mappedId) epgIdsToFetch.add(mappedId);
        else {
            if (ch.tvg_id) epgIdsToFetch.add(ch.tvg_id);
            if (ch.tvg_name) epgIdsToFetch.add(ch.tvg_name);
        }
    });
    const epgData = await window.iptvAPI.getEpg(Array.from(epgIdsToFetch));

    let html = `
    <div id="epg-scroll-container" style="flex-grow: 1; width: 100%; overflow: auto; position: relative; background: #121212; border: 1px solid #333; border-radius: 8px; display: flex; flex-direction: column;">
        <!-- Header Row (Timestamps) -->
        <div style="display: flex; width: ${250 + totalWidth}px; position: sticky; top: 0; z-index: 20; background: #1a1a1a; border-bottom: 2px solid #333;">
            <div style="width: 250px; min-width: 250px; position: sticky; left: 0; z-index: 30; background: #1a1a1a; border-right: 2px solid #333; display: flex; align-items: center; justify-content: center; font-weight: bold; color: #bb86fc; box-sizing: border-box;">Channels</div>
            <div style="position: relative; width: ${totalWidth}px; height: 50px;">`;

    for (let i = 0; i < 24; i++) {
        const headerTime = new Date(gridStart.getTime() + i * 60 * 60 * 1000);
        const timeStr = headerTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        html += `<div style="position: absolute; left: ${i * hourWidth}px; width: ${hourWidth}px; height: 100%; border-right: 1px solid #333; display: flex; align-items: center; padding-left: 10px; color: #888; box-sizing: border-box;">${timeStr}</div>`;
    }

    // Draw Current Time Live Indicator
    const minutesSinceStart = (now.getTime() - gridStart.getTime()) / 60000;
    const nowPx = minutesSinceStart * pxPerMinute;
    if (nowPx > 0 && nowPx < totalWidth) {
        html += `<div style="position: absolute; left: ${nowPx}px; top: 0; height: ${gridHeight}px; width: 2px; background: #cf6679; z-index: 15; pointer-events: none;"></div>`;
    }

    html += `</div></div>`; // Close Header Row

    if (channelsToRender.length === 0) {
        html += `<div style="padding: 20px; color: #888; text-align: center;">No channels match the current filter.</div>`;
    }

    channelsToRender.forEach(channel => {
        const globalIdx = allChannels.indexOf(channel);
        const safeTitle = (channel.title || 'Unknown Channel').replace(/</g, "&lt;").replace(/>/g, "&gt;");
        const imgSrc = (channel.logo && channel.logo.trim() !== '') ? channel.logo : 'assets/logo.png';
        
        html += `
        <div style="display: flex; width: ${250 + totalWidth}px; border-bottom: 1px solid #2a2a2a; height: 60px;">
            <!-- Left-Pinned Channel Logo + Name -->
            <div class="epg-play-channel" data-index="${globalIdx}" style="width: 250px; min-width: 250px; position: sticky; left: 0; z-index: 10; background: #1e1e1e; border-right: 2px solid #333; display: flex; align-items: center; padding: 10px; box-sizing: border-box; cursor: pointer;">
                <img src="${imgSrc}" style="width: 40px; height: 40px; min-width: 40px; object-fit: contain; margin-right: 15px; background: #ffffff; border-radius: 4px;">
                <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 0.8em; font-weight: bold; font-family: 'Inter', sans-serif; color: #e0e0e0;" title="${safeTitle}">${safeTitle}</span>
            </div>
            <!-- Right-Side Scrollable Content -->
            <div style="position: relative; width: ${totalWidth}px; height: 100%; background: #121212;">`;

        const mappedId = channelMappings[channel.title];
        let programmes = [];
        if (mappedId && epgData[mappedId]) programmes = epgData[mappedId];
        else if (channel.tvg_id && epgData[channel.tvg_id]) programmes = epgData[channel.tvg_id];
        else if (channel.tvg_name && epgData[channel.tvg_name]) programmes = epgData[channel.tvg_name];

        if (programmes.length > 0) {
            programmes.forEach(prog => {
                const pStart = parseEpgTime(prog.start);
                const pEnd = parseEpgTime(prog.stop);
                
                if (pEnd > gridStart && pStart < gridEnd) {
                    let startMin = (pStart.getTime() - gridStart.getTime()) / 60000;
                    let endMin = (pEnd.getTime() - gridStart.getTime()) / 60000;
                    
                    let left = Math.max(0, startMin * pxPerMinute);
                    let right = Math.min(totalWidth, endMin * pxPerMinute);
                    let width = right - left;

                    const isCurrent = (now >= pStart && now <= pEnd);
                    const isFuture = pStart > now;
                    const bg = isCurrent ? '#2c2c2c' : '#1e1e1e';
                    const borderCol = isCurrent ? '#bb86fc' : '#444';
                    const pTitle = (prog.title || 'Unknown').replace(/</g, "&lt;").replace(/>/g, "&gt;");
                    const timeStr = `${pStart.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - ${pEnd.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
                    const isReminderSet = typeof savedReminders !== 'undefined' && savedReminders.some(r => r.progTitle === prog.title && r.startTime === prog.start && r.channelTitle === channel.title);
                    const reminderStyle = isReminderSet ? 'opacity: 1; filter: drop-shadow(0 0 4px #bb86fc);' : 'opacity: 0.3; filter: grayscale(100%);';
                    const reminderHtml = isFuture ? `<span class="reminder-btn-full" data-channel="${safeTitle.replace(/"/g, '&quot;')}" data-prog="${pTitle.replace(/"/g, '&quot;')}" data-start="${prog.start}" data-stop="${prog.stop}" style="cursor: pointer; margin-right: 4px; display: inline-block; transition: 0.2s; ${reminderStyle}" title="Set/Remove Reminder">🔔</span>` : '';

                    html += `
                    <div class="epg-play-channel epg-program-cell" data-index="${globalIdx}" style="position: absolute; left: ${left}px; width: ${width}px; height: 100%; background: ${bg}; border-right: 1px solid #111; border-top: 2px solid ${borderCol}; box-sizing: border-box; padding: 6px 10px; overflow: hidden; cursor: pointer; transition: background 0.2s;" title="${pTitle}\n${timeStr}\n${(prog.desc || '').replace(/</g, "&lt;").replace(/>/g, "&gt;")}">
                        <div style="font-size: 0.85em; font-weight: bold; color: ${isCurrent ? '#fff' : '#ccc'}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${reminderHtml}${pTitle}</div>
                        <div style="font-size: 0.75em; color: #888; margin-top: 4px;">${timeStr}</div>
                    </div>`;
                }
            });
        } else {
            html += `<div class="epg-play-channel" data-index="${globalIdx}" style="display: flex; align-items: center; padding-left: 20px; height: 100%; color: #555; font-size: 0.9em; width: 100%; cursor: pointer;">No EPG Data</div>`;
        }

        html += `</div></div>`;
    });

    html += `</div>`;
    const contentArea = document.getElementById('epg-content-area');
    if (contentArea) {
        contentArea.innerHTML = html;
    }

    // Attach error handlers after inserting into DOM to bypass CSP inline restrictions
    epgView.querySelectorAll('img').forEach(img => {
        img.onerror = function() {
            this.onerror = null;
            this.src = 'assets/logo.png';
        };
    });

    // 1. Inject Hover Styles
    if (!document.getElementById('epg-styles')) {
        const style = document.createElement('style');
        style.id = 'epg-styles';
        style.textContent = `
            .epg-program-cell:hover { background: #333 !important; }
            .epg-play-channel:hover { background-color: #2a2a2a !important; }
        `;
        document.head.appendChild(style);
    }

    // 2. Play Channel Listeners
    document.querySelectorAll('.epg-play-channel').forEach(el => {
        el.addEventListener('click', (e) => {
            if (e.target.closest('.reminder-btn-full')) return;
            const idx = el.getAttribute('data-index');
            const targetChannel = allChannels[idx];
            if (targetChannel) {
                switchTab('live-tv', document.getElementById('btn-live-tv'));
                embedStream(targetChannel);
            }
        });
    });

    // 4. Reminder Listeners
    document.querySelectorAll('.reminder-btn-full').forEach(el => {
        el.addEventListener('click', (e) => {
            e.stopPropagation();
            const channelTitle = el.getAttribute('data-channel');
            const progTitle = el.getAttribute('data-prog');
            const start = el.getAttribute('data-start');
            const stop = el.getAttribute('data-stop');
            toggleReminder(channelTitle, progTitle, start, stop);
            const isSet = savedReminders.some(r => r.progTitle === progTitle && r.startTime === start && r.channelTitle === channelTitle);
            if (isSet) {
                el.style.opacity = '1';
                el.style.filter = 'drop-shadow(0 0 4px #bb86fc)';
                showToast('Reminder Set: ' + progTitle);
            } else {
                el.style.opacity = '0.3';
                el.style.filter = 'grayscale(100%)';
                showToast('Reminder Removed');
            }
        });
    });

    // 3. Jump to "Now" and default scroll
    const scrollContainer = document.getElementById('epg-scroll-container');
    const nowBtn = document.getElementById('epg-now-btn');
    if (scrollContainer) {
        const targetScroll = Math.max(0, nowPx - (30 * pxPerMinute)); // Pad back 30 mins from red line
        setTimeout(() => scrollContainer.scrollLeft = targetScroll, 10);
        if (nowBtn) {
            nowBtn.addEventListener('click', () => {
                scrollContainer.scrollTo({ left: targetScroll, behavior: 'smooth' });
            });
        }
    }
}

async function embedStream(channel) {
    streamActive = true;
    
    localStorage.setItem('lastPlayedChannelUrl', channel.url);
    
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
            this.src = 'assets/logo.png';
        };
        detailLogo.src = (channel.logo && channel.logo.trim() !== '') ? channel.logo : 'assets/logo.png';
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
    const epgData = await window.iptvAPI.getEpg(epgIds);
    
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
    window.iptvAPI.playMpvEmbedded({
        url: channel.url,
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
    if (streamActive) {
        streamActive = false;
        const playerOverlay = document.getElementById('player-overlay');
        if (playerOverlay) {
            playerOverlay.innerHTML = `<span style="color: #cf6679;">Loading failed or playback stopped.</span>`;
        }
    }
});

// Use ResizeObserver to track exact pixel coordinates perfectly
const resizeObserver = new ResizeObserver(() => {
    if (streamActive) {
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
    if (now - lastMouseMove > 30) { // Throttle updates to ~33fps to prevent IPC socket flooding
        lastMouseMove = now;
        const rect = playerContainer.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;
            const x = Math.round((e.clientX - rect.left) * dpr);
            const y = Math.round((e.clientY - rect.top) * dpr);
        window.iptvAPI.sendMpvCommand(`script-message-to modernz electron-mouse-move ${x} ${y}`);
    }
});

playerContainer.addEventListener('mouseleave', () => {
    window.iptvAPI.sendMpvCommand(`script-message-to modernz electron-mouse-leave`);
});

let lastClickTime = 0;
playerContainer.addEventListener('mousedown', (e) => {
    const now = Date.now();
    if (now - lastClickTime < 400) {
        window.iptvAPI.sendMpvCommand('cycle fullscreen');
        lastClickTime = 0; // Reset to prevent triple-click triggering again
    } else {
        lastClickTime = now;
    }
    const btn = e.button === 0 ? 'mbtn_left' : (e.button === 2 ? 'mbtn_right' : 'mbtn_mid');
    window.iptvAPI.sendMpvCommand(`script-message-to modernz electron-mouse-click ${btn} down`);
});

playerContainer.addEventListener('mouseup', (e) => {
    const btn = e.button === 0 ? 'mbtn_left' : (e.button === 2 ? 'mbtn_right' : 'mbtn_mid');
    window.iptvAPI.sendMpvCommand(`script-message-to modernz electron-mouse-click ${btn} up`);
});

playerContainer.addEventListener('wheel', (e) => {
    const btn = e.deltaY < 0 ? 'wheel_up' : 'wheel_down';
    window.iptvAPI.sendMpvCommand(`script-message-to modernz electron-mouse-click ${btn} press`);
});

// Wire up the Exit button to gracefully tear down the app
document.getElementById('btn-exit').addEventListener('click', () => {
    window.close();
});

// Setup Tab Navigation Logic
const navButtons = document.querySelectorAll('.nav-btn:not(#btn-exit)');
const sidebar = document.getElementById('sidebar');
const mainView = document.getElementById('main-view');

function switchTab(tabId, clickedBtn) {
    // Update active styling
    navButtons.forEach(btn => btn.classList.remove('active'));
    if (clickedBtn) clickedBtn.classList.add('active');
    
    // Toggle visibility for "Live TV" / "Playlist" views
    const isLive = tabId === 'live-tv';
    const isPlaylist = tabId === 'playlist';
    const isEpg = tabId === 'epg';
    const isSettings = tabId === 'settings';

    if (sidebar) sidebar.style.display = isLive ? 'flex' : 'none';
    if (mainView) mainView.style.display = isLive ? 'flex' : 'none';
    
    // Dynamically double the channel list (sidebar) width upon first showing it
    if (isLive && sidebar && !window.sidebarReduced) {
        const currentWidth = parseFloat(window.getComputedStyle(sidebar).width);
        if (!isNaN(currentWidth) && currentWidth > 0) {
            const newWidth = currentWidth * 2; // Double the width
            sidebar.style.width = newWidth + 'px';
            sidebar.style.minWidth = newWidth + 'px';
            sidebar.style.maxWidth = newWidth + 'px';
            sidebar.style.flex = `0 0 ${newWidth}px`;
            window.sidebarReduced = true;
        }
    }
    
    const playlistView = document.getElementById('playlist-view');
    if (playlistView) playlistView.style.display = isPlaylist ? 'flex' : 'none';
    
    const epgView = document.getElementById('epg-view');
    if (epgView) epgView.style.display = isEpg ? 'flex' : 'none';
    
    if (isEpg) renderFullEpg();
    
    const settingsView = document.getElementById('settings-view');
    if (settingsView) settingsView.style.display = isSettings ? 'flex' : 'none';

    if (isSettings) renderSettings();

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
}

document.getElementById('btn-live-tv').addEventListener('click', function() { if (!this.disabled) switchTab('live-tv', this); });
document.getElementById('btn-playlist').addEventListener('click', function() { switchTab('playlist', this); });
document.getElementById('btn-epg').addEventListener('click', function() { if (!this.disabled) switchTab('epg', this); });
document.getElementById('btn-settings').addEventListener('click', function() { if (!this.disabled) switchTab('settings', this); });

// Inject "Coming Soon" buttons
const navBarNode = document.getElementById('nav-bar');
if (navBarNode) {
    const comingSoonIcons = {
        'Movies': '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M18 4v1h-2V4c0-.55-.45-1-1-1H9c-.55 0-1 .45-1 1v1H6V4c0-.55-.45-1-1-1s-1 .45-1 1v16c0 .55.45 1 1 1s1-.45 1-1v-1h2v1c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-1h2v1c0 .55.45 1 1 1s1-.45 1-1V4c0-.55-.45-1-1-1s-1 .45-1 1zM8 17H6v-2h2v2zm0-4H6v-2h2v2zm0-4H6V7h2v2zm10 8h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V7h2v2z"/></svg>',
        'VOD': '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-8 12.5v-9l6 4.5-6 4.5z"/></svg>',
        'Recording': '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm4-8c0 2.21-1.79 4-4 4s-4-1.79-4-4 1.79-4 4-4 4 1.79 4 4z"/></svg>'
    };
    
    ['Movies', 'VOD', 'Recording'].forEach(name => {
        const btn = document.createElement('button');
        btn.id = `btn-${name.toLowerCase()}`;
        btn.className = 'nav-btn';
        btn.title = name;
        btn.style.padding = '12px';
        btn.style.display = 'flex';
        btn.style.alignItems = 'center';
        btn.style.justifyContent = 'center';
        btn.innerHTML = comingSoonIcons[name] || `<span style="font-weight: bold;">${name}</span>`;
        btn.addEventListener('click', function() {
            if (!this.disabled) alert('Coming in Next Version');
        });
        navBarNode.appendChild(btn);
    });

    // Re-order and flatten all buttons into a single group under #nav-bar
    const btnOrder = ['btn-live-tv', 'btn-playlist', 'btn-epg', 'btn-movies', 'btn-vod', 'btn-recording', 'btn-settings', 'btn-exit'];
    btnOrder.forEach(id => {
        const btn = document.getElementById(id);
        if (btn) navBarNode.appendChild(btn);
    });

    // Clean up empty grouping divs
    Array.from(navBarNode.children).forEach(child => {
        if (child.tagName === 'DIV' && child.children.length === 0) {
            child.remove();
        }
    });
}

// Hide the sidebar & title when the app goes fullscreen so the video takes up 100% of the monitor
window.iptvAPI.onFullscreenChange((isFullscreen) => {
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
            playerWrapper.style.setProperty('border', 'none', 'important');
            playerWrapper.style.setProperty('border-radius', '0', 'important');
            document.body.style.setProperty('padding', '0', 'important');
            document.body.style.setProperty('gap', '0', 'important');
            if (liveTopHalf) liveTopHalf.style.setProperty('gap', '0', 'important');
        } else {
            playerWrapper.style.setProperty('border', '1px solid #333', 'important');
            playerWrapper.style.setProperty('border-radius', '0', 'important');
            document.body.style.setProperty('padding', '12px', 'important');
            document.body.style.setProperty('gap', '12px', 'important');
            if (liveTopHalf) liveTopHalf.style.setProperty('gap', '12px', 'important');
        }
    }
});

async function backgroundAutoUpdate() {
    let hasUpdates = false;
    let epgSourcesToUpdate = new Set(savedEpgs);
    
    for (let i = 0; i < savedPlaylists.length; i++) {
        const p = savedPlaylists[i];
        if (p.disabled || !p.source || (!p.source.startsWith('http') && !p.source.startsWith('https'))) continue;

        const result = await window.iptvAPI.parseM3u(p.source);
        if (result && !result.error && (Array.isArray(result) || result.channels)) {
            const channels = Array.isArray(result) ? result : result.channels;
            const oldMap = new Map();
            if (p.channels) p.channels.forEach(c => oldMap.set(c.title, c));

            channels.forEach(newCh => {
                const old = oldMap.get(newCh.title);
                if (old) {
                    newCh.disabled = old.disabled;
                    newCh.favourite = old.favourite;
                }
            });

            savedPlaylists[i].channels = channels;
            if (result.epg_url && (!savedPlaylists[i].epg || savedPlaylists[i].epg === 'Not Configured')) {
                savedPlaylists[i].epg = result.epg_url;
            }
            hasUpdates = true;
            
            if (p.epg && p.epg !== 'Not Configured') epgSourcesToUpdate.add(p.epg);
        }
    }
    
    if (hasUpdates) updateState();
    if (epgSourcesToUpdate.size > 0) {
        const combinedEpgs = Array.from(epgSourcesToUpdate).join(',');
        await window.iptvAPI.updateEpg(combinedEpgs, null, true);
        epgChannelsData = await window.iptvAPI.getEpgChannels(combinedEpgs);
        await autoMapChannels(false);
    }
}

// Load saved channels on startup
window.addEventListener('DOMContentLoaded', async () => {
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

    // Inject Playlist Format Tabs into the Add Playlist card
    const importNameInputNode = document.getElementById('import-name');
    if (importNameInputNode) {
        let card = importNameInputNode.parentElement;
        while (card && !card.querySelector('h2, h3')) {
            card = card.parentElement;
            if (card === document.body) break;
        }
        
        if (card && card !== document.body) {
            const tabContainer = document.createElement('div');
            tabContainer.style.display = 'flex';
            tabContainer.style.gap = '10px';
            tabContainer.style.marginBottom = '20px';
            tabContainer.style.borderBottom = '1px solid #333';
            tabContainer.style.paddingBottom = '15px';
            tabContainer.style.marginTop = '15px';
            
            // Force text inputs to be active (in case the HTML had them disabled by default or form state locked)
            ['import-name', 'import-file-path', 'import-url-path', 'import-epg-path'].forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    el.disabled = false;
                    el.removeAttribute('disabled');
                    el.style.pointerEvents = 'auto';
                    el.style.opacity = '1';
                }
            });

            ['M3U', 'Xtreme', 'Stalker'].forEach((name, idx) => {
                const btn = document.createElement('button');
                btn.className = 'playlist-btn';
                btn.type = 'button'; // Prevent accidental form submissions
                btn.textContent = name;
                btn.style.padding = '8px 20px';
                btn.style.fontSize = '0.95em';
                if (idx === 0) {
                    btn.style.background = '#bb86fc';
                    btn.style.color = '#000';
                    btn.style.fontWeight = 'bold';
                } else {
                    btn.style.background = '#2a2a2a';
                    btn.addEventListener('click', (e) => {
                        e.preventDefault();
                        alert('Coming in Next Version');
                    });
                }
                tabContainer.appendChild(btn);
            });

            const heading = card.querySelector('h2, h3');
            if (heading) {
                heading.parentNode.insertBefore(tabContainer, heading.nextSibling);
            }
        }
    }

    channelMappings = await window.iptvAPI.getMappings();
    savedEpgs = await window.iptvAPI.getExternalEpgs();

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
        updateState();
        
        if (allChannels.length > 0) {
            switchTab('live-tv', document.getElementById('btn-live-tv'));
            // Autoplay last played channel
            const lastUrl = localStorage.getItem('lastPlayedChannelUrl');
            if (lastUrl) {
                const lastChannel = allChannels.find(c => c.url === lastUrl);
                if (lastChannel) {
                    embedStream(lastChannel);
                }
            }
        } else {
            switchTab('playlist', document.getElementById('btn-playlist'));
        }
    } else {
        updateState(); // Initialize empty states
        switchTab('playlist', document.getElementById('btn-playlist'));
    }
    
    // Begin non-blocking background auto-update process (Delayed to allow the UI to finish rendering first)
    setTimeout(() => {
        backgroundAutoUpdate();
        setInterval(backgroundAutoUpdate, 4 * 60 * 60 * 1000); // Check every 4 hours, actual web fetch limited to 24h by python cache
    }, 5000);

    // Check for Reminders periodically
    setInterval(() => {
        const now = new Date();
        let changed = false;
        savedReminders.forEach(r => {
            if (r.notified) return;
            const startTime = parseEpgTime(r.startTime);
            const diffMs = startTime - now;
            // Notify if starting within 1 minute or already started (up to 1 hr past)
            if (diffMs <= 1 * 60 * 1000 && diffMs > -60 * 60 * 1000) {
                const notif = new Notification("Programme Reminder", {
                    body: `${r.progTitle} is starting soon on ${r.channelTitle}. Click to watch.`,
                    icon: 'assets/logo.png'
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
});
