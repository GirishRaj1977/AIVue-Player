var tmdbObserver = null;

function initTmdbObserver() {
    if (tmdbObserver) return;
    
    let requestQueue = [];
    let isProcessingQueue = false;
    
    async function processQueue() {
        if (requestQueue.length === 0) {
            isProcessingQueue = false;
            return;
        }
        isProcessingQueue = true;
        const task = requestQueue.shift();
        try {
            await task();
        } catch (e) {
            console.error('[TMDB QUEUE] Scraper task failed:', e);
        }
        setTimeout(processQueue, 150);
    }
    
    tmdbObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const card = entry.target;
                const title = card.dataset.title;
                const type = card.dataset.type;
                
                if (title && card.dataset.tmdbLoaded !== 'true') {
                    requestQueue.push(async () => {
                        if (card.dataset.tmdbLoaded === 'true') return;
                        
                        const tmdbType = type === 'series' ? 'tv' : 'movie';
                        const tmdbId = card.dataset.tmdbId;
                        let res;
                        
                        if (tmdbId) {
                            console.log(`[TMDB] Live viewport scraping by ID: "${tmdbId}" for "${title}" (${type})`);
                            res = await window.iptvAPI.fetchTmdbById({ tmdbId, type: tmdbType });
                        } else {
                            console.log(`[TMDB] Live viewport scraping by Title: "${title}" (${type})`);
                            res = await window.iptvAPI.fetchTmdbByTitle({ title, type: tmdbType });
                        }
                        
                        if (res && !res.error) {
                            card.dataset.tmdbLoaded = 'true';
                            card.dataset.tmdbData = JSON.stringify(res);
                            
                            if (res.poster_path) {
                                const img = card.querySelector('.catalog-poster');
                                if (img) {
                                    img.src = res.poster_path;
                                    img.style.opacity = '1';
                                }
                            }
                            
                            if (res.vote_average && res.vote_average > 0) {
                                const wrapper = card.querySelector('.catalog-poster-wrapper');
                                if (wrapper) {
                                    const badge = document.createElement('div');
                                    badge.className = 'catalog-rating-badge';
                                    badge.innerHTML = `★ ${parseFloat(res.vote_average).toFixed(1)}`;
                                    wrapper.appendChild(badge);
                                }
                            }
                        }
                    });
                    
                    if (!isProcessingQueue) {
                        processQueue();
                    }
                }
                tmdbObserver.unobserve(card);
            }
        });
    }, {
        rootMargin: '0px 200px 0px 200px'
    });
}

