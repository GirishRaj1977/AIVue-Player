// EPG Matching Algorithms and Heuristics extracted from renderer.js

function getEpgName(url) {
    if (!url || url === 'Not Configured') return 'Not Configured';
    try {
        return new URL(url).hostname;
    } catch (e) {
        return url.split('\\').pop().split('/').pop();
    }
}

function buildAliasLookup() {
    if (_aliasLookupCache) return _aliasLookupCache;
    _aliasLookupCache = new Map();
    for (const [canonical, aliases] of Object.entries(CHANNEL_ALIASES)) {
        const normKey = normalizeChannelName(canonical).replace(/\s+/g, '');
        _aliasLookupCache.set(normKey, canonical);
        _aliasLookupCache.set(normalizeChannelName(canonical), canonical);
        for (const alias of aliases) {
            _aliasLookupCache.set(normalizeChannelName(alias).replace(/\s+/g, ''), canonical);
            _aliasLookupCache.set(normalizeChannelName(alias), canonical);
        }
    }
    return _aliasLookupCache;
}

function scoreChannelPair(chTitle, epgName, epgId) {
    const normCh  = normalizeChannelName(chTitle);
    const normEpg = normalizeChannelName(epgName || epgId || '');
    const normId  = normalizeChannelName(epgId || '');

    if (!normCh || !normEpg) return { score: 0, stage: 'none', detail: '' };

    // Strict number mismatch guard: "Star Sports 1" must NOT map to "Star Sports 2"
    const numsA   = (normCh.match(/\d+/g)  || []).sort().join(',');
    const numsB   = (normEpg.match(/\d+/g) || []).sort().join(',');
    const numsBId = (normId.match(/\d+/g)  || []).sort().join(',');
    if (numsA) {
        if ((numsB   && numsA !== numsB) ||
            (numsBId && numsA !== numsBId)) {
            return { score: 0, stage: 'number_mismatch', detail: '' };
        }
    }

    // Stage 1 – Exact normalized match (confidence 100)
    if (normCh === normEpg || normCh === normId) {
        return { score: 100, stage: 'exact', detail: 'Exact normalized match' };
    }

    // Stage 2 – Alias dictionary (confidence 97)
    const aliasMap = buildAliasLookup();
    const chSlug   = normCh.replace(/\s+/g, '');
    const epgSlug  = normEpg.replace(/\s+/g, '');
    const chCan    = aliasMap.get(chSlug)  || aliasMap.get(normCh);
    const epgCan   = aliasMap.get(epgSlug) || aliasMap.get(normEpg);
    if (chCan && epgCan && chCan === epgCan) {
        return { score: 97, stage: 'alias', detail: 'Alias dictionary match' };
    }

    // Stages 3–6 – Weighted fuzzy scoring
    const calcWeighted = (norm) => {
        const ts    = tokenSetRatio(normCh, norm);
        const tsort = tokenSortRatio(normCh, norm);
        const lev   = levenshteinRatio(normCh, norm);
        const to    = tokenOverlapScore(normCh, norm);
        return { score: 0.40 * ts + 0.25 * tsort + 0.20 * lev + 0.15 * to, ts, tsort, lev, to };
    };

    const byName = calcWeighted(normEpg);
    const byId   = (normId && normId !== normEpg) ? calcWeighted(normId) : { score: 0 };
    const best   = byName.score >= (byId.score || 0) ? byName : byId;
    const finalScore = Math.round(best.score);

    // Dominant algorithm label for the UI
    const dominant = Object.entries({
        'Token Set Ratio':  best.ts   || 0,
        'Token Sort Ratio': best.tsort || 0,
        'Levenshtein':      best.lev   || 0,
        'Token Overlap':    best.to    || 0,
    }).sort((a, b) => b[1] - a[1])[0];

    return {
        score:  finalScore,
        stage:  'fuzzy',
        detail: `${dominant[0]}: ${Math.round(dominant[1])}`,
    };
}

function getChannelSimilarity(str1, str2) {
    return scoreChannelPair(str1, str2, '').score / 100;
}

