// UI Channels List Renderer
// Renders the list of channels/favourite lists dynamically in the sidebar.

window.getMiniEqualizerHtml = function() {
    return `
        <div class="mini-equalizer" title="Playing">
            <span></span>
            <span></span>
            <span></span>
        </div>
    `;
};

window.isSamePlaybackChannel = function(a, b) {
    if (!a || !b) return false;
    const aUrl = a.url || a.stream_url || '';
    const bUrl = b.url || b.stream_url || '';
    return aUrl === bUrl &&
        (a.title || 'Unknown Channel') === (b.title || 'Unknown Channel') &&
        String(a.playlistId || a.playlist_id || '') === String(b.playlistId || b.playlist_id || '');
};

window.refreshCurrentPlayingChannelIndex = function() {
    if (!streamActive || !window.currentPlaybackChannel) return;
    const resolvedIndex = allChannels.findIndex(channel => isSamePlaybackChannel(channel, window.currentPlaybackChannel));
    if (resolvedIndex >= 0) currentPlayingChannelIndex = resolvedIndex;
};

window.isPlayingChannel = function(channel, index) {
    if (!streamActive || currentPlayingChannelIndex < 0) return false;
    if (index === currentPlayingChannelIndex) return true;
    return isSamePlaybackChannel(channel, window.currentPlaybackChannel);
};

window.clearPlayingChannelIndicator = function() {
    document.querySelectorAll('.channel-item.active').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.channel-item .mini-equalizer').forEach(el => el.remove());
};

window.updatePlayingChannelIndicator = function(options = {}) {
    if (window.refreshCurrentPlayingChannelIndex) window.refreshCurrentPlayingChannelIndex();
    if (window.clearPlayingChannelIndicator) window.clearPlayingChannelIndicator();
    if (!streamActive || currentPlayingChannelIndex < 0) return;

    const activeEl = document.querySelector(`.channel-item[data-index="${currentPlayingChannelIndex}"]`);
    if (!activeEl) return;

    activeEl.classList.add('active');
    const favBtn = activeEl.querySelector('.fav-btn');
    if (favBtn) {
        favBtn.insertAdjacentHTML('beforebegin', window.getMiniEqualizerHtml());
    } else {
        activeEl.insertAdjacentHTML('beforeend', window.getMiniEqualizerHtml());
    }

    if (options.scroll) {
        setTimeout(() => {
            activeEl.scrollIntoView({ behavior: 'smooth', block: options.block || 'nearest' });
        }, 100);
    }
};

