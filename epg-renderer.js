let liveEpgChannelsPool = [];
let liveEpgGridPool = [];
let mainEpgChannelsPool = [];
let mainEpgGridPool = [];

// ==========================================
// --- EPG GRID GUIDE FRONTEND MODULE ---
// ==========================================

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

let liveEpgGridState = null;
let liveEpgChannelsToRender = [];
let liveEpgLastStartIndex = -1;
let liveEpgLastEndIndex = -1;
let liveEpgLastScrollLeft = -1;
let liveEpgScrollTicking = false;


function onLiveEpgScroll() {
    if (!liveEpgScrollTicking) {
        window.requestAnimationFrame(() => {
            const scrollContainer = document.getElementById('live-epg-scroll-container');
            const headerScroll = document.getElementById('live-epg-header-scroll');
            const channelsCol = document.getElementById('live-epg-channels-col');
            
            if (scrollContainer && headerScroll && channelsCol) {
                headerScroll.scrollLeft = scrollContainer.scrollLeft;
                channelsCol.scrollTop = scrollContainer.scrollTop;
            }
            
            renderVisibleLiveEpgRows();
            liveEpgScrollTicking = false;
        });
        liveEpgScrollTicking = true;
    }
}

function renderVisibleLiveEpgRows(force = false) {
    const scrollContainer = document.getElementById('live-epg-scroll-container');
    const rowsLayer = document.getElementById('live-epg-rows-layer');
    const channelsInner = document.getElementById('live-epg-channels-inner');
    if (!scrollContainer || !rowsLayer || !channelsInner || !liveEpgGridState) return;
    
    const scrollTop = scrollContainer.scrollTop;
    const scrollLeft = scrollContainer.scrollLeft;
    const viewportHeight = scrollContainer.clientHeight;
    const viewportWidth = scrollContainer.clientWidth;
    const rowHeight = 45;
    
    const timeIndicator = document.getElementById('live-epg-time-indicator');
    if (timeIndicator) {
        timeIndicator.style.top = `${scrollTop}px`;
        timeIndicator.style.height = `${viewportHeight}px`;
    }

    const overscan = 5; 
    let startIndex = Math.floor(scrollTop / rowHeight) - overscan;
    let endIndex = Math.ceil((scrollTop + viewportHeight) / rowHeight) + overscan;
    
    startIndex = Math.max(0, startIndex);
    endIndex = Math.min(liveEpgChannelsToRender.length - 1, endIndex);
    
    if (!force && startIndex === liveEpgLastStartIndex && endIndex === liveEpgLastEndIndex && Math.abs(scrollLeft - liveEpgLastScrollLeft) < (viewportWidth / 2)) {
        return; 
    }
    
    liveEpgLastStartIndex = startIndex;
    liveEpgLastEndIndex = endIndex;
    liveEpgLastScrollLeft = scrollLeft;
    
    const viewStartPx = scrollLeft - 500;
    const viewEndPx = scrollLeft + viewportWidth + 500;
    
    const { gridStart, totalWidth, pxPerMinute, now } = liveEpgGridState;
    let gridHtml = '';
    let channelsHtml = '';
    const channelsToFetch = [];
    
    let poolIdx = 0;
    
    for (let i = startIndex; i <= endIndex; i++) {
        const channel = liveEpgChannelsToRender[i];
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
            const epgKey = epgId.toLowerCase();
            if (epgCache[epgKey]) {
                programmes = epgCache[epgKey];
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
                    const bg = isCurrent ? 'rgba(187, 134, 252, 0.1)' : 'rgba(255, 255, 255, 0.025)';
                    const borderCol = isCurrent ? '#bb86fc' : 'rgba(255, 255, 255, 0.08)';
                    const pTitle = (prog.title || 'Unknown').replace(/</g, "&lt;").replace(/>/g, "&gt;");
                    const timeStr = `${pStart.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - ${pEnd.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
                    const isReminderSet = savedReminders.some(r => r.progTitle === prog.title && r.startTime === prog.start && r.channelTitle === channel.title);
                    const reminderStyle = isReminderSet ? 'opacity: 1; filter: drop-shadow(0 0 4px #bb86fc);' : 'opacity: 0.3; filter: grayscale(100%);';
                    const reminderHtml = isFuture ? `<span class="reminder-btn-full" data-channel="${safeTitle.replace(/"/g, '&quot;')}" data-prog="${pTitle.replace(/"/g, '&quot;')}" data-start="${prog.start}" data-stop="${prog.stop}" style="cursor: pointer; margin-right: 4px; display: inline-block; transition: 0.2s; ${reminderStyle}" title="Set/Remove Reminder">🔔</span>` : '';
                    
                    const startTimeIso = pStart.toISOString();
                    const isScheduled = clientScheduledRecordings.some(s => s.channelName === channel.title && s.programName === prog.title && s.startTime === startTimeIso && s.status === 'pending');
                    const isRecording = clientActiveRecordings.some(r => r.channelName === channel.title && r.status === 'recording' && isCurrent);
                    const recordStyle = (isRecording || isScheduled) ? 'color: #ef4444; opacity: 1; filter: drop-shadow(0 0 4px #ef4444);' + (isRecording ? ' animation: pulse 1.5s infinite;' : '') : 'opacity: 0.4;';
                    const recordHtml = isFuture ? `<span class="epg-record-btn" data-channel="${safeTitle.replace(/"/g, '&quot;')}" data-url="${channel.url.replace(/"/g, '&quot;')}" data-prog="${pTitle.replace(/"/g, '&quot;')}" data-start="${prog.start}" data-stop="${prog.stop}" style="cursor: pointer; margin-right: 4px; display: inline-block; transition: 0.2s; ${recordStyle}" title="${isScheduled ? 'Cancel Scheduled Recording' : 'Schedule Recording'}">🔴</span>` : '';

                    programsHtml += `
                    <div class="epg-play-channel epg-program-cell" tabindex="0" data-index="${globalIdx}" style="position: absolute; left: ${left}px; top: 0; width: ${width}px; height: 45px; background: ${bg}; border-right: 1px solid rgba(255, 255, 255, 0.08); border-top: 2px solid ${borderCol}; border-bottom: 1px solid rgba(255, 255, 255, 0.08); box-sizing: border-box; padding: 2px 4px; overflow: hidden; cursor: pointer; transition: background 0.2s; outline: none;" title="${pTitle}\n${timeStr}\n${(prog.desc || '').replace(/</g, "&lt;").replace(/>/g, "&gt;")}">
                        <div style="font-size: 0.85em; font-weight: bold; color: ${isCurrent ? '#fff' : '#ccc'}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; width: 100%;">${reminderHtml}${recordHtml}${pTitle}</div>
                        <div style="font-size: 0.75em; color: #888; margin-top: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; width: 100%;">${timeStr}</div>
                    </div>`;
                }
            } else {
                programsHtml = `<div class="epg-play-channel" data-index="${globalIdx}" style="position: absolute; top: 0; left: 0; display: flex; align-items: center; padding-left: 20px; height: 45px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); box-sizing: border-box; color: #555; font-size: 0.9em; width: 100%; cursor: pointer;">No EPG Data</div>`;
            }
        } else {
            programsHtml = `<div class="epg-play-channel" data-index="${globalIdx}" style="position: absolute; top: 0; left: 0; display: flex; align-items: center; padding-left: 20px; height: 45px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); box-sizing: border-box; color: #bb86fc; font-size: 0.9em; width: 100%; cursor: pointer;"><div class="win-loading-ring" style="width: 22px; height: 22px; margin-right: 10px;"><div class="win-loading-dot" style="width: 4px; height: 4px;"></div><div class="win-loading-dot" style="width: 4px; height: 4px;"></div><div class="win-loading-dot" style="width: 4px; height: 4px;"></div><div class="win-loading-dot" style="width: 4px; height: 4px;"></div><div class="win-loading-dot" style="width: 4px; height: 4px;"></div></div><span style="color: #bb86fc; text-shadow: 0 0 8px rgba(187,134,252,0.3);">Loading...</span></div>`;
        }
        
        let cEl = liveEpgChannelsPool[poolIdx];
        if (!cEl) {
            cEl = document.createElement('div');
            liveEpgChannelsPool.push(cEl);
        }
        if (cEl.parentNode !== channelsInner) channelsInner.appendChild(cEl);
        cEl.style.display = 'flex';
        cEl.className = "epg-play-channel";
        cEl.tabIndex = 0;
        cEl.setAttribute('data-index', globalIdx);
        cEl.style.cssText = `position: absolute; top: ${topPos}px; left: 0; width: 250px; height: 45px; background: rgba(255, 255, 255, 0.02); border-bottom: 1px solid rgba(255, 255, 255, 0.08); border-top: 1px solid rgba(255, 255, 255, 0.08); border-right: 1px solid rgba(255, 255, 255, 0.08); display: flex; align-items: center; padding: 4px 8px; box-sizing: border-box; cursor: pointer; outline: none;`;
        cEl.innerHTML = `<img src="${imgSrc}" data-eh="0" style="width: 32px; height: 32px; min-width: 32px; object-fit: contain; margin-right: 10px; background: rgba(15, 15, 18, 0.45); border-radius: 4px; border: 1px solid rgba(255,255,255,0.06);">
            <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 0.8em; font-weight: bold; font-family: 'Inter', sans-serif; color: #e0e0e0;" title="${safeTitle}">${safeTitle}</span>`;
            
        let gEl = liveEpgGridPool[poolIdx];
        if (!gEl) {
            gEl = document.createElement('div');
            liveEpgGridPool.push(gEl);
        }
        if (gEl.parentNode !== rowsLayer) rowsLayer.appendChild(gEl);
        gEl.style.display = 'block';
        gEl.style.cssText = `position: absolute; top: ${topPos}px; left: 0; width: ${totalWidth}px; height: 45px;`;
        gEl.innerHTML = programsHtml;

        poolIdx++;
    }
    
    // Hide unused pool elements
    for (let i = poolIdx; i < liveEpgChannelsPool.length; i++) {
        liveEpgChannelsPool[i].style.display = 'none';
    }
    for (let i = poolIdx; i < liveEpgGridPool.length; i++) {
        liveEpgGridPool[i].style.display = 'none';
    }
    
    // Note: Removed the innerHTML reset, since we reuse nodes.
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