function injectTmdbEpgStyles() {
    if (document.getElementById('tmdb-epg-styles')) return;
    const style = document.createElement('style');
    style.id = 'tmdb-epg-styles';
    style.innerHTML = `
        .tmdb-epg-container {
            display: flex;
            gap: 20px;
            background: rgba(30, 30, 30, 0.4);
            border: 1px solid rgba(255, 255, 255, 0.05);
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
            margin-bottom: 10px;
            animation: fadeIn 0.4s ease-out;
            font-family: 'Outfit', 'Inter', sans-serif;
        }
        .tmdb-epg-poster-wrapper {
            width: 130px;
            flex-shrink: 0;
            position: relative;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 6px 16px rgba(0,0,0,0.6);
            aspect-ratio: 2/3;
            background: #1a1a1a;
            border: 1px solid rgba(255,255,255,0.08);
        }
        .tmdb-epg-poster {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        .tmdb-epg-content {
            flex-grow: 1;
            display: flex;
            flex-direction: column;
            gap: 12px;
        }
        .tmdb-epg-header {
            display: flex;
            flex-direction: column;
            gap: 6px;
        }
        .tmdb-epg-title {
            margin: 0;
            font-size: 1.6em;
            font-weight: 800;
            color: #fff;
            line-height: 1.2;
            text-shadow: 0 2px 4px rgba(0,0,0,0.5);
        }
        .tmdb-epg-subtitle {
            margin: 0;
            font-size: 1.15em;
            font-weight: 600;
            color: #bb86fc;
            line-height: 1.2;
        }
        .tmdb-epg-meta {
            display: flex;
            align-items: center;
            gap: 10px;
            flex-wrap: wrap;
            font-size: 0.85em;
            color: #aaa;
            margin-top: 4px;
        }
        .tmdb-epg-rating {
            background: rgba(255, 193, 7, 0.15);
            color: #ffc107;
            font-weight: bold;
            padding: 2px 8px;
            border-radius: 4px;
            border: 1px solid rgba(255, 193, 7, 0.3);
            display: flex;
            align-items: center;
            gap: 4px;
        }
        .tmdb-epg-badge {
            background: rgba(187, 134, 252, 0.15);
            color: #bb86fc;
            font-weight: bold;
            padding: 2px 8px;
            border-radius: 4px;
            border: 1px solid rgba(187, 134, 252, 0.25);
            text-transform: uppercase;
            font-size: 0.8em;
        }
        .tmdb-epg-overview {
            margin: 0;
            color: #ccc;
            font-size: 0.95em;
            line-height: 1.6;
            text-shadow: 0 1px 2px rgba(0,0,0,0.3);
        }
        .tmdb-epg-footer {
            border-top: 1px solid rgba(255, 255, 255, 0.08);
            padding-top: 12px;
            margin-top: 6px;
            display: flex;
            flex-direction: column;
            gap: 6px;
            font-size: 0.85em;
            color: #999;
        }
        .tmdb-epg-footer-item {
            display: flex;
            gap: 8px;
        }
        .tmdb-epg-footer-label {
            color: #bb86fc;
            font-weight: bold;
            text-transform: uppercase;
            font-size: 0.8em;
            width: 100px;
            flex-shrink: 0;
            letter-spacing: 0.5px;
        }
        .tmdb-epg-footer-value {
            color: #e0e0e0;
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        @media (max-width: 600px) {
            .tmdb-epg-container {
                flex-direction: column;
                align-items: center;
            }
            .tmdb-epg-poster-wrapper {
                width: 120px;
            }
        }
    `;
    document.head.appendChild(style);
}

