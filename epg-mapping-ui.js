// EPG Mapping UI Components extracted from renderer.js

function debouncedRenderMappingColumns() {
    clearTimeout(mappingDebounceTimer);
    mappingDebounceTimer = setTimeout(renderMappingColumns, 200);
}

function showFuzzyMappingModal(suggestions, onConfirm, onCancel) {
    // Remove existing modal if any
    const existing = document.getElementById('fuzzy-mapping-modal');
    if (existing) existing.remove();

    // Create modal div
    const modalDiv = document.createElement('div');
    modalDiv.id = 'fuzzy-mapping-modal';

    modalDiv.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(10, 10, 15, 0.65);
        backdrop-filter: blur(24px);
        -webkit-backdrop-filter: blur(24px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        font-family: 'Inter', sans-serif;
        box-sizing: border-box;
    `;

    // Add dynamic keyframes to head if not present
    if (!document.getElementById('fuzzy-modal-keyframes')) {
        const style = document.createElement('style');
        style.id = 'fuzzy-modal-keyframes';
        style.textContent = `
            @keyframes fuzzyFadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            @keyframes fuzzyScaleUp {
                from { transform: scale(0.96); opacity: 0; }
                to { transform: scale(1); opacity: 1; }
            }
            .fuzzy-row {
                background: rgba(255, 255, 255, 0.02);
                border: 1px solid rgba(255, 255, 255, 0.04);
                border-radius: 8px;
                padding: 12px 16px;
                display: flex;
                align-items: center;
                gap: 15px;
                transition: all 0.2s ease;
            }
            .fuzzy-row:hover {
                background: rgba(255, 255, 255, 0.04);
                border-color: rgba(255, 255, 255, 0.08);
            }
            .fuzzy-checkbox {
                width: 18px;
                height: 18px;
                border-radius: 4px;
                accent-color: var(--primary-accent);
                cursor: pointer;
            }
        `;
        document.head.appendChild(style);
    }

    modalDiv.style.animation = 'fuzzyFadeIn 0.25s ease';

    // Build the inner HTML
    modalDiv.innerHTML = `
        <div class="settings-card" style="
            width: 700px;
            max-width: 90%;
            max-height: 85vh;
            background: rgba(20, 20, 25, 0.8) !important;
            border: 1px solid rgba(255, 255, 255, 0.08) !important;
            border-radius: 16px;
            box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
            display: flex;
            flex-direction: column;
            overflow: hidden;
            animation: fuzzyScaleUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
            box-sizing: border-box;
        ">
            <!-- Header -->
            <div style="
                padding: 20px 25px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.08);
                background: rgba(255, 255, 255, 0.02);
                display: flex;
                justify-content: space-between;
                align-items: center;
            ">
                <div>
                    <h3 style="margin: 0; color: #fff; font-family: 'Outfit', sans-serif; font-size: 1.3em;">Fuzzy Mapping Suggestions</h3>
                    <p style="margin: 5px 0 0 0; color: #888; font-size: 0.85em;">We detected these potential channel matches. Toggle selections below to confirm.</p>
                </div>
                <button id="fuzzy-modal-close-x" style="
                    background: transparent;
                    border: none;
                    color: #888;
                    font-size: 1.5em;
                    cursor: pointer;
                    transition: color 0.2s;
                    line-height: 1;
                " onmouseover="this.style.color='#fff'" onmouseout="this.style.color='#888'">&times;</button>
            </div>
            
            <!-- Selection Toolbar -->
            <div style="
                padding: 12px 25px;
                background: rgba(0, 0, 0, 0.2);
                border-bottom: 1px solid rgba(255, 255, 255, 0.04);
                display: flex;
                justify-content: space-between;
                align-items: center;
                font-size: 0.88rem;
            ">
                <span style="color: #aaa;" id="fuzzy-selected-count">0 of 0 selected</span>
                <div style="display: flex; gap: 15px;">
                    <button id="fuzzy-select-all" style="background: transparent; border: none; color: var(--primary-accent); cursor: pointer; font-weight: bold; outline: none; font-size: 0.95em;">Select All</button>
                    <button id="fuzzy-select-none" style="background: transparent; border: none; color: #888; cursor: pointer; font-weight: bold; outline: none; font-size: 0.95em;">Deselect All</button>
                </div>
            </div>

            <!-- Body / Suggestions List -->
            <div id="fuzzy-mapping-list" style="
                flex-grow: 1;
                overflow-y: auto;
                padding: 20px 25px;
                display: flex;
                flex-direction: column;
                gap: 12px;
            ">
                ${suggestions.map((item, idx) => {
        const pct  = Math.round(item.score);
        const tier = item.tier || 'review';
        let badgeStyle, tierPill;
        if (tier === 'high') {
            badgeStyle = `background: rgba(16, 185, 129, 0.15); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.3);`;
            tierPill   = `<span style="font-size:0.64rem;background:rgba(16,185,129,0.15);color:#10b981;border-radius:3px;padding:1px 5px;margin-left:5px;font-weight:700;letter-spacing:.4px;">HIGH</span>`;
        } else {
            badgeStyle = `background: rgba(245, 158, 11, 0.15); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.3);`;
            tierPill   = `<span style="font-size:0.64rem;background:rgba(245,158,11,0.15);color:#f59e0b;border-radius:3px;padding:1px 5px;margin-left:5px;font-weight:700;letter-spacing:.4px;">REVIEW</span>`;
        }
        const isChecked = tier === 'high' ? 'checked' : '';
        const detail    = item.detail || '';

        return `
                        <div class="fuzzy-row" style="box-sizing: border-box;">
                            <input type="checkbox" class="fuzzy-checkbox" data-idx="${idx}" ${isChecked} style="flex-shrink: 0;">
                            
                            <!-- Content Box -->
                            <div style="display: flex; flex-grow: 1; align-items: center; justify-content: space-between; gap: 15px; min-width: 0;">
                                <!-- Playlist Channel -->
                                <div style="flex: 1; min-width: 0; text-align: left;">
                                    <span style="color: #ffffff; font-weight: 600; display: block; font-size: 0.95rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${item.playlistTitle}">
                                        ${item.playlistTitle}
                                    </span>
                                </div>

                                <!-- Arrow & Score -->
                                <div style="display: flex; flex-direction: column; align-items: center; gap: 3px; flex-shrink: 0; min-width: 120px;">
                                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--primary-accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.8;">
                                        <line x1="5" y1="12" x2="19" y2="12"></line>
                                        <polyline points="12 5 19 12 12 19"></polyline>
                                    </svg>
                                    <span style="font-size: 0.72rem; font-weight: bold; border-radius: 4px; padding: 2px 8px; letter-spacing: 0.3px; display:flex; align-items:center; ${badgeStyle}">
                                        ${pct}%${tierPill}
                                    </span>
                                    ${detail ? `<span style="font-size:0.63rem;color:#64748b;text-align:center;margin-top:1px;">${detail}</span>` : ''}
                                </div>

                                <!-- Suggested EPG Channel -->
                                <div style="flex: 1; min-width: 0; text-align: left;">
                                    <span style="color: #e2e8f0; font-weight: 600; display: block; font-size: 0.95rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${item.epgName}">
                                        ${item.epgName}
                                    </span>
                                    <span style="color: #64748b; font-size: 0.78rem; display: block; margin-top: 2px;">
                                        ${item.epgSource}
                                    </span>
                                </div>
                            </div>
                        </div>
                    `;
    }).join('')}
            </div>

            <!-- Footer -->
            <div style="
                padding: 20px 25px;
                border-top: 1px solid rgba(255, 255, 255, 0.08);
                background: rgba(0, 0, 0, 0.2);
                display: flex;
                justify-content: flex-end;
                gap: 12px;
            ">
                <button id="fuzzy-modal-cancel" class="playlist-btn" style="
                    background: rgba(255, 255, 255, 0.08);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    color: #fff;
                    padding: 10px 20px;
                    border-radius: 8px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                    font-size: 0.92rem;
                ">Cancel</button>
                <button id="fuzzy-modal-apply" class="playlist-btn" style="
                    background: var(--primary-accent);
                    color: #121212;
                    border: none;
                    padding: 10px 24px;
                    border-radius: 8px;
                    font-weight: 700;
                    cursor: pointer;
                    transition: all 0.2s;
                    box-shadow: 0 4px 15px rgba(var(--primary-accent-rgb), 0.3);
                    font-size: 0.92rem;
                ">Apply Selected</button>
            </div>
        </div>
    `;

    document.body.appendChild(modalDiv);

    // Setup interactive functionality
    const checkboxes = modalDiv.querySelectorAll('.fuzzy-checkbox');
    const countEl = modalDiv.querySelector('#fuzzy-selected-count');

    function updateCount() {
        const checkedCount = Array.from(checkboxes).filter(cb => cb.checked).length;
        countEl.textContent = `${checkedCount} of ${checkboxes.length} selected`;
    }
    updateCount();

    checkboxes.forEach(cb => {
        cb.addEventListener('change', updateCount);
    });

    modalDiv.querySelector('#fuzzy-select-all').addEventListener('click', () => {
        checkboxes.forEach(cb => cb.checked = true);
        updateCount();
    });

    modalDiv.querySelector('#fuzzy-select-none').addEventListener('click', () => {
        checkboxes.forEach(cb => cb.checked = false);
        updateCount();
    });

    const closeModal = () => {
        modalDiv.style.animation = 'fuzzyFadeIn 0.2s ease reverse';
        setTimeout(() => modalDiv.remove(), 180);
    };

    modalDiv.querySelector('#fuzzy-modal-close-x').addEventListener('click', () => {
        closeModal();
        if (onCancel) onCancel();
    });

    modalDiv.querySelector('#fuzzy-modal-cancel').addEventListener('click', () => {
        closeModal();
        if (onCancel) onCancel();
    });

    modalDiv.querySelector('#fuzzy-modal-apply').addEventListener('click', () => {
        const selectedIndices = Array.from(checkboxes)
            .filter(cb => cb.checked)
            .map(cb => parseInt(cb.getAttribute('data-idx'), 10));

        const confirmedMappings = selectedIndices.map(idx => suggestions[idx]);
        closeModal();
        if (onConfirm) onConfirm(confirmedMappings);
    });
}

function renderMappingColumns() {
    console.log('[MAPPING] Rendering mapping columns.');
    const channelListEl = document.getElementById('mapping-channel-list');
    const epgListEl = document.getElementById('mapping-epg-list');
    const mappedListEl = document.getElementById('mapping-mapped-list');
    if (!channelListEl || !epgListEl || !mappedListEl) return;

    // Blur active element inside mapping columns to prevent focus-loss scroll resetting
    if (document.activeElement && (
        channelListEl.contains(document.activeElement) ||
        epgListEl.contains(document.activeElement) ||
        mappedListEl.contains(document.activeElement)
    )) {
        document.activeElement.blur();
    }

    // Save outer settings scroll container position to prevent screen scroll jumping/resetting to top
    const settingsView = document.getElementById('settings-view');
    const settingsScrollTop = settingsView ? settingsView.scrollTop : 0;
    const docScrollTop = document.documentElement.scrollTop || document.body.scrollTop;

    // Save current column scroll positions
    const chScrollTop = channelListEl.scrollTop;
    const epgScrollTop = epgListEl.scrollTop;
    const mappedScrollTop = mappedListEl.scrollTop;

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
        const safeTitle = title.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

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

        const safeName = (epg.name || epg.id).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        const safeId = epg.id.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
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

    const filteredMapped = Object.entries(channelMappings).filter(([chTitle, epgId]) => {
        if (!epgId) return false;
        if (!titleToPlaylistId[chTitle]) return false; // Hide mappings for channels that no longer exist
        if (mappingSelectedPlaylist !== 'all' && !validTitlesForPlaylist.has(chTitle)) return false;

        const safeTitle = String(chTitle).replace(/</g, "&lt;").replace(/>/g, "&gt;");
        const epgName = epgNameLookup[epgId] || epgId;
        const safeEpgName = String(epgName).replace(/</g, "&lt;").replace(/>/g, "&gt;");

        if (mappedSearch && !safeTitle.toLowerCase().includes(mappedSearch) && !safeEpgName.toLowerCase().includes(mappedSearch)) return false;
        return true;
    }).sort((a, b) => sortAlphaNum(a[0], b[0]));

    const maxMappedDisplay = 300;
    const displayMapped = filteredMapped.slice(0, maxMappedDisplay);

    displayMapped.forEach(([chTitle, epgId]) => {
        const safeTitle = String(chTitle).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        const epgName = epgNameLookup[epgId] || epgId;
        const safeEpgName = String(epgName).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

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

    let mappedHtml = mappedHtmlArr.length ? mappedHtmlArr.join('') : '<div style="color: #888; text-align: center; margin-top: 20px;">No mappings yet.</div>';
    if (filteredMapped.length > maxMappedDisplay) {
        mappedHtml += `<div style="color: #888; text-align: center; margin-top: 10px; font-size: 0.9em;">Showing ${maxMappedDisplay} of ${filteredMapped.length} mapped channels. Use search to find more.</div>`;
    }
    mappedListEl.innerHTML = mappedHtml;

    // Restore scroll positions synchronously
    channelListEl.scrollTop = chScrollTop;
    epgListEl.scrollTop = epgScrollTop;
    mappedListEl.scrollTop = mappedScrollTop;

    // Restore outer settings scroll position
    if (settingsView) {
        settingsView.scrollTop = settingsScrollTop;
    }
    document.documentElement.scrollTop = docScrollTop;
    document.body.scrollTop = docScrollTop;

    // Restore focus to a stable EPG mapping element to prevent global focus-recovery timer from resetting scroll
    const restoreEpgMappingFocus = () => {
        const activeTagName = document.activeElement ? document.activeElement.tagName : '';
        if (activeTagName === 'INPUT' || activeTagName === 'SELECT') {
            return;
        }

        if (mappingSelectedChannel) {
            const safeTitle = mappingSelectedChannel.replace(/"/g, '&quot;');
            const targetEl = channelListEl.querySelector(`.mapping-ch-item[data-title="${safeTitle}"]`);
            if (targetEl) {
                targetEl.focus();
                return;
            }
        }
        if (mappingSelectedEpg) {
            const safeId = mappingSelectedEpg.replace(/"/g, '&quot;');
            const targetEl = epgListEl.querySelector(`.mapping-epg-item[data-id="${safeId}"]`);
            if (targetEl) {
                targetEl.focus();
                return;
            }
        }
        // Fallback: focus mapping search inputs so activeElement is never body
        const chSearchEl = document.getElementById('mapping-channel-search');
        if (chSearchEl && (document.activeElement === document.body || !document.activeElement)) {
            chSearchEl.focus();
        }
    };

    restoreEpgMappingFocus();

    // Failsafe: Restore scroll positions in the next tick to override any async browser scroll-to-top on focus shift
    setTimeout(() => {
        channelListEl.scrollTop = chScrollTop;
        epgListEl.scrollTop = epgScrollTop;
        mappedListEl.scrollTop = mappedScrollTop;
        if (settingsView) {
            settingsView.scrollTop = settingsScrollTop;
        }
        document.documentElement.scrollTop = docScrollTop;
        document.body.scrollTop = docScrollTop;
        restoreEpgMappingFocus();
    }, 0);

    // 4. Attach Event Listeners for the dynamic items
    document.querySelectorAll('.mapping-ch-item').forEach(el => {
        el.addEventListener('click', (e) => {
            const title = el.getAttribute('data-title');
            if (mappingSelectedChannel === title) {
                mappingSelectedChannel = null;
            } else {
                mappingSelectedChannel = title;
            }
            renderMappingColumns();
        });
    });

    document.querySelectorAll('.mapping-epg-item').forEach(el => {
        el.addEventListener('click', (e) => {
            if (e.target.closest('.mapping-confirm-btn')) return;
            const id = el.getAttribute('data-id');
            if (mappingSelectedEpg === id) {
                mappingSelectedEpg = null;
            } else {
                mappingSelectedEpg = id;
            }
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