async function renderLiveEpgGrid() {
    const container = document.getElementById('epg-container');
    if (!container) return;

    try {
        clientScheduledRecordings = await window.iptvAPI.getScheduledRecordings();
    } catch (e) {}

    if (allChannels.length === 0) {
        container.innerHTML = '<div style="color: #888; text-align: center; margin-top: 50px;">No channels available.</div>';
        return;
    }

    // EPG logos pre-resolved on load-channels

    if (window.liveEpgTimeIndicatorInterval) clearInterval(window.liveEpgTimeIndicatorInterval);

    const pxPerMinute = 5;
    const hourWidth = 60 * pxPerMinute;
    const now = new Date();
    
    const gridStart = new Date(now.getTime());
    gridStart.setMinutes(0, 0, 0);
    gridStart.setHours(gridStart.getHours() - 1); // -1 hour
    
    const gridEnd = new Date(gridStart.getTime() + 9 * 60 * 60 * 1000); // +8 hours from now (9 hours total duration)
    const totalWidth = 9 * hourWidth;

    let playlistOptionsHtml = `<option value="all">All Playlists</option><option value="favs" ${playerEpgSelectedPlaylist === 'favs' ? 'selected' : ''}>Favourites</option>`;
    savedPlaylists.forEach(p => {
        playlistOptionsHtml += `<option value="${p.id}" ${playerEpgSelectedPlaylist === String(p.id) ? 'selected' : ''}>${p.name}</option>`;
    });

    let epgGroupOptions = new Set();
    allChannels.forEach(c => {
        if (playerEpgSelectedPlaylist === 'favs' && !c.favourite) return;
        if (playerEpgSelectedPlaylist !== 'all' && playerEpgSelectedPlaylist !== 'favs' && String(c.playlistId) !== String(playerEpgSelectedPlaylist)) return;
        epgGroupOptions.add(c.group || 'Uncategorized');
    });
    const sortedEpgGroups = Array.from(epgGroupOptions).sort(sortAlphaNum);
    
    let groupOptionsHtml = `<option value="all">All Groups</option>`;
    sortedEpgGroups.forEach(g => {
        groupOptionsHtml += `<option value="${g.replace(/"/g, '&quot;')}" ${playerEpgSelectedGroup === g ? 'selected' : ''}>${g.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</option>`;
    });

    const topBarHtml = `
        <div style="width: 100%; display: flex; justify-content: space-between; align-items: center; padding: 6px 10px 4px 10px; box-sizing: border-box; flex-shrink: 0;">
            <div style="display: flex; gap: 8px;">
                <button id="player-epg-now-btn" class="playlist-btn" style="background: #bb86fc; color: black; font-weight: bold; padding: 8px 16px; border-radius: 4px; cursor: pointer; border: none;">Now</button>
                <button id="player-epg-full-btn" class="playlist-btn" style="background: #333; color: white; font-weight: bold; padding: 8px 16px; border-radius: 8px; cursor: pointer; border: 1px solid #555;">Full EPG</button>
            </div>
            <div></div>
        </div>
    `;

    const sidebarFilterSelect = document.getElementById('playlist-filter');
    const sidebarFilterVal = sidebarFilterSelect ? sidebarFilterSelect.value : 'all';

    const sidebarChannelSearch = document.getElementById('channel-search');
    const sidebarSearchVal = sidebarChannelSearch ? sidebarChannelSearch.value.toLowerCase() : '';

    if (sidebarFilterVal !== 'favs' && (!window.expandedGroups || window.expandedGroups.size === 0)) {
        container.innerHTML = topBarHtml + '<div style="color: #888; text-align: center; margin-top: 50px; font-family: \'Inter\', sans-serif;">Expand a group in the sidebar to view EPG schedules.</div>';
        return;
    }

    liveEpgChannelsToRender = allChannels.filter(channel => {
        if (sidebarFilterVal === 'favs' && !channel.favourite) return false;
        if (sidebarFilterVal !== 'all' && sidebarFilterVal !== 'favs' && String(channel.playlistId) !== String(sidebarFilterVal)) return false;
        
        const rawTitle = channel.title || 'Unknown Channel';
        if (sidebarSearchVal && !rawTitle.toLowerCase().includes(sidebarSearchVal)) return false;
        
        if (sidebarFilterVal !== 'favs') {
            const channelGroup = channel.group || 'Uncategorized';
            if (!window.expandedGroups.has(channelGroup)) return false;
        }
        
        return true;
    });

    liveEpgChannelsToRender.sort((a, b) => sortAlphaNum(a.title, b.title));

    liveEpgGridState = { gridStart, gridEnd, totalWidth, pxPerMinute, now };
    liveEpgLastStartIndex = -1;
    liveEpgLastEndIndex = -1;
    liveEpgLastScrollLeft = -1;

    let headerHtml = '';
    for (let i = 0; i < 9; i++) {
        const headerTime = new Date(gridStart.getTime() + i * 60 * 60 * 1000);
        const timeStr = headerTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        headerHtml += `<div style="position: absolute; left: ${i * hourWidth}px; width: ${hourWidth}px; height: 100%; border-right: 1px solid rgba(255,255,255,0.1); border-bottom: 2px solid #333; display: flex; align-items: center; padding-left: 10px; color: #fff; font-weight: normal; font-size: 0.9em; box-sizing: border-box;">${timeStr}</div>`;
    }

    const minutesSinceStart = (now.getTime() - gridStart.getTime()) / 60000;
    const nowPx = minutesSinceStart * pxPerMinute;
    let redLineHtml = '';
    if (nowPx > 0 && nowPx < totalWidth) {
        redLineHtml = `<div id="live-epg-time-indicator" style="position: absolute; left: ${nowPx}px; top: 0; height: 100%; width: 2px; background: #cf6679; z-index: 15; pointer-events: none;"></div>`;
    }

    let html = `
    <div id="live-epg-layout-wrapper" style="display: flex; flex-direction: column; flex-grow: 1; width: 100%; height: 100%; overflow: hidden; background: rgba(255, 255, 255, 0.02); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 16px;">
        <!-- Header Row -->
        <div style="display: flex; width: 100%; background: rgba(255, 255, 255, 0.03); z-index: 20;">
            <div style="width: 250px; min-width: 250px; background: rgba(255, 255, 255, 0.04); border-bottom: 2px solid rgba(255, 255, 255, 0.08); border-right: 1px solid rgba(255, 255, 255, 0.12); display: flex; align-items: center; justify-content: center; font-weight: normal; font-size: 0.9em; color: #fff; box-sizing: border-box; height: 30px;">Channels</div>
            <div id="live-epg-header-scroll" style="flex-grow: 1; overflow: hidden; position: relative; height: 30px;">
                <div style="width: ${totalWidth}px; height: 100%; position: relative;">
                    ${headerHtml}
                </div>
            </div>
            <!-- Scrollbar Spacer -->
            <div id="live-epg-header-spacer" style="width: 14px; min-width: 14px; background: rgba(255, 255, 255, 0.03); border-bottom: 2px solid rgba(255, 255, 255, 0.08); flex-shrink: 0; box-sizing: border-box;"></div>
        </div>
        
        <!-- Content Area -->
        <div style="display: flex; flex-grow: 1; overflow: hidden; width: 100%;">
            <!-- Left Pinned Channels -->
            <div id="live-epg-channels-col" style="width: 250px; min-width: 250px; background: rgba(255, 255, 255, 0.025); overflow: hidden; border-right: 1px solid rgba(255, 255, 255, 0.12); z-index: 10; position: relative;">
                <div id="live-epg-channels-inner" style="position: relative; width: 100%; height: ${liveEpgChannelsToRender.length * 45}px;"></div>
            </div>
            
            <!-- Right Scrolling Grid -->
            <div id="live-epg-scroll-container" style="flex-grow: 1; overflow-y: scroll; overflow-x: auto; position: relative; background: transparent;">
                <div id="live-epg-grid-inner" style="width: ${totalWidth}px; height: ${liveEpgChannelsToRender.length * 45}px; position: relative;">
                    <div id="live-epg-rows-layer" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"></div>
                    ${redLineHtml}
                </div>
            </div>
        </div>
    </div>`;

    container.innerHTML = topBarHtml + html;

    const channelsContainer = document.getElementById('live-epg-channels-col');
    const gridContainer = document.getElementById('live-epg-scroll-container');
    
    const handleEpgClick = (e) => {
            const recordBtn = e.target.closest('.epg-record-btn');
            if (recordBtn) {
                e.stopPropagation();
                const channelTitle = recordBtn.getAttribute('data-channel');
                const channelUrl = recordBtn.getAttribute('data-url');
                const progTitle = recordBtn.getAttribute('data-prog');
                const startRaw = recordBtn.getAttribute('data-start');
                const stopRaw = recordBtn.getAttribute('data-stop');
                
                const startTimeIso = parseEpgTime(startRaw).toISOString();
                const endTimeIso = parseEpgTime(stopRaw).toISOString();
                
                const existingSchedule = clientScheduledRecordings.find(s => s.channelName === channelTitle && s.programName === progTitle && s.startTime === startTimeIso && s.status === 'pending');
                
                if (existingSchedule) {
                    window.iptvAPI.cancelScheduledRecording(existingSchedule.id).then(success => {
                        if (success) {
                            showToast('Scheduled recording cancelled: ' + progTitle);
                            renderFullEpg();
                            renderLiveEpg();
                        } else {
                            showToast('Failed to cancel schedule.', true);
                        }
                    });
                } else {
                    const targetChannel = allChannels.find(c => c.title === channelTitle);
                    const resolveUrlAndSchedule = async () => {
                        try {
                            const originalUrl = targetChannel ? (targetChannel.stream_url || targetChannel.url) : channelUrl;
                            let customHeaders = [];
                            if (targetChannel && targetChannel.stream_url && targetChannel.stream_url.startsWith('stalker-cmd:')) {
                                const playlist = savedPlaylists.find(p => p.id === targetChannel.playlist_id || p.id === targetChannel.playlistId);
                                if (playlist && playlist.epg && playlist.epg.startsWith('stalker:')) {
                                    const mac = playlist.epg.substring(8);
                                    let portalUrl = playlist.source;
                                    let referer = portalUrl.replace('/server/load.php', '/c/index.html').replace('/portal.php', '/c/index.html');
                                    customHeaders = [
                                        `X-User-Agent: Model: MAG250; Link: Ethernet`,
                                        `Referer: ${referer}`,
                                        `STALKER-METADATA:${JSON.stringify({ portalUrl, mac, sourceType: 'stalker' })}`
                                    ];
                                }
                            } else if (targetChannel && targetChannel.url && targetChannel.url.startsWith('xtream-stream:')) {
                                const playlist = savedPlaylists.find(p => p.id === targetChannel.playlist_id || p.id === targetChannel.playlistId);
                                if (playlist && playlist.source && playlist.source.startsWith('xtream-credentials:')) {
                                    const credParts = playlist.source.substring(19).split('|');
                                    const server = credParts[0];
                                    const username = credParts[1];
                                    const password = credParts[2];
                                    const parts = targetChannel.url.substring(14).split('|');
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
                                    customHeaders = [
                                        `User-Agent: IPTV Smarters Pro`,
                                        `Referer: ${server}`,
                                        `XTREAM-METADATA:${JSON.stringify({
                                            server,
                                            username,
                                            password,
                                            streamId,
                                            type,
                                            extension,
                                            directSourceUrl,
                                            sourceType: 'xtream'
                                        })}`
                                    ];
                                }
                            } else {
                                customHeaders = [
                                    `STALKER-METADATA:${JSON.stringify({ sourceType: 'm3u' })}`
                                ];
                            }
                            
                            window.iptvAPI.scheduleRecording(originalUrl, channelTitle, progTitle, startTimeIso, endTimeIso, customHeaders).then(res => {
                                if (res) {
                                    showToast(`Recording scheduled: ${progTitle}`);
                                    renderFullEpg();
                                    renderLiveEpg();
                                } else {
                                    showToast('Failed to schedule recording.', true);
                                }
                            });
                        } catch (err) {
                            console.error('Error scheduling recording:', err);
                            showToast('Failed to schedule: ' + err.message, true);
                        }
                    };
                    resolveUrlAndSchedule();
                }
                return;
            }

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

    if (gridContainer) {
        gridContainer.addEventListener('scroll', onLiveEpgScroll);
    }

    const playerPlaylistFilter = document.getElementById('player-epg-playlist-filter');
    if (playerPlaylistFilter) {
        playerPlaylistFilter.addEventListener('change', (e) => {
            playerEpgSelectedPlaylist = e.target.value;
            playerEpgSelectedGroup = 'all';
            renderLiveEpgGrid();
        });
    }

    const playerGroupFilter = document.getElementById('player-epg-group-filter');
    if (playerGroupFilter) {
        playerGroupFilter.addEventListener('change', (e) => {
            playerEpgSelectedGroup = e.target.value;
            renderLiveEpgGrid();
        });
    }

    const playerNowBtn = document.getElementById('player-epg-now-btn');
    if (playerNowBtn) {
        playerNowBtn.addEventListener('click', () => {
            if (gridContainer && liveEpgGridState) {
                const pxPerMinute = liveEpgGridState.pxPerMinute;
                const minutesSinceStart = (new Date().getTime() - liveEpgGridState.gridStart.getTime()) / 60000;
                const nowPx = minutesSinceStart * pxPerMinute;
                const targetScroll = Math.max(0, nowPx - (30 * pxPerMinute));
                gridContainer.scrollLeft = targetScroll;
                const headerScroll = document.getElementById('live-epg-header-scroll');
                if (headerScroll) headerScroll.scrollLeft = targetScroll;
            }
        });
    }

    const playerFullBtn = document.getElementById('player-epg-full-btn');
    if (playerFullBtn) {
        playerFullBtn.addEventListener('click', () => {
            const epgBtn = document.getElementById('btn-epg');
            if (epgBtn) epgBtn.click();
        });
    }

    renderVisibleLiveEpgRows(true);

    if (!document.getElementById('live-epg-styles')) {
        const style = document.createElement('style');
        style.id = 'live-epg-styles';
        style.textContent = `
            #live-epg-scroll-container::-webkit-scrollbar { width: 12px !important; height: 12px !important; }
            #live-epg-scroll-container::-webkit-scrollbar-track { background: #121212 !important; border-left: 1px solid rgba(255, 255, 255, 0.05) !important; border-top: 1px solid rgba(255, 255, 255, 0.05) !important; }
            #live-epg-scroll-container::-webkit-scrollbar-thumb { background: #5c5c66 !important; border-radius: 6px !important; border: 3px solid #121212 !important; }
            #live-epg-scroll-container::-webkit-scrollbar-thumb:hover { background: #bb86fc !important; }
            #live-epg-scroll-container::-webkit-scrollbar-corner { background: #121212 !important; }
        `;
        document.head.appendChild(style);
    }

    if (gridContainer) {
        const targetScroll = Math.max(0, nowPx - (30 * pxPerMinute)); // Pad back 30 mins from red line
        setTimeout(() => {
            gridContainer.scrollLeft = targetScroll;
            const headerScroll = document.getElementById('live-epg-header-scroll');
            if (headerScroll) headerScroll.scrollLeft = targetScroll;

            // Scroll to the active channel if there is one
            if (currentPlayingChannelIndex >= 0) {
                const activeChannel = allChannels[currentPlayingChannelIndex];
                const renderIdx = liveEpgChannelsToRender.findIndex(c => c.title === activeChannel.title && c.url === activeChannel.url);
                if (renderIdx >= 0) {
                    const rowHeight = 45;
                    const scrollToY = renderIdx * rowHeight;
                    gridContainer.scrollTop = Math.max(0, scrollToY);
                }
            }
        }, 10);
    }

    window.liveEpgTimeIndicatorInterval = setInterval(() => {
        const indicator = document.getElementById('live-epg-time-indicator');
        if (indicator && liveEpgGridState) {
            const newNow = new Date();
            const newMinutesSinceStart = (newNow.getTime() - liveEpgGridState.gridStart.getTime()) / 60000;
            const newNowPx = newMinutesSinceStart * liveEpgGridState.pxPerMinute;
            indicator.style.left = `${newNowPx}px`;
        }
    }, 60000);
}

async function fetchEpgDataForChannels(channels) {
    const epgIdsToFetch = new Set();
    channels.forEach(ch => {
        if (!ch) return;
        const mappedId = channelMappings[ch.title];
        const epgId = mappedId || ch.tvg_id || ch.tvg_name;
        if (epgId) {
            const epgKey = epgId.toLowerCase();
            if (!epgCache[epgKey] && !epgLoadingSet.has(epgKey)) {
                epgIdsToFetch.add(epgKey);
                epgLoadingSet.add(epgKey);
            }
        }
    });
    
    const epgIdsArr = Array.from(epgIdsToFetch);
    if (epgIdsArr.length === 0) return;
    
    const activeState = epgGridState || liveEpgGridState;
    if (!activeState) return;
    const { gridStart, gridEnd } = activeState;
    const startLimit = formatDateToEpgString(gridStart);
    const endLimit = formatDateToEpgString(gridEnd);
    
    console.log(`[API] Fetching EPG for ${epgIdsArr.length} channel IDs...`);
    const epgData = await window.iptvAPI.getEpg(epgIdsArr, startLimit, endLimit);
    
    Object.keys(epgData).forEach(id => {
        epgCache[id.toLowerCase()] = epgData[id] || [];
    });

    // Mark as loaded even if no data was returned to prevent re-fetching
    epgIdsArr.forEach(id => {
        const epgKey = id.toLowerCase();
        if (!epgCache[epgKey]) epgCache[epgKey] = [];
    });
    
    renderVisibleEpgRows(true); // Force re-render with new data
    renderVisibleLiveEpgRows(true); // Force re-render Live EPG too!
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
    const rowHeight = 45;
    
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
    
    const viewStartPx = scrollLeft - 500;
    const viewEndPx = scrollLeft + viewportWidth + 500;
    
    const { gridStart, totalWidth, pxPerMinute, now } = epgGridState;
    let gridHtml = '';
    let channelsHtml = '';
    const channelsToFetch = [];
    
    let poolIdx = 0;
    
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
            const epgKey = epgId.toLowerCase();
            if (epgCache[epgKey]) {
                programmes = epgCache[epgKey];
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
                    const bg = isCurrent ? 'rgba(187, 134, 252, 0.1)' : 'rgba(255, 255, 255, 0.025)';
                    const borderCol = isCurrent ? '#bb86fc' : 'rgba(255, 255, 255, 0.08)';
                    const pTitle = (prog.title || 'Unknown').replace(/</g, "&lt;").replace(/>/g, "&gt;");
                    const timeStr = `${pStart.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - ${pEnd.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
                    const isReminderSet = savedReminders.some(r => r.progTitle === prog.title && r.startTime === prog.start && r.channelTitle === channel.title);
                    const reminderStyle = isReminderSet ? 'opacity: 1; filter: drop-shadow(0 0 4px #bb86fc);' : 'opacity: 0.3; filter: grayscale(100%);';
                    const reminderHtml = isFuture ? `<span class="reminder-btn-full" data-channel="${safeTitle.replace(/"/g, '&quot;')}" data-prog="${pTitle.replace(/"/g, '&quot;')}" data-start="${prog.start}" data-stop="${prog.stop}" style="cursor: pointer; margin-right: 4px; display: inline-block; transition: 0.2s; ${reminderStyle}" title="Set/Remove Reminder">🔔</span>` : '';
                    
                    const startTimeIso = pStart.toISOString();
                    const isScheduled = clientScheduledRecordings.some(s => s.channelName === channel.title && s.programName === prog.title && s.startTime === startTimeIso && s.status === 'pending');
                    const isRecording = clientActiveRecordings.some(r => r.channelName === channel.title && r.status === 'recording' && isCurrent);
                    const recordStyle = (isRecording || isScheduled) ? 'color: #ef4444; opacity: 1; filter: drop-shadow(0 0 4px #ef4444);' + (isRecording ? ' animation: pulse 1.5s infinite;' : '') : 'opacity: 0.4;';
                    const recordHtml = isFuture ? `<span class="epg-record-btn" data-channel="${safeTitle.replace(/"/g, '&quot;')}" data-url="${channel.url.replace(/"/g, '&quot;')}" data-prog="${pTitle.replace(/"/g, '&quot;')}" data-start="${prog.start}" data-stop="${prog.stop}" style="cursor: pointer; margin-right: 4px; display: inline-block; transition: 0.2s; ${recordStyle}" title="${isScheduled ? 'Cancel Scheduled Recording' : 'Schedule Recording'}">🔴</span>` : '';

                    programsHtml += `
                    <div class="epg-play-channel epg-program-cell" tabindex="0" data-index="${globalIdx}" style="position: absolute; left: ${left}px; top: 0; width: ${width}px; height: 45px; background: ${bg}; border-right: 1px solid rgba(255, 255, 255, 0.08); border-top: 2px solid ${borderCol}; border-bottom: 1px solid rgba(255, 255, 255, 0.08); box-sizing: border-box; padding: 2px 4px; overflow: hidden; cursor: pointer; transition: background 0.2s; outline: none;" title="${pTitle}\n${timeStr}\n${(prog.desc || '').replace(/</g, "&lt;").replace(/>/g, "&gt;")}">
                        <div style="font-size: 0.85em; font-weight: bold; color: ${isCurrent ? '#fff' : '#ccc'}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; width: 100%;">${reminderHtml}${recordHtml}${pTitle}</div>
                        <div style="font-size: 0.75em; color: #888; margin-top: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; width: 100%;">${timeStr}</div>
                    </div>`;
                }
            } else {
                programsHtml = `<div class="epg-play-channel" data-index="${globalIdx}" style="position: absolute; top: 0; left: 0; display: flex; align-items: center; padding-left: 20px; height: 45px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); box-sizing: border-box; color: #555; font-size: 0.9em; width: 100%; cursor: pointer;">No EPG Data</div>`;
            }
        } else {
            programsHtml = `<div class="epg-play-channel" data-index="${globalIdx}" style="position: absolute; top: 0; left: 0; display: flex; align-items: center; padding-left: 20px; height: 45px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); box-sizing: border-box; color: #bb86fc; font-size: 0.9em; width: 100%; cursor: pointer;"><div class="win-loading-ring" style="width: 22px; height: 22px; margin-right: 10px;"><div class="win-loading-dot" style="width: 4px; height: 4px;"></div><div class="win-loading-dot" style="width: 4px; height: 4px;"></div><div class="win-loading-dot" style="width: 4px; height: 4px;"></div><div class="win-loading-dot" style="width: 4px; height: 4px;"></div><div class="win-loading-dot" style="width: 4px; height: 4px;"></div></div><span style="color: #bb86fc; text-shadow: 0 0 8px rgba(187,134,252,0.3);">Loading...</span></div>`;
        }
        
        let cEl = mainEpgChannelsPool[poolIdx];
        if (!cEl) {
            cEl = document.createElement('div');
            mainEpgChannelsPool.push(cEl);
        }
        if (cEl.parentNode !== channelsInner) channelsInner.appendChild(cEl);
        cEl.style.display = 'flex';
        cEl.className = "epg-play-channel";
        cEl.tabIndex = 0;
        cEl.setAttribute('data-index', globalIdx);
        cEl.style.cssText = `position: absolute; top: ${topPos}px; left: 0; width: 250px; height: 45px; background: rgba(255, 255, 255, 0.02); border-bottom: 1px solid rgba(255, 255, 255, 0.08); border-top: 1px solid rgba(255, 255, 255, 0.08); border-right: 1px solid rgba(255, 255, 255, 0.08); display: flex; align-items: center; padding: 4px 8px; box-sizing: border-box; cursor: pointer; outline: none;`;
        cEl.innerHTML = `<img src="${imgSrc}" data-eh="0" style="width: 32px; height: 32px; min-width: 32px; object-fit: contain; margin-right: 10px; background: rgba(15, 15, 18, 0.45); border-radius: 4px; border: 1px solid rgba(255,255,255,0.06);">
            <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 0.8em; font-weight: bold; font-family: 'Inter', sans-serif; color: #e0e0e0;" title="${safeTitle}">${safeTitle}</span>`;
            
        let gEl = mainEpgGridPool[poolIdx];
        if (!gEl) {
            gEl = document.createElement('div');
            mainEpgGridPool.push(gEl);
        }
        if (gEl.parentNode !== rowsLayer) rowsLayer.appendChild(gEl);
        gEl.style.display = 'block';
        gEl.style.cssText = `position: absolute; top: ${topPos}px; left: 0; width: ${totalWidth}px; height: 45px;`;
        gEl.innerHTML = programsHtml;

        poolIdx++;
    }
    
    // Hide unused pool elements
    for (let i = poolIdx; i < mainEpgChannelsPool.length; i++) {
        mainEpgChannelsPool[i].style.display = 'none';
    }
    for (let i = poolIdx; i < mainEpgGridPool.length; i++) {
        mainEpgGridPool[i].style.display = 'none';
    }
    
    // Note: Removed the innerHTML reset, since we reuse nodes.
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

    try {
        clientScheduledRecordings = await window.iptvAPI.getScheduledRecordings();
    } catch (e) {}

    // EPG logos pre-resolved on load-channels

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
        <div style="width: 100%; display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
            <div style="display: flex; gap: 10px;">
                <select id="epg-playlist-filter" style="background: #121212; color: white; border: 1px solid #555; padding: 6px; border-radius: 4px; outline: none;">
                    ${playlistOptionsHtml}
                </select>
                <select id="epg-group-filter" style="background: #121212; color: white; border: 1px solid #555; padding: 6px; border-radius: 4px; outline: none;">
                    ${groupOptionsHtml}
                </select>
            </div>
            <div style="display: flex; align-items: center; gap: 10px;">
                <button id="epg-now-btn" class="playlist-btn" style="background: #bb86fc; color: black; font-weight: bold; padding: 8px 16px; border-radius: 4px;">Now</button>
            </div>
        </div>
    `;
    
    epgView.innerHTML = topBarHtml + '<div id="epg-content-area" style="flex-grow: 1; display: flex; flex-direction: column; min-height: 0;">' + getWinSpinnerHtml('Loading Guide Data...', { size: 'large' }) + '</div>';
    
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

    const pxPerMinute = 10;
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
    <div id="epg-layout-wrapper" style="display: flex; flex-direction: column; flex-grow: 1; width: 100%; height: 100%; overflow: hidden; background: rgba(255, 255, 255, 0.02); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 16px;">
        <!-- Header Row -->
        <div style="display: flex; width: 100%; background: rgba(187, 134, 252, 0.15); z-index: 20;">
            <div style="width: 250px; min-width: 250px; background: rgba(187, 134, 252, 0.2); border-bottom: 2px solid rgba(255, 255, 255, 0.08); border-right: 1px solid rgba(255, 255, 255, 0.12); display: flex; align-items: center; justify-content: center; font-weight: bold; color: #fff; box-sizing: border-box; height: 30px;">Channels</div>
            <div id="epg-header-scroll" style="flex-grow: 1; overflow: hidden; position: relative; height: 30px;">
                <div style="width: ${totalWidth}px; height: 100%; position: relative;">
                    ${headerHtml}
                </div>
            </div>
            <!-- Scrollbar Spacer -->
            <div id="epg-header-spacer" style="width: 14px; min-width: 14px; background: rgba(187, 134, 252, 0.15); border-bottom: 2px solid rgba(255, 255, 255, 0.08); flex-shrink: 0; box-sizing: border-box;"></div>
        </div>
        
        <!-- Content Area -->
        <div style="display: flex; flex-grow: 1; overflow: hidden; width: 100%;">
            <!-- Left Pinned Channels -->
            <div id="epg-channels-col" style="width: 250px; min-width: 250px; background: rgba(255, 255, 255, 0.025); overflow: hidden; border-right: 1px solid rgba(255, 255, 255, 0.12); z-index: 10; position: relative;">
                <div id="epg-channels-inner" style="position: relative; width: 100%; height: ${epgChannelsToRender.length * 45}px;"></div>
            </div>
            
            <!-- Right Scrolling Grid -->
            <div id="epg-scroll-container" style="flex-grow: 1; overflow-y: scroll; overflow-x: auto; position: relative; background: transparent;">
                <div id="epg-grid-inner" style="width: ${totalWidth}px; height: ${epgChannelsToRender.length * 45}px; position: relative;">
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
            const recordBtn = e.target.closest('.epg-record-btn');
            if (recordBtn) {
                e.stopPropagation();
                const channelTitle = recordBtn.getAttribute('data-channel');
                const channelUrl = recordBtn.getAttribute('data-url');
                const progTitle = recordBtn.getAttribute('data-prog');
                const startRaw = recordBtn.getAttribute('data-start');
                const stopRaw = recordBtn.getAttribute('data-stop');
                
                const startTimeIso = parseEpgTime(startRaw).toISOString();
                const endTimeIso = parseEpgTime(stopRaw).toISOString();
                
                const existingSchedule = clientScheduledRecordings.find(s => s.channelName === channelTitle && s.programName === progTitle && s.startTime === startTimeIso && s.status === 'pending');
                
                if (existingSchedule) {
                    window.iptvAPI.cancelScheduledRecording(existingSchedule.id).then(success => {
                        if (success) {
                            showToast('Scheduled recording cancelled: ' + progTitle);
                            renderFullEpg();
                            renderLiveEpg();
                        } else {
                            showToast('Failed to cancel schedule.', true);
                        }
                    });
                } else {
                    const targetChannel = allChannels.find(c => c.title === channelTitle);
                    const resolveUrlAndSchedule = async () => {
                        try {
                            const originalUrl = targetChannel ? (targetChannel.stream_url || targetChannel.url) : channelUrl;
                            let customHeaders = [];
                            if (targetChannel && targetChannel.stream_url && targetChannel.stream_url.startsWith('stalker-cmd:')) {
                                const playlist = savedPlaylists.find(p => p.id === targetChannel.playlist_id || p.id === targetChannel.playlistId);
                                if (playlist && playlist.epg && playlist.epg.startsWith('stalker:')) {
                                    const mac = playlist.epg.substring(8);
                                    let portalUrl = playlist.source;
                                    let referer = portalUrl.replace('/server/load.php', '/c/index.html').replace('/portal.php', '/c/index.html');
                                    customHeaders = [
                                        `X-User-Agent: Model: MAG250; Link: Ethernet`,
                                        `Referer: ${referer}`,
                                        `STALKER-METADATA:${JSON.stringify({ portalUrl, mac, sourceType: 'stalker' })}`
                                    ];
                                }
                            } else {
                                customHeaders = [
                                    `STALKER-METADATA:${JSON.stringify({ sourceType: 'm3u' })}`
                                ];
                            }
                            
                            window.iptvAPI.scheduleRecording(originalUrl, channelTitle, progTitle, startTimeIso, endTimeIso, customHeaders).then(res => {
                                if (res) {
                                    showToast(`Recording scheduled: ${progTitle}`);
                                    renderFullEpg();
                                    renderLiveEpg();
                                } else {
                                    showToast('Failed to schedule recording.', true);
                                }
                            });
                        } catch (err) {
                            console.error('Error scheduling recording:', err);
                            showToast('Failed to schedule: ' + err.message, true);
                        }
                    };
                    resolveUrlAndSchedule();
                }
                return;
            }

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
            #epg-scroll-container::-webkit-scrollbar { width: 12px !important; height: 12px !important; }
            #epg-scroll-container::-webkit-scrollbar-track { background: #121212 !important; border-left: 1px solid rgba(255, 255, 255, 0.05) !important; border-top: 1px solid rgba(255, 255, 255, 0.05) !important; }
            #epg-scroll-container::-webkit-scrollbar-thumb { background: #5c5c66 !important; border-radius: 6px !important; border: 3px solid #121212 !important; }
            #epg-scroll-container::-webkit-scrollbar-thumb:hover { background: #bb86fc !important; }
            #epg-scroll-container::-webkit-scrollbar-corner { background: #121212 !important; }
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

function getVisibleChannels() {
    const visible = new Map();
    const scrollContainer = document.getElementById('epg-scroll-container');
    if (scrollContainer && typeof epgChannelsToRender !== 'undefined' && epgChannelsToRender.length > 0) {
        const scrollTop = scrollContainer.scrollTop;
        const viewportHeight = scrollContainer.clientHeight;
        const rowHeight = 45;
        const overscan = 5;
        const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
        const endIndex = Math.min(epgChannelsToRender.length - 1, Math.ceil((scrollTop + viewportHeight) / rowHeight) + overscan);
        for (let i = startIndex; i <= endIndex; i++) {
            const ch = epgChannelsToRender[i];
            if (ch) visible.set(`${ch.title}|${ch.url}`, ch);
        }
    }
    const liveScrollContainer = document.getElementById('live-epg-scroll-container');
    if (liveScrollContainer && typeof liveEpgChannelsToRender !== 'undefined' && liveEpgChannelsToRender.length > 0) {
        const scrollTop = liveScrollContainer.scrollTop;
        const viewportHeight = liveScrollContainer.clientHeight;
        const rowHeight = 45;
        const overscan = 5;
        const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
        const endIndex = Math.min(liveEpgChannelsToRender.length - 1, Math.ceil((scrollTop + viewportHeight) / rowHeight) + overscan);
        for (let i = startIndex; i <= endIndex; i++) {
            const ch = liveEpgChannelsToRender[i];
            if (ch) visible.set(`${ch.title}|${ch.url}`, ch);
        }
    }
    return Array.from(visible.values());
}

if (window.iptvAPI && window.iptvAPI.onEpgProgressiveUpdate) {
    window.iptvAPI.onEpgProgressiveUpdate(({ channelsUpdated }) => {
        if (!channelsUpdated || channelsUpdated.length === 0) return;
        
        let needsFetch = false;
        channelsUpdated.forEach(ch => {
            const key = String(ch).toLowerCase();
            if (epgCache[key]) {
                delete epgCache[key];
            }
            if (epgLoadingSet.has(key)) {
                epgLoadingSet.delete(key);
            }
            needsFetch = true;
        });

        if (needsFetch) {
            const visible = getVisibleChannels();
            if (visible.length > 0) {
                // Fetch new data for visible channels from SQLite progressively
                fetchEpgDataForChannels(visible);
            }
        }
    });
}