window.renderChannels = function() {
    if (window.refreshCurrentPlayingChannelIndex) window.refreshCurrentPlayingChannelIndex();
    const filterSelect = document.getElementById('playlist-filter');
    const filterVal = filterSelect ? filterSelect.value : 'all';

    const channelSearch = document.getElementById('channel-search');
    const searchVal = channelSearch ? channelSearch.value.toLowerCase() : '';

    const expandedKey = JSON.stringify([...window.expandedGroups]);
    const renderKey   = `${filterVal}|${searchVal}|${expandedKey}|${allChannels.length}|${currentPlayingChannelIndex}`;
    if (window.renderChannels._lastKey === renderKey) return;
    window.renderChannels._lastKey = renderKey;

    console.log('[UI] Rendering channel list.');

    let flattenedItems = [];

    if (filterVal === 'favs') {
        const favsList = [];
        allChannels.forEach((channel, index) => {
            if (!channel.favourite) return;
            const rawTitle = channel.title || 'Unknown Channel';
            if (searchVal && !rawTitle.toLowerCase().includes(searchVal)) return;
            favsList.push({ channel, index, type: 'channel' });
        });

        favsList.sort((a, b) => sortAlphaNum(a.channel.title || '', b.channel.title || ''));
        flattenedItems = favsList;
    } else {
        const groupedChannels = {};

        allChannels.forEach((channel, index) => {
            if (filterVal !== 'all' && String(channel.playlistId) !== String(filterVal)) return;

            const rawTitle = channel.title || 'Unknown Channel';
            if (searchVal && !rawTitle.toLowerCase().includes(searchVal)) return;

            const rawGroup = channel.group || 'Uncategorized';
            const channelGroup = rawGroup.trim();
            let groupKey = channelGroup;
            const existingKey = Object.keys(groupedChannels).find(k => k.toLowerCase() === channelGroup.toLowerCase());
            if (existingKey) {
                groupKey = existingKey;
            }
            if (!groupedChannels[groupKey]) {
                groupedChannels[groupKey] = [];
            }
            groupedChannels[groupKey].push({ channel, index });
        });

        const sortedGroups = Object.keys(groupedChannels).sort(sortAlphaNum);

        sortedGroups.forEach(groupName => {
            const channelsInGroup = groupedChannels[groupName];
            const isExpanded = searchVal ? true : window.expandedGroups.has(groupName);
            flattenedItems.push({ type: 'group', groupName, count: channelsInGroup.length, isExpanded });
            
            if (isExpanded) {
                channelsInGroup.forEach(({ channel, index }) => {
                    const playlist = window.savedPlaylists ? window.savedPlaylists.find(p => String(p.id) === String(channel.playlistId)) : null;
                    const playlistName = playlist ? playlist.name : '';
                    flattenedItems.push({ type: 'channel', channel, index, playlistName, filterVal });
                });
            }
        });
    }

    if (flattenedItems.length === 0) {
        flattenedItems.push({ type: 'empty' });
    }

    let html = '';
    flattenedItems.forEach(item => {
        if (item.type === 'group') {
            const safeGroupName = item.groupName.replace(/</g, "&lt;").replace(/>/g, "&gt;");
            const expandIcon = item.isExpanded ? '▼' : '▶';
            const attrGroupName = String(item.groupName).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            
            html += `<div class="group-item" data-group="${attrGroupName}" tabindex="0">
                        <span>${safeGroupName} <span style="color:#888;font-size:0.8em;font-weight:normal;">(${item.count})</span></span>
                        <span class="group-expand-icon" style="color:#888;font-size:0.8em;">${expandIcon}</span>
                     </div>`;
        } else if (item.type === 'channel') {
            const channel = item.channel;
            const index = item.index;
            const rawTitle = channel.title || 'Unknown Channel';
            const safeTitle = rawTitle.replace(/</g, "&lt;").replace(/>/g, "&gt;");
            const imgSrc = (channel.logo && channel.logo.trim() !== '') ? channel.logo : 'assets/logo.ico';
            const playlistBadge = (item.filterVal === 'all' && item.playlistName) ? ` <span style="color: #666; font-size: 0.8em; font-weight: 500; margin-left: 4px;">[${item.playlistName}]</span>` : '';
            
            const activeClass = window.isPlayingChannel && isPlayingChannel(channel, index) ? ' active' : '';
            const eqHtml = window.isPlayingChannel && isPlayingChannel(channel, index) ? window.getMiniEqualizerHtml() : '';
            const favClass = channel.favourite ? 'fav-btn active' : 'fav-btn';
            const favBtnHtml = `<button class="${favClass}" data-fav-index="${index}" title="Toggle Favourite"><svg viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg></button>`;
            
            html += `<div class="channel-item${activeClass}" data-index="${index}" title="${safeTitle.replace(/"/g, '&quot;')}" tabindex="0">
                        <img src="${imgSrc}" onerror="this.onerror=null;this.src='assets/logo.ico';">
                        <span style="flex-grow: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding-right: 4px;">${safeTitle}${playlistBadge}</span>
                        ${eqHtml}
                        ${favBtnHtml}
                     </div>`;
        } else if (item.type === 'empty') {
            html += `<div style="padding: 20px; color: #888; text-align: center;">No channels found.</div>`;
        }
    });

    const listEl = document.getElementById('channel-list');
    if (listEl) {
        listEl.innerHTML = html;
    }
    
    if (window.updatePlayingChannelIndicator) window.updatePlayingChannelIndicator();
};
