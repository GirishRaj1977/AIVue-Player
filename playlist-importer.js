async function processAndImportPlaylist(tempPlaylist, result, isStalker) {
    let channels = tempPlaylist.channels || [];
    if (isStalker) {
        // Find the first ITV category
        const itvCats = channels.filter(c => c.type === 'itv_category');
        if (itvCats.length === 0) {
            hideGlobalSpinner();
            showToast("Cannot fetch channels (no categories found).");
            switchTab('playlist', document.getElementById('btn-playlist'));
            return;
        }
        
        // Sort ITV categories to get the first one
        itvCats.sort((a, b) => sortAlphaNum(a.title, b.title));
        const firstCat = itvCats[0];
        const mac = tempPlaylist.epg.substring(8);
        
        try {
            console.log('[PLAYLIST] Pre-fetching channels for first Stalker category:', firstCat.title);
            const fetched = await window.iptvAPI.loadStalkerCategory({
                url: tempPlaylist.source,
                mac: mac,
                categoryId: firstCat.tvg_id,
                categoryType: 'itv',
                categoryName: firstCat.title,
                isSeries: false
            });
            
            if (!fetched || fetched.length === 0) {
                throw new Error("Received empty channels list from server.");
            }
            
            // Add the fetched channels to tempPlaylist.channels
            fetched.forEach(newCh => {
                newCh.disabled = true;
                newCh.isNew = true;
                tempPlaylist.channels.push(newCh);
            });
        } catch (err) {
            console.error('[PLAYLIST] Failed to fetch Stalker first category channels:', err);
            hideGlobalSpinner();
            showToast("Cannot fetch channels.");
            switchTab('playlist', document.getElementById('btn-playlist'));
            return;
        }
    } else {
        // For M3U / Xtream, channels are already fetched.
        const liveChannels = channels.filter(c => c.type !== 'movie' && c.type !== 'series' && c.type !== 'movie_category' && c.type !== 'vod_category' && c.type !== 'series_category');
        if (liveChannels.length === 0) {
            hideGlobalSpinner();
            showToast("Cannot fetch channels.");
            switchTab('playlist', document.getElementById('btn-playlist'));
            return;
        }
    }
    
    hideGlobalSpinner();
    openManageChannelsModal(-1, tempPlaylist);
}

async function addPlaylist(source, customName, epgSource, editIndex = -1) {
    console.log('[PLAYLIST] Adding/editing playlist:', { source, customName, epgSource, editIndex });
    showGlobalSpinner("Authenticating...");
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
            hideGlobalSpinner();
            showToast(`Authentication failed.\nReason: ${result.error}`);
            switchTab('playlist', document.getElementById('btn-playlist'));
            return false;
        } else if (!result || (!Array.isArray(result) && !result.channels)) {
            hideGlobalSpinner();
            showToast(`Authentication failed.\nReason: Received invalid data from source.`);
            switchTab('playlist', document.getElementById('btn-playlist'));
            return false;
        } else {
            let channels = Array.isArray(result) ? result : result.channels;
            let finalEpgSource = epgSource || 'Not Configured';
            
            if (!isStalker && (!epgSource || epgSource === 'Not Configured') && result.epg_url) {
                finalEpgSource = result.epg_url;
            }

            if (isStalker && editIndex >= 0 && savedPlaylists[editIndex] && savedPlaylists[editIndex].channels) {
                const existingLive = savedPlaylists[editIndex].channels.filter(c => 
                    c.type !== 'itv_category' && 
                    c.type !== 'vod_category' && 
                    c.type !== 'movie_category' && 
                    c.type !== 'series_category'
                );
                channels = [...channels, ...existingLive];
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
                        const isVod = newCh.type === 'movie' || newCh.type === 'series' || newCh.type === 'movie_category' || newCh.type === 'vod_category' || newCh.type === 'series_category';
                        newCh.disabled = isVod ? false : true;
                        if (!isVod) {
                            newCh.isNew = true;
                            newCount++;
                        }
                    }
                });
                if (newCount > 0) showToast(`Update complete: Found ${newCount} new channels.`);
            } else {
                channels.forEach(newCh => {
                    const isVod = newCh.type === 'movie' || newCh.type === 'series' || newCh.type === 'movie_category' || newCh.type === 'vod_category' || newCh.type === 'series_category';
                    newCh.disabled = isVod ? false : true;
                    if (!isVod) newCh.isNew = true;
                });
            }

            const tempPlaylist = {
                id: editIndex >= 0 ? savedPlaylists[editIndex].id : (Date.now() + Math.random()),
                source: source,
                name: customName,
                channels: channels,
                epg: finalEpgSource,
                disabled: false,
                editIndex: editIndex,
                exp_date: result.exp_date || null
            };
            
            await processAndImportPlaylist(tempPlaylist, result, isStalker);
            return 'pending';
        }
    } catch (err) {
        hideGlobalSpinner();
        showToast(`UI Error (${source}):\n${err.message}`);
        switchTab('playlist', document.getElementById('btn-playlist'));
        return false;
    }
}

