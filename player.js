// Video Player and Playback Progress extracted from renderer.js

window.Player = {};

let autoplayInterval = null;
let nextEpisodeToPlay = null;

function getMiniEqualizerHtml() {
    return `
        <div class="mini-equalizer" title="Playing">
            <span></span>
            <span></span>
            <span></span>
        </div>
    `;
}

window.Player.getMiniEqualizerHtml = getMiniEqualizerHtml;

function isSamePlaybackChannel(a, b) {
    if (!a || !b) return false;
    const aUrl = a.url || a.stream_url || '';
    const bUrl = b.url || b.stream_url || '';
    return aUrl === bUrl &&
        (a.title || 'Unknown Channel') === (b.title || 'Unknown Channel') &&
        String(a.playlistId || a.playlist_id || '') === String(b.playlistId || b.playlist_id || '');
}

window.Player.isSamePlaybackChannel = isSamePlaybackChannel;

function refreshCurrentPlayingChannelIndex() {
    if (!streamActive || !window.currentPlaybackChannel) return;
    const resolvedIndex = allChannels.findIndex(channel => isSamePlaybackChannel(channel, window.currentPlaybackChannel));
    if (resolvedIndex >= 0) currentPlayingChannelIndex = resolvedIndex;
}

window.Player.refreshCurrentPlayingChannelIndex = refreshCurrentPlayingChannelIndex;

function isPlayingChannel(channel, index) {
    if (!streamActive || currentPlayingChannelIndex < 0) return false;
    if (index === currentPlayingChannelIndex) return true;
    return isSamePlaybackChannel(channel, window.currentPlaybackChannel);
}

window.Player.isPlayingChannel = isPlayingChannel;

function clearPlayingChannelIndicator() {
    document.querySelectorAll('.channel-item.active').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.channel-item .mini-equalizer').forEach(el => el.remove());
}

window.Player.clearPlayingChannelIndicator = clearPlayingChannelIndicator;

function updatePlayingChannelIndicator(options = {}) {
    refreshCurrentPlayingChannelIndex();
    clearPlayingChannelIndicator();
    if (!streamActive || currentPlayingChannelIndex < 0) return;

    const activeEl = document.querySelector(`.channel-item[data-index="${currentPlayingChannelIndex}"]`);
    if (!activeEl) return;

    activeEl.classList.add('active');
    const favBtn = activeEl.querySelector('.fav-btn');
    if (favBtn) {
        favBtn.insertAdjacentHTML('beforebegin', getMiniEqualizerHtml());
    } else {
        activeEl.insertAdjacentHTML('beforeend', getMiniEqualizerHtml());
    }

    if (options.scroll) {
        setTimeout(() => {
            activeEl.scrollIntoView({ behavior: 'smooth', block: options.block || 'nearest' });
        }, 100);
    }
}

window.Player.updatePlayingChannelIndicator = updatePlayingChannelIndicator;

async function loadAllPlaybackProgress() {
    allPlaybackProgress = await window.iptvAPI.getAllPlaybackProgress();
}

window.Player.loadAllPlaybackProgress = loadAllPlaybackProgress;

function getPlaybackProgressId(channel) {
    if (channel.type === 'episode') {
        const season = channel.season || 1;
        const episode = channel.episodeNum || 1;
        if (channel.tmdbId) {
            return `tmdb:${channel.tmdbId}:s${season}:e${episode}`;
        } else if (channel.seriesTitle) {
            return `stalker:${channel.seriesTitle}:s${season}:e${episode}`;
        } else {
            return `url:${channel.url}`;
        }
    } else if (channel.type === 'movie' || channel.type === 'vod') {
        if (channel.tmdbId) {
            return `tmdb:${channel.tmdbId}`;
        } else {
            return `url:${channel.url}`;
        }
    }
    return null;
}

window.Player.getPlaybackProgressId = getPlaybackProgressId;

