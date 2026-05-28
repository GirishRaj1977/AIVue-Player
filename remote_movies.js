document.addEventListener('DOMContentLoaded', () => {
    const isSeriesPage = window.location.pathname === '/series';
    let allItems = [];
    let currentCategory = null;
    let stalkerCategories = [];
    let m3uGroups = {};

    const grid = document.getElementById('movies-grid');
    const searchInput = document.getElementById('movies-search');
    const toast = document.getElementById('toast');

    // Create Details Modal dynamically
    const modalHtml = `
    <div id="details-modal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); z-index: 10000; overflow-y: auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        <div style="width: 100%; max-width: 600px; margin: 0 auto; min-height: 100%; background: #121214; color: #e1e1e6; position: relative; padding-bottom: 40px; box-sizing: border-box;">
            <!-- Backdrop/Hero Header -->
            <div id="modal-backdrop-container" style="position: relative; width: 100%; height: 260px; background: #1a1a1e; background-size: cover; background-position: center; border-bottom: 2px solid rgba(187, 134, 252, 0.25);">
                <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: linear-gradient(to bottom, rgba(18,18,20,0.1), rgba(18,18,20,0.95));"></div>
                <button id="modal-close-btn" style="position: absolute; top: 15px; right: 15px; width: 36px; height: 36px; border-radius: 50%; border: none; background: rgba(0,0,0,0.6); color: white; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: bold; outline: none; z-index: 10100;">&times;</button>
            </div>
            
            <!-- Metadata & Poster Info block -->
            <div style="padding: 0 20px; margin-top: -80px; position: relative; display: flex; gap: 15px; align-items: flex-end;">
                <img id="modal-poster" src="/player.png" style="width: 110px; height: 165px; object-fit: cover; border-radius: 8px; box-shadow: 0 8px 16px rgba(0,0,0,0.5); background: #1a1a1e; border: 1.5px solid rgba(255,255,255,0.08);">
                <div style="flex: 1; min-width: 0;">
                    <h2 id="modal-title" style="margin: 0 0 6px 0; font-size: 1.4em; font-weight: bold; color: white; text-shadow: 0 2px 4px rgba(0,0,0,0.8); line-height: 1.2;">Title</h2>
                    <div style="display: flex; gap: 10px; flex-wrap: wrap; font-size: 0.8em; color: #a1a1aa;">
                        <span id="modal-year" style="font-weight: bold; color: #bb86fc;">Year</span>
                        <span id="modal-rating" style="background: rgba(187, 134, 252, 0.15); color: #bb86fc; padding: 2px 6px; border-radius: 4px; font-weight: bold; border: 1px solid rgba(187,134,252,0.25);">⭐ 0.0</span>
                    </div>
                </div>
            </div>

            <!-- Controls (Play / Resume) -->
            <div id="modal-play-controls" style="padding: 20px 20px 10px 20px; display: flex; flex-direction: column; gap: 10px;">
                <button id="modal-play-btn" style="width: 100%; height: 50px; background: #eab308; color: black; font-weight: bold; font-size: 1.05em; border: none; border-radius: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: 0.15s; outline: none;">
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M8 5v14l11-7z"/></svg> Play Movie
                </button>
                <button id="modal-resume-btn" style="display: none; width: 100%; height: 50px; background: #3b82f6; color: white; font-weight: bold; font-size: 1.05em; border: none; border-radius: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: 0.15s; outline: none;">
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/></svg> Resume at 00:00
                </button>
            </div>

            <!-- Overview & Metadata -->
            <div style="padding: 10px 20px;">
                <h4 style="color: #bb86fc; font-size: 0.85em; text-transform: uppercase; letter-spacing: 0.8px; margin: 0 0 8px 0;">Overview</h4>
                <p id="modal-overview" style="font-size: 0.9em; color: #a1a1aa; line-height: 1.5; margin: 0 0 20px 0;">No description available.</p>
                <div id="modal-genres-container" style="display: flex; gap: 6px; flex-wrap: wrap;"></div>
            </div>

            <!-- TV Series Seasons & Episodes Selector -->
            <div id="modal-series-section" style="display: none; padding: 15px 20px;">
                <h4 style="color: #bb86fc; font-size: 0.85em; text-transform: uppercase; letter-spacing: 0.8px; margin: 0 0 12px 0;">Episodes</h4>
                <select id="modal-season-select" style="width: 100%; padding: 12px; background: #1a1a1e; color: white; border: 1px solid #3c3c3c; border-radius: 8px; outline: none; margin-bottom: 15px; font-size: 0.95em; cursor: pointer;"></select>
                <div id="modal-episodes-list" style="display: flex; flex-direction: column; gap: 10px;"></div>
            </div>
        </div>
    </div>`;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const detailsModal = document.getElementById('details-modal');
    const modalCloseBtn = document.getElementById('modal-close-btn');
    const modalPlayBtn = document.getElementById('modal-play-btn');
    const modalResumeBtn = document.getElementById('modal-resume-btn');
    const modalSeasonSelect = document.getElementById('modal-season-select');
    const modalEpisodesList = document.getElementById('modal-episodes-list');

    modalCloseBtn.addEventListener('click', () => {
        detailsModal.style.display = 'none';
        document.body.style.overflow = '';
    });

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

    let tmdbObserver = null;
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
                    const title = card.dataset.originalTitle;
                    
                    if (title && card.dataset.tmdbLoaded !== 'true') {
                        requestQueue.push(async () => {
                            if (card.dataset.tmdbLoaded === 'true') return;
                            
                            const tmdbId = card.dataset.tmdbId;
                            const type = isSeriesPage ? 'series' : 'movie';
                            let url = `/api/tmdb/search?title=${encodeURIComponent(title)}&type=${type}`;
                            
                            if (tmdbId) {
                                url = `/api/tmdb/details?id=${tmdbId}&type=${type}`;
                            }
                            
                            try {
                                const res = await fetch(url);
                                const data = await res.json();
                                
                                if (data && !data.error) {
                                    card.dataset.tmdbLoaded = 'true';
                                    card.dataset.tmdbData = JSON.stringify(data);
                                    
                                    if (data.poster_path) {
                                        const img = card.querySelector('.movie-poster');
                                        if (img) {
                                            img.src = data.poster_path;
                                            img.style.opacity = '1';
                                        }
                                    }
                                } else {
                                    card.dataset.tmdbLoaded = 'error';
                                }
                            } catch (e) {
                                card.dataset.tmdbLoaded = 'error';
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

    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                if (img.dataset.src) {
                    img.src = img.dataset.src;
                    img.onload = () => img.style.opacity = '1';
                    img.removeAttribute('data-src');
                }
                observer.unobserve(img);
            }
        });
    }, { rootMargin: '0px 0px 200px 0px' });

    async function initializeApp() {
        initTmdbObserver();
        try {
            const apiEndpoint = isSeriesPage ? '/api/series' : '/api/movies';
            const res = await fetch(apiEndpoint);
            allItems = await res.json();
            
            allItems.forEach(c => {
                if (c.type === 'movie_category' || c.type === 'series_category' || c.type === 'vod_category') {
                    stalkerCategories.push(c);
                } else {
                    const groupName = c.group || (isSeriesPage ? 'Series' : 'Movies');
                    if (!m3uGroups[groupName]) m3uGroups[groupName] = [];
                    m3uGroups[groupName].push(c);
                }
            });

            renderCategories();
        } catch (e) {
            grid.innerHTML = `<div style="color:#ef4444; grid-column:1/-1; text-align:center;">Failed to load ${isSeriesPage ? 'series' : 'movies'}</div>`;
        }
    }

    function sortAlphaNum(a, b) {
        return (a || '').toString().localeCompare((b || '').toString(), undefined, { numeric: true, sensitivity: 'base' });
    }

    function renderCategories() {
        grid.innerHTML = '';
        grid.className = 'movies-grid';
        
        const renderFolder = (title, count, onClick) => {
            const card = document.createElement('div');
            card.className = 'folder-card';
            card.innerHTML = `
                <div class="folder-icon">
                    <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
                </div>
                <div class="folder-title" title="${title.replace(/"/g, '&quot;')}">${title}</div>
                ${count !== null ? `<div style="font-size:0.8em;color:#888;">${count} Items</div>` : ''}
            `;
            card.addEventListener('click', onClick);
            grid.appendChild(card);
        };
        
        stalkerCategories.forEach(cat => {
            renderFolder(cat.title || cat.name || cat.tvg_name, null, () => {
                currentCategory = {
                    type: 'stalker',
                    playlistId: cat.playlistId,
                    categoryId: cat.tvg_id,
                    title: cat.title || cat.name || cat.tvg_name,
                    source: cat.source,
                    epg: cat.epg
                };
                loadCategory();
            });
        });
        
        Object.keys(m3uGroups).sort(sortAlphaNum).forEach(groupName => {
            renderFolder(groupName, m3uGroups[groupName].length, () => {
                currentCategory = {
                    type: 'm3u',
                    playlistId: m3uGroups[groupName][0].playlistId,
                    categoryId: groupName,
                    title: groupName,
                    items: m3uGroups[groupName]
                };
                loadCategory();
            });
        });
    }

    async function loadCategory() {
        grid.innerHTML = '';
        
        const backBtnContainer = document.createElement('div');
        backBtnContainer.style.gridColumn = '1 / -1';
        backBtnContainer.style.display = 'flex';
        backBtnContainer.style.alignItems = 'center';
        backBtnContainer.style.gap = '15px';
        backBtnContainer.style.marginBottom = '10px';
        backBtnContainer.innerHTML = `
            <button style="background: #2a2a2a; color: white; display: flex; align-items: center; gap: 8px; border:none; padding:8px 12px; border-radius:6px; cursor:pointer;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                Back
            </button>
            <h3 style="margin: 0; color: #bb86fc;">${currentCategory.title}</h3>
        `;
        backBtnContainer.querySelector('button').addEventListener('click', () => {
            currentCategory = null;
            searchInput.value = '';
            renderCategories();
        });
        grid.appendChild(backBtnContainer);

        if (currentCategory.type === 'm3u') {
            renderItems(currentCategory.items);
        } else if (currentCategory.type === 'stalker') {
            const loadingDiv = document.createElement('div');
            loadingDiv.style.gridColumn = '1 / -1';
            loadingDiv.style.textAlign = 'center';
            loadingDiv.style.color = '#bb86fc';
            loadingDiv.innerHTML = `Loading ${isSeriesPage ? 'series' : 'movies'}...`;
            grid.appendChild(loadingDiv);

            try {
                const mac = currentCategory.epg.substring(8);
                const res = await fetch('/api/load-stalker-category', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        url: currentCategory.source,
                        mac: mac,
                        categoryId: currentCategory.categoryId,
                        isSeries: isSeriesPage,
                        categoryType: isSeriesPage ? 'series' : 'movie',
                        categoryName: currentCategory.title
                    })
                });
                const items = await res.json();
                loadingDiv.remove();
                if (!items || items.length === 0) {
                    grid.innerHTML += `<div style="grid-column: 1 / -1; color: #888; text-align: center;">No ${isSeriesPage ? 'series' : 'movies'} found.</div>`;
                } else {
                    renderItems(items);
                }
            } catch (e) {
                loadingDiv.innerHTML = `<span style="color:#ef4444;">Failed to load ${isSeriesPage ? 'series' : 'movies'}.</span>`;
            }
        }
    }

    function renderItems(items) {
        items.sort((a, b) => sortAlphaNum(a.name || a.title, b.name || b.title));
        items.forEach(item => {
            const card = document.createElement('div');
            card.className = 'movie-card';
            
            const title = item.name || item.title;
            const logoUrl = item.logo || '/player.png';
            const tmdbId = item.tmdb_id || item.tmdbId || '';
            
            card.dataset.title = title.toLowerCase();
            card.dataset.originalTitle = title;
            if (tmdbId) {
                card.dataset.tmdbId = tmdbId;
            }
            
            card.innerHTML = `
                <div class="movie-poster-wrapper">
                    <img class="movie-poster" data-src="${logoUrl}" alt="${title.replace(/"/g, '&quot;')}" onerror="this.onerror=null; this.src='/player.png';">
                </div>
                <div class="movie-info">
                    <p class="movie-title" title="${title.replace(/"/g, '&quot;')}">${title}</p>
                </div>
            `;
            
            card.addEventListener('click', () => {
                if (card.dataset.tmdbData) {
                    item.tmdbData = JSON.parse(card.dataset.tmdbData);
                }
                showDetailsModal(item);
            });
            grid.appendChild(card);
            
            const img = card.querySelector('.movie-poster');
            if (img) imageObserver.observe(img);
            if (tmdbObserver) tmdbObserver.observe(card);
        });
    }

    function formatTime(secs) {
        const h = Math.floor(secs / 3600);
        const m = Math.floor((secs % 3600) / 60);
        const s = Math.floor(secs % 60);
        return h > 0 
            ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}` 
            : `${m}:${s.toString().padStart(2, '0')}`;
    }

    async function showDetailsModal(item) {
        // Reset modal layout
        document.getElementById('modal-backdrop-container').style.backgroundImage = '';
        
        // Instant local metadata fallback
        const localPoster = item.logo || item.poster || item.image || '/player.png';
        document.getElementById('modal-poster').src = localPoster;
        document.getElementById('modal-title').innerText = item.name || item.title;
        
        const localYear = item.year || (item.releaseDate ? new Date(item.releaseDate).getFullYear() : '');
        document.getElementById('modal-year').innerText = localYear;
        
        const localRating = item.rating || item.vote_average || '';
        const rateBadge = document.getElementById('modal-rating');
        if (localRating) {
            rateBadge.style.display = 'inline-block';
            rateBadge.innerText = `⭐ ${parseFloat(localRating).toFixed(1)}`;
        } else {
            rateBadge.style.display = 'none';
        }
        
        const localPlot = item.plot || item.description || item.overview || item.summary || '';
        document.getElementById('modal-overview').innerText = localPlot || 'Loading details from TMDB...';
        
        document.getElementById('modal-genres-container').innerHTML = '';
        document.getElementById('modal-series-section').style.display = 'none';
        modalPlayBtn.style.display = isSeriesPage ? 'none' : 'block';
        modalResumeBtn.style.display = 'none';
        
        detailsModal.style.display = 'block';
        document.body.style.overflow = 'hidden';

        // 1. Fetch TMDB details
        let tmdbData = item.tmdbData || null;
        if (!tmdbData) {
            try {
                const tmdbId = item.tmdb_id || item.tmdbId;
                let url = `/api/tmdb/search?title=${encodeURIComponent(item.name || item.title)}&type=${isSeriesPage ? 'series' : 'movie'}`;
                if (tmdbId) {
                    url = `/api/tmdb/details?id=${tmdbId}&type=${isSeriesPage ? 'series' : 'movie'}`;
                }
                const res = await fetch(url);
                tmdbData = await res.json();
            } catch (e) {
                console.error('TMDB load error:', e);
            }
        }
        
        try {
            if (tmdbData && !tmdbData.error) {
                if (tmdbData.backdrop_path) {
                    document.getElementById('modal-backdrop-container').style.backgroundImage = `url(${tmdbData.backdrop_path})`;
                }
                if (tmdbData.poster_path) {
                    document.getElementById('modal-poster').src = tmdbData.poster_path;
                }
                if (tmdbData.release_date || tmdbData.first_air_date) {
                    const date = tmdbData.release_date || tmdbData.first_air_date;
                    document.getElementById('modal-year').innerText = new Date(date).getFullYear();
                }
                if (tmdbData.vote_average && tmdbData.vote_average !== 'N/A') {
                    rateBadge.style.display = 'inline-block';
                    rateBadge.innerText = `⭐ ${parseFloat(tmdbData.vote_average).toFixed(1)}`;
                }
                if (tmdbData.overview) {
                    document.getElementById('modal-overview').innerText = tmdbData.overview;
                }
                if (tmdbData.genres && Array.isArray(tmdbData.genres)) {
                    const genresContainer = document.getElementById('modal-genres-container');
                    tmdbData.genres.forEach(g => {
                        const span = document.createElement('span');
                        span.style.cssText = "background: rgba(255,255,255,0.06); padding: 4px 10px; border-radius: 20px; font-size: 0.75em; border: 1px solid rgba(255,255,255,0.08); color: #ccc;";
                        span.innerText = g.name;
                        genresContainer.appendChild(span);
                    });
                }
            } else {
                if (!localPlot) {
                    document.getElementById('modal-overview').innerText = 'No description available.';
                }
            }
        } catch (e) {
            console.error('TMDB rendering error:', e);
            if (!localPlot) {
                document.getElementById('modal-overview').innerText = 'No description available.';
            }
        }

        // 2. Playback progress lookup & play binding (for movies)
        if (!isSeriesPage) {
            const tmdbId = tmdbData ? tmdbData.tmdbId : null;
            const progressId = tmdbId ? `tmdb:${tmdbId}` : `url:${item.url}`;
            
            try {
                const progRes = await fetch(`/api/progress?id=${encodeURIComponent(progressId)}`);
                const progress = await progRes.json();
                
                if (progress && progress.position > 5 && progress.completed === 0) {
                    modalResumeBtn.style.display = 'flex';
                    modalResumeBtn.innerText = `Resume at ${formatTime(progress.position)}`;
                    modalResumeBtn.onclick = () => playStream(item, progress.position, tmdbId);
                }
            } catch (e) {}

            modalPlayBtn.onclick = () => playStream(item, 0, tmdbId);
        } else {
            // For series, load seasons and episode grids
            document.getElementById('modal-series-section').style.display = 'block';
            modalEpisodesList.innerHTML = '<div style="color: #888; text-align: center; padding: 20px;">Selecting Season...</div>';
            
            if (tmdbData && tmdbData.seasons) {
                modalSeasonSelect.innerHTML = '';
                const validSeasons = tmdbData.seasons.filter(s => s.season_number > 0);
                validSeasons.forEach(s => {
                    const opt = document.createElement('option');
                    opt.value = s.season_number;
                    opt.innerText = s.name || `Season ${s.season_number}`;
                    modalSeasonSelect.appendChild(opt);
                });
                
                modalSeasonSelect.onchange = () => loadSeasonEpisodes(tmdbData.tmdbId, modalSeasonSelect.value, item);
                if (validSeasons.length > 0) {
                    loadSeasonEpisodes(tmdbData.tmdbId, validSeasons[0].season_number, item);
                }
            } else {
                // If not in TMDB or no seasons data, fallback to stalker/m3u list if available
                modalSeasonSelect.innerHTML = '<option value="1">Default Season</option>';
                modalEpisodesList.innerHTML = '<div style="color: #888; text-align: center; padding: 20px;">Use Desktop App to browse custom episodes without TMDB.</div>';
            }
        }
    }

    async function loadSeasonEpisodes(tmdbId, seasonNum, seriesItem) {
        modalEpisodesList.innerHTML = '<div style="color: #888; text-align: center; padding: 20px;">Loading episodes...</div>';
        try {
            const res = await fetch(`/api/tmdb/season?id=${tmdbId}&season=${seasonNum}`);
            const seasonData = await res.json();
            modalEpisodesList.innerHTML = '';
            
            if (seasonData && seasonData.episodes) {
                for (const ep of seasonData.episodes) {
                    const epDiv = document.createElement('div');
                    epDiv.style.cssText = "background: #1a1a1e; border: 1px solid rgba(255,255,255,0.06); border-radius: 10px; padding: 12px; display: flex; flex-direction: column; gap: 8px;";
                    
                    // Progress tracking ID
                    const progressId = `tmdb:${tmdbId}:s${seasonNum}:e${ep.episode_number}`;
                    let progressHtml = '';
                    let savedProgress = null;
                    try {
                        const progRes = await fetch(`/api/progress?id=${encodeURIComponent(progressId)}`);
                        savedProgress = await progRes.json();
                        if (savedProgress && savedProgress.position > 5) {
                            const percent = Math.min(100, Math.floor((savedProgress.position / savedProgress.duration) * 100));
                            progressHtml = `
                            <div style="width: 100%; height: 4px; background: rgba(255,255,255,0.08); border-radius: 2px; overflow: hidden; margin-top: 5px;">
                                <div style="width: ${percent}%; height: 100%; background: #3b82f6;"></div>
                            </div>
                            <span style="font-size: 0.75em; color: #a1a1aa;">${percent}% watched</span>`;
                        }
                    } catch (e) {}

                    epDiv.innerHTML = `
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 10px;">
                            <span style="font-weight: bold; font-size: 0.95em; color: white;">E${ep.episode_number} - ${ep.name}</span>
                            <div style="display: flex; gap: 8px;">
                                <button class="play-ep-btn" style="background:#eab308; color:black; font-weight:bold; padding: 6px 12px; border:none; border-radius:6px; cursor:pointer; font-size:0.85em;">Play</button>
                                ${savedProgress && savedProgress.position > 5 && savedProgress.completed === 0 ? `<button class="resume-ep-btn" style="background:#3b82f6; color:white; font-weight:bold; padding: 6px 12px; border:none; border-radius:6px; cursor:pointer; font-size:0.85em;">Resume</button>` : ''}
                            </div>
                        </div>
                        ${ep.overview ? `<p style="font-size:0.8em; color:#888; margin: 0; line-height:1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; text-overflow: ellipsis;">${ep.overview}</p>` : ''}
                        ${progressHtml}
                    `;
                    
                    const playBtn = epDiv.querySelector('.play-ep-btn');
                    playBtn.addEventListener('click', () => {
                        playEpisode(seriesItem, ep.episode_number, seasonNum, 0, tmdbId, ep.name);
                    });
                    
                    const resumeBtn = epDiv.querySelector('.resume-ep-btn');
                    if (resumeBtn && savedProgress) {
                        resumeBtn.addEventListener('click', () => {
                            playEpisode(seriesItem, ep.episode_number, seasonNum, savedProgress.position, tmdbId, ep.name);
                        });
                    }

                    modalEpisodesList.appendChild(epDiv);
                }
            } else {
                modalEpisodesList.innerHTML = '<div style="color: #888; text-align: center; padding: 20px;">No episodes found.</div>';
            }
        } catch (e) {
            modalEpisodesList.innerHTML = '<div style="color: #ef4444; text-align: center; padding: 20px;">Failed to load episodes.</div>';
        }
    }

    async function playStream(item, position = 0, tmdbId = null) {
        showToast(`Resuming ${item.name || item.title} on PC...`);
        try {
            await fetch('/api/play', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url: item.url || item.cmd,
                    title: item.name || item.title,
                    position: position,
                    type: 'movie',
                    tmdbId: tmdbId
                })
            });
        } catch (e) {
            showToast('Playback request failed.');
        }
    }

    async function playEpisode(seriesItem, episodeNum, seasonNum, position = 0, tmdbId = null, epTitle = '') {
        const fullTitle = `${seriesItem.name || seriesItem.title} - S${seasonNum.toString().padStart(2, '0')}E${episodeNum.toString().padStart(2, '0')} - ${epTitle}`;
        showToast(`Playing ${fullTitle} on PC...`);
        
        let targetUrl = seriesItem.url || seriesItem.cmd;
        
        // For Stalker series portals, format series url command string
        if (targetUrl && targetUrl.startsWith('stalker-category:series|')) {
            const categoryId = targetUrl.split('|')[1];
            targetUrl = `stalker-series-ep:${categoryId}|${seasonNum}|${episodeNum}`;
        }

        try {
            await fetch('/api/play', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url: targetUrl,
                    title: fullTitle,
                    position: position,
                    type: 'episode',
                    tmdbId: tmdbId,
                    season: seasonNum,
                    episodeNum: episodeNum
                })
            });
        } catch (e) {
            showToast('Playback request failed.');
        }
    }

    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        if (currentCategory) {
            const cards = grid.querySelectorAll('.movie-card');
            cards.forEach(card => {
                if (card.dataset.title.includes(query)) {
                    card.style.display = 'flex';
                } else {
                    card.style.display = 'none';
                }
            });
        } else {
            const cards = grid.querySelectorAll('.folder-card');
            cards.forEach(card => {
                const title = card.querySelector('.folder-title').textContent.toLowerCase();
                if (title.includes(query)) {
                    card.style.display = 'flex';
                } else {
                    card.style.display = 'none';
                }
            });
        }
    });

    initializeApp();
});