// Tab Switching for "Add Playlist"
const playlistTabs = document.querySelectorAll('.playlist-tab-btn');
const playlistContents = document.querySelectorAll('.playlist-tab-content');

playlistTabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
        e.preventDefault();
        playlistTabs.forEach(t => t.classList.remove('active'));
        playlistContents.forEach(c => {
            c.style.display = 'none';
        });
        
        tab.classList.add('active');
        const targetId = tab.id.replace('tab-', 'content-');
        const targetEl = document.getElementById(targetId);
        if (targetEl) {
            targetEl.style.display = 'flex';
        }
    });
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
            
            // Auto-detect Xtream Codes URL pasted in the M3U box using robust URL and URLSearchParams parsing
            let isXtreamUrl = false;
            let server = '';
            let username = '';
            let password = '';
            try {
                const parsedUrl = new URL(source);
                if (parsedUrl.pathname.endsWith('/get.php') || parsedUrl.pathname.endsWith('/player_api.php')) {
                    const params = parsedUrl.searchParams;
                    if (params.has('username') && params.has('password')) {
                        server = `${parsedUrl.protocol}//${parsedUrl.host}`;
                        username = params.get('username');
                        password = params.get('password');
                        isXtreamUrl = true;
                    }
                }
            } catch (err) {
                // Fallback to regex pattern matching for potentially non-standard URLs
                const urlPattern = /^(https?:\/\/[^/]+)\/(?:get|player_api)\.php\?(?:.*&)?username=([^&]+)(?:.*&)?password=([^&]+)/i;
                const match = source.match(urlPattern);
                if (match) {
                    server = match[1];
                    username = match[2];
                    password = match[3];
                    isXtreamUrl = true;
                }
            }

            if (isXtreamUrl && server && username && password) {
                console.log('[AUTO FALLBACK] Detected Xtream Codes URL in M3U box! Parsing as Xtream Codes portal in background:', server, username);
                
                showGlobalSpinner("Authenticating...");
                
                try {
                    const result = await window.iptvAPI.parseXtream({ name, server, username, password });
                    
                    if (result && result.error) {
                        hideGlobalSpinner();
                        showToast(`Fallback authentication failed.\nReason: ${result.error}`);
                        switchTab('playlist', document.getElementById('btn-playlist'));
                        return;
                    }
                    
                    if (!result || !result.channels) {
                        hideGlobalSpinner();
                        showToast(`Fallback failed.\nReason: Received invalid data from server.`);
                        switchTab('playlist', document.getElementById('btn-playlist'));
                        return;
                    }
                    
                    let channels = result.channels;
                    channels.forEach(newCh => {
                        const isVod = newCh.type === 'movie' || newCh.type === 'series';
                        newCh.disabled = isVod ? false : true;
                        if (!isVod) newCh.isNew = true;
                    });
                    
                    const tempPlaylist = {
                        id: Date.now() + Math.random(),
                        source: `xtream-credentials:${server}|${username}|${password}`,
                        name: name,
                        channels: channels,
                        epg: result.epg_url || ('xtream-epg:' + server),
                        disabled: false,
                        editIndex: -1,
                        exp_date: result.exp_date || null
                    };
                    
                    // Clear inputs
                    importNameInput.value = '';
                    importUrlPath.value = '';
                    if (importEpgInput) importEpgInput.value = '';
                    
                    await processAndImportPlaylist(tempPlaylist, result, false);
                    return;
                } catch (err) {
                    hideGlobalSpinner();
                    showToast(`Fallback failed:\n${err.message}`);
                    switchTab('playlist', document.getElementById('btn-playlist'));
                    return;
                }
            }
        }
        
        const success = await addPlaylist(source, name, epgSource, editingPlaylistIndex);
        
        if (success && success !== 'pending') {
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
        
        const success = await addPlaylist(source, name, epgSource, editingPlaylistIndex);
        
        if (success && success !== 'pending') {
            editingPlaylistIndex = -1;
            if (importStalkerCancelBtn) importStalkerCancelBtn.style.display = 'none';
            if (importStalkerName) importStalkerName.value = '';
            if (importStalkerUrl) importStalkerUrl.value = '';
            if (importStalkerMac) importStalkerMac.value = '';
        }
    });
}

