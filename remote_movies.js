document.addEventListener('DOMContentLoaded', () => {
    let allMovies = [];
    let currentCategory = null;
    let stalkerCategories = [];
    let m3uGroups = {};

    const grid = document.getElementById('movies-grid');
    const searchInput = document.getElementById('movies-search');
    const toast = document.getElementById('toast');

    function showToast(msg) {
        toast.innerText = msg;
        toast.style.opacity = '1';
        setTimeout(() => toast.style.opacity = '0', 3000);
    }

    // Lazy load observer
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
        try {
            const res = await fetch('/api/movies');
            allMovies = await res.json();
            
            allMovies.forEach(c => {
                if (c.type === 'movie_category') {
                    stalkerCategories.push(c);
                } else if (c.type === 'movie') {
                    const groupName = c.group || 'Movies';
                    if (!m3uGroups[groupName]) m3uGroups[groupName] = [];
                    m3uGroups[groupName].push(c);
                }
            });

            renderCategories();
        } catch (e) {
            grid.innerHTML = '<div style="color:#ef4444; grid-column:1/-1; text-align:center;">Failed to load movies</div>';
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
            loadingDiv.innerHTML = 'Loading movies...';
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
                        isSeries: false,
                        categoryType: 'movie',
                        categoryName: currentCategory.title
                    })
                });
                const items = await res.json();
                loadingDiv.remove();
                if (!items || items.length === 0) {
                    grid.innerHTML += '<div style="grid-column: 1 / -1; color: #888; text-align: center;">No movies found.</div>';
                } else {
                    renderItems(items);
                }
            } catch (e) {
                loadingDiv.innerHTML = '<span style="color:#ef4444;">Failed to load movies.</span>';
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
            
            card.dataset.title = title.toLowerCase();
            
            card.innerHTML = `
                <div class="movie-poster-wrapper">
                    <img class="movie-poster" data-src="${logoUrl}" alt="${title.replace(/"/g, '&quot;')}" onerror="this.onerror=null; this.src='/player.png';">
                </div>
                <div class="movie-info">
                    <p class="movie-title" title="${title.replace(/"/g, '&quot;')}">${title}</p>
                </div>
            `;
            
            card.addEventListener('click', async () => {
                showToast(`Playing ${title} on TV...`);
                await fetch('/api/play', { 
                    method: 'POST', 
                    headers: { 'Content-Type': 'application/json' }, 
                    body: JSON.stringify({ url: item.url, title: title }) 
                });
            });
            
            grid.appendChild(card);
            
            const img = card.querySelector('.movie-poster');
            if (img) imageObserver.observe(img);
        });
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