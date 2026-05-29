const path = require('path');
const fs = require('fs');
const { app } = require('electron');

let tmdbConfig = { apiKey: '', apiToken: '' };
const tmdbConfigPath = path.join(app.getPath('userData'), 'tmdb_config.json');

try {
    if (fs.existsSync(tmdbConfigPath)) {
        tmdbConfig = { ...tmdbConfig, ...JSON.parse(fs.readFileSync(tmdbConfigPath, 'utf8')) };
    }
} catch (e) {
    console.error("Failed to load TMDB config", e);
}

function getConfig() {
    return tmdbConfig;
}

function saveConfig(config) {
    tmdbConfig = config;
    try {
        fs.writeFileSync(tmdbConfigPath, JSON.stringify(tmdbConfig));
        return { success: true, status: 'Connected' };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

async function testConnection(config) {
    if (!config.apiKey && !config.apiToken) {
        return { valid: false, error: 'API credentials missing' };
    }
    
    let url = 'https://api.themoviedb.org/3/authentication';
    let headers = { 'Accept': 'application/json' };
    
    if (config.apiToken) {
        headers['Authorization'] = `Bearer ${config.apiToken}`;
    } else if (config.apiKey) {
        url += `?api_key=${config.apiKey}`;
    }
    
    try {
        const response = await fetch(url, { headers });
        if (response.ok) {
            const data = await response.json();
            return { valid: data.success === true, error: null };
        } else {
            const data = await response.json().catch(() => ({}));
            return { valid: false, error: data.status_message || `HTTP ${response.status}` };
        }
    } catch (e) {
        return { valid: false, error: e.message };
    }
}

async function cleanTitleForSearch(title) {
    if (!title) return { cleanTitle: '', year: null };
    let clean = title.replace(/\b(1080p|720p|4k|2160p|uhd|fhd|hd|hdr|bluray|blu-ray|webrip|web-dl|h264|h265|x264|x265|hevc|multi|dd5\.1|aac)\b/gi, '');
    const yearMatch = clean.match(/\b(19\d\d|20\d\d)\b/);
    const year = yearMatch ? yearMatch[0] : null;
    
    clean = clean.replace(/[.\-_\[\]()]/g, ' ');
    clean = clean.replace(/\s+/g, ' ').trim();
    
    return { cleanTitle: clean, year };
}

async function fetchDetails(tmdbId, tmdbType, headers) {
    if (!headers) {
        headers = { 'Accept': 'application/json' };
        if (tmdbConfig.apiToken) {
            headers['Authorization'] = `Bearer ${tmdbConfig.apiToken}`;
        }
    }

    let url = `https://api.themoviedb.org/3/${tmdbType}/${tmdbId}?append_to_response=credits,recommendations,images&include_image_language=en,null`;
    if (tmdbConfig.apiToken) {
        // Bearer auth in headers
    } else if (tmdbConfig.apiKey) {
        url += `&api_key=${tmdbConfig.apiKey}`;
    }
    
    try {
        const res = await fetch(url, { headers });
        if (!res.ok) {
            throw new Error(`Details fetch failed: HTTP ${res.status}`);
        }
        const data = await res.json();
        
        let director = 'N/A';
        let cast = [];
        if (data.credits) {
            if (data.credits.crew) {
                const dirObj = data.credits.crew.find(c => c.job === 'Director');
                if (dirObj) director = dirObj.name;
            }
            if (data.credits.cast) {
                cast = data.credits.cast.slice(0, 5).map(c => c.name);
            }
        }
        
        let logo_path = '';
        if (data.images && data.images.logos && data.images.logos.length > 0) {
            const enLogo = data.images.logos.find(l => l.iso_639_1 === 'en');
            const bestLogo = enLogo || data.images.logos[0];
            logo_path = `https://image.tmdb.org/t/p/w500${bestLogo.file_path}`;
        }
        
        return {
            tmdbId: String(data.id),
            title: data.title || data.name || 'Unknown Title',
            overview: data.overview || 'No description available.',
            backdrop_path: data.backdrop_path ? `https://image.tmdb.org/t/p/original${data.backdrop_path}` : '',
            poster_path: data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : '',
            logo_path,
            vote_average: data.vote_average ? data.vote_average.toFixed(1) : 'N/A',
            release_date: data.release_date || data.first_air_date || 'N/A',
            genres: data.genres || [],
            credits: data.credits || { crew: [], cast: [] },
            created_by: data.created_by || [],
            director,
            cast,
            runtime: data.runtime || (data.episode_run_time && data.episode_run_time.length > 0 ? data.episode_run_time[0] : null) || 'N/A',
            seasons: data.seasons || [],
            number_of_seasons: data.number_of_seasons || 0,
            number_of_episodes: data.number_of_episodes || 0
        };
    } catch (e) {
        console.error(`[TMDB API ERR] Details fetch failed:`, e.message);
        return { error: e.message };
    }
}

async function fetchByTitle(title, type) {
    if (!tmdbConfig.apiKey && !tmdbConfig.apiToken) {
        return { error: 'TMDB API not configured' };
    }
    
    const { cleanTitle, year } = await cleanTitleForSearch(title);
    if (!cleanTitle) return { error: 'Empty search query' };
    
    const isSeries = type === 'series' || type === 'vod';
    const tmdbType = isSeries ? 'tv' : 'movie';
    
    let url = `https://api.themoviedb.org/3/search/${tmdbType}?query=${encodeURIComponent(cleanTitle)}`;
    if (year) {
        if (isSeries) {
            url += `&first_air_date_year=${year}`;
        } else {
            url += `&year=${year}`;
        }
    }
    
    let headers = { 'Accept': 'application/json' };
    if (tmdbConfig.apiToken) {
        headers['Authorization'] = `Bearer ${tmdbConfig.apiToken}`;
    } else if (tmdbConfig.apiKey) {
        url += `&api_key=${tmdbConfig.apiKey}`;
    }
    
    try {
        console.log(`[TMDB API] Searching for ${tmdbType}: "${cleanTitle}" (Year: ${year || 'Any'})`);
        const searchRes = await fetch(url, { headers });
        if (!searchRes.ok) {
            throw new Error(`Search failed: HTTP ${searchRes.status}`);
        }
        const searchData = await searchRes.json();
        if (!searchData.results || searchData.results.length === 0) {
            if (year) {
                console.log(`[TMDB API] No results with year. Retrying search without year for: "${cleanTitle}"`);
                let retryUrl = `https://api.themoviedb.org/3/search/${tmdbType}?query=${encodeURIComponent(cleanTitle)}`;
                if (tmdbConfig.apiToken) {
                    // already in headers
                } else if (tmdbConfig.apiKey) {
                    retryUrl += `&api_key=${tmdbConfig.apiKey}`;
                }
                const retryRes = await fetch(retryUrl, { headers });
                if (retryRes.ok) {
                    const retryData = await retryRes.json();
                    if (retryData.results && retryData.results.length > 0) {
                        return await fetchDetails(retryData.results[0].id, tmdbType, headers);
                    }
                }
            }
            return { error: 'No results found' };
        }
        
        const bestMatch = searchData.results[0];
        return await fetchDetails(bestMatch.id, tmdbType, headers);
    } catch (err) {
        console.error(`[TMDB API ERR] Search failed for "${title}":`, err.message);
        return { error: err.message };
    }
}

async function fetchById(tmdbId, type) {
    if (!tmdbConfig.apiKey && !tmdbConfig.apiToken) {
        return { error: 'TMDB API not configured' };
    }
    
    if (!tmdbId) return { error: 'Empty TMDB ID' };
    
    const isSeries = type === 'series' || type === 'vod';
    const tmdbType = isSeries ? 'tv' : 'movie';
    
    let headers = { 'Accept': 'application/json' };
    if (tmdbConfig.apiToken) {
        headers['Authorization'] = `Bearer ${tmdbConfig.apiToken}`;
    }
    
    try {
        console.log(`[TMDB API] Fetching details directly by ID for ${tmdbType}: "${tmdbId}"`);
        return await fetchDetails(tmdbId, tmdbType, headers);
    } catch (err) {
        console.error(`[TMDB API ERR] Details fetch failed for ID "${tmdbId}":`, err.message);
        return { error: err.message };
    }
}

async function fetchSeasonEpisodes(tmdbId, seasonNumber) {
    if (!tmdbConfig.apiKey && !tmdbConfig.apiToken) {
        return { error: 'TMDB API not configured' };
    }
    
    if (!tmdbId) return { error: 'Empty TMDB ID' };
    const cleanSeasonNum = parseInt(seasonNumber) || 1;
    
    let url = `https://api.themoviedb.org/3/tv/${tmdbId}/season/${cleanSeasonNum}`;
    let headers = { 'Accept': 'application/json' };
    if (tmdbConfig.apiToken) {
        headers['Authorization'] = `Bearer ${tmdbConfig.apiToken}`;
    } else if (tmdbConfig.apiKey) {
        url += `&api_key=${tmdbConfig.apiKey}`;
    }
    
    try {
        console.log(`[TMDB API] Fetching season episodes for TV ID ${tmdbId}, Season ${cleanSeasonNum}`);
        const res = await fetch(url, { headers });
        if (!res.ok) {
            throw new Error(`Season fetch failed: HTTP ${res.status}`);
        }
        const data = await res.json();
        
        const episodes = (data.episodes || []).map(ep => ({
            episode_number: ep.episode_number,
            name: ep.name || `Episode ${ep.episode_number}`,
            overview: ep.overview || 'No description available.',
            still_path: ep.still_path ? `https://image.tmdb.org/t/p/w500${ep.still_path}` : ''
        }));
        
        return {
            season_number: data.season_number,
            name: data.name,
            overview: data.overview,
            poster_path: data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : '',
            episodes
        };
    } catch (err) {
        console.error(`[TMDB API ERR] Season episodes fetch failed for TV ID "${tmdbId}", Season "${cleanSeasonNum}":`, err.message);
        return { error: err.message };
    }
}

module.exports = {
    getConfig,
    saveConfig,
    testConnection,
    cleanTitleForSearch,
    fetchDetails,
    fetchByTitle,
    fetchById,
    fetchSeasonEpisodes
};
