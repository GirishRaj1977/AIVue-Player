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
        embedStream(visibleChannels[idx - 1], 'nearest');
    } else if (idx === 0 && visibleChannels.length > 0) {
        embedStream(visibleChannels[visibleChannels.length - 1], 'nearest'); // Wrap around
    } else if (idx === -1 && visibleChannels.length > 0) {
        embedStream(visibleChannels[0], 'nearest');
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
        embedStream(visibleChannels[idx + 1], 'nearest');
    } else if (idx === visibleChannels.length - 1 && visibleChannels.length > 0) {
        embedStream(visibleChannels[0], 'nearest'); // Wrap around
    } else if (idx === -1 && visibleChannels.length > 0) {
        embedStream(visibleChannels[0], 'nearest');
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
            if (window.isAppFullscreen) {
                window.iptvAPI.toggleFullscreen();
            }

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
        case 'vod':
            switchTab('vod', document.getElementById('btn-vod'));
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
    toast.style.cssText = 'position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%) translateY(20px); background: rgba(18, 18, 24, 0.85); color: #ffffff; border: 1px solid rgba(187, 134, 252, 0.45); padding: 22px 28px; border-radius: 16px; z-index: 2147483647; font-family: "Inter", sans-serif; box-shadow: 0 10px 30px rgba(187, 134, 252, 0.15), 0 5px 15px rgba(0,0,0,0.5); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); transition: opacity 0.3s cubic-bezier(0.25, 0.8, 0.25, 1), transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1); opacity: 0; display: flex; flex-direction: column; gap: 14px; align-items: center; pointer-events: auto; min-width: 320px; text-align: center;';
    toast.innerHTML = `
        <div style="font-weight: 700; color: #bb86fc; font-size: 1.1em; letter-spacing: -0.01em;">New Remote Connection</div>
        <div style="font-size: 0.9em; color: #e4e4e7; line-height: 1.45; letter-spacing: -0.01em; margin-bottom: 6px;">A new device is trying to connect.<br>Allow the new device and disconnect the old one?</div>
        <div style="display: flex; gap: 12px; width: 100%; justify-content: center;">
            <button id="btn-remote-allow" style="background: linear-gradient(135deg, #03dac6, #018786); color: #000; border: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; cursor: pointer; transition: background 0.2s, transform 0.1s; font-family: 'Inter', sans-serif; font-size: 0.85em; flex: 1;">Allow</button>
            <button id="btn-remote-deny" style="background: #2a2a2a; color: #fff; border: 1px solid #444; padding: 10px 20px; border-radius: 8px; font-weight: bold; cursor: pointer; transition: background 0.2s, transform 0.1s; font-family: 'Inter', sans-serif; font-size: 0.85em; flex: 1;">Keep Old</button>
        </div>
    `;
    document.body.appendChild(toast);
    
    requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(-50%) translateY(0)';
    });
    
    const allowBtn = document.getElementById('btn-remote-allow');
    const denyBtn = document.getElementById('btn-remote-deny');
    
    allowBtn.addEventListener('mouseover', () => allowBtn.style.background = 'linear-gradient(135deg, #66fff9, #03dac6)');
    allowBtn.addEventListener('mouseout', () => allowBtn.style.background = 'linear-gradient(135deg, #03dac6, #018786)');
    allowBtn.addEventListener('mousedown', () => allowBtn.style.transform = 'scale(0.95)');
    allowBtn.addEventListener('mouseup', () => allowBtn.style.transform = 'scale(1)');
    
    denyBtn.addEventListener('mouseover', () => denyBtn.style.background = '#383838');
    denyBtn.addEventListener('mouseout', () => denyBtn.style.background = '#2a2a2a');
    denyBtn.addEventListener('mousedown', () => denyBtn.style.transform = 'scale(0.95)');
    denyBtn.addEventListener('mouseup', () => denyBtn.style.transform = 'scale(1)');
    
    allowBtn.addEventListener('click', () => {
        window.iptvAPI.sendRemoteOverrideResponse(true);
        toast.style.pointerEvents = 'none';
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(20px)';
        if (document.activeElement) document.activeElement.blur();
        setTimeout(() => toast.remove(), 300);
    });
    
    denyBtn.addEventListener('click', () => {
        window.iptvAPI.sendRemoteOverrideResponse(false);
        toast.style.pointerEvents = 'none';
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(20px)';
        if (document.activeElement) document.activeElement.blur();
        setTimeout(() => toast.remove(), 300);
    });

    setTimeout(() => {
        if (denyBtn) denyBtn.focus();
    }, 50);
});