async function autoMapChannels(showSummaryAlert = false, skipSave = false) {
    console.log('[MAPPING] Starting 6-stage EPG mapping pipeline...');
    const playlistFilter = mappingSelectedPlaylist || 'all';
    const epgFilterEl = document.getElementById('mapping-epg-filter');
    const epgFilter = epgFilterEl ? epgFilterEl.value : 'all';

    const filteredEpgs = !epgChannelsData ? [] : (
        epgFilter === 'all'
            ? epgChannelsData
            : epgChannelsData.filter(epg => epg.source === epgFilter)
    );

    // Flat EPG key lookup for Stage 1 exact match
    const epgLookup = {};
    filteredEpgs.forEach(epg => {
        if (epg.id)   epgLookup[epg.id.toLowerCase()]   = epg.id;
        if (epg.name) epgLookup[epg.name.toLowerCase()] = epg.id;
    });

    const channelsToMap = playlistFilter === 'all'
        ? allChannels
        : allChannels.filter(ch => String(ch.playlistId) === String(playlistFilter));

    // Deduplicate by title; skip already-mapped channels
    const uniqueTitles = new Set();
    const toProcess = [];
    for (const ch of channelsToMap) {
        const title = ch.title || 'Unknown Channel';
        if (uniqueTitles.has(title) || channelMappings[title]) continue;
        uniqueTitles.add(title);
        toProcess.push(ch);
    }

    // Three result buckets
    const silentMaps  = []; // score ≥ 95 — auto-save silently (no UI)
    const highConf    = []; // score 90–94 — modal, pre-checked, green badge
    const suggestList = []; // score 80–89 — modal, unchecked, amber badge

    // ── Stage 1: Exact key match (tvg_id / tvg_name / normalized title) ─────
    const unmatched = [];
    for (const ch of toProcess) {
        const title    = ch.title || 'Unknown Channel';
        const tvgIdL   = ch.tvg_id   ? String(ch.tvg_id).toLowerCase()   : null;
        const tvgNameL = ch.tvg_name ? String(ch.tvg_name).toLowerCase() : null;
        const titleL   = title.toLowerCase();

        const exactId = (tvgIdL   && epgLookup[tvgIdL])   ? epgLookup[tvgIdL]
                      : (tvgNameL && epgLookup[tvgNameL]) ? epgLookup[tvgNameL]
                      : epgLookup[titleL]                 ? epgLookup[titleL]
                      : null;

        if (exactId) {
            silentMaps.push({ title, epgId: exactId });
        } else {
            unmatched.push(ch);
        }
    }

    // ── Stages 2–6: Scored pipeline on remaining unmatched channels ──────────
    if (unmatched.length > 0 && filteredEpgs.length > 0) {
        console.log(`[MAPPING] Weighted pipeline: ${unmatched.length} unmatched vs ${filteredEpgs.length} EPG entries...`);

        for (const ch of unmatched) {
            const title = ch.title || 'Unknown Channel';
            let bestScore = 0, bestEpg = null, bestResult = null;

            for (const epg of filteredEpgs) {
                const result = scoreChannelPair(title, epg.name, epg.id);
                if (result.score > bestScore) {
                    bestScore  = result.score;
                    bestEpg    = epg;
                    bestResult = result;
                }
            }

            if (!bestEpg || bestScore < 80) continue;

            const suggestion = {
                playlistTitle: title,
                epgId:         bestEpg.id,
                epgName:       bestEpg.name || bestEpg.id,
                epgSource:     bestEpg.source,
                score:         bestScore,
                detail:        bestResult.detail,
                stage:         bestResult.stage,
            };

            if (bestScore >= 95) {
                // Stage 2 alias hits (97) and very high fuzzy → silent
                silentMaps.push({ title, epgId: bestEpg.id });
            } else if (bestScore >= 90) {
                suggestion.tier = 'high';
                highConf.push(suggestion);
            } else {
                suggestion.tier = 'review';
                suggestList.push(suggestion);
            }
        }
    }

    // ── Apply silent mappings immediately (no UI) ────────────────────────────
    if (silentMaps.length > 0) {
        console.log(`[MAPPING] Silently saving ${silentMaps.length} high-confidence mappings (≥95)...`);
        for (const { title, epgId } of silentMaps) {
            channelMappings[title] = epgId;
        }
        await window.iptvAPI.saveMappingsBulk(silentMaps);
    }

    // Fast/silent mode — skip modal entirely
    if (skipSave) {
        if (silentMaps.length > 0) {
            updateState(true);
            renderMappingColumns();
        }
        return;
    }

    const modalSuggestions = [...highConf, ...suggestList];

    if (modalSuggestions.length === 0) {
        updateState(false);
        renderMappingColumns();
        if (showSummaryAlert) {
            showToast(silentMaps.length > 0
                ? `Auto-mapped ${silentMaps.length} channels silently (high confidence).`
                : 'No new channels could be auto-mapped.'
            );
        }
        return;
    }

    // ── Show modal for 90–94 (pre-checked) and 80–89 (unchecked) ────────────
    const hCount = highConf.length, sCount = suggestList.length;
    console.log(`[MAPPING] Modal: ${hCount} high confidence, ${sCount} to review.`);

    showFuzzyMappingModal(
        modalSuggestions,
        async (confirmedMappings) => {
            const toSave = [];
            confirmedMappings.forEach(m => {
                channelMappings[m.playlistTitle] = m.epgId;
                toSave.push({ title: m.playlistTitle, epgId: m.epgId });
            });
            if (toSave.length > 0) {
                await window.iptvAPI.saveMappingsBulk(toSave);
            }
            updateState(false);
            renderMappingColumns();
            const total = silentMaps.length + toSave.length;
            showToast(`Mapped ${total} channel${total !== 1 ? 's' : ''} (${silentMaps.length} silent + ${toSave.length} confirmed).`);
        },
        () => {
            // Cancel — silent mappings are already saved
            updateState(false);
            renderMappingColumns();
            if (silentMaps.length > 0) {
                showToast(`Auto-mapped ${silentMaps.length} channel${silentMaps.length !== 1 ? 's' : ''} silently.`);
            } else {
                showToast('No channels were mapped.');
            }
        }
    );

    // Patch modal header text after it's inserted into the DOM
    requestAnimationFrame(() => {
        const h3 = document.querySelector('#fuzzy-mapping-modal h3');
        const p  = document.querySelector('#fuzzy-mapping-modal p');
        if (h3) h3.textContent = 'EPG Mapping Suggestions';
        if (p) {
            const parts = [
                silentMaps.length ? `${silentMaps.length} auto-mapped silently` : '',
                hCount            ? `${hCount} high confidence (pre-checked)` : '',
                sCount            ? `${sCount} to review` : '',
            ].filter(Boolean);
            p.textContent = parts.join(' · ');
        }
    });
}