if (importXtremeSubmitBtn) {
    importXtremeSubmitBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        
        const name = importXtremeName.value.trim();
        const rawUrl = importXtremeUrl.value.trim();
        const user = importXtremeUser.value.trim();
        const pass = importXtremePass.value.trim();
        
        if (!name) {
            showToast('Please enter a playlist name.');
            return;
        }
        if (!rawUrl) {
            showToast('Please enter the server URL.');
            return;
        }
        
        let server = rawUrl;
        let username = user;
        let password = pass;
        
        // Robust standard URL & URLSearchParams parser for extracting credentials if a full URL is pasted
        try {
            const parsedUrl = new URL(rawUrl);
            if (parsedUrl.pathname.endsWith('/get.php') || parsedUrl.pathname.endsWith('/player_api.php')) {
                const params = parsedUrl.searchParams;
                if (params.has('username') && params.has('password')) {
                    server = `${parsedUrl.protocol}//${parsedUrl.host}`;
                    username = params.get('username');
                    password = params.get('password');
                    console.log('[XTREAM IMPORT] Auto-extracted credentials using robust URL parser:', server, username);
                }
            } else {
                server = `${parsedUrl.protocol}//${parsedUrl.host}`;
            }
        } catch (err) {
            // Fallback to regex pattern matching
            const urlPattern = /^(https?:\/\/[^/]+)\/(?:get|player_api)\.php\?(?:.*&)?username=([^&]+)(?:.*&)?password=([^&]+)/i;
            const match = rawUrl.match(urlPattern);
            if (match) {
                server = match[1];
                username = match[2];
                password = match[3];
                console.log('[XTREAM IMPORT] Auto-extracted credentials from M3U URL regex fallback:', server, username);
            }
        }
        
        if (!username || !password) {
            showToast('Username and password are required.');
            return;
        }
        
        showGlobalSpinner("Authenticating...");
        
        try {
            console.log('[API] Calling parseXtream for new playlist.');
            const result = await window.iptvAPI.parseXtream({ name, server, username, password });
            
            if (result && result.error) {
                hideGlobalSpinner();
                showToast(`Authentication failed.\nReason: ${result.error}`);
                switchTab('playlist', document.getElementById('btn-playlist'));
                return;
            }
            
            if (!result || !result.channels) {
                hideGlobalSpinner();
                showToast(`Authentication failed.\nReason: Received invalid data from server.`);
                switchTab('playlist', document.getElementById('btn-playlist'));
                return;
            }
            
            let channels = result.channels;
            channels.forEach(newCh => {
                const isVod = newCh.type === 'movie' || newCh.type === 'series';
                newCh.disabled = isVod ? false : true;
                if (!isVod) newCh.isNew = true;
            });
            
            const tempPlaylist = {
                id: Date.now() + Math.random(),
                source: `xtream-credentials:${server}|${username}|${password}`,
                name: name,
                channels: channels,
                epg: result.epg_url || ('xtream-epg:' + server),
                disabled: false,
                editIndex: -1,
                exp_date: result.exp_date || null
            };
            
            // Clear input fields
            importXtremeName.value = '';
            importXtremeUrl.value = '';
            importXtremeUser.value = '';
            importXtremePass.value = '';
            
            await processAndImportPlaylist(tempPlaylist, result, false);
        } catch (err) {
            hideGlobalSpinner();
            showToast(`Error importing Xtream playlist:\n${err.message}`);
            switchTab('playlist', document.getElementById('btn-playlist'));
        }
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
