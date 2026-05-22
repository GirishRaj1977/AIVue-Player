const { app, BrowserWindow, ipcMain, dialog, Menu, MenuItem, clipboard } = require('electron');
const path = require('path');
const { spawn, execFile } = require('child_process');
const net = require('net');
const fs = require('fs');
const crypto = require('crypto');

// Force all native warnings, dialogs, and popups to use the main window title
const originalUserData = app.getPath('userData');
app.name = 'AIVue Player';
app.setPath('userData', originalUserData); // Prevents wiping the user's data due to the name change!

// --- SQLite Database Initialization ---
const dbPath = path.join(app.getPath('userData'), 'iptv.db');
let db;
try {
    const Database = require('better-sqlite3');
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL'); // Enables high-performance concurrent reads/writes
    
    db.exec(`
        CREATE TABLE IF NOT EXISTS playlists (
            id TEXT PRIMARY KEY,
            name TEXT,
            source_url TEXT UNIQUE,
            epg_url TEXT,
            is_disabled INTEGER DEFAULT 0
        );
        
        CREATE TABLE IF NOT EXISTS channels (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            playlist_id TEXT,
            tvg_id TEXT,
            tvg_name TEXT,
            title TEXT,
            logo TEXT,
            group_name TEXT,
            stream_url TEXT,
            is_favourite INTEGER DEFAULT 0,
            is_disabled INTEGER DEFAULT 0,
            type TEXT DEFAULT 'live',
            FOREIGN KEY(playlist_id) REFERENCES playlists(id) ON DELETE CASCADE
        );
        
        CREATE TABLE IF NOT EXISTS epg (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            channel_id TEXT,
            start_time TEXT,
            stop_time TEXT,
            title TEXT,
            description TEXT,
            source_url TEXT
        );

        CREATE TABLE IF NOT EXISTS mappings (
            channel_title TEXT PRIMARY KEY,
            epg_id TEXT
        );
        
        CREATE TABLE IF NOT EXISTS external_epgs (
            source_url TEXT PRIMARY KEY
        );

        CREATE TABLE IF NOT EXISTS dvr_schedule (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            channel_url TEXT,
            start_time TEXT,
            end_time TEXT,
            status TEXT DEFAULT 'pending',
            file_path TEXT
        );

        -- Indexes for lightning fast lookups
        CREATE INDEX IF NOT EXISTS idx_channels_playlist ON channels(playlist_id);
        CREATE INDEX IF NOT EXISTS idx_channels_group ON channels(group_name);
        CREATE INDEX IF NOT EXISTS idx_channels_title ON channels(title);
        CREATE INDEX IF NOT EXISTS idx_epg_channel ON epg(channel_id);
    `);
    
    // Safety check for existing channels table (in case it didn't have type column previously)
    try {
        db.exec("ALTER TABLE channels ADD COLUMN type TEXT DEFAULT 'live'");
    } catch (e) {
        // column type already exists
    }
    
    // Safety check for existing playlists table (in case it didn't have exp_date column previously)
    try {
        db.exec("ALTER TABLE playlists ADD COLUMN exp_date TEXT");
    } catch (e) {
        // column exp_date already exists
    }
    
    console.log("[DB] SQLite Database initialized at", dbPath);
} catch (err) {
    console.warn("[DB] better-sqlite3 not installed yet. Run 'npm install better-sqlite3'.");
}

// --- Remote Settings Initialization ---
let remoteSettings = { enabled: false, username: '', password: '', port: 8088, activeDeviceId: null };
const remoteSettingsPath = path.join(app.getPath('userData'), 'remote_settings.json');
try {
    if (fs.existsSync(remoteSettingsPath)) {
        remoteSettings = { ...remoteSettings, ...JSON.parse(fs.readFileSync(remoteSettingsPath, 'utf8')) };
    }
} catch (e) {
    console.error("Failed to load remote settings", e);
}

ipcMain.handle('get-remote-settings', () => remoteSettings);
ipcMain.handle('save-remote-settings', (event, settings) => {
    const needsRestart = (remoteSettings.enabled !== settings.enabled) || (remoteSettings.port !== settings.port);
    remoteSettings = settings;
    try { fs.writeFileSync(remoteSettingsPath, JSON.stringify(remoteSettings)); } catch (e) { return false; }
    if (needsRestart) initRemoteServer();
    return true;
});

// --- TMDB API Settings Initialization ---
let tmdbConfig = { apiKey: '', apiToken: '' };
const tmdbConfigPath = path.join(app.getPath('userData'), 'tmdb_config.json');
try {
    if (fs.existsSync(tmdbConfigPath)) {
        tmdbConfig = { ...tmdbConfig, ...JSON.parse(fs.readFileSync(tmdbConfigPath, 'utf8')) };
    }
} catch (e) {
    console.error("Failed to load TMDB config", e);
}

async function testTmdbConnection(config) {
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
    // Normalize and remove common quality/release tags:
    let clean = title.replace(/\b(1080p|720p|4k|2160p|uhd|fhd|hd|hdr|bluray|blu-ray|webrip|web-dl|h264|h265|x264|x265|hevc|multi|dd5\.1|aac)\b/gi, '');
    const yearMatch = clean.match(/\b(19\d\d|20\d\d)\b/);
    const year = yearMatch ? yearMatch[0] : null;
    
    // Remove punctuation except spaces
    clean = clean.replace(/[.\-_\[\]()]/g, ' ');
    clean = clean.replace(/\s+/g, ' ').trim();
    
    return { cleanTitle: clean, year };
}

async function fetchDetails(tmdbId, tmdbType, headers) {
    let url = `https://api.themoviedb.org/3/${tmdbType}/${tmdbId}?append_to_response=credits,recommendations`;
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
        
        return {
            tmdbId: String(data.id),
            title: data.title || data.name || 'Unknown Title',
            overview: data.overview || 'No description available.',
            backdrop_path: data.backdrop_path ? `https://image.tmdb.org/t/p/original${data.backdrop_path}` : '',
            poster_path: data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : '',
            vote_average: data.vote_average ? data.vote_average.toFixed(1) : 'N/A',
            release_date: data.release_date || data.first_air_date || 'N/A',
            genres: data.genres ? data.genres.map(g => g.name) : [],
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

ipcMain.handle('get-tmdb-config', () => tmdbConfig);
ipcMain.handle('save-tmdb-config', async (event, config) => {
    tmdbConfig = config;
    try {
        fs.writeFileSync(tmdbConfigPath, JSON.stringify(tmdbConfig));
    } catch (e) {
        return { success: false, error: e.message };
    }
    
    if (!tmdbConfig.apiKey && !tmdbConfig.apiToken) {
        return { success: true, status: 'Not Configured' };
    }
    
    try {
        const testRes = await testTmdbConnection(tmdbConfig);
        return { success: testRes.valid, status: testRes.valid ? 'Connected' : 'Invalid Credentials', error: testRes.error };
    } catch (err) {
        return { success: false, status: 'Error', error: err.message };
    }
});

ipcMain.handle('fetch-tmdb-by-title', async (event, { title, type }) => {
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
});

ipcMain.handle('fetch-tmdb-by-id', async (event, { tmdbId, type }) => {
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
});

ipcMain.handle('fetch-tmdb-season-episodes', async (event, { tmdbId, seasonNumber }) => {
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
});

let mainWindow;
let playerWindow;
let mpvProcess;
let currentDOMBounds = null;
let ipcClient = null;
let isMpvReady = false;
let ipcConnectionAttempts = 0;
let reconnectTimer = null;
let splashWindow = null;
let isMainReadyToShow = false;
let shouldShowMainWindow = false;
let isSplashEnded = false;
const ipcPath = process.platform === 'win32' ? '\\\\.\\pipe\\mpv-electron-ipc' : '/tmp/mpv-electron-ipc';

// Fix for "Network service crashed" on Windows (disables Chromium sandbox and HW acceleration)
app.commandLine.appendSwitch('no-sandbox');
app.disableHardwareAcceleration();
// Suppress harmless DirectComposition GPU driver warnings on Windows
app.commandLine.appendSwitch('log-level', '3'); // Suppress Chromium console spam

ipcMain.on('splash-ended', () => {
    console.log('[EVENT] splash-ended');
    isSplashEnded = true;
    checkAndShowMainWindow();
});

function showMainWindowAndHideSplash() {
    shouldShowMainWindow = true;
    checkAndShowMainWindow();
}

function checkAndShowMainWindow() {
    if (shouldShowMainWindow && isMainReadyToShow && isSplashEnded) {
        if (splashWindow && !splashWindow.isDestroyed()) {
            splashWindow.destroy();
        }
        if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isVisible()) {
                mainWindow.maximize();
                mainWindow.setAlwaysOnTop(true);
            mainWindow.show();
                mainWindow.setAlwaysOnTop(false);
                mainWindow.focus();
            syncPlayerWindow();
        }
    }
}

let sseClients = [];

ipcMain.on('sync-remote-search', (event, text) => {
    sseClients.forEach(c => c.write(`data: ${JSON.stringify({ type: 'searchSync', text })}\n\n`));
});

ipcMain.on('focus-remote-search', (event) => {
    sseClients.forEach(c => c.write(`data: ${JSON.stringify({ type: 'focusSearch' })}\n\n`));
});

function createWindow() {
    // Create a frameless, transparent splash window
    splashWindow = new BrowserWindow({
        width: 600,
        height: 600,
        transparent: true,
        frame: false,
        alwaysOnTop: true,
        hasShadow: false,
        title: 'AIVue Player',
        icon: path.join(__dirname, 'assets', 'logo.ico'),
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    splashWindow.loadFile('splash.html');

    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        title: 'AIVue Player',
        icon: path.join(__dirname, 'assets', 'logo.ico'),
        show: false, // Hide initially until fully loaded
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true
        }
    });

    // Add context menu for text inputs and text selection
    mainWindow.webContents.on('context-menu', (event, params) => {
        console.log('[EVENT] context-menu', params);
        const menu = new Menu();
        if (params.isEditable) {
            menu.append(new MenuItem({ role: 'undo' }));
            menu.append(new MenuItem({ role: 'redo' }));
            menu.append(new MenuItem({ type: 'separator' }));
            menu.append(new MenuItem({ role: 'cut' }));
            menu.append(new MenuItem({ role: 'copy' }));
            menu.append(new MenuItem({ role: 'paste' }));
            menu.append(new MenuItem({ type: 'separator' }));
            menu.append(new MenuItem({ role: 'selectAll' }));
            menu.popup({ window: mainWindow });
        } else if (params.selectionText && params.selectionText.trim() !== '') {
            menu.append(new MenuItem({ role: 'copy' }));
            menu.append(new MenuItem({ type: 'separator' }));
            menu.append(new MenuItem({ role: 'selectAll' }));
            menu.popup({ window: mainWindow });
        }
    });

    mainWindow.removeMenu(); // Completely removes the menu bar

    mainWindow.loadFile('index.html');

    // Wait until the HTML is fully rendered and ready to display
    mainWindow.once('ready-to-show', () => {
        isMainReadyToShow = true;
        checkAndShowMainWindow();
        
        // Fallback in case of an issue playing the stream
        setTimeout(showMainWindowAndHideSplash, 8000);
    });

    // Terminate MPV gracefully when the window closes
    mainWindow.on('closed', () => {
        console.log('[EVENT] mainWindow closed');
        if (mpvProcess) mpvProcess.kill();
        mainWindow = null;
    });

    // Ensure the video child window moves seamlessly when you move or resize the app
    mainWindow.on('move', () => {
        console.log('[EVENT] mainWindow move');
        syncPlayerWindow();
    });
    mainWindow.on('resize', () => {
        console.log('[EVENT] mainWindow resize');
        syncPlayerWindow();
    });

    // Sync MPV's internal fullscreen state when Electron enters/leaves fullscreen natively (e.g., via ESC key)
    mainWindow.on('enter-full-screen', () => {
        console.log('[EVENT] mainWindow enter-full-screen');
        mainWindow.webContents.send('fullscreen-state', true);
        if (ipcClient && !ipcClient.destroyed) {
            ipcClient.write(JSON.stringify({ command: ["set_property", "fullscreen", true] }) + '\n');
        }
    });
    mainWindow.on('leave-full-screen', () => {
        console.log('[EVENT] mainWindow leave-full-screen');
        mainWindow.webContents.send('fullscreen-state', false);
        if (ipcClient && !ipcClient.destroyed) {
            ipcClient.write(JSON.stringify({ command: ["set_property", "fullscreen", false] }) + '\n');
        }
    });
    mainWindow.on('maximize', () => {
        console.log('[EVENT] mainWindow maximize');
        if (ipcClient && !ipcClient.destroyed) {
            ipcClient.write(JSON.stringify({ command: ["set_property", "window-maximized", true] }) + '\n');
        }
    });
    mainWindow.on('unmaximize', () => {
        console.log('[EVENT] mainWindow unmaximize');
        if (ipcClient && !ipcClient.destroyed) {
            ipcClient.write(JSON.stringify({ command: ["set_property", "window-maximized", false] }) + '\n');
        }
    });
}

function syncPlayerWindow() {
    console.log('[SYNC] Syncing player window bounds');
    if (playerWindow && mainWindow && !mainWindow.isDestroyed() && currentDOMBounds) {
        if (!isMpvReady || currentDOMBounds.width === 0 || currentDOMBounds.height === 0 || !mainWindow.isVisible()) {
            playerWindow.setOpacity(0); // Make completely invisible (Bypasses OS bounds clamping)
            playerWindow.setBounds({ x: -10000, y: -10000, width: 10, height: 10 });
            return;
        }
        playerWindow.setOpacity(1); // Restore visibility when active

        playerWindow.setIgnoreMouseEvents(true); // Re-enforce OS click fallthrough after opacity changes
        const contentBounds = mainWindow.getContentBounds();
        playerWindow.setBounds({
            x: contentBounds.x + currentDOMBounds.x,
            y: contentBounds.y + currentDOMBounds.y,
            width: currentDOMBounds.width,
            height: currentDOMBounds.height
        });
    }
}

let expressServer = null;