async function unmapAllChannelsFiltered() {
    const playlistFilter = mappingSelectedPlaylist || 'all';
    const epgFilterEl = document.getElementById('mapping-epg-filter');
    const epgFilter = epgFilterEl ? epgFilterEl.value : 'all';

    console.log(`[MAPPING] Starting bulk unmap. Playlist: ${playlistFilter}, EPG: ${epgFilter}`);

    // Build lookup of EPG channels belonging to the selected EPG source
    const epgIdsInFilter = new Set();
    if (epgChannelsData) {
        epgChannelsData.forEach(epg => {
            if (epgFilter === 'all' || epg.source === epgFilter) {
                if (epg.id) epgIdsInFilter.add(String(epg.id).toLowerCase());
            }
        });
    }

    // Build lookup of channel titles belonging to the selected playlist
    const titlesInPlaylistFilter = new Set();
    allChannels.forEach(ch => {
        if (playlistFilter === 'all' || String(ch.playlistId) === String(playlistFilter)) {
            if (ch.title) titlesInPlaylistFilter.add(ch.title);
        }
    });

    const mappingsToDelete = [];
    const titlesToUnmap = [];

    // Find mappings that match the filters
    for (const [title, mappedEpgId] of Object.entries(channelMappings)) {
        // Filter by Playlist: the title must exist in the selected playlist(s)
        if (!titlesInPlaylistFilter.has(title)) continue;

        // Filter by EPG: the mapped EPG ID must belong to the selected EPG source(s)
        if (mappedEpgId) {
            const mappedEpgIdLow = String(mappedEpgId).toLowerCase();
            if (!epgIdsInFilter.has(mappedEpgIdLow)) continue;
        }

        titlesToUnmap.push(title);
        mappingsToDelete.push({ title, epgId: null });
    }

    if (mappingsToDelete.length === 0) {
        showToast("No mapped channels found matching the current playlist/EPG filters.");
        return;
    }

    showConfirmToast(`Are you sure you want to remove ${mappingsToDelete.length} mappings matching the current filters?`, async () => {
        // Remove locally
        titlesToUnmap.forEach(title => {
            delete channelMappings[title];
        });

        // Save to DB in bulk
        await window.iptvAPI.saveMappingsBulk(mappingsToDelete);

        // Update EPG mappings state and render columns
        updateState(false);
        renderMappingColumns();
        showToast(`Successfully removed ${mappingsToDelete.length} mappings!`);
    });
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
                embedStream(currentChannel, 'nearest');
            }
        }
    }

    // Update Guide if we happen to switch over to it or if it is currently visible
    const epgView = document.getElementById('epg-view');
    if (epgView && epgView.style.display === 'flex') {
        renderFullEpg();
    }
}