function getItemProgress(item, type) {
    const tmdbId = item.tmdb_id || item.tmdbId || '';
    const title = item.name || item.title;

    // Find all progress rows that match this item
    const matches = allPlaybackProgress.filter(p => {
        if (tmdbId && p.tmdb_id == tmdbId) return true;
        if ((item.url || item.cmd) && p.stream_url === (item.url || item.cmd)) return true;
        if (title && p.title === title) return true;

        // Match series episodes by ID prefix (for Stalker or M3U series without TMDB ID)
        if (type === 'vod' || type === 'series') {
            if (p.id.startsWith(`stalker:${title}:`)) return true;
        }
        return false;
    });

    if (matches.length === 0) return null;

    if (type === 'movie' || (type === 'vod' && item.type !== 'series')) {
        return matches[0]; // For movies, there is only one match
    }

    // For series, sort by last_watched to find the active episode
    matches.sort((a, b) => new Date(b.last_watched) - new Date(a.last_watched));

    const latest = matches[0];
    const allCompleted = matches.every(m => m.completed === 1);

    return {
        position: latest.position,
        duration: latest.duration,
        completed: allCompleted ? 1 : 0
    };
}

window.Player.getItemProgress = getItemProgress;

async function saveCurrentPlaybackProgress() {
    let currentChannel = null;
    if (currentPlayingChannelIndex >= 0) {
        currentChannel = allChannels[currentPlayingChannelIndex];
    }
    if (!currentChannel) {
        currentChannel = window.currentPlaybackChannel;
    }
    if (!currentChannel) return;
    const progressId = getPlaybackProgressId(currentChannel);
    if (!progressId) return;

    const position = window.currentPlaybackTime || 0;
    const duration = window.currentPlaybackDuration || 0;
    if (position <= 0 || duration <= 0) return;

    // Only save progress if watched for more than 5 seconds
    if (position < 5) return;

    const completed = (position / duration >= 0.90) ? 1 : 0;

    const params = {
        id: progressId,
        tmdb_id: currentChannel.tmdbId || null,
        title: currentChannel.title,
        stream_url: currentChannel.url,
        season: currentChannel.season ? parseInt(currentChannel.season) : null,
        episode: currentChannel.episodeNum ? parseInt(currentChannel.episodeNum) : null,
        position: position,
        duration: duration,
        completed: completed
    };

    await window.iptvAPI.savePlaybackProgress(params);
}

window.Player.saveCurrentPlaybackProgress = saveCurrentPlaybackProgress;