function initRemoteServer() {
    if (expressServer) {
        expressServer.close();
        expressServer = null;
    }
    if (!remoteSettings.enabled) return;

    const getCookie = (req, name) => {
        if (!req.headers.cookie) return null;
        const match = req.headers.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
        return match ? decodeURIComponent(match[2]) : null;
    };

    let pendingDevicePrompt = false;

    try {
        const express = require('express');
        const app = express();
        const port = remoteSettings.port || 8088;

        app.use(express.urlencoded({ extended: true }));
        app.use(express.json());

        app.use(async (req, res, next) => {
            console.log(`[REMOTE API] Incoming request: ${req.method} ${req.path} (IP: ${req.ip})`);

            if (!remoteSettings.enabled) {
                return res.status(403).send('Remote control is disabled in Settings.');
            }


            if (remoteSettings.username && remoteSettings.password) {
                const expectedAuth = Buffer.from(remoteSettings.username + ':' + remoteSettings.password).toString('base64');
                const authCookie = getCookie(req, 'aivue_auth');
                
                // Support legacy basic auth (for the auto-login URL)
                const b64auth = (req.headers.authorization || '').split(' ')[1] || '';
                const [login, password] = Buffer.from(b64auth, 'base64').toString().split(':');
                const isBasicAuthValid = (login === remoteSettings.username && password === remoteSettings.password);

                if (authCookie !== expectedAuth && !isBasicAuthValid) {
                    console.log(`[REMOTE API] Auth failed or missing for path: ${req.path}`);
                    if (req.path === '/login' || req.path === '/manifest.json' || req.path === '/icon.svg' || req.path === '/sw.js' || req.path === '/favicon.ico' || req.path === '/player.png') {
                        console.log(`[REMOTE API] Bypassing auth for public path: ${req.path}`);
                        return next();
                    }
                    if (req.path.startsWith('/cmd/')) {
                        console.log(`[REMOTE API] Rejecting unauthorized command: ${req.path}`);
                        return res.status(401).send('Unauthorized');
                    }
                    console.log(`[REMOTE API] Redirecting unauthorized user to /login`);
                    return res.redirect('/login');
                }
                console.log(`[REMOTE API] Auth successful for path: ${req.path}`);
            }

            let deviceId = getCookie(req, 'aivue_device_id');
            if (!deviceId) {
                deviceId = require('crypto').randomUUID();
                res.cookie('aivue_device_id', deviceId, { maxAge: 31536000000, httpOnly: true });
            }

            console.log(`[REMOTE API] Current Device ID: ${deviceId} | Active Paired Device: ${remoteSettings.activeDeviceId}`);

            if (req.path === '/manifest.json' || req.path === '/icon.svg' || req.path === '/sw.js' || req.path === '/login' || req.path === '/favicon.ico' || req.path === '/player.png') {
                console.log(`[REMOTE API] Bypassing device lock for public path: ${req.path}`);
                return next();
            }

            if (!remoteSettings.activeDeviceId) {
                console.log(`[REMOTE API] No active device found. Auto-pairing with: ${deviceId}`);
                remoteSettings.activeDeviceId = deviceId;
                try { fs.writeFileSync(remoteSettingsPath, JSON.stringify(remoteSettings)); } catch(e) {}
                if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('remote-settings-updated');
            } else if (remoteSettings.activeDeviceId !== deviceId) {
                console.log(`[REMOTE API] Device mismatch detected. (Current: ${deviceId}, Active: ${remoteSettings.activeDeviceId})`);
                if (pendingDevicePrompt) {
                    console.log(`[REMOTE API] Toast prompt already pending. Sending wait message.`);
                    return res.status(403).send('<html style="background:#121212;color:white;font-family:sans-serif;text-align:center;padding:50px;"><h2>Access Denied</h2><p>Waiting for pairing approval on PC...</p></html>');
                }
                pendingDevicePrompt = true;
                let response = 1;
                if (mainWindow && !mainWindow.isDestroyed()) {
                    console.log(`[REMOTE API] Triggering new device override toast on PC.`);
                    if (mainWindow.isFullScreen()) {
                        console.log(`[REMOTE API] Exiting fullscreen to show toast.`);
                        mainWindow.setFullScreen(false);
                        // Give the window a moment to resize before showing the toast
                        await new Promise(resolve => setTimeout(resolve, 500));
                    }
                    response = await new Promise(resolve => {
                        let responded = false;
                        const handler = (event, res) => {
                            if (responded) return;
                            responded = true;
                            console.log(`[REMOTE API] PC user responded to toast: ${res ? 'Allow' : 'Deny'}`);
                            clearTimeout(timeout);
                            resolve(res ? 0 : 1);
                        };
                        const timeout = setTimeout(() => {
                            if (responded) return;
                            responded = true;
                            console.log(`[REMOTE API] Toast timed out. Defaulting to deny.`);
                            ipcMain.removeListener('remote-override-response', handler);
                            resolve(1);
                        }, 30000); // 30s timeout defaults to keep old
                        ipcMain.once('remote-override-response', handler);
                        mainWindow.webContents.send('show-remote-override-toast', deviceId);
                    });
                }
                pendingDevicePrompt = false;

                if (response === 0) {
                    console.log(`[REMOTE API] New device allowed. Overriding active device.`);
                    remoteSettings.activeDeviceId = deviceId;
                    try { fs.writeFileSync(remoteSettingsPath, JSON.stringify(remoteSettings)); } catch(e) {}
                    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('remote-settings-updated');
                    next();
                } else {
                    console.log(`[REMOTE API] New device denied.`);
                    return res.status(403).send('<html style="background:#121212;color:white;font-family:sans-serif;text-align:center;padding:50px;"><h2>Access Denied</h2><p>Another device is currently paired with AIVue Player.</p><p style="color:#888;">Please revoke access from the Remote Control settings on your PC to connect a new device.</p></html>');
                }
            } else {
                console.log(`[REMOTE API] Device matches active device. Proceeding.`);
                next();
            }
        });

        app.get('/events', (req, res) => {
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');
            res.flushHeaders();
            sseClients.push(res);
            req.on('close', () => { sseClients = sseClients.filter(c => c !== res); });
        });

        app.post('/search', (req, res) => {
            const text = req.body.text || '';
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('remote-search', text);
            }
            res.send('OK');
        });

        app.get('/login', (req, res) => {
            if (remoteSettings.username && remoteSettings.password) {
                const expectedAuth = Buffer.from(remoteSettings.username + ':' + remoteSettings.password).toString('base64');
                if (getCookie(req, 'aivue_auth') === expectedAuth) {
                    console.log(`[REMOTE API] User already authenticated. Redirecting /login to /remote`);
                    return res.redirect('/remote');
                }
            }
            res.send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<meta name="theme-color" content="#0f172a">
<link rel="icon" href="/favicon.ico" type="image/x-icon">
<title>Login - AIVue Remote</title>
<style>
* { box-sizing: border-box; }
body { background:#0f172a; color:white; font-family:Arial,sans-serif; display:flex; flex-direction:column; justify-content:center; align-items:center; height:100vh; margin:0; padding: 20px; }
form { background:#1e293b; padding:30px 25px; border-radius:16px; display:flex; flex-direction:column; gap:15px; width:100%; max-width:340px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
input { padding:14px; border-radius:8px; border:1px solid #334155; background:#0f172a; color:white; font-size:16px; outline:none; transition: 0.2s; }
input:focus { border-color: #7c3aed; }
button { padding:14px; border-radius:8px; border:none; background:#7c3aed; color:white; font-size:16px; font-weight:bold; cursor:pointer; transition: 0.2s; }
button:active { transform: scale(0.95); }
h2 { text-align:center; margin-top:0; color:#cbd5e1; font-size: 24px; margin-bottom: 5px; }
.err { background: rgba(239, 68, 68, 0.2); border: 1px solid #ef4444; color:#ef4444; padding: 10px; border-radius: 8px; text-align:center; font-size:14px; margin-bottom: 5px; }
</style>
</head>
<body>
<form action="/login" method="POST">
    <h2>AIVue Remote</h2>
    ${req.query.error ? '<div class="err">Invalid username or password.</div>' : ''}
    <input type="text" name="username" placeholder="Username" required autocomplete="username">
    <input type="password" name="password" placeholder="Password" required autocomplete="current-password">
    <button type="submit">Connect</button>
</form>
</body>
</html>`);
        });

        app.post('/login', (req, res) => {
            console.log(`[REMOTE API] POST /login attempt from IP: ${req.ip} for user: ${req.body.username}`);
            const { username, password } = req.body;
            if (username === remoteSettings.username && password === remoteSettings.password) {
                console.log(`[REMOTE API] Login successful. Redirecting to /remote`);
                const token = Buffer.from(username + ':' + password).toString('base64');
                res.cookie('aivue_auth', token, { maxAge: 31536000000, httpOnly: true });
                return res.redirect('/remote');
            }
            console.log(`[REMOTE API] Login failed (invalid credentials). Redirecting back to /login.`);
            res.redirect('/login?error=1');
        });

        // Helper to send commands to MPV using existing IPC client
        const sendMpvCommand = (args) => {
            if (ipcClient && !ipcClient.destroyed) {
                console.log('[MPV IPC SEND]', JSON.stringify({ command: args }));
                ipcClient.write(JSON.stringify({ command: args }) + '\n');
            }
        };

        // ------------------ Playback Commands ------------------
        app.get('/playpause', (req, res) => { sendMpvCommand(['cycle', 'pause']); res.send('OK'); });
        app.get('/stop', (req, res) => { 
            console.trace('STOP COMMAND RECEIVED (REMOTE API)');
            sendMpvCommand(['stop']); 
            res.send('OK'); 
        });
        app.get('/mute', (req, res) => { sendMpvCommand(['cycle', 'mute']); res.send('OK'); });
        app.get('/volumeup', (req, res) => { sendMpvCommand(['add', 'volume', 5]); res.send('OK'); });
        app.get('/volumedown', (req, res) => { sendMpvCommand(['add', 'volume', -5]); res.send('OK'); });
        app.get('/seekfwd', (req, res) => { sendMpvCommand(['seek', 30]); res.send('OK'); });
        app.get('/seekback', (req, res) => { sendMpvCommand(['seek', -30]); res.send('OK'); });
        
        // ------------------ Electron Intercepts ------------------
        app.get('/fullscreen', (req, res) => {
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.setFullScreen(!mainWindow.isFullScreen());
            }
            res.send('OK');
        });
        app.get('/nextchannel', (req, res) => {
            if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('mpv-next-channel');
            res.send('OK');
        });
        app.get('/previouschannel', (req, res) => {
            if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('mpv-previous-channel');
            res.send('OK');
        });

        app.get('/api/reminders', async (req, res) => {
            if (mainWindow && !mainWindow.isDestroyed()) {
                try {
                    const remindersJSON = await mainWindow.webContents.executeJavaScript('localStorage.getItem("iptv_reminders");', true);
                    res.json(JSON.parse(remindersJSON || '[]'));
                } catch (e) {
                    console.error('[REMOTE API] Error getting reminders:', e);
                    res.status(500).json({ error: 'Failed to get reminders' });
                }
            } else {
                res.status(503).json({ error: 'Main window not available' });
            }
        });

        app.post('/api/toggle-reminder', (req, res) => {
            const { channelTitle, progTitle, startTime, stopTime } = req.body;
            if (mainWindow && !mainWindow.isDestroyed()) {
                try {
                    mainWindow.webContents.executeJavaScript(`toggleReminder(${JSON.stringify(channelTitle)}, ${JSON.stringify(progTitle)}, ${JSON.stringify(startTime)}, ${JSON.stringify(stopTime)})`);
                    res.send('OK');
                } catch (e) {
                    console.error('[REMOTE API] Error toggling reminder:', e);
                    res.status(500).send('Failed to toggle reminder');
                }
            } else {
                res.status(503).send('Main window not available');
            }
        });

        app.get('/api/channels', (req, res) => {
            const playlists = loadChannelsFromDb();
            let channels = [];
            playlists.forEach(p => {
                if (p.channels && !p.disabled) {
                    channels.push(...p.channels.map(c => ({...c, playlistId: p.id, playlistName: p.name})));
                }
            });
            res.json(channels);
        });

        app.get('/api/mappings', (req, res) => {
            if (!db) return res.json({});
            try {
                const rows = db.prepare('SELECT channel_title, epg_id FROM mappings').all();
                const map = rows.reduce((acc, row) => {
                    acc[row.channel_title] = row.epg_id;
                    return acc;
                }, {});
                res.json(map);
            } catch (e) {
                res.status(500).json({ error: 'Failed to get mappings' });
            }
        });

        app.post('/api/epg', (req, res) => {
            const { ids, start, end } = req.body;
            if (!db || !ids || !Array.isArray(ids) || ids.length === 0) {
                return res.json({});
            }
            const epgData = getEpgDataFromDb(ids, start, end);
            res.json(epgData);
        });

        app.post('/api/play', (req, res) => {
            const { url, title } = req.body;
            if (mainWindow && !mainWindow.isDestroyed() && url && title) {
                mainWindow.webContents.send('remote-play-channel', { url, title });
            }
            res.send('OK');
        });

        app.get('/epg', (req, res) => {
            res.send(`
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
                    <title>Guide - AIVue Remote</title>
                    <style>
                        body { background:#121212; color:white; font-family:Arial,sans-serif; margin:0; }
                        #epg-view { display: flex; flex-direction: column; height: 100vh; }
                        .top-bar { padding: 10px; background: #1e1e1e; display: flex; gap: 10px; align-items: center; border-bottom: 1px solid #333; flex-wrap: wrap; }
                        .top-bar select, .top-bar input, .top-bar button { background: #2a2a2a; color: white; border: 1px solid #444; padding: 8px; border-radius: 6px; outline: none; }
                    .top-bar select option { background: #2a2a2a; color: white; }
                        .top-bar input { flex-grow: 1; min-width: 150px; }
                        #epg-content-area { flex-grow: 1; overflow: hidden; position: relative; }
                        #epg-layout-wrapper { display: flex; flex-direction: column; height: 100%; }
                        #epg-header-row { display: flex; width: 100%; background: #bb86fc; z-index: 20; flex-shrink: 0; height: 30px; border-bottom: 2px solid #333; box-sizing: border-box; }
                        #epg-channels-header { width: 120px; min-width: 120px; background: #bb86fc; border-right: 2px solid rgba(0,0,0,0.2); display: flex; align-items: center; justify-content: center; font-weight: bold; color: #000; box-sizing: border-box; height: 100%; font-size: 0.9em; }
                        #epg-header-scroll { flex-grow: 1; overflow: hidden; position: relative; height: 30px; }
                        #epg-header-inner { height: 100%; position: relative; }
                        #epg-main-content { display: flex; flex-grow: 1; overflow: visible; }
                        #epg-channels-col { width: 120px; min-width: 120px; background: #1a1a1a; overflow: hidden; border-right: 2px solid #333; z-index: 10; }
                        #epg-channels-inner { position: relative; width: 100%; }
                        #epg-scroll-container { flex-grow: 1; overflow: auto; position: relative; }
                        #epg-grid-inner { position: relative; }
                        #epg-rows-layer { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }
                        #epg-time-indicator { position: absolute; top: 0; width: 2px; background: #cf6679; z-index: 5; pointer-events: none; }
                        .epg-play-channel { cursor: pointer; }
                        .epg-play-channel:active { background-color: #2a2a2a !important; }
                        .epg-program-cell:active { background: #333 !important; }
                        .loader { text-align: center; padding: 50px; color: #888; }
                        
                        /* Modal Styles */
                        .modal-overlay { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 1000; justify-content: center; align-items: center; }
                        .modal-content { background: #1e1e1e; padding: 20px; border-radius: 12px; width: 90%; max-width: 400px; color: white; border: 1px solid #333; }
                        .modal-title { color: #bb86fc; font-size: 1.2em; font-weight: bold; margin-bottom: 10px; }
                        .modal-subtitle { color: #aaa; font-size: 0.9em; margin-bottom: 15px; }
                        .modal-desc { color: #ccc; font-size: 0.85em; margin-bottom: 20px; line-height: 1.4; max-height: 150px; overflow-y: auto; }
                        .modal-buttons { display: flex; gap: 10px; justify-content: flex-end; }
                        .modal-btn { padding: 10px 20px; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; }
                        .modal-btn.watch { background: #43CB44; color: black; }
                        .modal-btn.close { background: #333; color: white; }
                        
                        #toast { position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); background: #bb86fc; color: #000; padding: 10px 20px; border-radius: 20px; font-weight: bold; opacity: 0; transition: opacity 0.3s; pointer-events: none; z-index: 2000; }
                    </style>
                </head>
                <body>
                    <div id="epg-view">
                        <div class="top-bar">
                            <a href="/remote" style="background: #334155; color: white; padding: 8px 12px; border-radius: 6px; text-decoration: none; font-weight: bold;">&larr; Back</a>
                            <select id="epg-playlist-filter"><option value="all">All Playlists</option></select>
                            <select id="epg-group-filter"><option value="all">All Groups</option></select>
                            <input type="text" id="epg-search" placeholder="Search Channels...">
                            <button id="epg-now-btn">Now</button>
                        </div>
                        <div id="epg-content-area" class="loader">Loading EPG...</div>
                    </div>
                    
                    <div id="program-modal" class="modal-overlay">
                        <div class="modal-content">
                            <div id="modal-prog-title" class="modal-title"></div>
                            <div id="modal-prog-channel" class="modal-subtitle"></div>
                            <div id="modal-prog-desc" class="modal-desc"></div>
                            <div class="modal-buttons">
                                <button id="modal-close-btn" class="modal-btn close">Close</button>
                                <button id="modal-watch-btn" class="modal-btn watch">Watch TV</button>
                            </div>
                        </div>
                    </div>
                    
                    <div id="toast"></div>
    
                    <script src="/epg.js"></script>
                </body>
                </html>
            `);
        });

        app.get('/epg.js', (req, res) => {
            res.setHeader('Content-Type', 'application/javascript');
            try {
                res.send(fs.readFileSync(path.join(__dirname, 'remote_epg.js'), 'utf8'));
            } catch(e) {
                res.status(404).send('console.error("remote_epg.js not found");');
            }
        });

        // ------------------ Unified Command API ------------------
        app.get('/cmd/:command', (req, res) => {
            const cmd = req.params.command;
            switch(cmd) {
                case 'guide':
                    res.redirect('/epg');
                    return;
                case 'playpause': sendMpvCommand(['cycle', 'pause']); break;
                case 'mute': sendMpvCommand(['cycle', 'mute']); break;
                case 'volup': sendMpvCommand(['add', 'volume', 5]); break;
                case 'voldown': sendMpvCommand(['add', 'volume', -5]); break;
                case 'forward': sendMpvCommand(['seek', 30]); break;
                case 'rewind': sendMpvCommand(['seek', -30]); break;
                case 'chup': 
                    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('mpv-next-channel');
                    break;
                case 'chdown': 
                    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('mpv-previous-channel');
                    break;
                case 'power': case 'home': case 'back': case 'guide': case 'favorites':
                case 'up': case 'down': case 'left': case 'right': case 'ok': case 'search':
                case 'livetv': case 'playlist': case 'settings': case 'fullscreen':
                    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('remote-action', cmd);
                    break;
            }
            res.send('OK');
        });

        app.get('/favicon.ico', (req, res) => {
            res.sendFile(path.join(__dirname, 'assets', 'logo.ico'));
        });

        app.get('/player.png', (req, res) => {
            res.sendFile(path.join(__dirname, 'assets', 'player.png'));
        });

        // ------------------ PWA Endpoints ------------------
        app.get('/manifest.json', (req, res) => {
            res.json({
                name: "AIVue Remote",
                short_name: "AIVue",
                description: "Remote control for AIVue Player",
                start_url: "/remote",
                display: "standalone",
                background_color: "#0f172a",
                theme_color: "#0f172a",
                icons: [
                    { src: "/icon.svg", sizes: "192x192 512x512", type: "image/svg+xml", purpose: "any maskable" }
                ]
            });
        });

        app.get('/sw.js', (req, res) => {
            res.setHeader('Content-Type', 'application/javascript');
            res.send("self.addEventListener('install', e => self.skipWaiting());\nself.addEventListener('activate', e => e.waitUntil(clients.claim()));\nself.addEventListener('fetch', e => { e.respondWith(fetch(e.request).catch(() => new Response('AIVue Remote is offline.'))); });");
        });

        app.get('/icon.svg', (req, res) => {
            res.setHeader('Content-Type', 'image/svg+xml');
            res.send('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="112" fill="#7c3aed"/><text x="50%" y="50%" font-family="Arial, sans-serif" font-size="240" font-weight="bold" fill="white" dominant-baseline="central" text-anchor="middle">AV</text></svg>');
        });

        // ------------------ Web UI Remote ------------------
        app.get('/remote', (req, res) => {
            res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<meta name="theme-color" content="#0f172a">
<link rel="icon" href="/favicon.ico" type="image/x-icon">
<link rel="manifest" href="/manifest.json" crossorigin="use-credentials">
<link rel="apple-touch-icon" href="/icon.svg">
<title>AIVue Remote</title>
<style>
*{ margin:0; padding:0; box-sizing:border-box; -webkit-tap-highlight-color:transparent; }
body{ background:#0f172a; font-family:Arial,sans-serif; color:white; min-height:100vh; display:flex; justify-content:center; align-items:center; padding:10px; overflow-x:hidden; }
.remote{ width:100%; max-width:420px; display:flex; flex-direction:column; gap:10px; margin:auto; }
.row{ display:grid; gap:8px; }
.row-4{ grid-template-columns:repeat(4,1fr); }
.row-3{ grid-template-columns:repeat(3,1fr); }
.row-2{ grid-template-columns:repeat(2,1fr); }
button, a.top-btn { border:none; border-radius:12px; background:#1e293b; color:white; font-size:16px; font-weight:600; height:50px; cursor:pointer; transition:.15s; text-decoration:none; display:flex; align-items:center; justify-content:center; }
button:active, a.top-btn:active { transform:scale(.95); }
.top-btn{ height:45px; }
.power{ background:#dc2626; }
.guide{ background:#7c3aed; }
.dpad{ display:flex; flex-direction:column; align-items:center; gap:8px; margin:5px 0; }
.dpad button{ width:60px; height:60px; border-radius:50%; }
.middle{ display:flex; align-items:center; gap:12px; }
.ok{ width:75px !important; height:75px !important; border-radius:50%; background:#7c3aed; font-size:20px; }
.playback button{ font-size:20px; }
.secondary{ background:#334155; }
.header-img{ display:block; margin:0 auto; max-height:120px; min-height:100px; max-width:100%; object-fit:contain; }
</style>
</head>
<body>
<div class="remote">
    <img src="/player.png" alt="AIVue Remote" class="header-img">
    <!-- Search -->
    <input type="text" id="remoteSearchBox" placeholder="Search channels..." autocomplete="off" style="width:100%; padding:12px; border-radius:12px; border:none; background:#1e293b; color:white; font-size:16px; outline:none; text-align:center; margin-bottom: 5px;">
    <!-- Top Buttons -->
    <div class="row row-4">
        <button class="top-btn" data-cmd="livetv" style="background:#ef4444; display:flex; align-items:center; justify-content:center;">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M21,3H3C1.89,3 1,3.89 1,5V17A2,2 0 0,0 3,19H8V21H16V19H21A2,2 0 0,0 23,17V5C23,3.89 22.1,3 21,3M21,17H3V5H21V17Z"/></svg>
        </button>
        <button class="top-btn" data-cmd="playlist" style="background:#22c55e; display:flex; align-items:center; justify-content:center;">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M2 14H8V16H2M2 10H12V12H2M2 6H14V8H2M16 14V8H18V14H22V16H16V14Z"/></svg>
        </button>
        <button class="top-btn" onclick="window.location.href='/epg'" style="background:#eab308; display:flex; align-items:center; justify-content:center;">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M19,4H18V2H16V4H8V2H6V4H5C3.89,4 3.01,4.9 3.01,6L3,20A2,2 0 0,0 5,22H19A2,2 0 0,0 21,20V6A2,2 0 0,0 19,4M19,20H5V10H19V20M9,14H7V12H9V14M13,14H11V12H13V14M17,14H15V12H17V14M9,18H7V16H9V18M13,18H11V16H13V18M17,18H15V16H17V18Z"/></svg>
        </button>
        <button class="top-btn" data-cmd="settings" style="background:#3b82f6; display:flex; align-items:center; justify-content:center;">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5M19.43,12.97C19.47,12.65 19.5,12.33 19.5,12C19.5,11.67 19.47,11.34 19.43,11L21.54,9.37C21.73,9.22 21.78,8.95 21.66,8.73L19.66,5.27C19.54,5.05 19.27,4.96 19.05,5.05L16.56,6.05C16.04,5.66 15.5,5.32 14.87,5.07L14.5,2.42C14.46,2.18 14.25,2 14,2H10C9.75,2 9.54,2.18 9.5,2.42L9.13,5.07C8.5,5.32 7.96,5.66 7.44,6.05L4.95,5.05C4.73,4.96 4.46,5.05 4.34,5.27L2.34,8.73C2.21,8.95 2.27,9.22 2.46,9.37L4.57,11C4.53,11.34 4.5,11.67 4.5,12C4.5,12.33 4.53,12.65 4.57,12.97L2.46,14.63C2.27,14.78 2.21,15.05 2.34,15.27L4.34,18.73C4.46,18.95 4.73,19.03 4.95,18.95L7.44,17.94C7.96,18.34 8.5,18.68 9.13,18.93L9.5,21.58C9.54,21.82 9.75,22 10,22H14C14.25,22 14.46,21.82 14.5,21.58L14.87,18.93C15.5,18.68 16.04,18.34 16.56,17.94L19.05,18.95C19.27,19.03 19.54,18.95 19.66,18.73L21.66,15.27C21.78,15.05 21.73,14.78 21.54,14.63L19.43,12.97Z"/></svg>
        </button>
        <button class="top-btn" data-cmd="home" style="background:#334155; display:flex; align-items:center; justify-content:center;">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
        </button>
        <button class="top-btn" data-cmd="fullscreen" style="background:#334155; display:flex; align-items:center; justify-content:center; grid-column: span 2;" title="Fullscreen">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>
        </button>
        <button class="top-btn" data-cmd="back" style="background:#334155; display:flex; align-items:center; justify-content:center;">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
        </button>
    </div>
    <!-- D-Pad -->
    <div class="dpad">
        <button data-cmd="up">▲</button>
        <div class="middle">
            <button data-cmd="left">◄</button>
            <button class="ok" data-cmd="ok">OK</button>
            <button data-cmd="right">►</button>
        </div>
        <button data-cmd="down">▼</button>
    </div>
    <!-- Volume / Channel -->
    <div class="row row-2">
        <button data-cmd="volup">VOL +</button>
        <button data-cmd="chup">CH +</button>
        <button data-cmd="voldown">VOL −</button>
        <button data-cmd="chdown">CH −</button>
    </div>
    <!-- Extras -->
    <div class="row row-3">
        <button class="secondary" data-cmd="mute">🔇</button>
        <button class="secondary" data-cmd="favorites">⭐</button>
        <button class="power" data-cmd="power" style="display:flex;align-items:center;justify-content:center;"><svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M16.56,5.44L15.11,6.89C16.84,7.94 18,9.83 18,12A6,6 0 0,1 12,18A6,6 0 0,1 6,12C6,9.83 7.16,7.94 8.88,6.88L7.44,5.44C5.36,6.88 4,9.28 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12C20,9.28 18.64,6.88 16.56,5.44M11,3V13H13V3H11Z"/></svg></button>
    </div>
</div>
<script>
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(e => console.error('SW reg failed', e));
}
document.querySelectorAll('button').forEach(btn => {
    if (btn.dataset.cmd) {
        btn.addEventListener('click', () => {
            const cmd = btn.dataset.cmd;
            fetch('/cmd/' + cmd).catch(e => console.error(e));
            if(navigator.vibrate) navigator.vibrate(50);
        });
    }
});

const searchBox = document.getElementById('remoteSearchBox');
searchBox.addEventListener('input', () => {
    fetch('/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: searchBox.value })
    }).catch(e => console.error(e));
});

const evtSource = new EventSource('/events');
evtSource.onmessage = (e) => {
    const data = JSON.parse(e.data);
    if (data.type === 'searchSync') { searchBox.value = data.text; }
    else if (data.type === 'focusSearch') { searchBox.focus(); }
};
</script>
</body>
</html>
            `);
        });

        expressServer = app.listen(port, '0.0.0.0', () => {
            console.log(`[REMOTE] Express API listening on port ${port}`);
            console.log(`[REMOTE] Web remote available at http://localhost:${port}/remote`);
        }).on('error', (err) => {
            console.warn('[REMOTE] Express Server Error:', err.message);
            if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('remote-error', err.message);
        });
    } catch (err) {
        console.warn("[REMOTE] Express not installed. Run 'npm install express' to enable the web remote API.");
    }
}

app.whenReady().then(() => {
    createWindow();
    initMpv();
    initRemoteServer(); // Spin up the HTTP API server
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
            initMpv();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

function initMpv() {
    if (mpvProcess && mpvProcess.exitCode === null) return;

    console.log('[MPV] Creating player window');
    const contentBounds = mainWindow.getContentBounds();

    // Create an invisible borderless child window exactly over the HTML div
    playerWindow = new BrowserWindow({
        parent: mainWindow,
        x: -10000, 
        y: -10000,
        width: 10,
        height: 10,
        opacity: 0, 
        frame: false,
        hasShadow: false,
        thickFrame: false, 
        resizable: false,  
        backgroundColor: '#000000',
        skipTaskbar: true, 
        title: 'AIVue Player',
    });
    
    playerWindow.setIgnoreMouseEvents(true);
    playerWindow.focus();

    const handle = playerWindow.getNativeWindowHandle();
    let wid;
    
    if (process.platform === 'win32' || process.platform === 'linux') {
        wid = handle.readUInt32LE(0);
    } else {
        console.error("macOS Native --wid embedding requires custom NSView Swift implementation.");
        return;
    }

    const baseDir = app.isPackaged ? process.resourcesPath : __dirname;
    const mpvPath = process.platform === 'win32' ? path.join(baseDir, 'bin', 'mpv.exe') : 'mpv';
    const binDir = path.join(baseDir, 'bin');
    const luaScript = path.join(binDir, 'scripts', 'modernz.lua');
    
    const mpvArgs = [
        `--wid=${wid}`,
        `--input-ipc-server=${ipcPath}`,
        `--no-border`,
        `--force-window=yes`,   
        `--hwdec=auto-safe`,    
        `--profile=fast`,       
        `--cache=yes`,          
        `--cache-secs=30`,
        `--cache-pause=yes`,
        `--demuxer-max-bytes=100M`,
        `--demuxer-max-back-bytes=50M`,
        `--audio-buffer=1.0`,
        `--ao=wasapi`,
        `--video-sync=audio`,
        `--config-dir=${binDir}`, 
        `--load-scripts=no`,    
        `--script=${luaScript}`,
        `--script-opts=modernz-osc_on_start=yes,modernz-bottomhover=no,modernz-window_controls=yes,modernz-playlist_button=no,modernz-info_button=no,modernz-ontop_button=no,modernz-jump_buttons=no,modernz-chapter_skip_buttons=no,modernz-track_nextprev_buttons=yes`,
        `--input-cursor=yes`,   
        `--input-vo-keyboard=yes`, 
        `--osc=no`,             
        `--demuxer-lavf-analyzeduration=20`,
        `--demuxer-lavf-probescore=100`,
        `--keep-open=yes`,
        `--prefetch-playlist=yes`,
        `--stream-lavf-o=reconnect=1`,
        `--stream-lavf-o=reconnect_streamed=1`,
        `--idle=yes`,
        `--log-file=${path.join(app.getPath('userData'), 'mpv-debug.log')}`,
        `--msg-level=all=v`
    ];
    console.log('[MPV] Spawning MPV process ONCE with args:', mpvArgs);
    mpvProcess = spawn(mpvPath, mpvArgs, { windowsHide: true });

    setTimeout(connectIPC, 1000); 

    mpvProcess.stdout.on('data', (data) => {
        // MPV stdout parsing removed. We now rely strictly on IPC property-change events 
        // (like playback-time) to know exactly when the video has started rendering.
    });
    mpvProcess.stderr.on('data', (data) => console.error(`[MPV ERR] ${data.toString().trim()}`));

    mpvProcess.on('exit', () => {
        console.log(`[MPV] Process exited with code: ${mpvProcess ? mpvProcess.exitCode : 'unknown'}`);
        ipcConnectionAttempts = 0;
        if (reconnectTimer) clearTimeout(reconnectTimer);
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('mpv-exit', mpvProcess ? mpvProcess.exitCode : 0);
        }
        if (ipcClient) {
            ipcClient.removeAllListeners();
            ipcClient.destroy();
            ipcClient = null;
        }
        if (playerWindow && !playerWindow.isDestroyed()) {
            playerWindow.destroy();
        }
        mpvProcess = null;
    });
}

function connectIPC() {
    if (!mpvProcess || mpvProcess.exitCode !== null) return;
    
    if (ipcConnectionAttempts === 0) {
        console.log('[MPV IPC] Attempting to connect to', ipcPath);
    }
    ipcConnectionAttempts++;

    if (ipcClient) {
        ipcClient.removeAllListeners();
        ipcClient.destroy();
    }
    ipcClient = net.createConnection(ipcPath);
    let localConnected = false;
    
    ipcClient.on('connect', () => {
        localConnected = true;
        ipcConnectionAttempts = 0;
        console.log('[MPV IPC] Connection established. Sending initial commands.');
        ipcClient.write(JSON.stringify({ command: ["keybind", "f", "script-message electron-fullscreen-toggle"] }) + '\n');
        ipcClient.write(JSON.stringify({ command: ["observe_property", 1, "fullscreen"] }) + '\n');
        ipcClient.write(JSON.stringify({ command: ["observe_property", 8, "window-maximized"] }) + '\n');
        ipcClient.write(JSON.stringify({ command: ["observe_property", 2, "width"] }) + '\n');
        ipcClient.write(JSON.stringify({ command: ["observe_property", 3, "height"] }) + '\n');
        ipcClient.write(JSON.stringify({ command: ["observe_property", 4, "container-fps"] }) + '\n');
        ipcClient.write(JSON.stringify({ command: ["observe_property", 5, "video-bitrate"] }) + '\n');
        ipcClient.write(JSON.stringify({ command: ["observe_property", 6, "playback-time"] }) + '\n');
        ipcClient.write(JSON.stringify({ command: ["observe_property", 7, "core-idle"] }) + '\n');
        ipcClient.write(JSON.stringify({ command: ["observe_property", 9, "pause"] }) + '\n');
        ipcClient.write(JSON.stringify({ command: ["observe_property", 10, "path"] }) + '\n');
        ipcClient.write(JSON.stringify({ command: ["request_log_messages", "v"] }) + '\n');
    });
    
    let buffer = '';
    ipcClient.on('data', (chunk) => {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop(); // Keep incomplete lines in the buffer
        for (const line of lines) {
            if (!line.trim()) continue;
            try {
                const msg = JSON.parse(line);
                if (msg.event === 'property-change') {
                    if (msg.name === 'fullscreen') {
                        if (mainWindow && !mainWindow.isDestroyed()) {
                            if (mainWindow.isFullScreen() !== msg.data) {
                                mainWindow.setFullScreen(msg.data);
                            }
                        }
                    } else if (msg.name === 'window-maximized') {
                        // Ignore embedded MPV's native maximize state to prevent force-unmaximizing Electron
                    } else {
                        if (msg.name === 'playback-time' && msg.data !== null && !isMpvReady) {
                            console.log('[MPV] Playback confirmed ready.');
                            isMpvReady = true;
                            syncPlayerWindow();
                            showMainWindowAndHideSplash();
                        }
                        if (mainWindow && !mainWindow.isDestroyed()) {
                            mainWindow.webContents.send('mpv-prop-change', msg.name, msg.data);
                        }
                    }
                }
                if (msg.event === 'client-message' && msg.args && mainWindow && !mainWindow.isDestroyed()) {
                    console.log('[MPV IPC RECV] client-message:', msg.args);
                    if (msg.args[0] === 'electron-fullscreen-toggle') {
                        mainWindow.setFullScreen(!mainWindow.isFullScreen());
                    }
                    if (msg.args[0] === 'electron-maximize-toggle') {
                        if (mainWindow.isMaximized()) mainWindow.unmaximize();
                        else mainWindow.maximize();
                    }
                    if (msg.args[0] === 'electron-previous-channel') {
                        mainWindow.webContents.send('mpv-previous-channel');
                    }
                    if (msg.args[0] === 'electron-next-channel') {
                        mainWindow.webContents.send('mpv-next-channel');
                    }
                }
                
                if (['file-loaded', 'start-file', 'end-file', 'tracks-changed'].includes(msg.event)) {
                    console.log(`[MPV LIFECYCLE EVENT] ${msg.event}`, msg);
                }
                if (msg.event === 'log-message') {
                    if (msg.level === 'error' || msg.level === 'warn') console.log(`[MPV LOG] ${msg.text.trim()}`);
                }
            } catch (e) {}
        }
    });

    ipcClient.on('error', (err) => {
        if (err.code !== 'ENOENT' && err.code !== 'ECONNREFUSED') {
            console.error('[MPV IPC] Connection error:', err.message);
        }
    });

    ipcClient.on('close', () => {
        if (localConnected) {
            console.log('[MPV IPC] Connection closed.');
        }
        if (mpvProcess && mpvProcess.exitCode === null) {
            if (reconnectTimer) clearTimeout(reconnectTimer);
            reconnectTimer = setTimeout(connectIPC, 500);
        }
    });
}

// MPV Embedding Logic
ipcMain.on('play-mpv-embedded', (event, data) => {
    console.log('[IPC RECV] play-mpv-embedded', data);
    currentDOMBounds = data.bounds;
    isMpvReady = false;

    if (!mpvProcess || mpvProcess.exitCode !== null) {
        initMpv();
    }

    if (playerWindow && !playerWindow.isDestroyed()) {
        playerWindow.focus();
    }

    syncPlayerWindow();

    const urlStr = data.url || '';
    let mac = '';
    const macMatch = urlStr.match(/[?&]mac=([^&]+)/i);
    if (macMatch) {
        mac = decodeURIComponent(macMatch[1]);
    }
    
    let session = null;
    let portalUrl = '';
    if (mac) {
        const lowerMac = mac.toLowerCase();
        for (const [key, value] of stalkerTokens.entries()) {
            if (key.toLowerCase().endsWith('|' + lowerMac)) {
                session = value;
                const parts = key.split('|');
                portalUrl = parts[0];
                break;
            }
        }
    }

    const playStream = () => {
        if (ipcClient && !ipcClient.destroyed) {
            let ua = '';
            let headersList = '';
            
            if (mac && session) {
                ua = 'Mozilla/5.0 (QtEmbedded; U; Linux; C) AppleWebKit/533.3 (KHTML, like Gecko) MAG200 stbapp ver: 2 rev: 250 Safari/533.3';
                let referer = '';
                if (portalUrl) {
                    referer = portalUrl.replace('/server/load.php', '/c/index.html').replace('/portal.php', '/c/index.html');
                } else {
                    referer = urlStr.split('/play/')[0] + '/c/index.html';
                }
                const cookies = `mac=${mac}; stb_lang=en; timezone=GMT` + (session.phpSessionId ? `; PHPSESSID=${session.phpSessionId}` : '');
                const fields = [
                    'X-User-Agent: Model: MAG250; Link: Ethernet',
                    `Cookie: ${cookies}`,
                    `Referer: ${referer}`
                ];
                if (session.token) {
                    fields.push(`Authorization: Bearer ${session.token}`);
                }
                headersList = fields.join(',');
                console.log('[MPV HEADER INJECT] Injecting MAG stbapp headers for Stalker stream. MAC:', mac, 'Referer:', referer);
            } else {
                console.log('[MPV HEADER INJECT] Clearing custom MAG headers for standard stream.');
            }
            
            ipcClient.write(JSON.stringify({ command: ["set_property", "user-agent", ua] }) + '\n');
            ipcClient.write(JSON.stringify({ command: ["set_property", "http-header-fields", headersList] }) + '\n');
            
            console.log('[MPV IPC SEND]', JSON.stringify({ command: ["loadfile", data.url, "replace"] }));
            ipcClient.write(JSON.stringify({ command: ["loadfile", data.url, "replace"] }) + '\n');
        }
    };

    if (ipcClient && !ipcClient.destroyed) {
        playStream();
    } else {
        setTimeout(playStream, 1500);
    }
});

// Keep window perfectly locked if the user triggers a DOM resize inside the app
ipcMain.on('update-mpv-bounds', (event, bounds) => {
    console.log('[IPC RECV] update-mpv-bounds', bounds);
    currentDOMBounds = bounds;
    syncPlayerWindow();
});

// Send control commands directly to the MPV process
ipcMain.on('mpv-command', (event, command) => {
    console.log('[IPC RECV] mpv-command', command);
    if (command === 'stop') {
        console.trace('STOP COMMAND RECEIVED (MAIN IPC)');
    }
    if (command === 'cycle fullscreen' && mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.setFullScreen(!mainWindow.isFullScreen());
        return;
    }
    if (command === 'toggle-maximize' && mainWindow && !mainWindow.isDestroyed()) {
        if (mainWindow.isMaximized()) {
            mainWindow.unmaximize();
        } else {
            mainWindow.maximize();
        }
        return;
    }
    if (ipcClient && !ipcClient.destroyed) {
        const args = command.split(' ');
        console.log('[MPV IPC SEND]', JSON.stringify({ command: args }));
        ipcClient.write(JSON.stringify({ command: args }) + '\n');
    }
});

ipcMain.on('toggle-fullscreen', () => {
    console.log('[IPC RECV] toggle-fullscreen');
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.setFullScreen(!mainWindow.isFullScreen());
    }
});

ipcMain.on('hide-splash', () => {
    console.log('[IPC RECV] hide-splash');
    showMainWindowAndHideSplash();
});

// Ensure the Cache directory exists within the OS-specific User Data folder
const cacheDir = path.join(app.getPath('userData'), 'cache');
if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
}

ipcMain.handle('get-ip-address', () => {
    const os = require('os');
    const interfaces = os.networkInterfaces();
    for (const devName in interfaces) {
        const iface = interfaces[devName];
        for (let i = 0; i < iface.length; i++) {
            const alias = iface[i];
            if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal) {
                return alias.address;
            }
        }
    }
    return 'localhost';
});

ipcMain.on('copy-to-clipboard', (event, text) => {
    clipboard.writeText(text);
});

// M3U Parsing backend wrapper
ipcMain.handle('parse-m3u', async (event, source, epgSource, mappings, forceRefresh) => {
    console.log('[IPC HANDLE] parse-m3u START', { source, epgSource, mappings, forceRefresh });
    console.time('parse-m3u');
    if (forceRefresh) {
        cachedEpgDict = null; // Clear active node-memory cache when a forced refresh happens
        cachedEpgDictKey = '';
    }

    return new Promise((resolve) => {
        const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
        const baseDir = app.isPackaged ? process.resourcesPath : __dirname;
        const scriptPath = path.join(baseDir, 'backend', 'parser.py');
        
        const args = [scriptPath, source];
        if (epgSource !== undefined && epgSource !== null) args.push(epgSource);
        else args.push('');
        if (mappings !== undefined && mappings !== null) args.push(mappings);

        const env = Object.assign({}, process.env, { 
            AIVUE_CACHE_DIR: cacheDir,
            AIVUE_FORCE_REFRESH: forceRefresh ? '1' : '0'
        });

        console.log(`[Backend] Starting Python parser for: ${source}`);
        execFile(pythonCmd, args, { maxBuffer: 1024 * 1024 * 500, windowsHide: true, timeout: 120000, env }, (error, stdout, stderr) => {
            console.log(`[Backend] Python parser finished.`);
            console.timeEnd('parse-m3u');
            console.log('[IPC HANDLE] parse-m3u END');
            if (error) {
                console.error(`[Backend] Error:`, error.message);
                return resolve({ error: `${error.message}\n${stderr || ''}` });
            }
            if (!stdout || stdout.trim() === '') {
                return resolve({ error: "Python executed but returned absolutely nothing. Ensure 'backend/parser.py' is not empty, and that the Microsoft Store Python alias isn't intercepting the command." });
            }
            try { resolve(JSON.parse(stdout)); } 
            catch (e) { resolve({ error: `Failed to parse Python output. Raw: ${stdout.substring(0, 100)}` }); }
        });
    });
});

let cachedEpgDict = null;
let cachedEpgDictKey = '';

// Standalone EPG Dictionary Extractor (For hot-swapping data without reloading M3Us)
ipcMain.handle('get-epg-dict', async (event, epgSources, filterIds) => {
    console.log('[IPC HANDLE] get-epg-dict', { epgSources, filterIds });
    const cacheKey = epgSources + '|' + (filterIds || 'ALL');
    if (cachedEpgDictKey === cacheKey && cachedEpgDict) {
        return cachedEpgDict;
    }
    return new Promise((resolve) => {
        const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
        const baseDir = app.isPackaged ? process.resourcesPath : __dirname;
        const scriptPath = path.join(baseDir, 'backend', 'parser.py');
        
        const args = [scriptPath, '--epg-dict', epgSources || '', filterIds || ''];

        const env = Object.assign({}, process.env, { AIVUE_CACHE_DIR: cacheDir, AIVUE_FORCE_REFRESH: '0' });

        execFile(pythonCmd, args, { maxBuffer: 1024 * 1024 * 500, windowsHide: true, env }, (error, stdout) => {
            if (error) return resolve({});
            try { 
                cachedEpgDict = JSON.parse(stdout);
                cachedEpgDictKey = cacheKey;
                resolve(cachedEpgDict); 
            } 
            catch (e) { resolve({}); }
        });
    });
});

// Standalone EPG Extractor
ipcMain.handle('get-epg-channels', async (event, epgSources) => {
    console.log('[IPC HANDLE] get-epg-channels', { epgSources });
    if (!epgSources) return [];
    
    const sources = epgSources.split(',').map(s => s.trim()).filter(s => s);
    const stalkerSources = sources.filter(s => s.startsWith('stalker:'));
    const otherSources = sources.filter(s => !s.startsWith('stalker:'));
    
    let allEpgChannels = [];
    
    // 1. Get other EPG channels using Python parser
    if (otherSources.length > 0) {
        const otherChannels = await new Promise((resolve) => {
            const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
            const baseDir = app.isPackaged ? process.resourcesPath : __dirname;
            const scriptPath = path.join(baseDir, 'backend', 'parser.py');
            
            const args = [scriptPath, '--epg-only', otherSources.join(',')];
            const env = Object.assign({}, process.env, { AIVUE_CACHE_DIR: cacheDir, AIVUE_FORCE_REFRESH: '0' });
            
            execFile(pythonCmd, args, { maxBuffer: 1024 * 1024 * 100, windowsHide: true, env }, (error, stdout) => {
                if (error) return resolve([]);
                try { resolve(JSON.parse(stdout)); } 
                catch (e) { resolve([]); }
            });
        });
        allEpgChannels.push(...otherChannels);
    }
    
    // 2. Get Stalker EPG channels from SQLite database
    if (stalkerSources.length > 0 && db) {
        for (const stalkerSrc of stalkerSources) {
            try {
                const rows = db.prepare(`
                    SELECT DISTINCT e.channel_id, COALESCE(c.title, e.channel_id) AS name
                    FROM epg e
                    LEFT JOIN channels c ON e.channel_id = c.tvg_id
                    WHERE e.source_url = ?
                `).all(stalkerSrc);
                
                const stalkerChannels = rows.map(r => ({
                    id: r.channel_id,
                    name: r.name,
                    source: stalkerSrc
                }));
                allEpgChannels.push(...stalkerChannels);
            } catch (err) {
                console.error('[DB ERR] Failed to fetch Stalker EPG channels:', err);
            }
        }
    }
    
    return allEpgChannels;
});

ipcMain.handle('update-epg', async (event, epgSources, filterIds, forceRefresh) => {
    console.log('[IPC HANDLE] update-epg START', { epgSources, filterIds, forceRefresh });
    console.time('update-epg');
    if (!db) {
        console.timeEnd('update-epg');
        return false;
    }
    const sources = (epgSources || '').split(',').map(s => s.trim()).filter(s => s);
    if (sources.length === 0) {
        console.timeEnd('update-epg');
        return true;
    }

    const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
    const baseDir = app.isPackaged ? process.resourcesPath : __dirname;
    const scriptPath = path.join(baseDir, 'backend', 'parser.py');
    const env = Object.assign({}, process.env, { AIVUE_CACHE_DIR: cacheDir, AIVUE_FORCE_REFRESH: forceRefresh ? '1' : '0' });

    for (const source of sources) {
        if (source.startsWith('stalker:')) {
            const mac = source.substring(8);
            console.log(`[STALKER EPG] Fetching EPG for MAC: ${mac}`);
            
            try {
                // Find the playlist URL from the database
                const playlistRow = db.prepare('SELECT source_url FROM playlists WHERE epg_url = ?').get(source);
                if (!playlistRow) {
                    console.warn(`[STALKER EPG] No playlist found in DB for EPG source: ${source}`);
                    continue;
                }
                
                const baseUrl = playlistRow.source_url;
                
                // 1. Fetch ITV channels from the portal
                let stalkerChannels = [];
                try {
                    const res = await stalkerRequest(baseUrl, mac, 'get_all_channels', { type: 'itv' });
                    stalkerChannels = res.js?.data || (Array.isArray(res.js) ? res.js : []);
                } catch (err) {
                    console.error('[STALKER EPG] Failed to fetch all channels from portal:', err);
                }
                
                if (!stalkerChannels || stalkerChannels.length === 0) {
                    // Fallback: load from channels table in DB
                    try {
                        const rows = db.prepare(`
                            SELECT tvg_id AS id, title AS name
                            FROM channels
                            WHERE playlist_id = (SELECT id FROM playlists WHERE epg_url = ?) AND type = 'live'
                        `).all(source);
                        stalkerChannels = rows.map(r => ({ id: r.id, name: r.name }));
                    } catch (dbErr) {
                        console.error('[STALKER EPG] DB fallback failed:', dbErr);
                    }
                }
                
                if (!stalkerChannels || stalkerChannels.length === 0) {
                    console.log(`[STALKER EPG] No channels found to fetch EPG for: ${source}`);
                    continue;
                }
                
                console.log(`[STALKER EPG] Fetching EPG for ${stalkerChannels.length} channels...`);
                
                // 2. Fetch short EPG for all channels in parallel with limit
                const stalkerEpgDict = {};
                const chunkSize = 12; // concurrency limit
                for (let i = 0; i < stalkerChannels.length; i += chunkSize) {
                    const chunk = stalkerChannels.slice(i, i + chunkSize);
                    await Promise.all(chunk.map(async (ch) => {
                        const chId = ch.id || ch.ch_id;
                        if (!chId) return;
                        
                        try {
                            const epgRes = await stalkerRequest(baseUrl, mac, 'get_short_epg', { type: 'itv', ch_id: chId });
                            const events = epgRes.js || [];
                            if (Array.isArray(events) && events.length > 0) {
                                stalkerEpgDict[String(chId)] = events.map(ev => ({
                                    start: formatStalkerDate(ev.time, ev.start_timestamp),
                                    stop: formatStalkerDate(ev.time_to, ev.stop_timestamp),
                                    title: ev.name || 'No Title',
                                    desc: ev.descr || ev.desc || ''
                                }));
                            }
                        } catch (e) {
                            console.error(`[STALKER EPG ERR] Failed for channel ${chId}:`, e.message);
                        }
                    }));
                }
                
                // 3. Save to database using a transaction
                const deleteOld = db.prepare('DELETE FROM epg WHERE source_url = ?');
                const insert = db.prepare(`
                    INSERT INTO epg (channel_id, start_time, stop_time, title, description, source_url)
                    VALUES (@channel_id, @start, @stop, @title, @desc, @source)
                `);
                
                const saveTx = db.transaction((epgDict) => {
                    deleteOld.run(source);
                    let insertCount = 0;
                    for (const [chId, progs] of Object.entries(epgDict)) {
                        for (const p of progs) {
                            insert.run({
                                channel_id: chId,
                                start: p.start || '',
                                stop: p.stop || '',
                                title: p.title || '',
                                desc: p.desc || '',
                                source: source
                            });
                            insertCount++;
                        }
                    }
                    console.log(`[STALKER EPG] Inserted ${insertCount} EPG entries for ${source}`);
                });
                
                saveTx(stalkerEpgDict);
            } catch (err) {
                console.error(`[STALKER EPG] Failed to update for ${source}:`, err);
            }
            continue;
        }

        try {
            const args = [scriptPath, '--epg-dict', source, filterIds || ''];
            const stdout = await new Promise((resolve, reject) => {
                execFile(pythonCmd, args, { maxBuffer: 1024 * 1024 * 500, windowsHide: true, env }, (error, stdout) => {
                    if (error) reject(error);
                    else resolve(stdout);
                });
            });

            const dict = JSON.parse(stdout);
            
            const deleteOld = db.prepare('DELETE FROM epg WHERE source_url = ?');
            const insert = db.prepare(`
                INSERT INTO epg (channel_id, start_time, stop_time, title, description, source_url)
                VALUES (@channel_id, @start, @stop, @title, @desc, @source)
            `);

            const saveTx = db.transaction((epgDict) => {
                deleteOld.run(source);
                for (const [chId, progs] of Object.entries(epgDict)) {
                    for (const p of progs) {
                        insert.run({
                            channel_id: chId,
                            start: p.start || '',
                            stop: p.stop || '',
                            title: p.title || '',
                            desc: p.desc || '',
                            source: source
                        });
                    }
                }
            });

            saveTx(dict);
        } catch (err) {
            console.error(`[EPG Update] Failed for ${source}:`, err);
        }
    }
    console.timeEnd('update-epg');
    console.log('[IPC HANDLE] update-epg END');
    return true;
});

function getEpgDataFromDb(channelIds, startLimit, endLimit) {
    if (!db || !channelIds || channelIds.length === 0) return {};
    try {
        const result = {};
        // SQLite has a limit on bind variables, process array elements in safe chunks
        const chunkSize = 900;
        for (let i = 0; i < channelIds.length; i += chunkSize) {
            const chunk = channelIds.slice(i, i + chunkSize);
            const placeholders = chunk.map(() => '?').join(',');
            
            let query, params;
            if (startLimit && endLimit) {
                query = `SELECT channel_id, start_time, stop_time, title, description FROM epg WHERE channel_id IN (${placeholders}) AND stop_time >= ? AND start_time <= ? ORDER BY start_time ASC`;
                params = [...chunk, startLimit, endLimit];
            } else {
                query = `SELECT channel_id, start_time, stop_time, title, description FROM epg WHERE channel_id IN (${placeholders}) ORDER BY start_time ASC`;
                params = [...chunk];
            }
            
            const rows = db.prepare(query).all(...params);
            
            for (const row of rows) {
                if (!result[row.channel_id]) result[row.channel_id] = [];
                result[row.channel_id].push({
                    start: row.start_time,
                    stop: row.stop_time,
                    title: row.title,
                    desc: row.description
                });
            }
        }
        return result;
    } catch (e) {
        console.error('[DB ERR] Failed to get EPG:', e);
        return {};
    }
}

ipcMain.handle('get-epg', (event, channelIds, startLimit, endLimit) => {
    console.log('[IPC HANDLE] get-epg START', { channelIds_count: channelIds ? channelIds.length : 0 });
    console.time('get-epg');
    const result = getEpgDataFromDb(channelIds, startLimit, endLimit);
    console.timeEnd('get-epg');
    console.log('[IPC HANDLE] get-epg END');
    return result;
});

// Native file dialog for selecting playlists
ipcMain.handle('open-file-dialog', async () => {
    console.log('[IPC HANDLE] open-file-dialog');
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
        title: 'AIVue Player',
        properties: ['openFile'],
        filters: [{ name: 'M3U Playlists', extensions: ['m3u', 'm3u8'] }]
    });
    if (canceled) return [];
    return filePaths;
});

// Channels persistence
function saveChannelsToDb(playlists) {
    console.log('[DB] Saving channels to database START...');
    console.time('saveChannelsToDb');
    if (!db) {
        console.timeEnd('saveChannelsToDb');
        return false;
    }
    const insertPlaylist = db.prepare(`
        INSERT INTO playlists (id, name, source_url, epg_url, is_disabled, exp_date)
        VALUES (@id, @name, @source, @epg, @disabled, @exp_date)
        ON CONFLICT(id) DO UPDATE SET
            name = @name,
            source_url = @source,
            epg_url = @epg,
            is_disabled = @disabled,
            exp_date = @exp_date
    `);

    const insertChannel = db.prepare(`
        INSERT INTO channels (playlist_id, tvg_id, tvg_name, title, logo, group_name, stream_url, is_favourite, is_disabled, type)
        VALUES (@playlist_id, @tvg_id, @tvg_name, @title, @logo, @group_name, @stream_url, @is_favourite, @is_disabled, @type)
    `);

    const clearChannels = db.prepare(`DELETE FROM channels WHERE playlist_id = ?`);
    const deletePlaylist = db.prepare(`DELETE FROM playlists WHERE id = ?`);

    const saveTx = db.transaction((pls) => {
        const incomingIds = pls.map(p => p.id.toString());
        const existingPlaylists = db.prepare(`SELECT id FROM playlists`).all();
        for (const row of existingPlaylists) {
            if (!incomingIds.includes(row.id)) {
                deletePlaylist.run(row.id);
            }
        }

        for (const p of pls) {
            insertPlaylist.run({
                id: p.id.toString(),
                name: p.name || 'Unnamed',
                source: p.source || '',
                epg: p.epg || 'Not Configured',
                disabled: p.disabled ? 1 : 0,
                exp_date: p.exp_date || null
            });

            clearChannels.run(p.id.toString());
            
            if (p.channels) {
                for (const c of p.channels) {
                    insertChannel.run({
                        playlist_id: p.id.toString(),
                        tvg_id: c.tvg_id || '',
                        tvg_name: c.tvg_name || '',
                        title: c.title || '',
                        logo: c.logo || '',
                        group_name: c.group || '',
                        stream_url: c.url || '',
                        is_favourite: c.favourite ? 1 : 0,
                        is_disabled: c.disabled ? 1 : 0,
                        type: c.type || 'live'
                    });
                }
            }
        }
    });

    try {
        saveTx(playlists);
    } catch (e) {
        console.error('[DB ERR] Transaction failed:', e);
        console.timeEnd('saveChannelsToDb');
        throw e;
    }
    
    console.timeEnd('saveChannelsToDb');
    console.log('[DB] Saving channels to database END.');
    return true;
}

ipcMain.handle('save-channels', (event, channels) => {
    console.log('[IPC HANDLE] save-channels START', { playlist_count: channels ? channels.length : 0 });
    try {
        const result = saveChannelsToDb(channels);
        console.log('[IPC HANDLE] save-channels END');
        return result;
    } catch (e) {
        console.error('[DB ERR] Failed to save channels:', e);
        return false;
    }
});

ipcMain.handle('delete-playlist', async (event, playlistId) => {
    console.log('[IPC HANDLE] delete-playlist START', playlistId);
    console.time('delete-playlist');
    if (!db) {
        console.timeEnd('delete-playlist');
        return false;
    }
    try {
        const deleteChannels = db.prepare('DELETE FROM channels WHERE playlist_id = ?');
        const deletePlaylist = db.prepare('DELETE FROM playlists WHERE id = ?');
        
        const deleteTx = db.transaction((id) => {
            deleteChannels.run(id);
            deletePlaylist.run(id);
        });
        
        deleteTx(playlistId.toString());
        console.timeEnd('delete-playlist');
        console.log('[IPC HANDLE] delete-playlist END');
        return true;
    } catch (e) {
        console.error('[DB ERR] Failed to delete playlist:', e);
        console.timeEnd('delete-playlist');
        return false;
    }
});

ipcMain.handle('clear-all-playlists', async () => {
    console.log('[IPC HANDLE] clear-all-playlists START');
    if (!db) return false;
    try {
        db.transaction(() => {
            db.prepare('DELETE FROM channels').run();
            db.prepare('DELETE FROM playlists').run();
            db.prepare('DELETE FROM epg').run();
            db.prepare('DELETE FROM mappings').run();
            db.prepare('DELETE FROM external_epgs').run();
        })();
        console.log('[IPC HANDLE] clear-all-playlists END');
        return true;
    } catch (e) {
        console.error('[DB ERR] Failed to clear all playlists:', e);
        return false;
    }
});

ipcMain.handle('get-external-epgs', () => {
    console.log('[IPC HANDLE] get-external-epgs START');
    if (!db) return [];
    try {
        const rows = db.prepare('SELECT source_url FROM external_epgs').all();
        console.log('[IPC HANDLE] get-external-epgs END');
        return rows.map(r => r.source_url);
    } catch (e) {
        console.error('[DB ERR] Failed to get external EPGs:', e);
        throw e;
    }
});

ipcMain.handle('add-external-epg', (event, url) => {
    console.log('[IPC HANDLE] add-external-epg', { url });
    if (!db) return false;
    try {
        db.prepare('INSERT OR IGNORE INTO external_epgs (source_url) VALUES (?)').run(url);
        return true;
    } catch (e) {
        return false;
    }
});

ipcMain.handle('remove-external-epg', (event, url) => {
    console.log('[IPC HANDLE] remove-external-epg', { url });
    if (!db) return false;
    try {
        db.prepare('DELETE FROM external_epgs WHERE source_url = ?').run(url);
        return true;
    } catch (e) {
        return false;
    }
});

function loadChannelsFromDb() {
    try {
        if (!db) return [];
        const oldFilePath = path.join(app.getPath('userData'), 'saved_channels.json');
        
        const dbCount = db.prepare(`SELECT COUNT(*) as count FROM playlists`).get();
        if (dbCount.count === 0 && fs.existsSync(oldFilePath)) {
            console.log("[DB] Starting with a blank database, deleting old JSON data...");
            fs.unlinkSync(oldFilePath);
            console.log("[DB] Old JSON deleted.");
        }

        const playlists = db.prepare(`SELECT * FROM playlists`).all();
        const getChannels = db.prepare(`SELECT * FROM channels WHERE playlist_id = ?`);
        
        const result = [];
        for (const p of playlists) {
            const pChannels = getChannels.all(p.id).map(c => ({
                tvg_id: c.tvg_id,
                tvg_name: c.tvg_name,
                title: c.title,
                logo: c.logo,
                group: c.group_name,
                url: c.stream_url,
                favourite: c.is_favourite === 1,
                disabled: c.is_disabled === 1,
                type: c.type || 'live'
            }));
            
            result.push({
                id: p.id,
                name: p.name,
                source: p.source_url,
                epg: p.epg_url,
                disabled: p.is_disabled === 1,
                exp_date: p.exp_date,
                channels: pChannels
            });
        }
        return result;
    } catch (e) {
        console.error('[DB ERR] Failed to load channels:', e);
        throw e;
    }
}

ipcMain.handle('load-channels', (event) => {
    console.log('[IPC HANDLE] load-channels START');
    const result = loadChannelsFromDb();
    console.log('[IPC HANDLE] load-channels END');
    return result;
});

// Stalker Portal Helper & Handles
function getStalkerUrl(baseUrl) {
    return baseUrl.trim().includes('/c/') ? baseUrl.trim().replace('/c/', '/portal.php') : 
           (baseUrl.trim().includes('/c') ? baseUrl.trim().replace('/c', '/portal.php') : 
           (baseUrl.trim().endsWith('.php') ? baseUrl.trim() : (baseUrl.trim().endsWith('/') ? baseUrl.trim() + 'portal.php' : baseUrl.trim() + '/portal.php')));
}

function formatStalkerDate(rawTime, timestamp) {
    if (timestamp) {
        const date = new Date(timestamp * 1000);
        const pad = n => n.toString().padStart(2, '0');
        return `${date.getUTCFullYear()}${pad(date.getUTCMonth()+1)}${pad(date.getUTCDate())}${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())} +0000`;
    }
    if (typeof rawTime === 'string') {
        const clean = rawTime.replace(/[-:\s]/g, '');
        if (clean.length === 14) {
            return `${clean} +0000`;
        }
    }
    return '';
}

async function runInChunks(items, chunkSize, asyncFn) {
    for (let i = 0; i < items.length; i += chunkSize) {
        const chunk = items.slice(i, i + chunkSize);
        await Promise.all(chunk.map(asyncFn));
    }
}

const stalkerTokens = new Map();
const stalkerAuthPromises = new Map();

async function authenticateStalker(baseUrl, mac) {
    const url = getStalkerUrl(baseUrl);
    const cacheKey = `${url}|${mac}`;
    
    if (stalkerTokens.has(cacheKey)) {
        const cached = stalkerTokens.get(cacheKey);
        if (Date.now() - cached.timestamp < 3600000) {
            return cached;
        }
    }

    if (stalkerAuthPromises.has(cacheKey)) {
        return await stalkerAuthPromises.get(cacheKey);
    }

    const authPromise = (async () => {
        const handshakeUrl = `${url}?type=stb&action=handshake&key=&js=true`;
        const headers = {
            'User-Agent': 'Mozilla/5.0 (QtEmbedded; U; Linux; C) AppleWebKit/533.3 (KHTML, like Gecko) MAG200 stbapp ver: 2 rev: 250 Safari/533.3',
            'X-User-Agent': 'Model: MAG250; Link: Ethernet',
            'Accept': '*/*',
            'Referer': url.replace('/server/load.php', '/c/index.html').replace('/portal.php', '/c/index.html'),
            'Cookie': `mac=${mac}; stb_lang=en; timezone=GMT`
        };

        let phpSessionId = '';
        let token = '';
        
        try {
            const response = await fetch(handshakeUrl, { headers });
            const setCookie = response.headers.get('set-cookie');
            if (setCookie) {
                const match = setCookie.match(/PHPSESSID=([^;]+)/);
                if (match) phpSessionId = match[1];
            }
            if (!phpSessionId && typeof response.headers.getSetCookie === 'function') {
                const cookiesList = response.headers.getSetCookie();
                for (const cookie of cookiesList) {
                    const match = cookie.match(/PHPSESSID=([^;]+)/);
                    if (match) {
                        phpSessionId = match[1];
                        break;
                    }
                }
            }
            
            const text = await response.text();
            if (!text || !text.trim()) {
                console.warn('[STALKER ERR] Empty handshake response from', handshakeUrl);
            } else {
                try {
                    const handshakeData = JSON.parse(text);
                    token = handshakeData.js?.token || '';
                } catch (err) {
                    console.error('[STALKER ERR] Invalid JSON in handshake');
                    console.error('URL:', handshakeUrl);
                    console.error('Status:', response.status);
                    console.error('Body:', text.substring(0, 1000));
                }
            }
        } catch (e) {
            console.error('[STALKER ERR] Handshake network failed:', e.message);
        }
        
        const cookieHeader = `mac=${mac}; stb_lang=en; timezone=GMT` + (phpSessionId ? `; PHPSESSID=${phpSessionId}` : '');
        const authHeaders = {
            ...headers,
            'Cookie': cookieHeader
        };
        
        const profileUrl = `${url}?type=stb&action=get_profile&mac=${encodeURIComponent(mac)}&hd=1&auth_second_step=1`;
        try {
            const response = await fetch(profileUrl, { headers: authHeaders });
            
            // Capture PHPSESSID from profile request as well!
            const setCookie = response.headers.get('set-cookie');
            if (setCookie) {
                const match = setCookie.match(/PHPSESSID=([^;]+)/);
                if (match) phpSessionId = match[1];
            }
            if (!phpSessionId && typeof response.headers.getSetCookie === 'function') {
                const cookiesList = response.headers.getSetCookie();
                for (const cookie of cookiesList) {
                    const match = cookie.match(/PHPSESSID=([^;]+)/);
                    if (match) {
                        phpSessionId = match[1];
                        break;
                    }
                }
            }

            const profileData = await response.json();
            if (profileData.js?.token) {
                token = profileData.js.token;
            }
        } catch (e) {
            console.error('[STALKER ERR] Profile auth failed:', e.message);
        }
        
        const session = { phpSessionId, token, timestamp: Date.now() };
        stalkerTokens.set(cacheKey, session);
        stalkerAuthPromises.delete(cacheKey);
        return session;
    })();

    stalkerAuthPromises.set(cacheKey, authPromise);
    return await authPromise;
}

async function stalkerRequest(baseUrl, mac, action, extraParams = {}, isRetry = false) {
    const session = await authenticateStalker(baseUrl, mac);
    const url = session.activeUrl || getStalkerUrl(baseUrl);
    const cacheKey = `${getStalkerUrl(baseUrl)}|${mac}`;
    
    const headers = {
        'User-Agent': 'Mozilla/5.0 (QtEmbedded; U; Linux; C) AppleWebKit/533.3 (KHTML, like Gecko) MAG200 stbapp ver: 2 rev: 250 Safari/533.3',
        'X-User-Agent': 'Model: MAG250; Link: Ethernet',
        'Accept': '*/*',
        'Referer': url.replace('/server/load.php', '/c/index.html').replace('/portal.php', '/c/index.html')
    };
    
    const cookieHeader = `mac=${mac}; stb_lang=en; timezone=GMT` + (session.phpSessionId ? `; PHPSESSID=${session.phpSessionId}` : '');
    const reqHeaders = {
        ...headers,
        'Cookie': cookieHeader,
        ...(session.token ? { 'Authorization': `Bearer ${session.token}` } : {})
    };
    
    let queryParams = `type=${extraParams.type || 'itv'}&action=${action}&mac=${encodeURIComponent(mac)}&JsHttpRequest=1-xml`;
    for (const [k, v] of Object.entries(extraParams)) {
        if (k !== 'type') queryParams += `&${k}=${encodeURIComponent(v)}`;
    }
    
    const requestUrl = `${url}?${queryParams}`;
    if (action === 'create_link') {
        console.log('[CREATE LINK REQUEST URL]', requestUrl);
        console.log('[CREATE LINK TOKEN]', session.token);
        console.log('[CREATE LINK CMD PARAM]', extraParams.cmd);
    }
    
    try {
        const response = await fetch(requestUrl, { headers: reqHeaders });
        
        // Auto-heal on Unauthorized/Forbidden status codes
        if ((response.status === 401 || response.status === 403) && !isRetry) {
            console.warn(`[STALKER] Session invalid/expired (HTTP ${response.status}). Re-authenticating and retrying ${action}...`);
            stalkerTokens.delete(cacheKey);
            return stalkerRequest(baseUrl, mac, action, extraParams, true);
        }
        
        // Capture PHPSESSID dynamic updates
        let newPhpSessionId = '';
        const setCookie = response.headers.get('set-cookie');
        if (setCookie) {
            const match = setCookie.match(/PHPSESSID=([^;]+)/);
            if (match) newPhpSessionId = match[1];
        }
        if (!newPhpSessionId && typeof response.headers.getSetCookie === 'function') {
            const cookiesList = response.headers.getSetCookie();
            for (const cookie of cookiesList) {
                const match = cookie.match(/PHPSESSID=([^;]+)/);
                if (match) {
                    newPhpSessionId = match[1];
                    break;
                }
            }
        }
        if (newPhpSessionId && session.phpSessionId !== newPhpSessionId) {
            console.log('[STALKER] Dynamic session cookie update:', newPhpSessionId);
            session.phpSessionId = newPhpSessionId;
            stalkerTokens.set(cacheKey, { ...session, phpSessionId: newPhpSessionId });
        }
        
        const text = await response.text();
        if (action === 'create_link') {
            console.log('[CREATE LINK RAW]', text.substring(0, 500));
        }
        
        if (!text || !text.trim()) {
            console.warn(`[STALKER] Empty response for ${action}`, requestUrl);
            if (!isRetry) {
                console.warn(`[STALKER] Retrying empty response once...`);
                stalkerTokens.delete(cacheKey);
                return stalkerRequest(baseUrl, mac, action, extraParams, true);
            }
            return {};
        }
        
        try {
            const parsed = JSON.parse(text);
            // Handle portal-specific JSON error blocks
            if (parsed && (parsed.error === 'Expired token' || parsed.error === 'Unauthorized' || parsed.message === 'Access denied' || parsed.js?.error === 'expired') && !isRetry) {
                console.warn(`[STALKER] Session error in JSON response: ${parsed.error || parsed.message || parsed.js?.error}. Re-authenticating...`);
                stalkerTokens.delete(cacheKey);
                return stalkerRequest(baseUrl, mac, action, extraParams, true);
            }
            return parsed;
        } catch (err) {
            console.error(`[STALKER] Invalid JSON for ${action}`);
            if (!isRetry) {
                console.warn(`[STALKER] Retrying invalid JSON response once...`);
                stalkerTokens.delete(cacheKey);
                return stalkerRequest(baseUrl, mac, action, extraParams, true);
            }
            return {};
        }
    } catch (err) {
        console.error(`[STALKER ERR] Network error for ${action}:`, err.message);
        if (!isRetry) {
            console.warn(`[STALKER] Retrying network failure once...`);
            stalkerTokens.delete(cacheKey);
            return stalkerRequest(baseUrl, mac, action, extraParams, true);
        }
        return {};
    }
}

async function fetchAllStalkerPages(baseUrl, mac, action, extraParams) {
    const firstPageRes = await stalkerRequest(baseUrl, mac, action, { ...extraParams, p: 1 });
    if (!firstPageRes || !firstPageRes.js) {
        console.warn(`[STALKER] Missing js payload in first page for ${action}. Aborting pagination.`);
        return [];
    }

    let data = firstPageRes.js?.data || (Array.isArray(firstPageRes.js) ? firstPageRes.js : []);
    let allItems = [...data];
    let totalItems = firstPageRes.js?.total_items ? parseInt(firstPageRes.js.total_items, 10) : 0;
    let itemsPerPage = data.length;
    
    if (totalItems > 0 && itemsPerPage > 0) {
        let totalPages = Math.ceil(totalItems / itemsPerPage);
        
        // Prevent pagination flooding on seasons/episodes queries (sub-queries for a specific movie_id or season_id).
        // Some portals mistakenly return the total VOD/category item count under total_items for these sub-queries,
        // which results in thousands of concurrent page requests that trigger portal rate-limiting.
        const isSubQuery = extraParams && (
            extraParams.movie_id !== undefined || 
            extraParams.season_id !== undefined ||
            extraParams.series_id !== undefined ||
            extraParams.season_num !== undefined ||
            extraParams.season_number !== undefined ||
            extraParams.episode_id !== undefined
        );
        
        if (isSubQuery && totalPages > 5) {
            console.log(`[STALKER] Sub-query detected with high page count (${totalPages}). Capping to 5 pages to prevent rate-limiting.`);
            totalPages = 5;
        }
        
        if (totalPages > 1) {
            console.log(`[STALKER] Fetching ${totalPages - 1} additional pages for ${action} (${totalItems} total items)...`);
            const chunkSize = 10; // Parallel fetch chunk size for 10x faster loading speed!
            for (let i = 2; i <= totalPages; i += chunkSize) {
                const chunkPromises = [];
                for (let p = i; p < i + chunkSize && p <= totalPages; p++) {
                    chunkPromises.push(stalkerRequest(baseUrl, mac, action, { ...extraParams, p }));
                }
                const results = await Promise.all(chunkPromises);
                for (const res of results) {
                    if (!res || !res.js) {
                        console.warn(`[STALKER] No js payload returned`, extraParams);
                        continue;
                    }
                    let chunkData = res.js?.data || (Array.isArray(res.js) ? res.js : []);
                    allItems.push(...chunkData);
                }
            }
        }
    }
    
    const uniqueItems = [];
    const seenIds = new Set();
    for (const item of allItems) {
        const id = item.id || item.ch_id || item.cmd;
        if (id && !seenIds.has(id)) {
            seenIds.add(id);
            uniqueItems.push(item);
        } else if (!id) {
            uniqueItems.push(item);
        }
    }
    
    return uniqueItems;
}

ipcMain.handle('resolve-stalker-link', async (event, { url, mac, type, cmd, series }) => {
    try {
        console.log('[STALKER IPC] Resolving link for:', { url, mac, type, cmd, series });
        
        const probes = [];

        if (series !== undefined && series !== null) {
            probes.push({ type: 'vod', cmd, series });
        }
        
        probes.push({ type, cmd });

        // Create variations of the cmd to bypass common Stalker portal quirks
        let parsedObj = null;
        if (typeof cmd === 'string') {
            if (cmd.startsWith('{')) {
                try { parsedObj = JSON.parse(cmd); } catch (e) {}
            } else {
                try {
                    const decoded = Buffer.from(cmd, 'base64').toString('utf8');
                    if (decoded.startsWith('{')) parsedObj = JSON.parse(decoded);
                } catch (e) {}
            }
        }

        if (parsedObj) {
            const altObj = { ...parsedObj };
            // Ensure both episode_num and episode_number are present
            if (altObj.episode_num && !altObj.episode_number) altObj.episode_number = altObj.episode_num;
            if (altObj.episode_number && !altObj.episode_num) altObj.episode_num = altObj.episode_number;

            const asJson = JSON.stringify(altObj);
            const asBase64 = Buffer.from(asJson).toString('base64');
            
            if (cmd !== asJson) probes.push({ type, cmd: asJson, ...(series !== undefined ? { series } : {}) });
            if (cmd !== asBase64) probes.push({ type, cmd: asBase64, ...(series !== undefined ? { series } : {}) });
            
            if (type === 'series') {
                probes.push({ type: 'vod', cmd: asBase64, ...(series !== undefined ? { series } : {}) });
                probes.push({ type: 'vod', cmd: asJson, ...(series !== undefined ? { series } : {}) });
            }
        }

        let finalUrl = '';
        
        for (const probe of probes) {
            console.log('[CREATE LINK PROBE]', probe);
            const res = await stalkerRequest(url, mac, 'create_link', probe);
            
            finalUrl = res?.js?.cmd || res?.js?.url || '';
            if (finalUrl) {
                console.log('[CREATE LINK SUCCESS] Found URL using probe.');
                break;
            }
        }
        
        if (!finalUrl) {
            console.error('[STALKER IPC] Could not find stream URL in response across all probes.');
            return null;
        }

        // Strip the ffmpeg wrapper if Stalker serves it natively
        if (finalUrl.toLowerCase().startsWith('ffmpeg ')) {
            finalUrl = finalUrl.substring(7).trim();
        }
        
        // Re-construct into absolute URLs if the portal provides an incomplete route
        if (finalUrl && !finalUrl.startsWith('http')) {
            try {
                const parsed = new URL(url);
                finalUrl = `${parsed.protocol}//${parsed.host}${finalUrl.startsWith('/') ? '' : '/'}${finalUrl}`;
            } catch (err) {}
        } else if (finalUrl) {
            try {
                const parsedFinal = new URL(finalUrl);
                if (parsedFinal.hostname === 'localhost' || parsedFinal.hostname === '127.0.0.1') {
                    const parsedPortal = new URL(url);
                    parsedFinal.hostname = parsedPortal.hostname;
                    finalUrl = parsedFinal.toString();
                }
            } catch (err) {}
        }
        
        return finalUrl;
    } catch (e) {
        console.error('[STALKER IPC] Resolving link failed:', e);
        return null;
    }
});

ipcMain.handle('parse-stalker', async (event, { url, mac }) => {
    try {
        console.log('[STALKER IPC] Starting Stalker parsing for url:', url, 'mac:', mac);
        
        let allParsed = [];
        let expireDate = null;
        
        // 0. Fetch profile for expiry date
        try {
            const profileRes = await stalkerRequest(url, mac, 'get_profile', { type: 'stb' });
            if (profileRes && profileRes.js) {
                const expire = profileRes.js.expire_billing || profileRes.js.expire || profileRes.js.end_date;
                if (expire) {
                    expireDate = expire;
                }
            }
        } catch(e) {
            console.error('[STALKER] Failed to load profile:', e);
        }

        // 1. Fetch ITV Categories (Genres)
        let itvCategories = [];
        try {
            const catRes = await stalkerRequest(url, mac, 'get_genres', { type: 'itv' });
            const catData = catRes.js?.data || (Array.isArray(catRes.js) ? catRes.js : []);
            itvCategories = catData.map(c => ({ id: c.id, name: c.title || c.name || 'Live TV' }));
            
            itvCategories.forEach(c => {
                allParsed.push({
                    tvg_id: c.id,
                    title: c.name,
                    group: 'Live TV',
                    logo: '',
                    url: `stalker-category:itv|${c.id}`,
                    type: 'itv_category'
                });
            });
        } catch (e) {
            console.error('[STALKER] Failed to load ITV categories:', e);
        }

        // Fallback for ITV
        if (itvCategories.length === 0) {
            allParsed.push({
                tvg_id: 'all',
                title: 'All Channels',
                group: 'Live TV',
                logo: '',
                url: 'stalker-category:itv|all',
                type: 'itv_category'
            });
        }

        // 2. Fetch VOD Categories (Lazy Load Placeholders)
        try {
            const catRes = await stalkerRequest(url, mac, 'get_categories', { type: 'vod' });
            const catData = catRes.js?.data || (Array.isArray(catRes.js) ? catRes.js : []);
            
            catData.forEach(cat => {
                const name = cat.title || cat.name || cat.category_name || 'VOD';
                const isSeries = name.toLowerCase().match(/(tv|series|show)/);
                if (isSeries) {
                    allParsed.push({
                        tvg_id: cat.id,
                        tvg_name: name,
                        title: name,
                        logo: '',
                        group: 'Series Categories',
                        url: `stalker-category:series|${cat.id}`,
                        type: 'vod_category'
                    });
                } else {
                    allParsed.push({
                        tvg_id: cat.id,
                        tvg_name: name,
                        title: name,
                        logo: '',
                        group: 'Movie Categories',
                        url: `stalker-category:movie|${cat.id}`,
                        type: 'movie_category'
                    });
                }
            });
        } catch (e) {
            console.error('[STALKER] Failed to load VOD categories:', e);
        }

        // 3. Fetch Series Categories (Lazy Load Placeholders for portals that separate movies and series)
        try {
            console.log('[STALKER] Attempting to load dedicated Series categories...');
            const seriesCatRes = await stalkerRequest(url, mac, 'get_categories', { type: 'series' });
            const seriesCatData = seriesCatRes.js?.data || (Array.isArray(seriesCatRes.js) ? seriesCatRes.js : []);
            
            seriesCatData.forEach(cat => {
                const name = cat.title || cat.name || cat.category_name || 'Series';
                allParsed.push({
                    tvg_id: cat.id,
                    tvg_name: name,
                    title: name,
                    logo: '',
                    group: 'Series Categories',
                    url: `stalker-category:series|${cat.id}`,
                    type: 'vod_category'
                });
            });
        } catch (e) {
            console.warn('[STALKER] Portal does not support dedicated series categories, falling back to mixed VOD.', e.message);
        }
        
        // Remove duplicates
        const uniqueParsed = [];
        const seenSet = new Set();
        for (const item of allParsed) {
            const key = `${item.type}-${item.url || item.title}`;
            if (!seenSet.has(key)) {
                seenSet.add(key);
                uniqueParsed.push(item);
            }
        }
        
        if (uniqueParsed.length === 0) {
            return { error: "Authentication failed or no channels found for the provided MAC address." };
        }

        console.log(`[STALKER IPC] Successfully imported ${uniqueParsed.length} items (Categories lazy-loaded).`);
        return { channels: uniqueParsed, exp_date: expireDate };
    } catch (e) {
        console.error('[STALKER IPC ERR] Failed to parse stalker portal:', e);
        return { error: e.message };
    }
});

ipcMain.handle('load-stalker-category', async (event, { url, mac, categoryId, isSeries, categoryType, categoryName }) => {
    const startTime = Date.now();
    const isSeriesFolder = categoryType === 'series' || isSeries;
    const typeLabel = isSeriesFolder ? 'Series' : 'Movies';
    
    try {
        console.log(`\n=================== [PERF ANALYSIS START: ${typeLabel.toUpperCase()} FOLDER] ===================`);
        console.log(`[PERF] Folder Name: "${categoryName || 'Unknown'}" (ID: ${categoryId})`);
        console.log(`[PERF] MAC: ${mac} | URL: ${url}`);
        
        let action = 'get_ordered_list';
        let params = {};

        if (categoryType === 'itv') {
            params.type = 'itv';
            if (categoryId === 'all') {
                action = 'get_all_channels';
            } else {
                params.genre = categoryId;
            }
        } else if (isSeriesFolder) {
            params.type = 'series';
            params.category = categoryId;
        } else {
            params.type = 'vod';
            params.category = categoryId;
        }

        console.log(`[PERF] Initial Stalker query: action="${action}", params=`, JSON.stringify(params));
        
        const fetchStart = Date.now();
        let itemList = await fetchAllStalkerPages(url, mac, action, params);
        let fetchDuration = Date.now() - fetchStart;
        console.log(`[PERF] Initial Page Fetch Phase completed in ${fetchDuration}ms. Items returned: ${itemList.length}`);
        
        // Fallback for series on mixed VOD portals
        if (isSeriesFolder && itemList.length === 0) {
            console.log(`[PERF] No items found with type: 'series'. Falling back and retrying with type: 'vod'...`);
            const fallbackStart = Date.now();
            params.type = 'vod';
            itemList = await fetchAllStalkerPages(url, mac, action, params);
            const fallbackDuration = Date.now() - fallbackStart;
            fetchDuration += fallbackDuration;
            console.log(`[PERF] Fallback Page Fetch Phase completed in ${fallbackDuration}ms. Items returned: ${itemList.length}`);
        }
        
        if (itemList.length > 0) {
            console.log(`[PERF DEBUG] First raw item keys:`, Object.keys(itemList[0] || {}));
            console.log(`[PERF DEBUG] First raw item full:`, JSON.stringify(itemList[0], null, 2));
            console.log(`[SERIES OBJECT DEBUG]`);
            console.log(`[ID FIELD]`, itemList[0].id);
            console.log(`[MOVIE_ID FIELD]`, itemList[0].movie_id);
            console.log(`[VIDEO_ID FIELD]`, itemList[0].video_id);
            console.log(`[SERIES FIELD]`, itemList[0].series);
        } else {
            console.log(`[PERF WARNING] Portal returned 0 raw items for this category!`);
        }

        const parseStart = Date.now();
        let result = [];

        if (categoryType === 'itv') {
            result = itemList.map(c => ({
                tvg_id: String(c.id || c.ch_id || c.tvg_id || ''),
                tvg_name: c.name || '',
                title: c.name || 'Unknown Channel',
                logo: c.logo ? (c.logo.startsWith('http') ? c.logo : `${url.substring(0, url.lastIndexOf('/'))}/${c.logo}`) : '',
                group: categoryName || 'Live TV',
                url: `stalker-cmd:itv|${c.cmd || ''}`,
                type: 'live'
            }));
        } else {
            result = itemList.filter(m => {
                if (params.type === 'series') return true;
                const isItemSeries = m.is_series == 1 || m.is_series == "1" || m.is_series == true;
                return isSeries ? isItemSeries : !isItemSeries;
            }).map(m => {
                if (isSeries || params.type === 'series') {
                // Fix: m.series can be an empty array []. In JS, [] is truthy.
                // Prioritize m.id per Stalker standard, ignoring empty arrays.
                let seriesId = m.id || m.video_id || m.series_id || m.movie_id || '';
                if (m.series && !Array.isArray(m.series) && typeof m.series !== 'object') {
                    seriesId = m.series;
                }
                    return {
                        id: seriesId,
                        tvg_id: seriesId,
                        name: m.name || 'Unknown Series',
                        logo: m.logo ? (m.logo.startsWith('http') ? m.logo : `${url.substring(0, url.lastIndexOf('/'))}/${m.logo}`) : '',
                        url: `stalker-series:${seriesId}`,
                        type: 'series',
                        group: categoryName || 'Series',
                        tmdb_id: m.tmdb_id || m.tmdbId || m.tmdb || ''
                    };
                } else {
                    const movieId = m.id || m.video_id || m.movie_id || '';
                    return {
                        id: movieId,
                        tvg_id: movieId,
                        name: m.name || 'Unknown Movie',
                        logo: m.logo ? (m.logo.startsWith('http') ? m.logo : `${url.substring(0, url.lastIndexOf('/'))}/${m.logo}`) : '',
                        url: `stalker-cmd:vod|${m.cmd || ''}`,
                        type: 'movie',
                        group: categoryName || 'Movies',
                        tmdb_id: m.tmdb_id || m.tmdbId || m.tmdb || ''
                    };
                }
            });
        }
        
        const parseDuration = Date.now() - parseStart;
        const totalDuration = Date.now() - startTime;
        
        console.log(`[PERF] Filter and mapping phase took ${parseDuration}ms. Output items: ${result.length}`);
        console.log(`[PERF SUCCESS] Total Folder Load Time for ${typeLabel}: ${totalDuration}ms`);
        console.log(`=================== [PERF ANALYSIS END] ===================\n`);
        
        return result;
    } catch (e) {
        console.error(`[PERF FAILURE] Error loading stalker category:`, e);
        return [];
    }
});

ipcMain.handle('get-stalker-episodes', async (event, { url, mac, seriesId }) => {
    const startTime = Date.now();
    console.log(`\n=================== [PERF ANALYSIS START: SERIES EPISODES] ===================`);
    console.log(`[PERF] Loading Episodes for Series ID: ${seriesId}`);
    
    // Ensure seriesId is a valid string to prevent empty array [] corruption
    const cleanSeriesId = Array.isArray(seriesId) ? (seriesId[0] || '') : String(seriesId);
    console.log(`[PERF] Series ID: ${cleanSeriesId}`);

    // Helper to parse season and episode numbers from properties or name
    const parseSeasonAndEpisode = (item, index) => {
        let season = parseInt(item.season_number || item.season || 0);
        let episodeNum = parseInt(item.series_number || item.episode || item.episode_number || 0);
        
        const name = (item.name || '').trim();
        if (!season || !episodeNum) {
            // Try S01E02 or S1E2 or S01 E02 pattern
            const seMatch = name.match(/s(\d+)\s*e(\d+)/i);
            if (seMatch) {
                if (!season) season = parseInt(seMatch[1]);
                if (!episodeNum) episodeNum = parseInt(seMatch[2]);
            } else {
                // Try "Episode X" or "Ep X" or "Ep. X" pattern
                const epMatch = name.match(/(?:episode|ep|ep\.)\s*(\d+)/i);
                if (epMatch) {
                    if (!episodeNum) episodeNum = parseInt(epMatch[1]);
                }
                
                // Try "Season X" or "S X" pattern
                const sMatch = name.match(/(?:season|s)\s*(\d+)/i);
                if (sMatch) {
                    if (!season) season = parseInt(sMatch[1]);
                }
            }
        }
        
        // Try to match just a plain number in the name if episodeNum is still 0
        if (!episodeNum) {
            const numMatch = name.match(/^\d+$/);
            if (numMatch) {
                episodeNum = parseInt(name);
            }
        }
        
        // Fallbacks
        if (!season) season = 1;
        if (!episodeNum) episodeNum = index + 1;
        
        return { season, episodeNum };
    };
    
    try {
        const strippedId = cleanSeriesId.includes(':') ? cleanSeriesId.split(':')[0] : cleanSeriesId;
        
        console.log(`[PERF] Step 1: Running diagnostic probes to find correct season/episode query parameters...`);
        const seasonsFetchStart = Date.now();
        const probes = [
            { name: 'Probe 1', params: { type: 'vod', movie_id: strippedId, season_id: '0', episode_id: '0' } },
            { name: 'Probe 2', params: { type: 'vod', movie_id: cleanSeriesId, season_id: '0', episode_id: '0' } },
            { name: 'Probe 3', params: { type: 'series', movie_id: cleanSeriesId, season_id: '0', episode_id: '0' } }
        ];

        let rawData = [];
        let winningParams = { type: 'vod', movie_id: seriesId }; // fallback
        
        for (const probe of probes) {
            console.log(`\n[${probe.name}] Requesting:`, probe.params);
            try {
                // Just do a single page request first to check total_items and avoid rate limiting
                const res = await stalkerRequest(url, mac, 'get_ordered_list', { ...probe.params, p: 1 });
                const data = res.js?.data || (Array.isArray(res.js) ? res.js : []);
                const totalItems = res.js?.total_items ? parseInt(res.js.total_items, 10) : data.length;
                
                console.log(`[${probe.name}] Total Items reported: ${totalItems}, Array length: ${data.length}`);
                if (data.length > 0) {
                    console.log(`[${probe.name}] First item preview:`, JSON.stringify(data[0], null, 2));
                }
                
                // If it returns a reasonable number of items (not the entire 20k catalog), consider it a valid candidate
                if (totalItems > 0 && totalItems < 5000 && data.length > 0) {
                    console.log(`[${probe.name}] Looks like a valid response! Fetching all pages...`);
                    const allData = await fetchAllStalkerPages(url, mac, 'get_ordered_list', probe.params);
                    if (rawData.length === 0 || allData.length > rawData.length) {
                        rawData = allData;
                        winningParams = probe.params;
                    }
                }
            } catch (e) {
                console.log(`[${probe.name}] Error:`, e.message);
            }
        }
        
        const seasonsFetchDuration = Date.now() - seasonsFetchStart;
        console.log(`\n[PERF] Probes completed in ${seasonsFetchDuration}ms. Found ${rawData.length} items using params:`, winningParams);
        
        if (!rawData || rawData.length === 0) {
            console.log(`[PERF SUCCESS] No seasons or episodes found using any probe.`);
            console.log(`=================== [PERF ANALYSIS END] ===================\n`);
            return [];
        }
        
        // Check if rawData is actually a flat list of direct episodes
        const isFlatList = rawData.some(item => {
            if (!item) return false;
            const name = (item.name || '').toLowerCase();
            return item.file || item.url || name.includes('episode') || name.includes('ep.') || /\bep\b/.test(name) || /s\d+\s*e\d+/.test(name);
        });
        
        if (isFlatList) {
            console.log(`[PERF] Smart check detected flat list of episodes. Mapping directly...`);
            const mapped = rawData.map((e, index) => {
                const { season, episodeNum } = parseSeasonAndEpisode(e, index);
                let cmdVal = e.cmd || '';
                if (!cmdVal && e.id) {
                    cmdVal = `/media/file_${e.id}.mpg`;
                }
                
                let linkType = winningParams.type || 'vod';
                if (e.cmd && typeof e.cmd === 'string' && e.cmd.includes('"type":"series"')) linkType = 'series';
                
                return {
                    ...e,
                    id: e.id,
                    episode_id: e.id,
                    episode_number: e.series_number || episodeNum,
                    name: e.name || `Episode ${episodeNum}`,
                    season: season,
                    episodeNum: episodeNum,
                    url: `stalker-cmd:${linkType}|${cmdVal}`
                };
            });
            
            const totalDuration = Date.now() - startTime;
            console.log(`[PERF SUCCESS] Total Episodes Load Time (Direct Flat list): ${totalDuration}ms. Count: ${mapped.length}`);
            console.log(`=================== [PERF ANALYSIS END] ===================\n`);
            return mapped;
        }
        
        console.log('================ RAW SEASONS ================');
        rawData.forEach((s, i) => {
            console.log(`[${i}]`, {
                id: s.id,
                name: s.name,
                is_series: s.is_series,
                is_season: s.is_season,
                series_length: Array.isArray(s.series) ? s.series.length : 'N/A',
                cmd: s.cmd
            });
        });
        
        const seasonsData = rawData.filter(s => {
            if (!s) return false;
            if (s.is_season === true || s.is_season === 1 || s.is_season === '1' || String(s.is_season).toLowerCase() === 'true') return true;
            if (s.name && /^season\s+\d+/i.test(s.name)) return true;
            if (s.id && String(s.id).includes(':') && Array.isArray(s.series)) return true;
            return false;
        });
        
        // Step 2: Fetch episodes for each season
        console.log(`[PERF] Step 2: Fetching episodes for all ${seasonsData.length} true seasons...`);
        const epFetchStart = Date.now();
        
        const allEpisodes = [];
        const chunkSize = 4;
        for (let i = 0; i < seasonsData.length; i += chunkSize) {
            const chunk = seasonsData.slice(i, i + chunkSize);
            const chunkPromises = chunk.map(async (season, index) => {
                const actualIndex = i + index;
                const seasonId = season.id || season.season_id;
                const sNum = season.season_number || season.series_number || (actualIndex + 1);
                
                let reqObj = {
                    type: winningParams.type,
                    movie_id: winningParams.movie_id,
                    season_id: String(seasonId),
                    episode_id: '0'
                };
                
                let decodedCmd = {};
                if (season.cmd) {
                    try {
                        console.log(`[SEASON CMD]`, season.cmd);
                        let decodedCmdStr = season.cmd;
                        if (!decodedCmdStr.startsWith('{')) {
                            decodedCmdStr = Buffer.from(season.cmd, 'base64').toString('utf8');
                        }
                        if (decodedCmdStr.startsWith('{')) {
                            decodedCmd = JSON.parse(decodedCmdStr);
                            console.log(`[SEASON CMD DECODED]`, decodedCmd);
                            // Merge decoded portal-specific state directly into the query
                            reqObj = { ...reqObj, ...decodedCmd };
                        }
                    } catch (e) {
                        console.log(`[SEASON CMD DECODE ERROR]`, e.message);
                    }
                }
                
                const hasInlineEpisodes = Array.isArray(season.series) && season.series.length > 0 && typeof season.series[0] !== 'object';
                
                let eps = [];
                if (hasInlineEpisodes) {
                    console.log(`[PERF] Season already contains episode numbers. Skipping redundant network request.`);
                } else {
                    console.log('[EP REQUEST]', reqObj);
                    try {
                        eps = await fetchAllStalkerPages(url, mac, 'get_ordered_list', reqObj);
                    } catch (err) {
                        console.warn(`[PERF] Probe failed for season ${sNum}:`, err.message);
                    }
                    console.log('[EP RESPONSE]', eps ? eps.slice(0, 3) : []);
                    console.log('[EP CHECK]', eps[0]?.id, eps[0]?.name, Array.isArray(eps[0]?.series) ? `Array(${eps[0].series.length})` : eps[0]?.series);
                    
                    // Detection: If the portal ignored our episode query and just returned the seasons list again
                    if (eps && eps.length > 0 && (eps[0].is_season || /^season\s+\d+/i.test(eps[0].name) || eps[0].id === seasonId)) {
                        console.log(`[PERF] Portal returned seasons instead of episodes! Discarding bogus response.`);
                        eps = [];
                    }
                }
                
                console.log('[EP RESPONSE]', eps ? eps.slice(0, 3) : []);
                
                if (!eps || eps.length === 0) {
                    // Fallback: Check if season object has a 'series' array with episode numbers
                    if (Array.isArray(season.series) && season.series.length > 0) {
                        console.log(`[PERF] Generating episodes directly from season.series array...`);
                        eps = season.series.map(ep => {
                            return {
                                id: `${seasonId}:${ep}`,
                                episode_id: ep,
                                series_number: ep,
                                name: `Episode ${ep}`,
                                cmd: season.cmd, // Package verbatim
                                is_inline_episode: true
                            };
                        });
                    } else {
                        return [];
                    }
                }
                
                return eps.map((e, epIndex) => {
                    const { season: parsedSeason, episodeNum } = parseSeasonAndEpisode(e, epIndex);
                    const finalSeason = (parsedSeason === 1 && sNum !== 1) ? sNum : parsedSeason;
                    
                    if (e.is_inline_episode) {
                        return {
                            ...e,
                            id: e.id,
                            episode_id: e.id,
                            episode_number: e.series_number || episodeNum,
                            name: e.name || `Episode ${episodeNum}`,
                            season: finalSeason,
                            episodeNum: episodeNum,
                            url: `stalker-series-ep:${e.cmd}|${episodeNum}`
                        };
                    }
                    
                    let cmdVal = e.cmd || '';
                    if (!cmdVal && e.id) {
                        cmdVal = `/media/file_${e.id}.mpg`;
                    }
                    
                    let linkType = 'vod';
                    if (reqObj.type === 'series') linkType = 'series';
                    if (decodedCmd.type) linkType = decodedCmd.type;
                    if (e.cmd && typeof e.cmd === 'string' && e.cmd.includes('"type":"series"')) linkType = 'series';
                    
                    return {
                        ...e,
                        id: e.id,
                        episode_id: e.id,
                        episode_number: e.series_number || episodeNum,
                        name: e.name || `Episode ${episodeNum}`,
                        season: finalSeason,
                        episodeNum: episodeNum,
                        url: `stalker-cmd:${linkType}|${cmdVal}`
                    };
                });
            });
            
            const results = await Promise.all(chunkPromises);
            allEpisodes.push(...results.flat());
            
            if (i + chunkSize < seasonsData.length) {
                await new Promise(resolve => setTimeout(resolve, 50));
            }
        }
        
        const epFetchDuration = Date.now() - epFetchStart;
        const totalDuration = Date.now() - startTime;
        
        console.log(`[PERF] Season-based Episodes Fetch took ${epFetchDuration}ms. Total episodes collected: ${allEpisodes.length}`);
        console.log(`[PERF SUCCESS] Total Episodes Load Time: ${totalDuration}ms`);
        console.log(`=================== [PERF ANALYSIS END] ===================\n`);
        
        if (allEpisodes.length > 0) {
            return allEpisodes;
        }
        
        // Step 3: Fallback if no episodes found inside seasons
        console.log(`[PERF] Fallback - Fetching all episodes directly as VOD fallback...`);
        let episodes = [];
        try {
            episodes = await fetchAllStalkerPages(url, mac, 'get_ordered_list', { type: winningParams.type, movie_id: winningParams.movie_id });
        } catch (e) {}
        
        const mapped = episodes.map((e, index) => {
            const { season, episodeNum } = parseSeasonAndEpisode(e, index);
            let cmdVal = e.cmd || '';
            if (!cmdVal && e.id) {
                cmdVal = `/media/file_${e.id}.mpg`;
            }
            
            let linkType = winningParams.type || 'vod';
            if (e.cmd && typeof e.cmd === 'string' && e.cmd.includes('"type":"series"')) linkType = 'series';
            
            return {
                ...e,
                id: e.id,
                episode_id: e.id,
                episode_number: e.series_number || episodeNum,
                name: e.name || `Episode ${episodeNum}`,
                season: season,
                episodeNum: episodeNum,
                url: `stalker-cmd:${linkType}|${cmdVal}`
            };
        });
        
        return mapped;
    } catch (e) {
        console.error(`[PERF FAILURE] Error loading stalker episodes:`, e);
        return [];
    }
});

// Cache deletion
ipcMain.handle('clear-cache', async (event, url) => {
    console.log('[IPC HANDLE] clear-cache', { url });
    if (!url) return false;
    
    if (db) {
        try { db.prepare('DELETE FROM epg WHERE source_url = ?').run(url); } 
        catch (e) { console.error(e); }
    }

    const hash = crypto.createHash('md5').update(url, 'utf8').digest('hex');
    const cacheFile = path.join(cacheDir, `${hash}.txt`);
    const metaFile = path.join(cacheDir, `${hash}.meta`);
    try {
        if (fs.existsSync(cacheFile)) fs.unlinkSync(cacheFile);
        if (fs.existsSync(metaFile)) fs.unlinkSync(metaFile);
        return true;
    } catch (e) { return false; }
});

// Mappings persistence
ipcMain.handle('get-mappings', () => {
    console.log('[IPC HANDLE] get-mappings START');
    if (!db) return {};
    try {
        const rows = db.prepare('SELECT channel_title, epg_id FROM mappings').all();
        const map = {};
        for (const row of rows) {
            map[row.channel_title] = row.epg_id;
        }
        console.log('[IPC HANDLE] get-mappings END');
        return map;
    } catch (e) {
        console.error('[DB ERR] Failed to get mappings:', e);
        throw e;
    }
});

ipcMain.handle('save-mapping', (event, title, epgId) => {
    console.log('[IPC HANDLE] save-mapping START', { title, epgId });
    if (!db) return false;
    try {
        if (epgId) {
            db.prepare(`
                INSERT INTO mappings (channel_title, epg_id)
                VALUES (@title, @epg)
                ON CONFLICT(channel_title) DO UPDATE SET epg_id = @epg
            `).run({ title, epg: epgId });
        } else {
            db.prepare('DELETE FROM mappings WHERE channel_title = ?').run(title);
        }
        console.log('[IPC HANDLE] save-mapping END');
        return true;
    } catch (e) {
        console.error('[DB ERR] Failed to save mapping:', e);
        throw e;
    }
});

ipcMain.handle('factory-reset', () => {
    console.log('[IPC HANDLE] factory-reset START. Relaunching app.');
    try {
        if (db) db.close(); // Safely release SQLite locks
        const dbPath = path.join(app.getPath('userData'), 'iptv.db');
        const walPath = dbPath + '-wal';
        const shmPath = dbPath + '-shm';
        if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
        if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
        if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);
        
        console.log('[IPC HANDLE] factory-reset END');
        app.relaunch();
        app.quit();
        return true;
    } catch (e) {
        console.error("[DB ERR] Factory reset failed:", e);
        throw e;
    }
});