async function loadAndRenderTmdbSynopsis(channel) {
    console.log('[TMDB EPG] Loading TMDB synopsis for channel:', channel.title);
    const container = document.getElementById('epg-container');
    if (!container) return;
    
    // Inject the CSS styles
    injectTmdbEpgStyles();
    
    // Show premium loader
    container.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px; color: #bb86fc; font-family: 'Outfit', 'Inter', sans-serif;">
            <div class="loader-spinner" style="margin-bottom: 15px; width: 36px; height: 36px;"></div>
            <span style="font-weight: 500; font-size: 1.1em; letter-spacing: 0.5px;">Fetching Synopsis from TMDB...</span>
        </div>
    `;
    
    const parsed = parseM3uSeriesName(channel.title);
    const hasSeriesPattern = channel.title && (
        /s\d+\s*e\d+/i.test(channel.title) || 
        /season\s*\d+\s*episode\s*\d+/i.test(channel.title) ||
        /\d+x\d+/i.test(channel.title)
    );
    const isEpisode = channel.type === 'episode' || channel.type === 'series' || hasSeriesPattern;
    
    let tmdbData = channel.tmdbData || null;
    let episodeData = null;
    let seriesTitle = channel.seriesTitle || parsed.seriesTitle;
    let seasonNum = channel.season || parsed.season || 1;
    let episodeNum = channel.episodeNum || parsed.episode || 1;
    
    try {
        if (isEpisode) {
            // Load TV Series TMDB Details
            if (!tmdbData) {
                let res;
                if (channel.tmdbId) {
                    res = await window.iptvAPI.fetchTmdbById({ tmdbId: channel.tmdbId, type: 'tv' });
                } else {
                    res = await window.iptvAPI.fetchTmdbByTitle({ title: seriesTitle, type: 'tv' });
                }
                if (res && !res.error) {
                    tmdbData = res;
                }
            }
            
            // Load Episode Specific Details from Season Details
            const tvId = tmdbData ? (tmdbData.tmdbId || tmdbData.id) : null;
            if (tvId) {
                console.log(`[TMDB EPG] Fetching Season ${seasonNum} episodes for TV ID: ${tvId}`);
                const tmdbSeason = await window.iptvAPI.fetchTmdbSeasonEpisodes({
                    tmdbId: tvId,
                    seasonNumber: seasonNum
                });
                if (tmdbSeason && tmdbSeason.episodes && !tmdbSeason.error) {
                    episodeData = tmdbSeason.episodes.find(e => e.episode_number === parseInt(episodeNum));
                }
            }
            
            renderTmdbEpisodeCard(channel, tmdbData, episodeData, seriesTitle, seasonNum, episodeNum);
        } else {
            // Load Movie TMDB Details
            if (!tmdbData) {
                let res;
                if (channel.tmdbId) {
                    res = await window.iptvAPI.fetchTmdbById({ tmdbId: channel.tmdbId, type: 'movie' });
                } else {
                    res = await window.iptvAPI.fetchTmdbByTitle({ title: channel.title, type: 'movie' });
                }
                if (res && !res.error) {
                    tmdbData = res;
                }
            }
            
            renderTmdbMovieCard(channel, tmdbData);
        }
    } catch (e) {
        console.error('[TMDB EPG ERR] Failed to load TMDB details:', e);
        renderTmdbFallbackCard(channel);
    }
}

function renderTmdbMovieCard(channel, tmdbData) {
    const container = document.getElementById('epg-container');
    if (!container) return;
    
    if (!tmdbData || tmdbData.error) {
        renderTmdbFallbackCard(channel);
        return;
    }
    
    const title = tmdbData.title || channel.title;
    const poster = tmdbData.poster_path || channel.logo || 'assets/logo.ico';
    const rating = tmdbData.vote_average && tmdbData.vote_average !== 'N/A' ? `★ ${parseFloat(tmdbData.vote_average).toFixed(1)}` : '';
    const releaseDate = tmdbData.release_date || '';
    const year = releaseDate && releaseDate !== 'N/A' ? new Date(releaseDate).getFullYear() : '';
    const runtime = tmdbData.runtime && tmdbData.runtime !== 'N/A' ? `${tmdbData.runtime}m` : '';
    const genres = tmdbData.genres && tmdbData.genres.length > 0 ? tmdbData.genres.map(g => g.name).join(', ') : '';
    const overview = tmdbData.overview || 'No synopsis available.';
    
    let director = tmdbData.director || '';
    let cast = tmdbData.cast && tmdbData.cast.length > 0 ? tmdbData.cast.join(', ') : '';
    
    if (!director && tmdbData.credits && tmdbData.credits.crew) {
        const dirObj = tmdbData.credits.crew.find(c => c.job === 'Director');
        if (dirObj) director = dirObj.name;
    }
    if (!cast && tmdbData.credits && tmdbData.credits.cast) {
        cast = tmdbData.credits.cast.slice(0, 5).map(c => c.name).join(', ');
    }
    
    let metaHtml = '';
    if (rating) metaHtml += `<span class="tmdb-epg-rating">${rating}</span>`;
    if (year) metaHtml += `<span>${year}</span>`;
    if (runtime) metaHtml += `<span>${runtime}</span>`;
    metaHtml += `<span class="tmdb-epg-badge">Movie</span>`;
    
    let footerHtml = '';
    if (genres) footerHtml += `<div class="tmdb-epg-footer-item"><span class="tmdb-epg-footer-label">Genres</span><span class="tmdb-epg-footer-value">${genres}</span></div>`;
    if (director && director !== 'N/A') footerHtml += `<div class="tmdb-epg-footer-item"><span class="tmdb-epg-footer-label">Director</span><span class="tmdb-epg-footer-value">${director}</span></div>`;
    if (cast) footerHtml += `<div class="tmdb-epg-footer-item"><span class="tmdb-epg-footer-label">Cast</span><span class="tmdb-epg-footer-value">${cast}</span></div>`;
    
    container.innerHTML = `
        <div class="tmdb-epg-container">
            <div class="tmdb-epg-poster-wrapper">
                <img class="tmdb-epg-poster" src="${poster}" alt="${title.replace(/"/g, '&quot;')}" onerror="this.onerror=null; this.src='assets/logo.ico';">
            </div>
            <div class="tmdb-epg-content">
                <div class="tmdb-epg-header">
                    <h3 class="tmdb-epg-title">${title}</h3>
                    <div class="tmdb-epg-meta">${metaHtml}</div>
                </div>
                <p class="tmdb-epg-overview">${overview}</p>
                ${footerHtml ? `<div class="tmdb-epg-footer">${footerHtml}</div>` : ''}
            </div>
        </div>
    `;
    
    // Update Now Playing EPG program info in Left Details Panel
    const detailProgram = document.getElementById('detail-program');
    if (detailProgram) {
        detailProgram.textContent = title;
    }
    const detailTimeslot = document.getElementById('detail-timeslot');
    if (detailTimeslot) {
        detailTimeslot.textContent = '';
    }
    const detailDescription = document.getElementById('detail-description');
    if (detailDescription) {
        detailDescription.textContent = '';
    }
    
    // Update pending EPG payload
    updateMpvEpgPayload(title, overview, runtime);
}

function renderTmdbEpisodeCard(channel, tmdbData, episodeData, seriesTitle, seasonNum, episodeNum) {
    const container = document.getElementById('epg-container');
    if (!container) return;
    
    if (!tmdbData || tmdbData.error) {
        renderTmdbFallbackCard(channel);
        return;
    }
    
    const showTitle = tmdbData.title || tmdbData.name || seriesTitle;
    const epTitle = episodeData && episodeData.name ? episodeData.name : `Episode ${episodeNum}`;
    
    // Use episode thumbnail still_path if available, otherwise series poster
    const poster = (episodeData && episodeData.still_path) || tmdbData.poster_path || channel.logo || 'assets/logo.ico';
    const rating = episodeData && episodeData.vote_average ? `★ ${parseFloat(episodeData.vote_average).toFixed(1)}` : (tmdbData.vote_average && tmdbData.vote_average !== 'N/A' ? `★ ${parseFloat(tmdbData.vote_average).toFixed(1)}` : '');
    const releaseDate = episodeData && episodeData.air_date ? episodeData.air_date : (tmdbData.release_date || '');
    const year = releaseDate && releaseDate !== 'N/A' ? new Date(releaseDate).getFullYear() : '';
    const genres = tmdbData.genres && tmdbData.genres.length > 0 ? tmdbData.genres.map(g => g.name).join(', ') : '';
    const overview = (episodeData && episodeData.overview && episodeData.overview !== 'No description available.') ? episodeData.overview : (tmdbData.overview || 'No synopsis available.');
    
    let cast = tmdbData.cast && tmdbData.cast.length > 0 ? tmdbData.cast.join(', ') : '';
    if (!cast && tmdbData.credits && tmdbData.credits.cast) {
        cast = tmdbData.credits.cast.slice(0, 5).map(c => c.name).join(', ');
    }
    
    let metaHtml = '';
    if (rating) metaHtml += `<span class="tmdb-epg-rating">${rating}</span>`;
    if (year) metaHtml += `<span>${year}</span>`;
    metaHtml += `<span class="tmdb-epg-badge">S${seasonNum}E${episodeNum}</span>`;
    metaHtml += `<span class="tmdb-epg-badge" style="background: rgba(43, 203, 68, 0.15); color: #43CB44; border-color: rgba(43, 203, 68, 0.25);">TV Show</span>`;
    
    let footerHtml = '';
    if (genres) footerHtml += `<div class="tmdb-epg-footer-item"><span class="tmdb-epg-footer-label">Genres</span><span class="tmdb-epg-footer-value">${genres}</span></div>`;
    if (cast) footerHtml += `<div class="tmdb-epg-footer-item"><span class="tmdb-epg-footer-label">Cast</span><span class="tmdb-epg-footer-value">${cast}</span></div>`;
    
    container.innerHTML = `
        <div class="tmdb-epg-container">
            <div class="tmdb-epg-poster-wrapper" style="${episodeData && episodeData.still_path ? 'aspect-ratio: 16/10; width: 180px;' : 'aspect-ratio: 2/3; width: 130px;'}">
                <img class="tmdb-epg-poster" src="${poster}" alt="${epTitle.replace(/"/g, '&quot;')}" onerror="this.onerror=null; this.src='assets/logo.ico';">
            </div>
            <div class="tmdb-epg-content">
                <div class="tmdb-epg-header">
                    <h3 class="tmdb-epg-title" style="font-size: 1.3em; color: #aaa; font-weight: 500; margin-bottom: 2px;">${showTitle}</h3>
                    <h4 class="tmdb-epg-subtitle" style="font-size: 1.6em; color: #fff; font-weight: 800;">${epTitle}</h4>
                    <div class="tmdb-epg-meta">${metaHtml}</div>
                </div>
                <p class="tmdb-epg-overview">${overview}</p>
                ${footerHtml ? `<div class="tmdb-epg-footer">${footerHtml}</div>` : ''}
            </div>
        </div>
    `;
    
    // Update Now Playing EPG program info in Left Details Panel
    const detailProgram = document.getElementById('detail-program');
    if (detailProgram) {
        detailProgram.textContent = `${showTitle} - S${seasonNum}E${episodeNum}`;
    }
    const detailTimeslot = document.getElementById('detail-timeslot');
    if (detailTimeslot) {
        detailTimeslot.textContent = '';
    }
    const detailDescription = document.getElementById('detail-description');
    if (detailDescription) {
        detailDescription.textContent = '';
    }
    
    // Update pending EPG payload
    updateMpvEpgPayload(`${showTitle} - S${seasonNum}E${episodeNum} - ${epTitle}`, overview, `S${seasonNum}E${episodeNum}`);
}

function renderTmdbFallbackCard(channel) {
    const container = document.getElementById('epg-container');
    if (!container) return;
    
    const parsed = parseM3uSeriesName(channel.title);
    const hasSeriesPattern = channel.title && (
        /s\d+\s*e\d+/i.test(channel.title) || 
        /season\s*\d+\s*episode\s*\d+/i.test(channel.title) ||
        /\d+x\d+/i.test(channel.title)
    );
    const isEpisode = channel.type === 'episode' || channel.type === 'series' || hasSeriesPattern;
    
    const title = channel.title || 'Unknown Stream';
    const poster = channel.logo || 'assets/logo.ico';
    
    container.innerHTML = `
        <div class="tmdb-epg-container">
            <div class="tmdb-epg-poster-wrapper">
                <img class="tmdb-epg-poster" src="${poster}" alt="${title.replace(/"/g, '&quot;')}" onerror="this.onerror=null; this.src='assets/logo.ico';">
            </div>
            <div class="tmdb-epg-content">
                <div class="tmdb-epg-header">
                    <h3 class="tmdb-epg-title">${title}</h3>
                    <div class="tmdb-epg-meta">
                        <span class="tmdb-epg-badge" style="background: rgba(255,255,255,0.05); color: #fff; border-color: rgba(255,255,255,0.1);">${isEpisode ? 'Episode' : 'Movie'}</span>
                    </div>
                </div>
                <p class="tmdb-epg-overview" style="color: #888; font-style: italic;">No synopsis available on TMDB. Please check if your TMDB API configuration is valid in Settings.</p>
            </div>
        </div>
    `;
    
    // Update Now Playing EPG program info in Left Details Panel
    const detailProgram = document.getElementById('detail-program');
    if (detailProgram) {
        detailProgram.textContent = title;
    }
    const detailTimeslot = document.getElementById('detail-timeslot');
    if (detailTimeslot) {
        detailTimeslot.textContent = '';
    }
    const detailDescription = document.getElementById('detail-description');
    if (detailDescription) {
        detailDescription.textContent = '';
    }
}
