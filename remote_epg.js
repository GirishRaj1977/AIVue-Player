document.addEventListener('DOMContentLoaded', () => {
    let allChannels = [];
    let channelMappings = {};
    let savedPlaylists = [];
    let savedReminders = [];

    let epgGridState = null;
    let epgChannelsToRender = [];
    let epgCache = {};
    let epgLoadingSet = new Set();
    let epgLastStartIndex = -1;
    let epgLastEndIndex = -1;
    let epgLastScrollLeft = -1;
    let epgScrollTicking = false;
    
    let epgSelectedPlaylist = 'all';
    let epgSelectedGroup = 'all';
    let searchQuery = '';

    const contentArea = document.getElementById('epg-content-area');
    const playlistFilter = document.getElementById('epg-playlist-filter');
    const groupFilter = document.getElementById('epg-group-filter');
    const searchInput = document.getElementById('epg-search');
    const nowBtn = document.getElementById('epg-now-btn');
    const toast = document.getElementById('toast');

    function showToast(msg) {
        if (toast.hideTimeout) clearTimeout(toast.hideTimeout);
        toast.innerText = msg;
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(-50%) translateY(0)';
        toast.hideTimeout = setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(-50%) translateY(20px)';
        }, 3000);
    }

    function sortAlphaNum(a, b) {
        return (a || '').toString().localeCompare((b || '').toString(), undefined, { numeric: true, sensitivity: 'base' });
    }

    function parseEpgTime(timeStr) {
        if (!timeStr || timeStr.length < 14) return new Date();
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

    function formatDateToEpgString(date) {
        const pad = n => n.toString().padStart(2, '0');
        return `${date.getUTCFullYear()}${pad(date.getUTCMonth()+1)}${pad(date.getUTCDate())}${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}`;
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
        
        try {
            const response = await fetch('/api/epg', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: epgIdsArr, start: startLimit, end: endLimit })
            });
            const epgData = await response.json();
            
            Object.keys(epgData).forEach(id => {
                epgCache[id] = epgData[id] || [];
            });

            epgIdsArr.forEach(id => {
                if (!epgCache[id]) epgCache[id] = [];
            });
            
            renderVisibleEpgRows(true);
        } catch(e) { console.error(e); }
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
        
        // Pinned elements are handled naturally via CSS sticky and absolute height: 100%

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

            const topPos = i * rowHeight;
            const safeTitle = (channel.title || 'Unknown Channel').replace(/</g, "&lt;").replace(/>/g, "&gt;");
            const imgSrc = (channel.logo && channel.logo.trim() !== '') ? channel.logo : '/player.png';
            
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

                        if (right < viewStartPx || left > viewEndPx) continue;
                        
                        const isCurrent = (now >= pStart && now <= pEnd);
                        const pTitle = (prog.title || 'Unknown').replace(/</g, "&lt;").replace(/>/g, "&gt;");
                        const timeStr = `${pStart.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - ${pEnd.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
                        
                        const progData = { title: pTitle, timeStr: timeStr, desc: (prog.desc||'') };

                        const isFuture = pStart > now;
                        const isReminderSet = savedReminders.some(r => r.progTitle === prog.title && r.startTime === prog.start && r.channelTitle === channel.title);
                        const reminderStyle = isReminderSet ? 'opacity: 1; filter: drop-shadow(0 0 4px #bb86fc);' : 'opacity: 0.3; filter: grayscale(100%);';
                        const reminderHtml = isFuture ? `<span class="reminder-btn-full" data-channel='${JSON.stringify(channel).replace(/'/g, "&apos;")}' data-prog='${JSON.stringify(prog).replace(/'/g, "&apos;")}' style="cursor: pointer; margin-right: 4px; display: inline-block; transition: 0.2s; ${reminderStyle}" title="Set/Remove Reminder">🔔</span>` : '';
                        const borderCol = isCurrent ? '#bb86fc' : 'transparent';

                        programsHtml += `
                        <div class="epg-play-channel epg-program-cell" data-channel='${JSON.stringify(channel).replace(/'/g, "&apos;")}' data-program='${JSON.stringify(progData).replace(/'/g, "&apos;")}' style="position: absolute; left: ${left}px; top: 0; width: ${width}px; height: 45px; background: ${isCurrent ? '#2c2c2c' : '#1e1e1e'}; border-right: 1px solid rgba(255, 255, 255, 0.15); border-top: 2px solid ${borderCol}; border-bottom: 1px solid rgba(255, 255, 255, 0.15); box-sizing: border-box; padding: 2px 4px; overflow: hidden;">
                            <div style="font-size: 0.85em; font-weight: bold; color: ${isCurrent ? '#fff' : '#ccc'}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${reminderHtml}${pTitle}</div>
                            <div style="font-size: 0.75em; color: #888; margin-top: 4px;">${timeStr}</div>
                        </div>`;
                    }
                } else {
                    programsHtml = `<div class="epg-play-channel" data-channel='${JSON.stringify(channel).replace(/'/g, "&apos;")}' style="position: absolute; top: 0; left: 0; display: flex; align-items: center; padding-left: 20px; height: 45px; border-bottom: 1px solid rgba(255, 255, 255, 0.15); box-sizing: border-box; color: #555; font-size: 0.9em; width: 100%;">No EPG Data</div>`;
                }
            } else {
                programsHtml = `<div style="position: absolute; top: 0; left: 0; display: flex; align-items: center; padding-left: 20px; height: 45px; border-bottom: 1px solid rgba(255, 255, 255, 0.15); box-sizing: border-box; color: #888; font-size: 0.9em; width: 100%;">Loading...</div>`;
            }
            
            channelsHtml += `
            <div class="epg-play-channel" data-channel='${JSON.stringify(channel).replace(/'/g, "&apos;")}' style="position: absolute; top: ${topPos}px; left: 0; width: 120px; height: 45px; background: #1e1e1e; border-bottom: 1px solid rgba(255, 255, 255, 0.15); border-top: 1px solid rgba(255, 255, 255, 0.15); border-right: 1px solid rgba(255, 255, 255, 0.15); display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 3px; box-sizing: border-box; text-align: center;">
                <img src="${imgSrc}" style="height: 18px; max-width: 100%; object-fit: contain; margin-bottom: 2px; border-radius: 2px; background: #2A2A2A; padding: 2px;">
                <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 0.65em; font-weight: bold; color: #e0e0e0; width: 100%;" title="${safeTitle}">${safeTitle}</span>
            </div>`;
            
            gridHtml += `<div style="position: absolute; top: ${topPos}px; left: 0; width: ${totalWidth}px; height: 45px;">${programsHtml}</div>`;
        }
        
        channelsInner.innerHTML = channelsHtml;
        rowsLayer.innerHTML = gridHtml;

        if (channelsToFetch.length > 0) {
            fetchEpgDataForChannels(channelsToFetch);
        }
    }

    function onEpgScroll() {
        if (!epgScrollTicking) {
            window.requestAnimationFrame(() => {
                renderVisibleEpgRows();
                epgScrollTicking = false;
            });
            epgScrollTicking = true;
        }
    }

    async function renderFullEpg() {
        contentArea.classList.remove('loader');
        epgChannelsToRender = allChannels.filter(channel => {
            if (epgSelectedPlaylist === 'favs' && !channel.favourite) return false;
            if (epgSelectedPlaylist !== 'all' && epgSelectedPlaylist !== 'favs' && String(channel.playlistId) !== String(epgSelectedPlaylist)) return false;
            const channelGroup = channel.group || 'Uncategorized';
            if (epgSelectedGroup !== 'all' && channelGroup !== epgSelectedGroup) return false;
            if (searchQuery && !channel.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
            return true;
        });

        const pxPerMinute = 10;
        const hourWidth = 60 * pxPerMinute;
        const now = new Date();
        const gridStart = new Date(now.getTime());
        gridStart.setMinutes(0, 0, 0);
        gridStart.setHours(gridStart.getHours() - 1); // -1 hour
        const gridEnd = new Date(gridStart.getTime() + 9 * 60 * 60 * 1000); // +8 hours from now (9 hours total duration)
        const totalWidth = 9 * hourWidth;

        epgGridState = { gridStart, gridEnd, totalWidth, pxPerMinute, now };
        epgLastStartIndex = -1;
        epgLastEndIndex = -1;
        epgLastScrollLeft = -1;
        // Clear cache for fresh data
        epgCache = {};
        epgLoadingSet.clear();

        let headerHtml = '';
        for (let i = 0; i < 9; i++) {
            const headerTime = new Date(gridStart.getTime() + i * 60 * 60 * 1000);
            const timeStr = headerTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            headerHtml += `<div style="position: absolute; left: ${i * hourWidth}px; width: ${hourWidth}px; height: 100%; border-right: 1px solid rgba(0,0,0,0.2); display: flex; align-items: center; padding-left: 10px; color: #000; font-weight: bold; box-sizing: border-box; font-size: 0.8em;">${timeStr}</div>`;
        }

        const minutesSinceStart = (now.getTime() - gridStart.getTime()) / 60000;
        const nowPx = minutesSinceStart * pxPerMinute;
        let redLineHtml = (nowPx > 0 && nowPx < totalWidth) ? `<div id="epg-time-indicator" style="position: absolute; left: ${nowPx}px; top: 0; height: 100%; width: 2px; background: #cf6679; z-index: 5; pointer-events: none;"></div>` : '';

        contentArea.innerHTML = `
            <div id="epg-layout-wrapper" style="height: 100%; display: flex; flex-direction: column;">
                <div id="epg-scroll-container" style="flex-grow: 1; overflow: auto; position: relative;">
                    <!-- Sticky Header Row -->
                    <div id="epg-header-row" style="position: sticky; top: 0; z-index: 20; display: flex; width: ${totalWidth + 120}px; background: #bb86fc; flex-shrink: 0; height: 30px; overflow: visible !important; border-bottom: 2px solid #333; box-sizing: border-box;">
                        <div id="epg-channels-header" style="position: sticky; left: 0; z-index: 30; width: 120px; min-width: 120px; background: #bb86fc; border-right: 1px solid rgba(255, 255, 255, 0.15); display: flex; align-items: center; justify-content: center; font-weight: bold; color: #000; box-sizing: border-box; height: 100%; font-size: 0.9em;">Channels</div>
                        <div id="epg-header-inner" style="position: relative; flex-grow: 1; height: 100%;">${headerHtml}</div>
                    </div>
                    <!-- Main Content Flex Row -->
                    <div id="epg-main-content" style="display: flex; position: relative; width: ${totalWidth + 120}px; height: ${epgChannelsToRender.length * 45}px; overflow: visible !important;">
                        <div id="epg-channels-col" style="position: sticky; left: 0; z-index: 10; width: 120px; min-width: 120px; background: #1a1a1a; border-right: 1px solid rgba(255, 255, 255, 0.15); height: 100%;">
                            <div id="epg-channels-inner" style="position: relative; width: 100%; height: 100%;"></div>
                        </div>
                        <div id="epg-grid-inner" style="position: relative; flex-grow: 1; height: 100%;">
                            <div id="epg-rows-layer"></div>
                            ${redLineHtml}
                        </div>
                    </div>
                </div>
            </div>`;
        
        const scrollContainer = document.getElementById('epg-scroll-container');
        scrollContainer.addEventListener('scroll', onEpgScroll);

        renderVisibleEpgRows(true);

        const targetScroll = Math.max(0, nowPx - (30 * pxPerMinute));
        scrollContainer.scrollLeft = targetScroll;
        setTimeout(() => { scrollContainer.scrollLeft = targetScroll; }, 50);
        setTimeout(() => { scrollContainer.scrollLeft = targetScroll; }, 150);
        nowBtn.onclick = () => { scrollContainer.scrollTo({ left: targetScroll, behavior: 'smooth' }); };
    }

    async function initializeApp() {
        const [channelsRes, mappingsRes, remindersRes] = await Promise.all([
            fetch('/api/channels'),
            fetch('/api/mappings'),
            fetch('/api/reminders')
        ]);
        allChannels = await channelsRes.json();
        channelMappings = await mappingsRes.json();
        try {
            savedReminders = await remindersRes.json();
        } catch(e) {
            savedReminders = [];
        }

        savedPlaylists = allChannels.reduce((acc, ch) => {
            let playlist = acc.find(p => p.id === ch.playlistId);
            if (!playlist) {
                playlist = { id: ch.playlistId, name: ch.playlistName, channels: [] };
                acc.push(playlist);
            }
            playlist.channels.push(ch);
            return acc;
        }, []);
        savedPlaylists.sort((a,b) => sortAlphaNum(a.name, b.name));

        playlistFilter.innerHTML = '<option value="all">All Playlists</option><option value="favs">Favourites</option>';
        savedPlaylists.forEach(p => {
            playlistFilter.innerHTML += `<option value="${p.id}">${p.name}</option>`;
        });

        playlistFilter.addEventListener('change', (e) => {
            epgSelectedPlaylist = e.target.value;
            epgSelectedGroup = 'all';
            updateGroupFilter();
            renderFullEpg();
        });
        groupFilter.addEventListener('change', (e) => {
            epgSelectedGroup = e.target.value;
            renderFullEpg();
        });
        
        let debounceTimer;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(debounceTimer);
            searchQuery = e.target.value;
            debounceTimer = setTimeout(() => {
                renderFullEpg();
            }, 300);
        });

        updateGroupFilter();
        renderFullEpg();
        
        // Auto update red line
        setInterval(() => {
            const timeIndicator = document.getElementById('epg-time-indicator');
            if (timeIndicator && epgGridState) {
                const newNow = new Date();
                const minutesSinceStart = (newNow.getTime() - epgGridState.gridStart.getTime()) / 60000;
                const nowPx = minutesSinceStart * epgGridState.pxPerMinute;
                timeIndicator.style.left = `${nowPx}px`;
                epgGridState.now = newNow;
            }
        }, 60000);
    }

    function updateGroupFilter() {
        let epgGroupOptions = new Set();
        allChannels.forEach(c => {
            if (epgSelectedPlaylist === 'favs' && !c.favourite) return;
            if (epgSelectedPlaylist !== 'all' && epgSelectedPlaylist !== 'favs' && String(c.playlistId) !== String(epgSelectedPlaylist)) return;
            epgGroupOptions.add(c.group || 'Uncategorized');
        });
        const sortedEpgGroups = Array.from(epgGroupOptions).sort(sortAlphaNum);
        
        groupFilter.innerHTML = `<option value="all">All Groups</option>`;
        sortedEpgGroups.forEach(g => {
            groupFilter.innerHTML += `<option value="${g.replace(/"/g, '&quot;')}" ${epgSelectedGroup === g ? 'selected' : ''}>${g.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</option>`;
        });
    }
    
    document.getElementById('modal-close-btn').addEventListener('click', () => {
        document.getElementById('program-modal').style.display = 'none';
    });

    async function toggleReminder(channel, program) {
        const reminder = {
            channelTitle: channel.title,
            progTitle: program.title,
            startTime: program.start,
            stopTime: program.stop
        };

        const existingIdx = savedReminders.findIndex(r => r.channelTitle === reminder.channelTitle && r.progTitle === reminder.progTitle && r.startTime === reminder.startTime);
        if (existingIdx >= 0) {
            savedReminders.splice(existingIdx, 1);
        } else {
            savedReminders.push({ ...reminder, notified: false });
        }

        await fetch('/api/toggle-reminder', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(reminder)
        });
    }

    contentArea.addEventListener('click', async (e) => {
        const reminderBtn = e.target.closest('.reminder-btn-full');
        if (reminderBtn) {
            e.stopPropagation();
            const channelData = JSON.parse(reminderBtn.dataset.channel);
            const progData = JSON.parse(reminderBtn.dataset.prog);
            
            await toggleReminder(channelData, progData);

            const isSet = savedReminders.some(r => r.progTitle === progData.title && r.startTime === progData.start && r.channelTitle === channelData.title);
            if (isSet) {
                reminderBtn.style.opacity = '1';
                reminderBtn.style.filter = 'drop-shadow(0 0 4px #bb86fc)';
                showToast('Reminder Set: ' + progData.title);
            } else {
                reminderBtn.style.opacity = '0.3';
                reminderBtn.style.filter = 'grayscale(100%)';
                showToast('Reminder Removed');
            }
            return;
        }

        const programCell = e.target.closest('.epg-program-cell');
        const playChannelEl = e.target.closest('.epg-play-channel');
        
        if (programCell) {
            const internalReminderBtn = programCell.querySelector('.reminder-btn-full');
            if (internalReminderBtn) {
                internalReminderBtn.click();
                return;
            }

            const channelData = JSON.parse(programCell.dataset.channel);
            const progData = JSON.parse(programCell.dataset.program);
            
            document.getElementById('modal-prog-title').innerText = progData.title;
            document.getElementById('modal-prog-channel').innerText = `${channelData.title} • ${progData.timeStr}`;
            document.getElementById('modal-prog-desc').innerText = progData.desc || 'No description available.';
            document.getElementById('program-modal').style.display = 'flex';
            
            document.getElementById('modal-watch-btn').onclick = async () => {
                document.getElementById('program-modal').style.display = 'none';
                showToast(`Playing ${channelData.title} on TV...`);
                await fetch('/api/play', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: channelData.url, title: channelData.title }) });
            };
        } else if (playChannelEl && !programCell) {
            const channelData = JSON.parse(playChannelEl.dataset.channel);
            if (channelData) {
                showToast(`Playing ${channelData.title} on TV...`);
                await fetch('/api/play', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: channelData.url, title: channelData.title }) });
            }
        }
    });

    initializeApp();
});