function showResumePromptModal(savedSeconds, onChoice) {
    if (window.isAppFullscreen) {
        window.iptvAPI.toggleFullscreen();
    }

    let modal = document.getElementById('resume-prompt-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'resume-prompt-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(10, 10, 12, 0.7);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            font-family: 'Outfit', 'Inter', sans-serif;
        `;
        document.body.appendChild(modal);
    }

    const minutes = Math.floor(savedSeconds / 60);
    const seconds = Math.floor(savedSeconds % 60);
    const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;

    modal.innerHTML = `
        <div style="background: rgba(30, 30, 40, 0.95); border: 1px solid rgba(187, 134, 252, 0.2); border-radius: 16px; padding: 30px; max-width: 400px; width: 90%; text-align: center; box-shadow: 0 20px 50px rgba(0,0,0,0.5);">
            <h3 style="color: #bb86fc; margin: 0 0 15px 0; font-size: 1.5em; font-weight: 700;">Resume Playback</h3>
            <p style="color: #e0e0e0; margin: 0 0 25px 0; font-size: 1em; line-height: 1.6;">You watched this previously. Would you like to resume from <strong>${timeStr}</strong> or start from the beginning?</p>
            <div style="display: flex; gap: 15px; justify-content: center;">
                <button id="resume-btn-start-over" class="playlist-btn" style="background: #2a2a2d; color: white; padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; border: 1px solid #444;">Start Over</button>
                <button id="resume-btn-resume" class="playlist-btn" style="background: #bb86fc; color: black; padding: 10px 20px; border-radius: 8px; font-weight: 700; cursor: pointer; border: none;">Resume</button>
            </div>
        </div>
    `;

    modal.style.display = 'flex';

    const startOverBtn = document.getElementById('resume-btn-start-over');
    const resumeBtn = document.getElementById('resume-btn-resume');

    startOverBtn.replaceWith(startOverBtn.cloneNode(true));
    resumeBtn.replaceWith(resumeBtn.cloneNode(true));

    document.getElementById('resume-btn-start-over').addEventListener('click', () => {
        modal.style.display = 'none';
        onChoice(false);
    });
    document.getElementById('resume-btn-resume').addEventListener('click', () => {
        modal.style.display = 'none';
        onChoice(true);
    });
}

window.Player.showResumePromptModal = showResumePromptModal;

async function embedStream(channel, scrollMode = 'start') {
    console.log('[STREAM] Embedding stream for channel:', channel.title);
    window.currentPlaybackRequestId = (window.currentPlaybackRequestId || 0) + 1;
    const thisRequestId = window.currentPlaybackRequestId;

    streamActive = true;
    window.currentPlaybackHeaders = null;

    window.isSwitchingStream = true;

    try {
        window.iptvAPI.sendMpvCommand('stop');
    } catch (e) {
        console.error('Error stopping MPV:', e);
    }

    const safeTitle = (channel.title || 'Unknown Channel').replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const playerOverlay = document.getElementById('player-overlay');
    if (playerOverlay) playerOverlay.innerHTML = getWinSpinnerHtml(safeTitle, { size: 'large' });

    if (window.activeEpgTrackingInterval) {
        clearInterval(window.activeEpgTrackingInterval);
        window.activeEpgTrackingInterval = null;
    }

    if (window.playbackTimeout) {
        clearTimeout(window.playbackTimeout);
        window.playbackTimeout = null;
    }
    window.hasStartedPlayback = false;

    currentPlayingChannelIndex = allChannels.findIndex(c => c.url === channel.url && c.title === channel.title);
    window.currentPlaybackChannel = channel;

    const groupName = channel.group || 'Uncategorized';
    if (!window.expandedGroups.has(groupName)) {
        window.expandedGroups.add(groupName);
        localStorage.setItem('iptv_expanded_groups', JSON.stringify(Array.from(window.expandedGroups)));
        renderChannels();
    }

    updatePlayingChannelIndicator({ scroll: true, block: scrollMode });

    const fsBtn = document.getElementById('fullscreen-btn');
    if (fsBtn) fsBtn.style.display = 'block';

    localStorage.setItem('lastPlayedChannelUrl', channel.url);

    let finalStreamUrl = channel.url;
    const playlist = savedPlaylists.find(p => String(p.id) === String(channel.playlistId));

    if (playlist && playlist.epg && playlist.epg.startsWith('stalker:') && !finalStreamUrl.startsWith('stalker-cmd:') && !finalStreamUrl.startsWith('stalker-series:') && !finalStreamUrl.startsWith('stalker-series-ep:')) {
        finalStreamUrl = `stalker-cmd:${channel.type === 'live' ? 'itv' : 'vod'}|${finalStreamUrl}`;
    }

    if (finalStreamUrl.startsWith('stalker-series-ep:')) {
        const parts = finalStreamUrl.substring(18).split('|');
        const cmd = parts[0];
        const seriesNum = parts[1];

        if (playlist && playlist.epg && playlist.epg.startsWith('stalker:')) {
            const mac = playlist.epg.substring(8);
            const resolved = await window.iptvAPI.resolveStalkerLink({ url: playlist.source, mac, type: 'vod', cmd, series: seriesNum });
            if (thisRequestId !== window.currentPlaybackRequestId) return;
            if (resolved) finalStreamUrl = resolved;
            else {
                showToast("Failed to authenticate stream link.");
                const playerOverlay = document.getElementById('player-overlay');
                if (playerOverlay) {
                    playerOverlay.innerHTML = `
                        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; height: 100%;">
                            <img src="assets/logo.png" style="width: 128px; height: 128px; margin-bottom: 20px; border-radius: 15px; background: #2A2A2A;">
                            <span style="color: #cf6679; font-size: 1.2em; font-weight: bold;">Channel currently not available</span>
                        </div>
                    `;
                }
                streamActive = false;
                currentPlayingChannelIndex = -1;
                clearPlayingChannelIndicator();
                const fsBtn = document.getElementById('fullscreen-btn');
                if (fsBtn) fsBtn.style.display = 'none';
                return;
            }
        }
    } else if (finalStreamUrl.startsWith('stalker-cmd:')) {
        const parts = finalStreamUrl.substring(12).split('|');
        const type = parts[0];
        const cmd = parts.slice(1).join('|');

        if (playlist && playlist.epg && playlist.epg.startsWith('stalker:')) {
            const mac = playlist.epg.substring(8);
            const resolved = await window.iptvAPI.resolveStalkerLink({ url: playlist.source, mac, type, cmd });
            if (thisRequestId !== window.currentPlaybackRequestId) return;
            if (resolved) finalStreamUrl = resolved;
            else {
                showToast("Failed to authenticate stream link.");
                const playerOverlay = document.getElementById('player-overlay');
                if (playerOverlay) {
                    playerOverlay.innerHTML = `
                        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; height: 100%;">
                            <img src="assets/logo.png" style="width: 128px; height: 128px; margin-bottom: 20px; border-radius: 15px; background: #2A2A2A;">
                            <span style="color: #cf6679; font-size: 1.2em; font-weight: bold;">Channel currently not available</span>
                        </div>
                    `;
                }
                streamActive = false;
                currentPlayingChannelIndex = -1;
                clearPlayingChannelIndicator();
                const fsBtn = document.getElementById('fullscreen-btn');
                if (fsBtn) fsBtn.style.display = 'none';
                return;
            }
        }
    } else if (finalStreamUrl.startsWith('xtream-stream:')) {
        const parts = finalStreamUrl.substring(14).split('|');
        const type = parts[0];
        const streamId = parts[1];
        let extension = null;
        let directSourceUrl = null;

        if (type === 'live') {
            extension = null;
            if (parts[2]) {
                directSourceUrl = decodeURIComponent(parts[2]);
            }
        } else if (type === 'movie') {
            extension = parts[2] || null;
            if (parts[3]) {
                directSourceUrl = decodeURIComponent(parts[3]);
            }
        }

        if (playlist && playlist.source && playlist.source.startsWith('xtream-credentials:')) {
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
            if (thisRequestId !== window.currentPlaybackRequestId) return;
            
            if (resolvedSource && resolvedSource.url) {
                finalStreamUrl = resolvedSource.url;
                window.currentPlaybackHeaders = resolvedSource.headers || null;
                console.log(`[XTREAM PLAYBACKSOURCE] Resolved playable URL: ${finalStreamUrl}, Format: ${resolvedSource.streamFormat}`);
            } else {
                showToast("Failed to resolve Xtream Codes stream URL.");
                const playerOverlay = document.getElementById('player-overlay');
                if (playerOverlay) {
                    playerOverlay.innerHTML = `
                        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; height: 100%;">
                            <img src="assets/logo.png" style="width: 128px; height: 128px; margin-bottom: 20px; border-radius: 15px; background: #2A2A2A;">
                            <span style="color: #cf6679; font-size: 1.2em; font-weight: bold;">Stream currently not available</span>
                        </div>
                    `;
                }
                streamActive = false;
                currentPlayingChannelIndex = -1;
                clearPlayingChannelIndicator();
                const fsBtn = document.getElementById('fullscreen-btn');
                if (fsBtn) fsBtn.style.display = 'none';
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
        detailLogo.onerror = function () {
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

    if (channel.type === 'recording') {
        const detailProgram = document.getElementById('detail-program');
        const detailTimeslot = document.getElementById('detail-timeslot');
        const detailDescription = document.getElementById('detail-description');

        if (detailProgram) {
            detailProgram.textContent = channel.programName || channel.title || 'Recorded Stream';
            
            let timeStr = 'Recorded Program';
            if (channel.startTime && channel.endTime) {
                try {
                    const pStart = new Date(channel.startTime);
                    const pEnd = new Date(channel.endTime);
                    timeStr = `${pStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${pEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
                } catch (e) { }
            }
            
            if (detailTimeslot) {
                detailTimeslot.textContent = timeStr;
                detailTimeslot.style.display = 'block';
            }
            if (detailDescription) {
                detailDescription.textContent = channel.description || 'No program description was saved for this recording.';
                detailDescription.style.display = 'block';
            }
        }
        
        // Also update MPV EPG payload for the OSC!
        const epgUpdatePayload = {
            title: channel.programName || channel.title || 'Recorded Stream',
            progTitle: channel.programName || channel.title || 'Recorded Stream',
            progDesc: channel.description || 'Local Recording Playback',
            progTime: channel.channelName || 'Saved Recording'
        };
        if (window.hasStartedPlayback) {
            const encoded = encodeURIComponent(JSON.stringify(epgUpdatePayload));
            window.iptvAPI.sendMpvCommand(`script-message update-epg ${encoded}`);
        } else {
            window.pendingEpgUpdate = epgUpdatePayload;
        }
    } else {
        const parsedSeries = parseM3uSeriesName(channel.title);
        const hasSeriesPattern = channel.title && (
            /s\d+\s*e\d+/i.test(channel.title) ||
            /season\s*\d+\s*episode\s*\d+/i.test(channel.title) ||
            /\d+x\d+/i.test(channel.title)
        );
        const isMovieOrEpisode = channel.type === 'movie' ||
            channel.type === 'series' ||
            channel.type === 'episode' ||
            hasSeriesPattern ||
            (channel.url && (channel.url.startsWith('stalker-series') || channel.url.startsWith('stalker-cmd:vod')));

        if (isMovieOrEpisode) {
            loadAndRenderTmdbSynopsis(channel);
            if (!window.activeDetailsStreamInfo) {
                if (channel.type === 'episode') {
                    window.activeDetailsStreamInfo = {
                        title: channel.seriesTitle || channel.title.split(' - ')[0],
                        logo: channel.logo,
                        playlistId: channel.playlistId,
                        type: 'series',
                        tmdbId: channel.tmdbId
                    };
                } else {
                    window.activeDetailsStreamInfo = channel;
                }
            }
        } else {
            window.activeDetailsStreamInfo = null;
            const mappedId = channelMappings[channel.title];
            const epgIds = [mappedId, channel.tvg_id, channel.tvg_name].filter(Boolean);
            console.log('[API] Calling getEpg for current stream.');
            const epgData = await window.iptvAPI.getEpg(epgIds, null, null);
            if (thisRequestId !== window.currentPlaybackRequestId) return;

            let programmes = [];
            for (const id of epgIds) {
                const lowId = id.toLowerCase();
                if (epgData[lowId] && epgData[lowId].length > 0) { programmes = epgData[lowId]; break; }
            }

            const detailProgram = document.getElementById('detail-program');
            const detailTimeslot = document.getElementById('detail-timeslot');
            const detailDescription = document.getElementById('detail-description');
            const currentProg = getCurrentProgram(programmes);
            if (detailProgram) {
                if (currentProg) {
                    detailProgram.textContent = currentProg.title || 'No Title';
                    const pStart = parseEpgTime(currentProg.start);
                    const pEnd = parseEpgTime(currentProg.stop);
                    const timeStr = `${pStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${pEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
                    if (detailTimeslot) {
                        detailTimeslot.textContent = timeStr;
                        detailTimeslot.style.display = 'block';
                    }
                    if (detailDescription) {
                        detailDescription.textContent = currentProg.desc || 'No description available.';
                        detailDescription.style.display = 'block';
                    }
                } else {
                    detailProgram.textContent = 'No Information Available';
                    if (detailTimeslot) {
                        detailTimeslot.textContent = '--';
                    }
                    if (detailDescription) {
                        detailDescription.textContent = 'No EPG data available for this channel.';
                    }
                }
            }

            renderLiveEpgGrid();

            // Setup pending EPG payload to send to MPV Lua script
            let progTitle = '', progDesc = '', progTime = '';
            if (currentProg) {
                progTitle = currentProg.title || '';
                progDesc = currentProg.desc || '';
                const pStart = parseEpgTime(currentProg.start);
                const pEnd = parseEpgTime(currentProg.stop);
                progTime = `${pStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${pEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
            }

            window.pendingEpgUpdate = {
                title: channel.title || '',
                progTitle: progTitle,
                progDesc: progDesc,
                progTime: progTime
            };

            // Periodically track EPG changes to dynamically update details card and OSC
            window.activeEpgTrackingInterval = setInterval(() => {
                updatePlayingChannelEpg(channel);
            }, 30000);
        }
    }



    // Track active fallback iterations
    window.currentPlaybackChannel = channel;
    window.currentPlaybackFinalUrl = finalStreamUrl;

    // Autoplay Next Episode initialization
    hideAutoplayOverlay();
    window.isAutoplayBlockedForCurrentEpisode = false;
    if (channel && channel.type === 'episode') {
        getEpisodesForSeries(channel).then(eps => {
            if (thisRequestId !== window.currentPlaybackRequestId) return;
            window.currentPlayingSeriesEpisodes = eps;
            console.log(`[AUTOPLAY] Cached ${eps.length} episodes for series:`, channel.seriesTitle);
        }).catch(err => {
            console.error('[AUTOPLAY] Error loading series episodes cache:', err);
            window.currentPlayingSeriesEpisodes = [];
        });
    } else {
        window.currentPlayingSeriesEpisodes = [];
    }

    if (window.lastPlaybackChannelUrl !== channel.url) {
        window.lastPlaybackChannelUrl = channel.url;
        window.playbackFallbackCount = 0;
    }

    const rect = playerContainer.getBoundingClientRect();

    // We keep window.pendingResumeSeekTime intact until file-loaded fires
    window.isFileLoaded = false;
    window.isSwitchingStream = true;

    console.log('[API] Calling playMpvEmbedded. Final URL:', finalStreamUrl);
    window.iptvAPI.playMpvEmbedded({
        url: finalStreamUrl,
        title: channel.title,
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

    // Start a 30-second loading timeout. If no playback-time is received, fail gracefully.
    window.playbackTimeout = setTimeout(() => {
        if (!window.hasStartedPlayback && streamActive) {
            console.warn('[STREAM] Playback timeout. Stream failed to load.');
            window.isSwitchingStream = false;
            streamActive = false;
            currentPlayingChannelIndex = -1;
            clearPlayingChannelIndicator();

            // Stop MPV rendering
            window.iptvAPI.sendMpvCommand('stop');

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
    }, 30000);
}

window.Player.embedStream = embedStream;

function triggerBoundsUpdate() {
    const isLiveViewActive = document.getElementById('btn-live-tv') && document.getElementById('btn-live-tv').classList.contains('active');
    if (streamActive && isLiveViewActive && playerContainer) {
        const rect = playerContainer.getBoundingClientRect();
        // Guard against zero-size or tiny layouts during hidden transitions
        if (rect.width < 50 || rect.height < 50) {
            console.log('[BOUNDS] Stale or zero-sized layout skipped:', rect.width, 'x', rect.height);
            return;
        }
        window.iptvAPI.updateMpvBounds({
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
            scale: window.devicePixelRatio || 1
        });
    } else {
        window.iptvAPI.updateMpvBounds({ x: 0, y: 0, width: 0, height: 0, scale: window.devicePixelRatio || 1 });
    }
}

window.Player.triggerBoundsUpdate = triggerBoundsUpdate;

function settlePlayerBoundsAfterLayout() {
    // Cancel any pending settle calls
    if (_boundsSettleFinal) { clearTimeout(_boundsSettleFinal); _boundsSettleFinal = null; }
    if (_boundsSettleImmediate) { cancelAnimationFrame(_boundsSettleImmediate); }

    // Shot 1 — immediate rAF (catches the first layout pass)
    _boundsSettleImmediate = requestAnimationFrame(() => {
        requestAnimationFrame(triggerBoundsUpdate);
    });

    // Shot 2 — debounced final settle (catches late CSS reflows, Electron animation end)
    _boundsSettleFinal = setTimeout(() => {
        requestAnimationFrame(() => requestAnimationFrame(triggerBoundsUpdate));
        _boundsSettleFinal = null;
    }, 260);
}

window.Player.settlePlayerBoundsAfterLayout = settlePlayerBoundsAfterLayout;

function hideAutoplayOverlay() {
    if (autoplayInterval) {
        clearInterval(autoplayInterval);
        autoplayInterval = null;
    }
    const overlay = document.getElementById('autoplay-countdown-overlay');
    if (overlay) overlay.style.display = 'none';
}

window.Player.hideAutoplayOverlay = hideAutoplayOverlay;

function showAutoplayOverlay(nextEp) {
    if (!window.isAutoplayEnabled) return;

    hideAutoplayOverlay();
    nextEpisodeToPlay = nextEp;

    const overlay = document.getElementById('autoplay-countdown-overlay');
    const titleEl = document.getElementById('autoplay-next-title');
    const descEl = document.getElementById('autoplay-countdown-text');

    if (!overlay || !titleEl || !descEl) return;

    // Set next episode display title
    let displayTitle = `S${nextEp.season}E${nextEp.episodeNum}`;
    if (nextEp.name) {
        const playlist = savedPlaylists.find(p => p.id.toString() === (window.currentPlaybackChannel.playlistId ? window.currentPlaybackChannel.playlistId.toString() : ''));
        let cleanName = nextEp.name;
        if (playlist && !playlist.epg?.startsWith('stalker:')) {
            const cleanPrefix = new RegExp(`^.*?\\b(s\\d+e\\d+|\\d+x\\d+|episode\\s*\\d+|ep\\s*\\d+)\\b\\s*[-_.:]?\\s*`, 'i');
            cleanName = nextEp.name.replace(cleanPrefix, '').trim();
        }
        displayTitle += ` - ${cleanName || nextEp.name}`;
    }

    titleEl.textContent = displayTitle;
    titleEl.setAttribute('title', displayTitle);

    autoplayCountdown = 15; // 15 seconds countdown
    descEl.textContent = `Playing in ${autoplayCountdown} seconds...`;
    overlay.style.display = 'block';

    autoplayInterval = setInterval(() => {
        autoplayCountdown--;
        if (autoplayCountdown <= 0) {
            hideAutoplayOverlay();
            playNextEpisode();
        } else {
            descEl.textContent = `Playing in ${autoplayCountdown} seconds...`;
        }
    }, 1000);
}

window.Player.showAutoplayOverlay = showAutoplayOverlay;

async function playNextEpisode() {
    if (!nextEpisodeToPlay || !window.currentPlaybackChannel) return;

    const nextEp = nextEpisodeToPlay;
    nextEpisodeToPlay = null;
    hideAutoplayOverlay();

    console.log('[AUTOPLAY] Autoplaying next episode:', nextEp);

    let epDisplayName = nextEp.name || `Episode ${nextEp.episodeNum}`;
    const playlist = savedPlaylists.find(p => p.id.toString() === (window.currentPlaybackChannel.playlistId ? window.currentPlaybackChannel.playlistId.toString() : ''));
    if (nextEp.name && playlist && !playlist.epg?.startsWith('stalker:')) {
        const cleanPrefix = new RegExp(`^.*?\\b(s\\d+e\\d+|\\d+x\\d+|episode\\s*\\d+|ep\\s*\\d+)\\b\\s*[-_.:]?\\s*`, 'i');
        const cleaned = nextEp.name.replace(cleanPrefix, '').trim();
        if (cleaned) epDisplayName = cleaned;
    }

    const nextChannel = {
        title: `${window.currentPlaybackChannel.seriesTitle} - S${nextEp.season}E${nextEp.episodeNum} - ${epDisplayName}`,
        url: nextEp.url,
        logo: window.currentPlaybackChannel.logo,
        playlistId: window.currentPlaybackChannel.playlistId,
        type: 'episode',
        tmdbId: window.currentPlaybackChannel.tmdbId,
        seriesTitle: window.currentPlaybackChannel.seriesTitle,
        season: nextEp.season,
        episodeNum: nextEp.episodeNum,
        tmdbData: window.currentPlaybackChannel.tmdbData
    };

    embedStream(nextChannel);
    showToast(`Autoplaying: S${nextEp.season}E${nextEp.episodeNum}`);
}

window.Player.playNextEpisode = playNextEpisode;

function findNextEpisode() {
    if (!window.currentPlaybackChannel || window.currentPlaybackChannel.type !== 'episode' || !window.currentPlayingSeriesEpisodes || window.currentPlayingSeriesEpisodes.length === 0) {
        return null;
    }

    const currentSeason = parseInt(window.currentPlaybackChannel.season || 1);
    const currentEpNum = parseInt(window.currentPlaybackChannel.episodeNum || 1);

    // Find the next episode in the sorted list
    return window.currentPlayingSeriesEpisodes.find(ep => {
        const epS = parseInt(ep.season || 1);
        const epNum = parseInt(ep.episodeNum || 1);
        if (epS > currentSeason) return true;
        if (epS === currentSeason && epNum > currentEpNum) return true;
        return false;
    });
}

window.Player.findNextEpisode = findNextEpisode;

