const { app, BrowserWindow, ipcMain, dialog, Menu, MenuItem, clipboard } = require('electron');
const path = require('path');
const { spawn, execFile, exec } = require('child_process');
const net = require('net');
const fs = require('fs');
const crypto = require('crypto');

// --- Logger Initialization & Error Handling ---
const logger = require('./logger');
logger.init();

// Log application startup details
console.log(`[APP] Version ${app.getVersion() || '1.0.0'} started`);
console.log(`[APP] OS: ${process.platform} (${process.arch})`);
console.log(`[APP] User data path: ${app.getPath('userData')}`);

// Uncaught exceptions and rejections handlers (routed automatically to crash.log)
process.on('uncaughtException', (err) => {
    console.error(`[CRASH] Uncaught Exception: ${err.message}\nStack: ${err.stack}`);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error(`[CRASH] Unhandled Promise Rejection at: ${promise}\nReason: ${reason}`);
});

function applyRoundedCorners(hwnd) {
    if (process.platform !== 'win32') return;
    const preference = 2; // DWMWCP_ROUND = 2
    const psCommand = `
$code = 'using System; using System.Runtime.InteropServices; public class Dwm { [DllImport("dwmapi.dll")] public static extern int DwmSetWindowAttribute(IntPtr hwnd, int attr, ref int value, int size); }';
Add-Type -TypeDefinition $code;
[Dwm]::DwmSetWindowAttribute([IntPtr]${hwnd}, 33, [ref]${preference}, 4);
`;
    exec(`powershell -NoProfile -Command "${psCommand.replace(/\n/g, ' ').replace(/"/g, '\\"')}"`, { windowsHide: true }, (err) => {
        if (err) console.error('[DWM] Failed to set rounded corners:', err);
    });
}

function applyPlayerWindowShape(hwnd, width, height, radius) {
    if (process.platform !== 'win32' || !hwnd) return;
    const safeWidth = Math.max(1, Math.round(width));
    const safeHeight = Math.max(1, Math.round(height));
    const safeRadius = Math.max(0, Math.round(radius));
    const shapeKey = `${safeWidth}x${safeHeight}:${safeRadius}`;
    if (lastPlayerWindowShapeKey === shapeKey) return;
    lastPlayerWindowShapeKey = shapeKey;

    sendPlayerShapeCommand({ hwnd, width: safeWidth, height: safeHeight, radius: safeRadius });
}

function ensurePlayerShapeProcess() {
    if (process.platform !== 'win32') return;
    if (playerShapeProcess && !playerShapeProcess.killed) return;

    playerShapeReady = false;
    pendingPlayerShapeCommands = [];

    const psScript = `
$code = @"
using System;
using System.Runtime.InteropServices;
public class PlayerWindowShape {
    [DllImport("gdi32.dll")]
    public static extern IntPtr CreateRoundRectRgn(int left, int top, int right, int bottom, int ellipseWidth, int ellipseHeight);
    [DllImport("user32.dll")]
    public static extern int SetWindowRgn(IntPtr hwnd, IntPtr region, bool redraw);
}
"@
Add-Type -TypeDefinition $code -ErrorAction SilentlyContinue
Write-Output "READY"
while ($null -ne ($line = [Console]::In.ReadLine())) {
    try {
        $cmd = $line | ConvertFrom-Json
        $hwnd = [IntPtr]$cmd.hwnd
        $radius = [int]$cmd.radius
        if ($radius -le 0) {
            [PlayerWindowShape]::SetWindowRgn($hwnd, [IntPtr]::Zero, $true) | Out-Null
        } else {
            $diameter = $radius * 2
            $region = [PlayerWindowShape]::CreateRoundRectRgn(0, 0, ([int]$cmd.width) + 1, ([int]$cmd.height) + 1, $diameter, $diameter)
            [PlayerWindowShape]::SetWindowRgn($hwnd, $region, $true) | Out-Null
        }
    } catch {
        Write-Error $_
    }
}
`;

    playerShapeProcess = spawn('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', psScript], { windowsHide: true });
    playerShapeProcess.stdout.on('data', (data) => {
        if (!data.toString().includes('READY')) return;
        playerShapeReady = true;
        const queued = pendingPlayerShapeCommands;
        pendingPlayerShapeCommands = [];
        queued.forEach(sendPlayerShapeCommand);
    });
    playerShapeProcess.stderr.on('data', (data) => console.error(`[WIN32 SHAPE ERR] ${data.toString().trim()}`));
    playerShapeProcess.on('exit', () => {
        playerShapeProcess = null;
        playerShapeReady = false;
    });
}

function sendPlayerShapeCommand(command) {
    ensurePlayerShapeProcess();
    if (!playerShapeProcess || playerShapeProcess.killed || !playerShapeProcess.stdin.writable) return;
    if (!playerShapeReady) {
        pendingPlayerShapeCommands = [command];
        return;
    }
    playerShapeProcess.stdin.write(JSON.stringify(command) + '\n');
}

function schedulePlayerWindowShape(width, height, radius) {
    if (playerShapeDebounceTimer) {
        clearTimeout(playerShapeDebounceTimer);
        playerShapeDebounceTimer = null;
    }

    if (radius <= 0) {
        applyPlayerWindowShape(playerWindowHwnd, width, height, 0);
        return;
    }

    playerShapeDebounceTimer = setTimeout(() => {
        playerShapeDebounceTimer = null;
        applyPlayerWindowShape(playerWindowHwnd, width, height, radius);
    }, 120);
}

function clearPlayerWindowShapeForFullscreen() {
    if (!currentDOMBounds || !playerWindowHwnd) return;
    if (playerShapeDebounceTimer) {
        clearTimeout(playerShapeDebounceTimer);
        playerShapeDebounceTimer = null;
    }
    applyPlayerWindowShape(playerWindowHwnd, currentDOMBounds.width, currentDOMBounds.height, 0);
}

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

        CREATE TABLE IF NOT EXISTS dvr_settings (
            key TEXT PRIMARY KEY,
            value TEXT
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

        CREATE TABLE IF NOT EXISTS playback_progress (
            id TEXT PRIMARY KEY,
            tmdb_id TEXT,
            title TEXT,
            stream_url TEXT,
            season INTEGER,
            episode INTEGER,
            position REAL,
            duration REAL,
            last_watched TEXT,
            completed INTEGER DEFAULT 0
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
    
    // Safety check for portal_profiles table
    try {
        db.exec(`
            CREATE TABLE IF NOT EXISTS portal_profiles (
                portal_url TEXT PRIMARY KEY,
                uses_direct_source INTEGER DEFAULT 0,
                requires_headers INTEGER DEFAULT 0,
                preferred_format TEXT,
                last_working_url TEXT,
                link_resolves INTEGER DEFAULT 0,
                token_failures INTEGER DEFAULT 0,
                avg_resolve_ms REAL DEFAULT 0
            )
        `);
    } catch (e) {
        console.error('[DB] Failed to create portal_profiles table:', e);
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
let nativeToastWindow = null;
let nativeToastTimer = null;
let remoteOverrideWindow = null;
let playerWindowHwnd = null;
let lastPlayerWindowShapeKey = null;
let playerShapeProcess = null;
let playerShapeReady = false;
let pendingPlayerShapeCommands = [];
let playerShapeDebounceTimer = null;
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

ipcMain.on('show-native-toast', (_event, message, duration) => {
    showNativeToast(message, duration);
});

function createWindow() {
    // Create a frameless, transparent splash window
    splashWindow = new BrowserWindow({
        width: 700,
        height: 700,
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
        frame: false,
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
        syncNativeOverlayWindows();
    });
    mainWindow.on('resize', () => {
        console.log('[EVENT] mainWindow resize');
        syncPlayerWindow();
        syncNativeOverlayWindows();
    });

    // Sync MPV's internal fullscreen state when Electron enters/leaves fullscreen natively (e.g., via ESC key)
    mainWindow.on('enter-full-screen', () => {
        console.log('[EVENT] mainWindow enter-full-screen');
        clearPlayerWindowShapeForFullscreen();
        mainWindow.webContents.send('fullscreen-state', true);
        syncNativeOverlayWindows();
        if (ipcClient && !ipcClient.destroyed) {
            ipcClient.write(JSON.stringify({ command: ["set_property", "fullscreen", true] }) + '\n');
        }
    });
    mainWindow.on('leave-full-screen', () => {
        console.log('[EVENT] mainWindow leave-full-screen');
        mainWindow.webContents.send('fullscreen-state', false);
        syncNativeOverlayWindows();
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
    if (playerWindow && !playerWindow.isDestroyed() && mainWindow && !mainWindow.isDestroyed() && currentDOMBounds) {
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
        schedulePlayerWindowShape(
            currentDOMBounds.width,
            currentDOMBounds.height,
            mainWindow.isFullScreen() ? 0 : 24
        );
    }
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function getOverlayBounds(width, height) {
    if (!mainWindow || mainWindow.isDestroyed()) return { x: 0, y: 0, width, height };
    const bounds = mainWindow.getBounds();
    return {
        x: Math.round(bounds.x + (bounds.width - width) / 2),
        y: Math.round(bounds.y + bounds.height - height - 30),
        width,
        height
    };
}

function keepOverlayAbovePlayer(win) {
    if (!win || win.isDestroyed()) return;
    win.setAlwaysOnTop(true, 'screen-saver');
    if (typeof win.moveTop === 'function') win.moveTop();
}

function syncNativeOverlayWindows() {
    if (nativeToastWindow && !nativeToastWindow.isDestroyed()) {
        nativeToastWindow.setBounds(getOverlayBounds(520, 96));
        keepOverlayAbovePlayer(nativeToastWindow);
    }
    if (remoteOverrideWindow && !remoteOverrideWindow.isDestroyed()) {
        remoteOverrideWindow.setBounds(getOverlayBounds(460, 190));
        keepOverlayAbovePlayer(remoteOverrideWindow);
    }
}

function showNativeToast(message, duration = 3000) {
    if (!mainWindow || mainWindow.isDestroyed()) return;

    if (nativeToastTimer) clearTimeout(nativeToastTimer);
    if (nativeToastWindow && !nativeToastWindow.isDestroyed()) nativeToastWindow.destroy();

    const toastWindow = new BrowserWindow({
        parent: mainWindow,
        ...getOverlayBounds(520, 96),
        frame: false,
        transparent: true,
        resizable: false,
        movable: false,
        show: false,
        focusable: false,
        skipTaskbar: true,
        hasShadow: false,
        backgroundColor: '#00000000',
        webPreferences: {
            contextIsolation: true,
            sandbox: true
        }
    });
    nativeToastWindow = toastWindow;

    toastWindow.setIgnoreMouseEvents(true);
    const safeMessage = escapeHtml(message);
    toastWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(`
<!doctype html>
<html>
<head>
<style>
html,body{margin:0;width:100%;height:100%;overflow:hidden;background:transparent;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#fff}
.toast{position:absolute;left:50%;bottom:0;transform:translateX(-50%);box-sizing:border-box;max-width:500px;min-width:260px;padding:14px 24px;border-radius:16px;border:1px solid rgba(187,134,252,.48);background:rgba(18,18,24,.9);box-shadow:0 10px 30px rgba(187,134,252,.16),0 5px 15px rgba(0,0,0,.5);backdrop-filter:blur(20px);text-align:center;font-size:14px;font-weight:650;line-height:1.4;white-space:pre-wrap}
</style>
</head>
<body><div class="toast">${safeMessage}</div></body>
</html>
`)}`);
    toastWindow.once('ready-to-show', () => {
        if (toastWindow.isDestroyed() || nativeToastWindow !== toastWindow) return;
        toastWindow.showInactive();
        keepOverlayAbovePlayer(toastWindow);
    });
    toastWindow.on('closed', () => {
        if (nativeToastWindow !== toastWindow) return;
        nativeToastWindow = null;
        if (nativeToastTimer) clearTimeout(nativeToastTimer);
        nativeToastTimer = null;
    });

    nativeToastTimer = setTimeout(() => {
        if (nativeToastWindow === toastWindow && !toastWindow.isDestroyed()) toastWindow.destroy();
    }, duration);
}

function showRemoteOverridePrompt() {
    if (!mainWindow || mainWindow.isDestroyed()) return Promise.resolve(false);

    if (remoteOverrideWindow && !remoteOverrideWindow.isDestroyed()) remoteOverrideWindow.destroy();

    const promptWindow = new BrowserWindow({
        parent: mainWindow,
        ...getOverlayBounds(460, 190),
        frame: false,
        transparent: true,
        resizable: false,
        movable: false,
        show: false,
        skipTaskbar: true,
        hasShadow: false,
        backgroundColor: '#00000000',
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });
    remoteOverrideWindow = promptWindow;

    promptWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(`
<!doctype html>
<html>
<head>
<style>
html,body{margin:0;width:100%;height:100%;overflow:hidden;background:transparent;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#fff}
.toast{position:absolute;left:50%;bottom:0;transform:translateX(-50%);box-sizing:border-box;width:430px;padding:22px 28px;border-radius:16px;border:1px solid rgba(187,134,252,.48);background:rgba(18,18,24,.92);box-shadow:0 10px 30px rgba(187,134,252,.16),0 5px 15px rgba(0,0,0,.5);backdrop-filter:blur(20px);text-align:center}
.title{font-size:18px;font-weight:800;margin-bottom:8px}.body{font-size:14px;color:#e4e4e7;line-height:1.45;margin-bottom:18px}.actions{display:flex;gap:12px}button{flex:1;border:0;border-radius:8px;padding:10px 16px;font-weight:800;cursor:pointer;font-family:inherit}#allow{background:#bb86fc;color:#000}#deny{background:#2a2a2a;color:#fff;border:1px solid #444}
</style>
</head>
<body>
<div class="toast">
<div class="title">New Remote Device</div>
<div class="body">A new device is trying to connect.<br>Allow it and disconnect the old one?</div>
<div class="actions"><button id="allow">Allow</button><button id="deny">Deny</button></div>
</div>
<script>
const { ipcRenderer } = require('electron');
document.getElementById('allow').onclick = () => ipcRenderer.send('native-remote-override-response', true);
document.getElementById('deny').onclick = () => ipcRenderer.send('native-remote-override-response', false);
</script>
</body>
</html>
`)}`);

    return new Promise(resolve => {
        let settled = false;
        const settle = (allow) => {
            if (settled) return;
            settled = true;
            clearTimeout(timeout);
            ipcMain.removeListener('native-remote-override-response', responseHandler);
            if (remoteOverrideWindow === promptWindow && !promptWindow.isDestroyed()) promptWindow.destroy();
            resolve(!!allow);
        };
        const responseHandler = (_event, allow) => settle(allow);
        const timeout = setTimeout(() => settle(false), 30000);

        ipcMain.once('native-remote-override-response', responseHandler);
        promptWindow.once('closed', () => {
            if (remoteOverrideWindow === promptWindow) remoteOverrideWindow = null;
            settle(false);
        });
        promptWindow.once('ready-to-show', () => {
            if (promptWindow.isDestroyed() || remoteOverrideWindow !== promptWindow) return;
            promptWindow.show();
            promptWindow.focus();
            keepOverlayAbovePlayer(promptWindow);
        });
    });
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
                console.log(`[REMOTE API] No active device found. Requiring pairing via login.`);
                res.clearCookie('aivue_auth');
                return res.redirect('/login');
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
                    const allowOverride = await showRemoteOverridePrompt();
                    console.log(`[REMOTE API] PC user responded to toast: ${allowOverride ? 'Allow' : 'Deny'}`);
                    response = allowOverride ? 0 : 1;
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
            if (!remoteSettings.username || !remoteSettings.password) {
                // Auto-pair on connect if password protection is disabled!
                let deviceId = getCookie(req, 'aivue_device_id');
                if (deviceId) {
                    remoteSettings.activeDeviceId = deviceId;
                    try { fs.writeFileSync(remoteSettingsPath, JSON.stringify(remoteSettings)); } catch(e) {}
                    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('remote-settings-updated');
                }
                return res.redirect('/remote');
            }

            const expectedAuth = Buffer.from(remoteSettings.username + ':' + remoteSettings.password).toString('base64');
            let deviceId = getCookie(req, 'aivue_device_id');
            
            // If already logged in AND activeDeviceId matches, redirect directly to remote
            if (getCookie(req, 'aivue_auth') === expectedAuth && remoteSettings.activeDeviceId === deviceId) {
                console.log(`[REMOTE API] User already authenticated. Redirecting /login to /remote`);
                return res.redirect('/remote');
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
                
                // Pair the device!
                let deviceId = getCookie(req, 'aivue_device_id');
                if (deviceId) {
                    remoteSettings.activeDeviceId = deviceId;
                    try { fs.writeFileSync(remoteSettingsPath, JSON.stringify(remoteSettings)); } catch(e) {}
                    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('remote-settings-updated');
                }
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
                const shouldEnterFullscreen = !mainWindow.isFullScreen();
                if (shouldEnterFullscreen) clearPlayerWindowShapeForFullscreen();
                mainWindow.setFullScreen(shouldEnterFullscreen);
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
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
            const playlists = loadChannelsFromDb();
            let channels = [];
            playlists.forEach(p => {
                if (p.channels && !p.disabled) {
                    channels.push(...p.channels.filter(c => !c.disabled && c.type === 'live').map(c => ({...c, playlistId: p.id, playlistName: p.name})));
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
            const { url, title, position, type, tmdbId, season, episodeNum } = req.body;
            if (mainWindow && !mainWindow.isDestroyed() && url && title) {
                mainWindow.webContents.send('remote-play-channel', { url, title, position, type, tmdbId, season, episodeNum });
            }
            res.send('OK');
        });

        app.get('/api/movies', (req, res) => {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
            const playlists = loadChannelsFromDb();
            let movies = [];
            playlists.forEach(p => {
                if (p.channels && !p.disabled) {
                    movies.push(...p.channels.filter(c => !c.disabled && (c.type === 'movie' || c.type === 'movie_category')).map(c => ({...c, playlistId: p.id, playlistName: p.name, source: p.source, epg: p.epg})));
                }
            });
            res.json(movies);
        });

        app.get('/api/series', (req, res) => {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
            const playlists = loadChannelsFromDb();
            let series = [];
            playlists.forEach(p => {
                if (p.channels && !p.disabled) {
                    series.push(...p.channels.filter(c => !c.disabled && (c.type === 'series' || c.type === 'series_category' || c.type === 'vod' || c.type === 'vod_category' || c.group === 'Series Categories')).map(c => ({...c, playlistId: p.id, playlistName: p.name, source: p.source, epg: p.epg})));
                }
            });
            res.json(series);
        });

        app.get('/api/tmdb/search', async (req, res) => {
            const { title, type } = req.query;
            if (!title) return res.status(400).json({ error: 'Title is required' });
            if (!tmdbConfig.apiKey && !tmdbConfig.apiToken) {
                return res.json({ error: 'TMDB not configured' });
            }
            try {
                const { cleanTitle, year } = await cleanTitleForSearch(title);
                const isSeries = type === 'series' || type === 'vod';
                const tmdbType = isSeries ? 'tv' : 'movie';
                let url = `https://api.themoviedb.org/3/search/${tmdbType}?query=${encodeURIComponent(cleanTitle)}`;
                if (year) {
                    url += isSeries ? `&first_air_date_year=${year}` : `&year=${year}`;
                }
                let headers = { 'Accept': 'application/json' };
                if (tmdbConfig.apiToken) {
                    headers['Authorization'] = `Bearer ${tmdbConfig.apiToken}`;
                } else if (tmdbConfig.apiKey) {
                    url += `&api_key=${tmdbConfig.apiKey}`;
                }
                const searchRes = await fetch(url, { headers });
                if (!searchRes.ok) throw new Error(`HTTP ${searchRes.status}`);
                const searchData = await searchRes.json();
                if (!searchData.results || searchData.results.length === 0) {
                    if (year) {
                        let retryUrl = `https://api.themoviedb.org/3/search/${tmdbType}?query=${encodeURIComponent(cleanTitle)}`;
                        if (tmdbConfig.apiToken) {
                            // in headers
                        } else if (tmdbConfig.apiKey) {
                            retryUrl += `&api_key=${tmdbConfig.apiKey}`;
                        }
                        const retryRes = await fetch(retryUrl, { headers });
                        if (retryRes.ok) {
                            const retryData = await retryRes.json();
                            if (retryData.results && retryData.results.length > 0) {
                                const details = await fetchDetails(retryData.results[0].id, tmdbType, headers);
                                return res.json(details);
                            }
                        }
                    }
                    return res.json({ error: 'No results' });
                }
                const bestMatch = searchData.results[0];
                const details = await fetchDetails(bestMatch.id, tmdbType, headers);
                res.json(details);
            } catch (e) {
                res.status(500).json({ error: e.message });
            }
        });

        app.get('/api/tmdb/details', async (req, res) => {
            const { id, type } = req.query;
            if (!id) return res.status(400).json({ error: 'ID is required' });
            if (!tmdbConfig.apiKey && !tmdbConfig.apiToken) {
                return res.json({ error: 'TMDB not configured' });
            }
            try {
                const isSeries = type === 'series' || type === 'vod';
                const tmdbType = isSeries ? 'tv' : 'movie';
                let headers = { 'Accept': 'application/json' };
                if (tmdbConfig.apiToken) {
                    headers['Authorization'] = `Bearer ${tmdbConfig.apiToken}`;
                }
                const details = await fetchDetails(id, tmdbType, headers);
                res.json(details);
            } catch (e) {
                res.status(500).json({ error: e.message });
            }
        });

        app.get('/api/tmdb/season', async (req, res) => {
            const { id, season } = req.query;
            if (!id || !season) return res.status(400).json({ error: 'ID and season required' });
            if (!tmdbConfig.apiKey && !tmdbConfig.apiToken) {
                return res.json({ error: 'TMDB not configured' });
            }
            try {
                let url = `https://api.themoviedb.org/3/tv/${id}/season/${season}`;
                let headers = { 'Accept': 'application/json' };
                if (tmdbConfig.apiToken) {
                    headers['Authorization'] = `Bearer ${tmdbConfig.apiToken}`;
                } else if (tmdbConfig.apiKey) {
                    url += `&api_key=${tmdbConfig.apiKey}`;
                }
                const response = await fetch(url, { headers });
                const data = await response.json();
                res.json(data);
            } catch (e) {
                res.status(500).json({ error: e.message });
            }
        });

        app.get('/api/progress', (req, res) => {
            const { id } = req.query;
            if (!id) return res.status(400).json({ error: 'ID required' });
            try {
                if (!db) return res.json(null);
                const row = db.prepare("SELECT * FROM playback_progress WHERE id = ?").get(id);
                res.json(row || null);
            } catch (e) {
                res.status(500).json({ error: e.message });
            }
        });

        app.post('/api/load-stalker-category', async (req, res) => {
            try {
                const data = await executeLoadStalkerCategory(req.body);
                res.json(data);
            } catch (e) {
                res.status(500).json({ error: e.message });
            }
        });

        const catalogPageHandler = (req, res) => {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
            const isSeries = req.path === '/series';
            const pageTitle = isSeries ? 'TV Series' : 'Movies';
            res.send(`
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
                    <title>${pageTitle} - AIVue Remote</title>
                    <style>
                        body { background:#0f172a; color:white; font-family:Arial,sans-serif; margin:0; }
                        #movies-view { display: flex; flex-direction: column; height: 100vh; }
                        .top-bar { padding: 12px; background: #1e293b; display: flex; gap: 10px; align-items: center; border-bottom: 1.5px solid rgba(255,255,255,0.06); }
                        .top-bar input { flex-grow: 1; min-width: 150px; background: #0f172a; color: white; border: 1px solid #334155; padding: 10px 14px; border-radius: 10px; outline: none; font-size: 0.95em; }
                        .top-bar input::placeholder { color: #64748b; }
                        #movies-content-area { flex-grow: 1; overflow-y: auto; padding: 15px; position: relative; }
                        
                        .movies-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(105px, 1fr)); gap: 12px; }
                        .movie-card { background: #1e293b; border: 1px solid rgba(255,255,255,0.04); border-radius: 10px; overflow: hidden; cursor: pointer; display: flex; flex-direction: column; transition: 0.2s; box-shadow: 0 4px 10px rgba(0,0,0,0.3); }
                        .movie-poster-wrapper { position: relative; width: 100%; padding-top: 150%; background: #0f172a; }
                        .movie-poster { position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; opacity: 0; transition: opacity 0.35s ease-in-out; }
                        .movie-info { padding: 8px; flex-grow: 1; display: flex; align-items: center; min-height: 38px; }
                        .movie-title { font-size: 0.82em; font-weight: 600; margin: 0; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; text-overflow: ellipsis; color: #f8fafc; line-height: 1.25; }
                        
                        .folder-card { background: #1e293b; border: 1.5px solid rgba(255,255,255,0.05); border-radius: 12px; padding: 16px 10px; cursor: pointer; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; gap: 8px; aspect-ratio: 1; transition: 0.15s; box-shadow: 0 4px 12px rgba(0,0,0,0.35); }
                        .folder-icon { font-size: 2.2em; color: #bb86fc; display: flex; align-items: center; justify-content: center; }
                        .folder-title { font-size: 0.85em; font-weight: bold; margin: 0; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; color: #e2e8f0; }
                        
                        .loader { text-align: center; padding: 50px; color: #64748b; font-weight: 600; }
                        
                        #toast { position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%) translateY(20px); background: rgba(15, 23, 42, 0.95); color: #ffffff; border: 1.5px solid rgba(187, 134, 252, 0.45); padding: 12px 24px; border-radius: 14px; z-index: 101000; font-weight: 600; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; box-shadow: 0 10px 30px rgba(187, 134, 252, 0.15), 0 5px 15px rgba(0,0,0,0.5); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); transition: opacity 0.3s cubic-bezier(0.25, 0.8, 0.25, 1), transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1); opacity: 0; pointer-events: none; white-space: pre-wrap; text-align: center; font-size: 0.9em; letter-spacing: -0.01em; }
                    </style>
                </head>
                <body>
                    <div id="movies-view">
                        <div class="top-bar">
                            <a href="/remote" style="background: #334155; color: white; padding: 10px 14px; border-radius: 10px; text-decoration: none; font-weight: bold; font-size: 0.9em; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 5px rgba(0,0,0,0.2);">&larr; Back</a>
                            <input type="text" id="movies-search" placeholder="Search ${pageTitle}...">
                        </div>
                        <div id="movies-content-area">
                            <div id="movies-grid" class="movies-grid loader">Loading ${pageTitle}...</div>
                        </div>
                    </div>
                    
                    <div id="toast"></div>
    
                    <script src="/movies.js"></script>
                </body>
                </html>
            `);
        };
 
        app.get('/movies', catalogPageHandler);
        app.get('/series', catalogPageHandler);
 
        app.get('/epg', (req, res) => {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
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
                        .epg-program-cell {
                            border-right: 1px solid rgba(255, 255, 255, 0.15) !important;
                            border-bottom: 1px solid rgba(255, 255, 255, 0.15) !important;
                            border-top: 1px solid rgba(255, 255, 255, 0.15) !important;
                            box-sizing: border-box;
                        }
                        .epg-program-cell[style*="border-top: 2px solid rgb(187, 134, 252)"],
                        .epg-program-cell[style*="border-top-color: rgb(187, 134, 252)"],
                        .epg-program-cell[style*="border-top: 2px solid #bb86fc"],
                        .epg-program-cell[style*="border-top-color: #bb86fc"] {
                            background: rgba(187, 134, 252, 0.12) !important;
                            border-top: 1px solid rgba(255, 255, 255, 0.15) !important;
                            box-shadow: inset 0 0 14px rgba(187, 134, 252, 0.35), 0 0 10px rgba(187, 134, 252, 0.2) !important;
                        }
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
                        
                        #toast { position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%) translateY(20px); background: rgba(18, 18, 24, 0.85); color: #ffffff; border: 1px solid rgba(187, 134, 252, 0.45); padding: 12px 24px; border-radius: 14px; z-index: 10000; font-weight: 600; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; box-shadow: 0 10px 30px rgba(187, 134, 252, 0.15), 0 5px 15px rgba(0,0,0,0.5); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); transition: opacity 0.3s cubic-bezier(0.25, 0.8, 0.25, 1), transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1); opacity: 0; pointer-events: none; white-space: pre-wrap; text-align: center; font-size: 0.9em; letter-spacing: -0.01em; }
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
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
            try {
                res.send(fs.readFileSync(path.join(__dirname, 'remote_epg.js'), 'utf8'));
            } catch(e) {
                res.status(404).send('console.error("remote_epg.js not found");');
            }
        });

        app.get('/movies.js', (req, res) => {
            res.setHeader('Content-Type', 'application/javascript');
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
            try {
                res.send(fs.readFileSync(path.join(__dirname, 'remote_movies.js'), 'utf8'));
            } catch(e) {
                res.status(404).send('console.error("remote_movies.js not found");');
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
                case 'livetv': case 'playlist': case 'settings': case 'fullscreen': case 'vod':
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
        <button class="top-btn" onclick="window.location.href='/movies'" style="background:#22c55e; display:flex; align-items:center; justify-content:center;" title="Movies">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M18 4v1h-2V4c0-.55-.45-1-1-1H9c-.55 0-1 .45-1 1v1H6V4c0-.55-.45-1-1-1s-1 .45-1 1v16c0 .55.45 1 1 1s1-.45 1-1v-1h2v1c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-1h2v1c0 .55.45 1 1 1s1-.45 1-1V4c0-.55-.45-1-1-1s-1 .45-1 1zM8 17H6v-2h2v2zm0-4H6v-2h2v2zm0-4H6V7h2v2zm10 8h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V7h2v2z"/></svg>
        </button>
        <button class="top-btn" onclick="window.location.href='/series'" style="background:#eab308; display:flex; align-items:center; justify-content:center;" title="Series">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-8 12.5v-9l6 4.5-6 4.5z"/></svg>
        </button>
        <button class="top-btn" onclick="window.location.href='/epg'" style="background:#3b82f6; display:flex; align-items:center; justify-content:center;" title="Guide">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M19,4H18V2H16V4H8V2H6V4H5C3.89,4 3.01,4.9 3.01,6L3,20A2,2 0 0,0 5,22H19A2,2 0 0,0 21,20V6A2,2 0 0,0 19,4M19,20H5V10H19V20M9,14H7V12H9V14M13,14H11V12H13V14M17,14H15V12H17V14M9,18H7V16H9V18M13,18H11V16H13V18M17,18H15V16H17V18Z"/></svg>
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
    ensurePlayerShapeProcess();
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
    console.log('[APP] Shutdown requested (all windows closed)');
    if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', () => {
    console.log('[APP] Shutdown completed');
    if (playerShapeProcess && !playerShapeProcess.killed) {
        playerShapeProcess.kill();
    }
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
        playerWindowHwnd = wid;
        lastPlayerWindowShapeKey = null;
        if (process.platform === 'win32') {
            applyRoundedCorners(wid);
        }
    } else {
        console.error("macOS Native --wid embedding requires custom NSView Swift implementation.");
        return;
    }

    const baseDir = app.isPackaged ? process.resourcesPath : __dirname;
    const mpvPath = process.platform === 'win32' ? path.join(baseDir, 'bin', 'mpv.exe') : 'mpv';
    const binDir = path.join(baseDir, 'bin');
    const luaScript = path.join(binDir, 'scripts', 'aivue.lua');
    
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
        `--framedrop=vo`,
        `--video-sync=audio`,
        `--config-dir=${binDir}`, 
        `--load-scripts=no`,    
        `--script=${luaScript}`,
        `--script-opts=aivue-osc_on_start=yes,aivue-bottomhover=no,aivue-window_controls=yes,aivue-playlist_button=no,aivue-info_button=no,aivue-ontop_button=no,aivue-jump_buttons=no,aivue-chapter_skip_buttons=no,aivue-track_nextprev_buttons=yes,aivue-fullscreen_button=no`,
        `--input-cursor=yes`,   
        `--input-vo-keyboard=yes`, 
        `--osc=no`,             
        `--demuxer-lavf-analyzeduration=20`,
        `--demuxer-lavf-probescore=100`,
        `--demuxer-lavf-o-add=fflags=+genpts`,
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
        playerWindow = null;
        playerWindowHwnd = null;
        lastPlayerWindowShapeKey = null;
        if (playerShapeDebounceTimer) {
            clearTimeout(playerShapeDebounceTimer);
            playerShapeDebounceTimer = null;
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
        ipcClient.write(JSON.stringify({ command: ["set_property", "mute", "no"] }) + '\n'); // Ensure unmuted on startup
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
        ipcClient.write(JSON.stringify({ command: ["observe_property", 11, "duration"] }) + '\n');
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
                                if (msg.data) clearPlayerWindowShapeForFullscreen();
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
                        const shouldEnterFullscreen = !mainWindow.isFullScreen();
                        if (shouldEnterFullscreen) clearPlayerWindowShapeForFullscreen();
                        mainWindow.setFullScreen(shouldEnterFullscreen);
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
                
                if (['file-loaded', 'start-file', 'tracks-changed'].includes(msg.event)) {
                    console.log(`[MPV LIFECYCLE EVENT] ${msg.event}`, msg);
                    if (mainWindow && !mainWindow.isDestroyed()) {
                        mainWindow.webContents.send(`mpv-${msg.event}`);
                    }
                }
                if (msg.event === 'end-file') {
                    console.log('[MPV LIFECYCLE EVENT] end-file', msg);
                    if (msg.reason === 'error' && (msg.file_error === 'unrecognized file format' || msg.file_error === 'loading failed')) {
                        if (mainWindow && !mainWindow.isDestroyed()) {
                            console.log('[MPV FALLBACK SYSTEM] Stream load failed. Invoking next fallback strategy.');
                            mainWindow.webContents.send('mpv-stream-failed-retry');
                        }
                    } else if (msg.reason === 'stop' || msg.reason === 'quit') {
                        if (mainWindow && !mainWindow.isDestroyed()) {
                            if (mainWindow.isFullScreen()) {
                                mainWindow.setFullScreen(false);
                            }
                            mainWindow.webContents.send('mpv-stopped');
                        }
                    }
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
    } else {
        // Fallback for paths that contain /mac=XX:XX:XX:XX:XX:XX or similar inline patterns
        const inlineMacMatch = urlStr.match(/mac=([0-9a-fA-F:]{17})/i);
        if (inlineMacMatch) {
            mac = inlineMacMatch[1];
        }
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
            let ua = 'VLC/3.0.9 LibVLC/3.0.9'; // Premium default User-Agent to prevent 403 / I/O reconnect errors
            let headersVal = [];
            
            if (data.headers) {
                if (data.headers['User-Agent']) ua = data.headers['User-Agent'];
                for (const [k, v] of Object.entries(data.headers)) {
                    if (k !== 'User-Agent') {
                        headersVal.push(`${k}: ${v}`);
                    }
                }
                console.log('[MPV HEADER INJECT] Injecting custom headers from PlaybackSource:', JSON.stringify(headersVal));
            } else if (mac) {
                ua = 'Mozilla/5.0 (QtEmbedded; U; Linux; C) AppleWebKit/533.3 (KHTML, like Gecko) MAG200 stbapp ver: 2 rev: 250 Safari/533.3';
                let referer = '';
                if (portalUrl) {
                    referer = portalUrl.replace('/server/load.php', '/c/index.html').replace('/portal.php', '/c/index.html');
                } else {
                    referer = urlStr.split('/play/')[0] + '/c/index.html';
                }
                const sessionPHPSessId = session ? session.phpSessionId : '';
                const cookies = `mac=${mac}; stb_lang=en; timezone=GMT` + (sessionPHPSessId ? `; PHPSESSID=${sessionPHPSessId}` : '');
                headersVal = [
                    'X-User-Agent: Model: MAG250; Link: Ethernet',
                    `Cookie: ${cookies}`,
                    `Referer: ${referer}`
                ];
                if (session && session.token) {
                    headersVal.push(`Authorization: Bearer ${session.token}`);
                }
                console.log('[MPV HEADER INJECT] Injecting MAG stbapp headers for Stalker stream. MAC:', mac, 'Referer:', referer);
            } else {
                console.log('[MPV HEADER INJECT] Using default VLC User-Agent and clearing custom headers.');
            }
            
            ipcClient.write(JSON.stringify({ command: ["set_property", "user-agent", ua] }) + '\n');
            ipcClient.write(JSON.stringify({ command: ["set_property", "http-header-fields", headersVal.join(',')] }) + '\n');
            
            // Ensure player always starts unmuted
            console.log('[MPV IPC SEND] Unmuting stream');
            ipcClient.write(JSON.stringify({ command: ["set_property", "mute", "no"] }) + '\n');
            
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
        const shouldEnterFullscreen = !mainWindow.isFullScreen();
        if (shouldEnterFullscreen) clearPlayerWindowShapeForFullscreen();
        mainWindow.setFullScreen(shouldEnterFullscreen);
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
        const args = Array.isArray(command) ? command : command.split(' ');
        console.log('[MPV IPC SEND]', JSON.stringify({ command: args }));
        ipcClient.write(JSON.stringify({ command: args }) + '\n');
    }
});

ipcMain.on('toggle-fullscreen', () => {
    console.log('[IPC RECV] toggle-fullscreen');
    if (mainWindow && !mainWindow.isDestroyed()) {
        const shouldEnterFullscreen = !mainWindow.isFullScreen();
        if (shouldEnterFullscreen) clearPlayerWindowShapeForFullscreen();
        mainWindow.setFullScreen(shouldEnterFullscreen);
    }
});

ipcMain.on('hide-splash', () => {
    console.log('[IPC RECV] hide-splash');
    showMainWindowAndHideSplash();
});

ipcMain.on('window-minimize', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.minimize();
    }
});

ipcMain.on('window-maximize', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
        if (mainWindow.isMaximized()) {
            mainWindow.unmaximize();
        } else {
            mainWindow.maximize();
        }
    }
});

ipcMain.on('set-confirm-toast-active', (event, active) => {
    if (playerWindow && !playerWindow.isDestroyed() && mainWindow && !mainWindow.isDestroyed()) {
        if (active) {
            mainWindow.setAlwaysOnTop(true, 'screen-saver');
            playerWindow.setAlwaysOnTop(false);
        } else {
            mainWindow.setAlwaysOnTop(false);
            playerWindow.setAlwaysOnTop(true);
            syncPlayerWindow();
        }
    }
});

ipcMain.on('window-close', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.close();
    }
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
let epgChannelsCache = {};

ipcMain.handle('get-epg-channels', async (event, epgSources) => {
    console.log('[IPC HANDLE] get-epg-channels', { epgSources });
    if (!epgSources) return [];
    
    if (epgChannelsCache[epgSources]) {
        console.log('[CACHE HIT] Returning cached EPG channels');
        return epgChannelsCache[epgSources];
    }
    
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
    
    epgChannelsCache[epgSources] = allEpgChannels;
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
        if (source.startsWith('xtream-epg:')) {
            console.log(`[XTREAM EPG] Fetching EPG for: ${source}`);
            try {
                const playlistRow = db.prepare('SELECT source_url FROM playlists WHERE epg_url = ?').get(source);
                if (playlistRow) {
                    const credParts = playlistRow.source_url.substring(19).split('|');
                    const server = credParts[0];
                    const username = credParts[1];
                    const password = credParts[2];
                    
                    const res = await xtreamFetch(server, username, password, 'get_simple_data_table');
                    if (res && res.epg_data) {
                        const deleteOld = db.prepare('DELETE FROM epg WHERE source_url = ?');
                        const insert = db.prepare(`
                            INSERT INTO epg (channel_id, start_time, stop_time, title, description, source_url)
                            VALUES (@channel_id, @start, @stop, @title, @desc, @source)
                        `);
                        
                        const saveTx = db.transaction((epgDict) => {
                            deleteOld.run(source);
                            let insertCount = 0;
                            for (const [streamId, epList] of Object.entries(epgDict)) {
                                if (Array.isArray(epList)) {
                                    for (const ep of epList) {
                                        if (!ep.start || !ep.end) continue;
                                        // Convert "YYYY-MM-DD HH:MM:SS" to ISO format
                                        let startIso = '';
                                        let endIso = '';
                                        try {
                                            startIso = new Date(ep.start.trim().replace(' ', 'T')).toISOString();
                                            endIso = new Date(ep.end.trim().replace(' ', 'T')).toISOString();
                                        } catch (dateErr) {
                                            continue;
                                        }
                                        insert.run({
                                            channel_id: String(streamId),
                                            start: startIso,
                                            stop: endIso,
                                            title: ep.title || 'No Title',
                                            desc: ep.description || '',
                                            source: source
                                        });
                                        insertCount++;
                                    }
                                }
                            }
                            console.log(`[XTREAM EPG] Saved ${insertCount} EPG entries to database.`);
                        });
                        saveTx(res.epg_data);
                    }
                }
            } catch (err) {
                console.error('[XTREAM EPG ERR] Failed to fetch EPG table:', err.message);
            }
        } else if (source.startsWith('stalker:')) {
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
                
                // 2. Fetch EPG for all channels in parallel with limit
                const stalkerEpgDict = {};
                const chunkSize = 12; // concurrency limit
                for (let i = 0; i < stalkerChannels.length; i += chunkSize) {
                    const chunk = stalkerChannels.slice(i, i + chunkSize);
                    await Promise.all(chunk.map(async (ch) => {
                        const chId = chooseStalkerChannelId(ch);
                        if (!chId) return;
                        
                        try {
                            // Try get_short_epg first
                            let epgRes = await stalkerRequest(baseUrl, mac, 'get_short_epg', { type: 'itv', ch_id: chId, size: '48', limit: 100, period: 72 });
                            let events = extractStalkerEpgItems(epgRes);
                            
                            // If empty, try get_epg_info fallback
                            if (!events || events.length === 0) {
                                epgRes = await stalkerRequest(baseUrl, mac, 'get_epg_info', { type: 'itv', ch_id: chId, period: 72 });
                                events = extractStalkerEpgItems(epgRes);
                            }
                            
                            if (events && events.length > 0) {
                                const normalized = normalizeStalkerEpgItems(events);
                                if (normalized.length > 0) {
                                    stalkerEpgDict[String(chId)] = normalized;
                                }
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
        const safeChannelIds = channelIds.filter(id => id !== null && id !== undefined).map(id => String(id));
        // SQLite has a limit on bind variables, process array elements in safe chunks
        const chunkSize = 900;
        for (let i = 0; i < safeChannelIds.length; i += chunkSize) {
            const chunk = safeChannelIds.slice(i, i + chunkSize);
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
function chooseStalkerChannelId(ch) {
    if (!ch || typeof ch !== 'object') return null;
    for (const k of ["ch_id", "id", "number", "channel_id", "cmd"]) {
        const v = ch[k];
        if (v !== undefined && v !== null) {
            const s = String(v).trim();
            if (s) {
                const digits = s.replace(/\D/g, '');
                return digits || s;
            }
        }
    }
    return null;
}

function extractStalkerEpgItems(res) {
    if (!res) return [];
    const data = res.js;
    if (Array.isArray(data)) return data;
    if (data && typeof data === 'object') {
        if (Array.isArray(data.epg)) return data.epg;
        if (Array.isArray(data.data)) return data.data;
    }
    return [];
}

function parseEpochToDate(ts) {
    if (ts === null || ts === undefined) return null;
    let val = Number(ts);
    if (isNaN(val)) return null;
    if (val > 10000000000) { // ms?
        val = val / 1000;
    }
    return new Date(val * 1000);
}

function parseDtStr(s) {
    if (!s || typeof s !== 'string') return null;
    const clean = s.trim();
    // Try parsing 'YYYY-MM-DD HH:MM:SS'
    const match = clean.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/);
    if (match) {
        const [_, year, month, day, hour, minute, second] = match;
        return new Date(Date.UTC(
            parseInt(year, 10),
            parseInt(month, 10) - 1,
            parseInt(day, 10),
            parseInt(hour, 10),
            parseInt(minute, 10),
            parseInt(second, 10)
        ));
    }
    const parsed = Date.parse(clean);
    if (!isNaN(parsed)) {
        return new Date(parsed);
    }
    return null;
}

function firstNonEmpty(d, keys) {
    if (!d || typeof d !== 'object') return null;
    for (const k of keys) {
        const v = d[k];
        if (v !== undefined && v !== null && String(v).trim()) {
            return String(v).trim();
        }
    }
    return null;
}

function safeInt(x) {
    if (x === null || x === undefined) return null;
    const parsed = parseInt(x, 10);
    return isNaN(parsed) ? null : parsed;
}

function formatDateToEpgString(date) {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) return '';
    const pad = n => n.toString().padStart(2, '0');
    return `${date.getUTCFullYear()}${pad(date.getUTCMonth()+1)}${pad(date.getUTCDate())}${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())} +0000`;
}

function normalizeStalkerEpgItems(items) {
    if (!Array.isArray(items)) return [];
    const norm = [];
    for (const it of items) {
        if (!it || typeof it !== 'object') continue;
        
        const title = (firstNonEmpty(it, ["name", "title", "progname", "program"]) || 'No Title').trim();
        
        // Timestamps
        const start_ts = safeInt(it.start) || safeInt(it.start_timestamp) || safeInt(it.from);
        const end_ts = safeInt(it.end) || safeInt(it.stop_timestamp) || safeInt(it.to);
        
        let start_dt = null;
        if (start_ts) {
            start_dt = parseEpochToDate(start_ts);
        } else {
            const start_dt_str = firstNonEmpty(it, ["time", "start_time"]);
            start_dt = parseDtStr(start_dt_str);
        }
        
        let end_dt = null;
        if (end_ts) {
            end_dt = parseEpochToDate(end_ts);
        } else {
            const end_dt_str = firstNonEmpty(it, ["time_to", "end_time"]);
            end_dt = parseDtStr(end_dt_str);
        }
        
        // Duration
        let duration = safeInt(firstNonEmpty(it, ["duration", "prog_duration", "length"]));
        if (!duration && start_ts && end_ts && start_dt && end_dt) {
            const delta = Math.floor((end_dt.getTime() - start_dt.getTime()) / 1000);
            if (delta > 0 && delta < 24 * 3600) {
                duration = delta;
            }
        }
        
        // If end_dt is not present but start_dt and duration are, derive end_dt
        if (!end_dt && start_dt && duration && duration < 24 * 3600) {
            end_dt = new Date(start_dt.getTime() + duration * 1000);
        }
        
        const desc = (firstNonEmpty(it, ["descr", "description", "desc", "short_description", "long_description", "plot", "overview"]) || '').trim();
        
        if (start_dt && end_dt) {
            norm.push({
                start: formatDateToEpgString(start_dt),
                stop: formatDateToEpgString(end_dt),
                title,
                desc,
                start_ms: start_dt.getTime()
            });
        }
    }
    
    // Sort normalized items by start_ms
    norm.sort((a, b) => a.start_ms - b.start_ms);
    
    // Clean up the temporary start_ms field
    return norm.map(item => ({
        start: item.start,
        stop: item.stop,
        title: item.title,
        desc: item.desc
    }));
}

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

function getPortalProfile(portalUrl) {
    if (!db) return null;
    try {
        const row = db.prepare('SELECT * FROM portal_profiles WHERE portal_url = ?').get(portalUrl);
        return row || null;
    } catch (e) {
        console.error('[DB] Failed to get portal profile:', e.message);
        return null;
    }
}

function updatePortalProfile(portalUrl, updates) {
    if (!db) return;
    try {
        const existing = getPortalProfile(portalUrl);
        if (!existing) {
            db.prepare(`
                INSERT INTO portal_profiles (portal_url, uses_direct_source, requires_headers, preferred_format, last_working_url, link_resolves, token_failures, avg_resolve_ms)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                portalUrl,
                updates.uses_direct_source || 0,
                updates.requires_headers || 0,
                updates.preferred_format || null,
                updates.last_working_url || null,
                updates.link_resolves || 0,
                updates.token_failures || 0,
                updates.avg_resolve_ms || 0
            );
        } else {
            const setClause = [];
            const params = [];
            for (const [k, v] of Object.entries(updates)) {
                setClause.push(`${k} = ?`);
                params.push(v);
            }
            params.push(portalUrl);
            db.prepare(`UPDATE portal_profiles SET ${setClause.join(', ')} WHERE portal_url = ?`).run(...params);
        }
    } catch (e) {
        console.error('[DB] Failed to update portal profile:', e.message);
    }
}

// =========================================================================
// --- XTREAM CODES (XC API) ENGINE SUPPORT ---
// =========================================================================

async function xtreamFetch(server, username, password, action = null, extraParams = {}) {
    let cleanServer = server.trim();
    if (!cleanServer.startsWith('http://') && !cleanServer.startsWith('https://')) {
        cleanServer = 'http://' + cleanServer;
    }
    // Remove trailing slashes
    cleanServer = cleanServer.replace(/\/+$/, '');

    let url = `${cleanServer}/player_api.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;
    if (action) {
        url += `&action=${encodeURIComponent(action)}`;
    }
    for (const [k, v] of Object.entries(extraParams)) {
        url += `&${encodeURIComponent(k)}=${encodeURIComponent(v)}`;
    }

    console.log('[XTREAM API] Requesting:', url.replace(/password=[^&]+/, 'password=******'));
    const response = await fetch(url, {
        headers: { 'User-Agent': 'AIVue-Player/1.0' },
        signal: AbortSignal.timeout(15000)
    });

    if (!response.ok) {
        throw new Error(`Server returned status code: ${response.status}`);
    }
    return await response.json();
}

async function resolveXtreamLink(server, username, password, streamId, type, extension = null, directSourceUrl = null) {
    const startResolveTime = Date.now();
    let cleanServer = server.trim();
    if (!cleanServer.startsWith('http://') && !cleanServer.startsWith('https://')) {
        cleanServer = 'http://' + cleanServer;
    }
    cleanServer = cleanServer.replace(/\/+$/, '');

    // 0. Query Capability Profile
    const profile = getPortalProfile(cleanServer);
    const preferredFormat = profile ? profile.preferred_format : null;
    const usesDirectSource = profile ? profile.uses_direct_source : 0;
    const lastWorkingUrl = profile ? profile.last_working_url : null;

    const candidates = [];

    // 1. Direct Source (Method A) takes absolute priority if present
    if (directSourceUrl && (usesDirectSource === 1 || candidates.length === 0)) {
        candidates.push(decodeURIComponent(directSourceUrl));
    }

    // 2. Pre-evaluate working cache
    if (lastWorkingUrl && !candidates.includes(lastWorkingUrl)) {
        // Confirm it matches this streamId to avoid crossover channel leaks
        if (lastWorkingUrl.includes(`/${streamId}.`) || lastWorkingUrl.endsWith(`/${streamId}`)) {
            candidates.push(lastWorkingUrl);
        }
    }

    if (type === 'live') {
        const ext = extension || 'ts';
        const hlsUrl = `${cleanServer}/live/${encodeURIComponent(username)}/${encodeURIComponent(password)}/${streamId}.m3u8`;
        const tsUrl = `${cleanServer}/live/${encodeURIComponent(username)}/${encodeURIComponent(password)}/${streamId}.ts`;
        const customUrl = `${cleanServer}/live/${encodeURIComponent(username)}/${encodeURIComponent(password)}/${streamId}.${ext}`;
        
        if (preferredFormat === 'hls') {
            if (!candidates.includes(hlsUrl)) candidates.push(hlsUrl);
            if (ext !== 'm3u8' && !candidates.includes(customUrl)) candidates.push(customUrl);
            if (ext !== 'ts' && !candidates.includes(tsUrl)) candidates.push(tsUrl);
        } else {
            if (!candidates.includes(tsUrl)) candidates.push(tsUrl);
            if (ext !== 'ts' && !candidates.includes(customUrl)) candidates.push(customUrl);
            if (ext !== 'm3u8' && !candidates.includes(hlsUrl)) candidates.push(hlsUrl);
        }
    } else {
        const ext = extension || 'mp4';
        const primaryUrl = `${cleanServer}/${type === 'movie' ? 'movie' : 'series'}/${encodeURIComponent(username)}/${encodeURIComponent(password)}/${streamId}.${ext}`;
        if (!candidates.includes(primaryUrl)) candidates.push(primaryUrl);
        
        const formats = ['mp4', 'mkv', 'avi'];
        if (preferredFormat && formats.includes(preferredFormat) && preferredFormat !== ext) {
            const prefUrl = `${cleanServer}/${type === 'movie' ? 'movie' : 'series'}/${encodeURIComponent(username)}/${encodeURIComponent(password)}/${streamId}.${preferredFormat}`;
            if (!candidates.includes(prefUrl)) candidates.push(prefUrl);
        }
        for (const fallback of formats) {
            if (fallback !== ext && fallback !== preferredFormat) {
                const fallUrl = `${cleanServer}/${type === 'movie' ? 'movie' : 'series'}/${encodeURIComponent(username)}/${encodeURIComponent(password)}/${streamId}.${fallback}`;
                if (!candidates.includes(fallUrl)) candidates.push(fallUrl);
            }
        }
    }

    console.log(`[XTREAM RESOLVER] Probing playback URL for streamId: ${streamId}, type: ${type}`);

    const customHeaders = {
        'User-Agent': 'IPTV Smarters Pro',
        'Referer': cleanServer
    };

    for (const urlCandidate of candidates) {
        try {
            console.log('[XTREAM RESOLVER] Probing candidate URL:', urlCandidate.replace(/\/[^/]+\/[^/]+\/(\d+)/, '/****/****/$1'));
            
            let currentUrl = urlCandidate;
            let redirects = 0;
            let headResponse = null;

            while (redirects < 10) {
                try {
                    headResponse = await fetch(currentUrl, {
                        method: 'HEAD',
                        redirect: 'manual',
                        headers: customHeaders,
                        signal: AbortSignal.timeout(5000)
                    });
                } catch (fetchErr) {
                    if (currentUrl.startsWith('https://')) {
                        console.warn('[XTREAM RESOLVER] TLS / network error on HTTPS. Retrying on HTTP fallback...', fetchErr.message);
                        currentUrl = currentUrl.replace('https://', 'http://');
                        continue;
                    }
                    throw fetchErr;
                }

                if (headResponse.status >= 300 && headResponse.status < 400) {
                    const location = headResponse.headers.get('location');
                    if (location) {
                        currentUrl = new URL(location, currentUrl).toString();
                        redirects++;
                        console.log(`[XTREAM RESOLVER] Following redirect #${redirects} to:`, currentUrl.replace(/\/[^/]+\/[^/]+\/(\d+)/, '/****/****/$1'));
                        continue;
                    }
                }
                break;
            }

            const status = headResponse.status;
            if (status === 200 || status === 206 || status === 302) {
                console.log(`[XTREAM RESOLVER] Success! Verified stream URL with HTTP ${status}`);
                
                // Determine format dynamically from Content-Type
                const contentType = (headResponse.headers.get('content-type') || '').toLowerCase();
                let format = 'ts';
                if (contentType.includes('mpegurl') || contentType.includes('x-mpegurl') || currentUrl.includes('.m3u8')) {
                    format = 'hls';
                } else if (contentType.includes('mp4') || currentUrl.includes('.mp4')) {
                    format = 'mp4';
                } else if (contentType.includes('mkv') || currentUrl.includes('.mkv')) {
                    format = 'mkv';
                }

                const elapsed = Date.now() - startResolveTime;
                console.log(`[TELEMETRY] Stream resolved in ${elapsed}ms.`);

                // Update portal capability profile
                const existingResolves = profile ? (profile.link_resolves || 0) : 0;
                const newResolves = existingResolves + 1;
                const existingAvg = profile ? (profile.avg_resolve_ms || 0) : 0;
                const newAvg = ((existingAvg * existingResolves) + elapsed) / newResolves;

                updatePortalProfile(cleanServer, {
                    uses_direct_source: (directSourceUrl && urlCandidate === decodeURIComponent(directSourceUrl)) ? 1 : 0,
                    requires_headers: 1,
                    preferred_format: format,
                    last_working_url: currentUrl,
                    link_resolves: newResolves,
                    avg_resolve_ms: parseFloat(newAvg.toFixed(2))
                });

                return {
                    url: currentUrl,
                    headers: customHeaders,
                    streamFormat: format
                };
            } else {
                console.warn(`[XTREAM RESOLVER] Candidate URL returned HTTP ${status}. Trying fallback...`);
            }
        } catch (e) {
            console.warn(`[XTREAM RESOLVER] Failed to probe candidate:`, e.message);
        }
    }

    // Absolute fallback: return the primary candidate if validation completely timed out or errored out
    console.log(`[XTREAM RESOLVER] All probes failed or timed out. Returning primary candidate as fallback.`);
    
    const newFailures = (profile ? (profile.token_failures || 0) : 0) + 1;
    updatePortalProfile(cleanServer, {
        token_failures: newFailures
    });

    return {
        url: candidates[0],
        headers: customHeaders,
        streamFormat: type === 'live' ? 'ts' : 'mp4'
    };
}

const stalkerTokens = new Map();
const stalkerAuthPromises = new Map();

async function authenticateStalker(baseUrl, mac, forceFresh = false) {
    const url = getStalkerUrl(baseUrl);
    const cacheKey = `${url}|${mac}`;
    
    if (!forceFresh && stalkerTokens.has(cacheKey)) {
        const cached = stalkerTokens.get(cacheKey);
        if (Date.now() - cached.timestamp < 3600000) {
            return cached;
        }
    }

    if (!forceFresh && stalkerAuthPromises.has(cacheKey)) {
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

async function stalkerRequest(baseUrl, mac, action, extraParams = {}, isRetry = false, forceFresh = false) {
    const session = await authenticateStalker(baseUrl, mac, forceFresh);
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
        
        let originalCmd = cmd || '';
        if (originalCmd.startsWith('ffmpeg ')) {
            originalCmd = originalCmd.substring(7).trim();
        }

        // HEURISTIC: Direct Playback Bypass (Disabled to ensure play_tokens are always freshly resolved/renewed and do not result in HTTP 458 errors)
        /*
        if (originalCmd.startsWith('http') && 
            !originalCmd.includes('localhost') && 
            !originalCmd.includes('127.0.0.1') && 
            (originalCmd.includes('/play/live.php') || 
             originalCmd.includes('/play/movie.php') || 
             originalCmd.includes('/play/series.php')) && 
            !originalCmd.includes('stream=&')) {
            
            console.log('[STALKER IPC] Heuristic Match: Bypassing create_link for direct play URL:', originalCmd);
            return originalCmd;
        }
        */

        const probes = [];

        // Clean and extract standard Stalker stream ID if present
        let streamId = '';
        const streamMatch = originalCmd.match(/[?&]stream=(\d+)/);
        if (streamMatch) {
            streamId = streamMatch[1];
        } else {
            const chMatch = originalCmd.match(/\/ch\/(\d+)/);
            if (chMatch) streamId = chMatch[1];
        }

        if (streamId) {
            console.log('[STALKER IPC] Extracted Stream ID:', streamId, 'Injecting clean standard MAG commands.');
            probes.push({ type: type || 'itv', cmd: `ffmpeg http://localhost/ch/${streamId}` });
            probes.push({ type: type || 'itv', cmd: `ffmpeg http://localhost/ch/${streamId}_` });
        }

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
            const res = await stalkerRequest(url, mac, 'create_link', probe, false, true);
            console.log('[CREATE LINK RAW]', JSON.stringify(res));
            
            const candidates = [
                res?.js?.cmd,
                res?.js?.url,
                res?.cmd,
                res?.url,
                res?.stream_url,
                Array.isArray(res?.js) ? res.js[0]?.cmd : null,
                Array.isArray(res?.js) ? res.js[0]?.url : null,
                originalCmd // Absolute fallback
            ];

            let candidateUrl = '';
            for (const c of candidates) {
                if (c && typeof c === 'string') {
                    const cleaned = c.trim().replace(/^ffmpeg\s+/i, '');
                    if (!cleaned.includes('stream=&')) {
                        candidateUrl = cleaned;
                        break;
                    }
                }
            }

            if (candidateUrl) {
                finalUrl = candidateUrl;
                console.log('[CREATE LINK SUCCESS] Found URL using probe. Candidate URL:', finalUrl);
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

const COUNTRY_CODES = new Set([
    "US", "USA", "UK", "GBR", "CA", "CAN", "FR", "FRA", "DE", "DEU", "ES", "ESP", "IT", "ITA", 
    "AR", "ARG", "MX", "MEX", "IN", "IND", "BR", "BRA", "PT", "PRT", "TR", "TUR", "RU", "RUS", 
    "NL", "NLD", "PL", "POL", "BE", "BEL", "SE", "SWE", "NO", "NOR", "DK", "DNK", "FI", "FIN", 
    "PK", "PAK", "AU", "AUS", "NZ", "NZL", "ZA", "ZAF", "CH", "CHE", "AT", "AUT", "IE", "IRL", 
    "GR", "GRC", "CN", "CHN", "JP", "JPN", "KR", "KOR", "EN", "ENG", "LAT", "SPA", "GER", 
    "POR", "ARA", "ARAB", "HE", "ISR", "IT", "RO", "ROM", "BG", "BGR", "HU", "HUN", "CZ", "CZE", 
    "SK", "SVK", "HR", "HRV", "RS", "SRB", "SI", "SVN", "UA", "UKR", "KZ", "KAZ", "UZ", "UZB", 
    "AL", "ALB", "MK", "MKD", "TH", "THA", "VN", "VNM", "PH", "PHL", "MY", "MYS", "ID", "IDN", 
    "SG", "SGP", "HK", "HKG", "TW", "TWN"
]);

const countryCodesSorted = Array.from(COUNTRY_CODES).sort((a, b) => b.length - a.length);
const countryPatternStr = countryCodesSorted.join('|');
const countryPrefixRegex = new RegExp(`^(?:\\[(?:${countryPatternStr})\\]|\\((?:${countryPatternStr})\\)|(?:${countryPatternStr})\\s*[:|#\\- ]\\s*)\\s*`, 'i');

function trimCountryPrefix(text) {
    if (!text || typeof text !== 'string') return text;
    let prev = "";
    let current = text.trim();
    while (prev !== current) {
        prev = current;
        current = current.replace(countryPrefixRegex, '').trim();
    }
    return current;
}

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
            itvCategories = catData.map(c => ({ id: c.id, name: trimCountryPrefix(c.title || c.name || 'Live TV') }));
            
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
                const rawName = cat.title || cat.name || cat.category_name || 'VOD';
                const name = trimCountryPrefix(rawName);
                const isSeries = rawName.toLowerCase().match(/(tv|series|show)/);
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
                const name = trimCountryPrefix(cat.title || cat.name || cat.category_name || 'Series');
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

async function executeLoadStalkerCategory({ url, mac, categoryId, isSeries, categoryType, categoryName }) {
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
        


        const parseStart = Date.now();
        let result = [];

        if (categoryType === 'itv') {
            result = itemList.map(c => ({
                tvg_id: String(c.id || c.ch_id || c.tvg_id || ''),
                tvg_name: trimCountryPrefix(c.name || ''),
                title: trimCountryPrefix(c.name || 'Unknown Channel'),
                logo: c.logo ? (c.logo.startsWith('http') ? c.logo : `${url.substring(0, url.lastIndexOf('/'))}/${c.logo}`) : '',
                group: trimCountryPrefix(categoryName || 'Live TV'),
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
                        name: trimCountryPrefix(m.name || 'Unknown Series'),
                        logo: m.logo ? (m.logo.startsWith('http') ? m.logo : `${url.substring(0, url.lastIndexOf('/'))}/${m.logo}`) : '',
                        url: `stalker-series:${seriesId}`,
                        type: 'series',
                        group: trimCountryPrefix(categoryName || 'Series'),
                        tmdb_id: m.tmdb_id || m.tmdbId || m.tmdb || ''
                    };
                } else {
                    const movieId = m.id || m.video_id || m.movie_id || '';
                    return {
                        id: movieId,
                        tvg_id: movieId,
                        name: trimCountryPrefix(m.name || 'Unknown Movie'),
                        logo: m.logo ? (m.logo.startsWith('http') ? m.logo : `${url.substring(0, url.lastIndexOf('/'))}/${m.logo}`) : '',
                        url: `stalker-cmd:vod|${m.cmd || ''}`,
                        type: 'movie',
                        group: trimCountryPrefix(categoryName || 'Movies'),
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
}

ipcMain.handle('load-stalker-category', async (event, params) => {
    return await executeLoadStalkerCategory(params);
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

ipcMain.handle('parse-xtream', async (event, { name, server, username, password }) => {
    try {
        console.log('[XTREAM IPC] Starting Xtream Codes parsing for:', server, 'user:', username);
        
        // 1. Verify Credentials
        const loginInfo = await xtreamFetch(server, username, password);
        if (!loginInfo || !loginInfo.user_info || loginInfo.user_info.auth !== 1) {
            console.error('[XTREAM IPC] Authentication failed or account expired.');
            return { error: 'Authentication failed or account has expired.' };
        }

        const userInfo = loginInfo.user_info;
        const serverInfo = loginInfo.server_info;
        console.log('[XTREAM IPC] Auth successful. Expire:', userInfo.exp_date);

        // 2. Fetch categories
        let liveCats = [], movieCats = [], seriesCats = [];
        try {
            liveCats = await xtreamFetch(server, username, password, 'get_live_categories');
        } catch (e) { console.error('[XTREAM] Failed to load live categories:', e.message); }
        
        try {
            movieCats = await xtreamFetch(server, username, password, 'get_vod_categories');
        } catch (e) { console.error('[XTREAM] Failed to load movie categories:', e.message); }
        
        try {
            seriesCats = await xtreamFetch(server, username, password, 'get_series_categories');
        } catch (e) { console.error('[XTREAM] Failed to load series categories:', e.message); }

        const liveCatMap = new Map((liveCats || []).map(c => [String(c.category_id), c.category_name]));
        const movieCatMap = new Map((movieCats || []).map(c => [String(c.category_id), c.category_name]));
        const seriesCatMap = new Map((seriesCats || []).map(c => [String(c.category_id), c.category_name]));

        const allParsed = [];

        // 3. Fetch streams
        let liveStreams = [], movieStreams = [], seriesStreams = [];
        try {
            liveStreams = await xtreamFetch(server, username, password, 'get_live_streams');
        } catch (e) { console.error('[XTREAM] Failed to load live streams:', e.message); }
        
        try {
            movieStreams = await xtreamFetch(server, username, password, 'get_vod_streams');
        } catch (e) { console.error('[XTREAM] Failed to load movie streams:', e.message); }
        
        try {
            seriesStreams = await xtreamFetch(server, username, password, 'get_series');
        } catch (e) { console.error('[XTREAM] Failed to load series streams:', e.message); }

        // 4. Map streams
        if (Array.isArray(liveStreams)) {
            liveStreams.forEach(item => {
                const grp = liveCatMap.get(String(item.category_id)) || 'Live TV';
                const directSourceSuffix = item.direct_source ? `|${encodeURIComponent(item.direct_source)}` : '';
                allParsed.push({
                    tvg_id: item.epg_channel_id || String(item.stream_id),
                    tvg_name: trimCountryPrefix(item.name || ''),
                    title: trimCountryPrefix(item.name || ''),
                    logo: item.stream_icon || '',
                    group: grp,
                    url: `xtream-stream:live|${item.stream_id}${directSourceSuffix}`,
                    type: 'live'
                });
            });
        }

        if (Array.isArray(movieStreams)) {
            movieStreams.forEach(item => {
                const grp = movieCatMap.get(String(item.category_id)) || 'Movies';
                const directSourceSuffix = item.direct_source ? `|${encodeURIComponent(item.direct_source)}` : '';
                allParsed.push({
                    tvg_id: String(item.stream_id),
                    tvg_name: trimCountryPrefix(item.name || ''),
                    title: trimCountryPrefix(item.name || ''),
                    logo: item.stream_icon || '',
                    group: grp,
                    url: `xtream-stream:movie|${item.stream_id}|${item.container_extension || 'mp4'}${directSourceSuffix}`,
                    type: 'movie'
                });
            });
        }

        if (Array.isArray(seriesStreams)) {
            seriesStreams.forEach(item => {
                const grp = seriesCatMap.get(String(item.category_id)) || 'Series';
                allParsed.push({
                    tvg_id: String(item.series_id),
                    tvg_name: trimCountryPrefix(item.name || ''),
                    title: trimCountryPrefix(item.name || ''),
                    logo: item.cover || '',
                    group: grp,
                    url: `xtream-stream:series|${item.series_id}`,
                    type: 'series'
                });
            });
        }

        let safeExpDate = null;
        if (userInfo.exp_date) {
            const expStr = String(userInfo.exp_date).trim().toLowerCase();
            if (expStr && expStr !== 'never' && expStr !== 'unlimited' && expStr !== 'null' && expStr !== '0') {
                try {
                    const parsedTimestamp = parseInt(expStr);
                    if (!isNaN(parsedTimestamp) && parsedTimestamp > 0) {
                        safeExpDate = new Date(parsedTimestamp * 1000).toISOString();
                    }
                } catch (err) {
                    console.error('[XTREAM IPC] Error parsing exp_date timestamp:', err);
                }
            }
        }

        console.log(`[XTREAM IPC] Finished parsing. Loaded total channels: ${allParsed.length}`);
        return {
            channels: allParsed,
            epg_url: 'xtream-epg:' + server,
            exp_date: safeExpDate
        };
    } catch (e) {
        console.error('[XTREAM IPC ERR] Parser failed:', e);
        return { error: e.message };
    }
});

ipcMain.handle('resolve-xtream-link', async (event, { server, username, password, streamId, type, extension, directSourceUrl }) => {
    try {
        return await resolveXtreamLink(server, username, password, streamId, type, extension, directSourceUrl);
    } catch (e) {
        console.error('[XTREAM RESOLVE ERR] Fail:', e.message);
        return null;
    }
});

ipcMain.handle('get-xtream-episodes', async (event, { server, username, password, seriesId }) => {
    try {
        console.log(`[XTREAM EPISODES] Loading episodes for Series ID: ${seriesId}`);
        const res = await xtreamFetch(server, username, password, 'get_series_info', { series_id: seriesId });
        
        const episodes = [];
        if (res && res.episodes) {
            for (const [seasonNum, epList] of Object.entries(res.episodes)) {
                if (Array.isArray(epList)) {
                    epList.forEach((ep, idx) => {
                        const epTitle = ep.title || `Episode ${ep.episode_num || (idx + 1)}`;
                        const ext = ep.container_extension || 'mp4';
                        episodes.push({
                            id: String(ep.id || ep.stream_id),
                            name: epTitle,
                            season: parseInt(seasonNum) || 1,
                            episodeNum: parseInt(ep.episode_num) || (idx + 1),
                            url: `xtream-stream:series|${ep.id || ep.stream_id}|${ext}`,
                            logo: ep.info?.movie_image || ''
                        });
                    });
                }
            }
        }
        console.log(`[XTREAM EPISODES SUCCESS] Found ${episodes.length} episodes.`);
        return episodes;
    } catch (e) {
        console.error('[XTREAM EPISODES ERR] Fail:', e.message);
        return [];
    }
});
ipcMain.handle('get-telemetry-diagnostics', async (event, portalUrl) => {
    try {
        if (!portalUrl) {
            return db.prepare('SELECT * FROM portal_profiles').all();
        }
        return getPortalProfile(portalUrl);
    } catch (e) {
        console.error('[TELEMETRY IPC ERR] Fail:', e.message);
        return null;
    }
});

// Cache deletion
ipcMain.handle('clear-cache', async (event, url) => {
    console.log('[IPC HANDLE] clear-cache', { url });
    if (!url) return false;
    
    // Invalidate in-memory cache
    epgChannelsCache = {};
    
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

ipcMain.handle('save-mappings-bulk', (event, mappingsArray) => {
    console.log('[IPC HANDLE] save-mappings-bulk START', mappingsArray.length);
    if (!db) return false;
    try {
        const insertStmt = db.prepare(`
            INSERT INTO mappings (channel_title, epg_id)
            VALUES (@title, @epg)
            ON CONFLICT(channel_title) DO UPDATE SET epg_id = @epg
        `);
        const deleteStmt = db.prepare('DELETE FROM mappings WHERE channel_title = ?');
        
        const transaction = db.transaction((mappings) => {
            for (const { title, epgId } of mappings) {
                if (epgId) {
                    insertStmt.run({ title, epg: epgId });
                } else {
                    deleteStmt.run(title);
                }
            }
        });
        
        transaction(mappingsArray);
        console.log('[IPC HANDLE] save-mappings-bulk END');
        return true;
    } catch (e) {
        console.error('[DB ERR] Failed to save mappings bulk:', e);
        throw e;
    }
});

ipcMain.handle('get-playback-progress', (event, id) => {
    try {
        if (!db) return null;
        const row = db.prepare("SELECT * FROM playback_progress WHERE id = ?").get(id);
        return row || null;
    } catch (e) {
        console.error('[DB ERR] Failed to get playback progress:', e);
        return null;
    }
});

ipcMain.handle('save-playback-progress', (event, { id, tmdb_id, title, stream_url, season, episode, position, duration, completed }) => {
    try {
        if (!db) return false;
        const last_watched = new Date().toISOString();
        db.prepare(`
            INSERT INTO playback_progress (id, tmdb_id, title, stream_url, season, episode, position, duration, last_watched, completed)
            VALUES (@id, @tmdb_id, @title, @stream_url, @season, @episode, @position, @duration, @last_watched, @completed)
            ON CONFLICT(id) DO UPDATE SET
                position = excluded.position,
                duration = excluded.duration,
                last_watched = excluded.last_watched,
                completed = excluded.completed
        `).run({ id, tmdb_id: tmdb_id || null, title: title || null, stream_url: stream_url || null, season: season || null, episode: episode || null, position, duration, last_watched, completed });
        return true;
    } catch (e) {
        console.error('[DB ERR] Failed to save playback progress:', e);
        return false;
    }
});

ipcMain.handle('get-all-playback-progress', () => {
    try {
        if (!db) return [];
        return db.prepare("SELECT * FROM playback_progress").all();
    } catch (e) {
        console.error('[DB ERR] Failed to get all playback progress:', e);
        return [];
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

// ==========================================
// --- DVR LIVE TV CHANNELS RECORDING ENGINE ---
// ==========================================
const http = require('http');
const https = require('https');
const { URL } = require('url');

const activeRecordings = new Map();

function downloadStream(urlStr, destPath, customHeaders = [], onProgress, onDone, onError) {
    console.log('[DVR DEBUG] URL=', urlStr);
    console.log('[DVR DEBUG] ABS=', /^https?:\/\//.test(urlStr));
    
    let ffmpegProcess = null;
    let requestInstance = null;
    let fileStream = null;
    let isCancelled = false;
    
    const cancel = () => {
        isCancelled = true;
        if (ffmpegProcess) {
            console.log('[DVR] Killing active FFmpeg process...');
            ffmpegProcess.kill('SIGKILL');
        }
        if (requestInstance) requestInstance.destroy();
        if (fileStream) fileStream.end();
    };

    const startDownload = (currentUrl) => {
        if (isCancelled) return;
        
        console.log('[DVR] Attempting stream capture via FFmpeg...');
        
        let headersString = '';
        if (customHeaders && Array.isArray(customHeaders)) {
            headersString = customHeaders.map(h => `${h}\r\n`).join('');
        }
        headersString += 'User-Agent: VLC/3.0.9 LibVLC/3.0.9\r\n';

        const args = [];
        if (headersString) {
            args.push('-headers', headersString);
        }
        args.push('-i', currentUrl, '-c', 'copy', '-y', destPath);

        try {
            ffmpegProcess = spawn('ffmpeg', args);
            
            let ffmpegStarted = false;
            
            ffmpegProcess.on('error', (err) => {
                if (err.code === 'ENOENT') {
                    console.log('[DVR] FFmpeg not found on system PATH. Falling back to native Node HTTP capturing...');
                    startHttpDownload(currentUrl);
                } else {
                    onError(err);
                }
            });

            ffmpegProcess.stderr.on('data', (data) => {
                if (isCancelled) return;
                const log = data.toString();
                const sizeMatch = log.match(/size=\s*(\d+)\s*(kB|mB)/i);
                if (sizeMatch) {
                    ffmpegStarted = true;
                    let size = parseInt(sizeMatch[1]);
                    if (sizeMatch[2].toLowerCase() === 'mb') size *= 1024;
                    if (onProgress) onProgress(size * 1024);
                }
            });

            ffmpegProcess.on('close', (code) => {
                if (isCancelled) return;
                if (code === 0 || ffmpegStarted) {
                    console.log('[DVR] FFmpeg capture completed successfully.');
                    onDone();
                } else {
                    console.log(`[DVR] FFmpeg process exited with code ${code}. Trying HTTP fallback...`);
                    startHttpDownload(currentUrl);
                }
            });
            
        } catch (e) {
            console.log('[DVR] FFmpeg spawning threw exception. Falling back to native Node HTTP capturing...', e);
            startHttpDownload(currentUrl);
        }
    };

    const startHttpDownload = (currentUrl) => {
        if (isCancelled) return;
        try {
            const parsedUrl = new URL(currentUrl);
            const protocol = parsedUrl.protocol === 'https:' ? https : http;
            
            const headers = {
                'User-Agent': 'VLC/3.0.9 LibVLC/3.0.9'
            };
            if (customHeaders && Array.isArray(customHeaders)) {
                customHeaders.forEach(h => {
                    const parts = h.split(':');
                    if (parts.length >= 2) {
                        headers[parts[0].trim()] = parts.slice(1).join(':').trim();
                    }
                });
            }

            const options = {
                headers: headers,
                timeout: 15000
            };

            requestInstance = protocol.get(currentUrl, options, (res) => {
                if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                    const redirectUrl = new URL(res.headers.location, currentUrl).href;
                    console.log(`[DVR] Redirecting to: ${redirectUrl}`);
                    startHttpDownload(redirectUrl);
                    return;
                }

                if (res.statusCode !== 200) {
                    onError(new Error(`Server returned HTTP ${res.statusCode}`));
                    return;
                }

                fileStream = fs.createWriteStream(destPath);
                let bytesWritten = 0;

                res.on('data', (chunk) => {
                    if (isCancelled) {
                        res.destroy();
                        return;
                    }
                    fileStream.write(chunk);
                    bytesWritten += chunk.length;
                    if (onProgress) onProgress(bytesWritten);
                });

                res.on('end', () => {
                    fileStream.end();
                    if (!isCancelled) onDone();
                });

                res.on('error', (err) => {
                    fileStream.end();
                    onError(err);
                });
            });
            
            requestInstance.on('error', (err) => {
                onError(err);
            });
            
            requestInstance.on('timeout', () => {
                requestInstance.destroy();
                onError(new Error('Connection timeout'));
            });
            
        } catch (err) {
            onError(err);
        }
    };

    startDownload(urlStr);

    return { cancel };
}

ipcMain.handle('get-recording-path', () => {
    try {
        if (!db) return path.join(app.getPath('documents'), 'AIVueRecordings');
        const row = db.prepare("SELECT value FROM dvr_settings WHERE key = 'recording_path'").get();
        if (row && row.value) return row.value;
    } catch (e) {
        console.error('[DB ERR] Failed to read recording path settings:', e);
    }
    return path.join(app.getPath('documents'), 'AIVueRecordings');
});

ipcMain.handle('save-recording-path', (event, targetPath) => {
    try {
        if (!db) return false;
        db.prepare("INSERT OR REPLACE INTO dvr_settings (key, value) VALUES ('recording_path', ?)").run(targetPath);
        if (!fs.existsSync(targetPath)) {
            fs.mkdirSync(targetPath, { recursive: true });
        }
        return true;
    } catch (e) {
        console.error('[DB ERR] Failed to save recording path settings:', e);
        return false;
    }
});

ipcMain.handle('start-recording', async (event, channelUrl, channelName, programName, headers = []) => {
    console.log('[DVR IPC] Start recording requested for:', channelName, '-- Program:', programName);
    
    let folder = path.join(app.getPath('documents'), 'AIVueRecordings');
    try {
        const row = db.prepare("SELECT value FROM dvr_settings WHERE key = 'recording_path'").get();
        if (row && row.value) folder = row.value;
    } catch (e) {}
    
    if (!fs.existsSync(folder)) {
        fs.mkdirSync(folder, { recursive: true });
    }
    
    const safeChannelName = channelName.replace(/[\/\\:\*\?"<>\|]/g, '_');
    const safeProgramName = programName.replace(/[\/\\:\*\?"<>\|]/g, '_');
    const filename = `${safeChannelName} - ${safeProgramName}.ts`;
    const destPath = path.join(folder, filename);
    
    const recordingId = crypto.randomUUID();
    let headersVal = [];
    if (headers && Array.isArray(headers)) {
        headersVal = headers;
    }
    
    const handleProgress = (bytes) => {
        const rec = activeRecordings.get(recordingId);
        if (rec) {
            rec.bytesWritten = bytes;
        }
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('recording-status-change', {
                id: recordingId,
                status: 'recording',
                channelName,
                programName,
                filename,
                bytesWritten: bytes,
                startTime: rec ? rec.startTime : Date.now()
            });
        }
    };
    
    const handleDone = () => {
        activeRecordings.delete(recordingId);
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('recording-status-change', {
                id: recordingId,
                status: 'completed',
                channelName,
                programName,
                filename
            });
        }
    };
    
    const handleError = (err) => {
        activeRecordings.delete(recordingId);
        console.error('[DVR ERROR] Recording failed:', err.message);
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('recording-status-change', {
                id: recordingId,
                status: 'error',
                channelName,
                programName,
                filename,
                error: err.message
            });
        }
    };
    
    const download = downloadStream(channelUrl, destPath, headersVal, handleProgress, handleDone, handleError);
    
    activeRecordings.set(recordingId, {
        id: recordingId,
        channelName,
        programName,
        filename,
        destPath,
        cancel: download.cancel,
        startTime: Date.now(),
        bytesWritten: 0
    });
    
    return {
        id: recordingId,
        filename,
        status: 'recording'
    };
});

ipcMain.handle('stop-recording', (event, recordingId) => {
    console.log('[DVR IPC] Stop recording requested for id:', recordingId);
    const rec = activeRecordings.get(recordingId);
    if (rec) {
        rec.cancel();
        activeRecordings.delete(recordingId);
        return true;
    }
    return false;
});

ipcMain.handle('get-active-recordings', () => {
    const list = [];
    for (const [id, rec] of activeRecordings.entries()) {
        list.push({
            id: rec.id,
            channelName: rec.channelName,
            programName: rec.programName,
            filename: rec.filename,
            startTime: rec.startTime,
            bytesWritten: rec.bytesWritten
        });
    }
    return list;
});

ipcMain.handle('get-recordings', async () => {
    let folder = path.join(app.getPath('documents'), 'AIVueRecordings');
    try {
        const row = db.prepare("SELECT value FROM dvr_settings WHERE key = 'recording_path'").get();
        if (row && row.value) folder = row.value;
    } catch (e) {}
    
    if (!fs.existsSync(folder)) {
        return [];
    }
    
    try {
        const files = fs.readdirSync(folder);
        const list = [];
        
        // Build a set of active recording filenames to filter them out
        const activeFilenames = new Set();
        for (const rec of activeRecordings.values()) {
            if (rec.filename) {
                activeFilenames.add(rec.filename);
            }
        }

        files.forEach(f => {
            if (f.endsWith('.ts')) {
                if (activeFilenames.has(f)) {
                    return; // Skip active recordings
                }
                const filePath = path.join(folder, f);
                const stats = fs.statSync(filePath);
                list.push({
                    filename: f,
                    sizeBytes: stats.size,
                    createdTime: stats.birthtimeMs,
                    absolutePath: filePath
                });
            }
        });
        list.sort((a, b) => b.createdTime - a.createdTime);
        return list;
    } catch (e) {
        console.error('[DVR ERR] Failed to read recordings folder:', e);
        return [];
    }
});

ipcMain.handle('delete-recording', async (event, filename) => {
    let folder = path.join(app.getPath('documents'), 'AIVueRecordings');
    try {
        const row = db.prepare("SELECT value FROM dvr_settings WHERE key = 'recording_path'").get();
        if (row && row.value) folder = row.value;
    } catch (e) {}
    
    const filePath = path.join(folder, filename);
    try {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            return true;
        }
    } catch (e) {
        console.error('[DVR ERR] Failed to delete recording file:', e);
    }
    return false;
});

// ==========================================
// --- DVR RECORDINGS SCHEDULER ENGINE ---
// ==========================================

ipcMain.handle('schedule-recording', (event, channelUrl, channelName, programName, startTime, endTime, headers = []) => {
    console.log('[DVR SCHEDULER IPC] schedule-recording:', channelName, '--', programName, '-- Start:', startTime);
    try {
        if (!db) return false;
        
        const metadata = JSON.stringify({ channelName, programName, headers });
        const res = db.prepare(`
            INSERT INTO dvr_schedule (channel_url, start_time, end_time, status, file_path)
            VALUES (?, ?, ?, 'pending', ?)
        `).run(channelUrl, startTime, endTime, metadata);
        
        return res.lastInsertRowid;
    } catch (e) {
        console.error('[DB ERR] Failed to schedule recording:', e);
        return false;
    }
});

ipcMain.handle('get-scheduled-recordings', () => {
    try {
        if (!db) return [];
        const rows = db.prepare("SELECT * FROM dvr_schedule ORDER BY start_time ASC").all();
        return rows.map(r => {
            let meta = { channelName: 'Unknown', programName: 'Scheduled Program', headers: [] };
            try {
                if (r.file_path) meta = JSON.parse(r.file_path);
            } catch (e) {}
            return {
                id: r.id,
                channelUrl: r.channel_url,
                startTime: r.start_time,
                endTime: r.end_time,
                status: r.status,
                channelName: meta.channelName,
                programName: meta.programName
            };
        });
    } catch (e) {
        console.error('[DB ERR] Failed to get scheduled recordings:', e);
        return [];
    }
});

ipcMain.handle('cancel-scheduled-recording', (event, scheduleId) => {
    console.log('[DVR SCHEDULER IPC] cancel-scheduled-recording:', scheduleId);
    try {
        if (!db) return false;
        
        const row = db.prepare("SELECT * FROM dvr_schedule WHERE id = ?").get();
        if (row && row.status === 'recording') {
            const recordingId = activeScheduleRecordings.get(scheduleId);
            if (recordingId) {
                const rec = activeRecordings.get(recordingId);
                if (rec) rec.cancel();
                activeRecordings.delete(recordingId);
            }
            activeScheduleRecordings.delete(scheduleId);
        }
        
        db.prepare("DELETE FROM dvr_schedule WHERE id = ?").run(scheduleId);
        return true;
    } catch (e) {
        console.error('[DB ERR] Failed to cancel scheduled recording:', e);
        return false;
    }
});

const activeScheduleRecordings = new Map();

async function checkScheduledRecordings() {
    if (!db) return;
    
    const nowIso = new Date().toISOString();
    
    try {
        // 1. Start pending recordings whose time has arrived
        const pending = db.prepare("SELECT * FROM dvr_schedule WHERE status = 'pending' AND start_time <= ?").all(nowIso);
        for (const row of pending) {
            let meta = { channelName: 'Scheduled', programName: 'Program', headers: [] };
            try {
                if (row.file_path) meta = JSON.parse(row.file_path);
            } catch (e) {}
            
            console.log(`[DVR SCHEDULER] Starting scheduled recording: ${meta.programName} on ${meta.channelName}`);
            
            db.prepare("UPDATE dvr_schedule SET status = 'recording' WHERE id = ?").run(row.id);
            
            let folder = path.join(app.getPath('documents'), 'AIVueRecordings');
            try {
                const setting = db.prepare("SELECT value FROM dvr_settings WHERE key = 'recording_path'").get();
                if (setting && setting.value) folder = setting.value;
            } catch (e) {}
            
            if (!fs.existsSync(folder)) {
                fs.mkdirSync(folder, { recursive: true });
            }
            
            const safeChannelName = meta.channelName.replace(/[\/\\:\*\?"<>\|]/g, '_');
            const safeProgramName = meta.programName.replace(/[\/\\:\*\?"<>\|]/g, '_');
            const filename = `${safeChannelName} - ${safeProgramName}.ts`;
            const destPath = path.join(folder, filename);
            
            const recordingId = crypto.randomUUID();
            
            const startScheduledDownload = async () => {
                let activeUrl = row.channel_url;
                let cleanHeaders = [];
                let stalkerMeta = null;
                let sourceType = 'm3u';
                let xtreamMeta = null;
                
                if (meta.headers && Array.isArray(meta.headers)) {
                    meta.headers.forEach(h => {
                        if (h.startsWith('STALKER-METADATA:')) {
                            try {
                                stalkerMeta = JSON.parse(h.substring(17));
                                if (stalkerMeta && stalkerMeta.sourceType) {
                                    sourceType = stalkerMeta.sourceType;
                                }
                            } catch (e) {}
                        } else if (h.startsWith('XTREAM-METADATA:')) {
                            try {
                                xtreamMeta = JSON.parse(h.substring(16));
                                if (xtreamMeta && xtreamMeta.sourceType) {
                                    sourceType = xtreamMeta.sourceType;
                                }
                            } catch (e) {}
                        } else {
                            cleanHeaders.push(h);
                        }
                    });
                }
                
                // Dynamically resolve Xtream Codes stream URL to fresh validated PlaybackSource at START time!
                if (sourceType === 'xtream' && xtreamMeta) {
                    try {
                        console.log(`[DVR SCHEDULER] Resolving fresh Xtream Codes link for scheduled recording:`, xtreamMeta);
                        const resolvedSource = await resolveXtreamLink(
                            xtreamMeta.server,
                            xtreamMeta.username,
                            xtreamMeta.password,
                            xtreamMeta.streamId,
                            xtreamMeta.type || 'live',
                            xtreamMeta.extension || null,
                            xtreamMeta.directSourceUrl || null
                        );
                        if (resolvedSource && resolvedSource.url) {
                            activeUrl = resolvedSource.url;
                            if (resolvedSource.headers) {
                                Object.entries(resolvedSource.headers).forEach(([k, v]) => {
                                    cleanHeaders.push(`${k}: ${v}`);
                                });
                            }
                            console.log('[DVR SCHEDULER] Xtream Codes link resolved successfully to fresh URL:', activeUrl);
                        } else {
                            console.warn('[DVR SCHEDULER] Failed to resolve Xtream Codes link, falling back to original url.');
                        }
                    } catch (err) {
                        console.error('[DVR SCHEDULER] Error resolving Xtream Codes link on schedule start:', err);
                    }
                }
                
                // Dynamically resolve Stalker command to fresh absolute stream link at START time!
                if (sourceType === 'stalker' && stalkerMeta) {
                    try {
                        const parts = activeUrl.substring(12).split('|');
                        const type = parts[0];
                        const cmd = parts.slice(1).join('|');
                        
                        console.log(`[DVR SCHEDULER] Resolving fresh Stalker link for scheduled recording:`, stalkerMeta);
                        const probes = [{ type, cmd }];
                        
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
                            if (altObj.episode_num && !altObj.episode_number) altObj.episode_number = altObj.episode_num;
                            if (altObj.episode_number && !altObj.episode_num) altObj.episode_num = altObj.episode_number;

                            const asJson = JSON.stringify(altObj);
                            const asBase64 = Buffer.from(asJson).toString('base64');
                            if (cmd !== asJson) probes.push({ type, cmd: asJson });
                            if (cmd !== asBase64) probes.push({ type, cmd: asBase64 });
                        }

                        let resolvedUrl = '';
                        for (const probe of probes) {
                            console.log('[DVR SCHEDULER] create_link Probe:', probe);
                            const res = await stalkerRequest(stalkerMeta.portalUrl, stalkerMeta.mac, 'create_link', probe);
                            
                            const candidates = [
                                res?.js?.cmd,
                                res?.js?.url,
                                res?.cmd,
                                res?.url,
                                res?.stream_url,
                                Array.isArray(res?.js) ? res.js[0]?.cmd : null,
                                Array.isArray(res?.js) ? res.js[0]?.url : null
                            ];

                            for (const c of candidates) {
                                if (c && typeof c === 'string') {
                                    const cleaned = c.trim().replace(/^ffmpeg\s+/i, '');
                                    if (!cleaned.includes('stream=&')) {
                                        resolvedUrl = cleaned;
                                        break;
                                    }
                                }
                            }
                            if (resolvedUrl) break;
                        }

                        if (resolvedUrl) {
                            if (!resolvedUrl.startsWith('http')) {
                                const parsed = new URL(stalkerMeta.portalUrl);
                                resolvedUrl = `${parsed.protocol}//${parsed.host}${resolvedUrl.startsWith('/') ? '' : '/'}${resolvedUrl}`;
                            } else {
                                const parsedFinal = new URL(resolvedUrl);
                                if (parsedFinal.hostname === 'localhost' || parsedFinal.hostname === '127.0.0.1') {
                                    const parsedPortal = new URL(stalkerMeta.portalUrl);
                                    parsedFinal.protocol = parsedPortal.protocol;
                                    parsedFinal.host = parsedPortal.host;
                                    resolvedUrl = parsedFinal.href;
                                }
                            }
                            activeUrl = resolvedUrl;
                            console.log('[DVR SCHEDULER] Stalker link resolved successfully to fresh URL:', activeUrl);
                        } else {
                            console.warn('[DVR SCHEDULER] Failed to resolve Stalker link, falling back to original url.');
                        }
                    } catch (err) {
                        console.error('[DVR SCHEDULER] Error resolving stalker link on schedule start:', err);
                    }
                }
                
                try {
                    const download = downloadStream(activeUrl, destPath, cleanHeaders, handleProgress, handleDone, handleError);
                    
                    activeRecordings.set(recordingId, {
                        id: recordingId,
                        channelName: meta.channelName,
                        programName: meta.programName,
                        filename,
                        destPath,
                        cancel: download.cancel,
                        startTime: Date.now(),
                        bytesWritten: 0
                    });
                    
                    activeScheduleRecordings.set(row.id, recordingId);
                } catch (err) {
                    console.error('[DVR SCHEDULER] Failed to start downloader:', err);
                    db.prepare("UPDATE dvr_schedule SET status = 'error' WHERE id = ?").run(row.id);
                }
            };
            
            const handleProgress = (bytes) => {
                const rec = activeRecordings.get(recordingId);
                if (rec) rec.bytesWritten = bytes;
                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.webContents.send('recording-status-change', {
                        id: recordingId,
                        status: 'recording',
                        channelName: meta.channelName,
                        programName: meta.programName,
                        filename,
                        bytesWritten: bytes,
                        startTime: rec ? rec.startTime : Date.now()
                    });
                }
            };
            
            const handleDone = () => {
                activeRecordings.delete(recordingId);
                activeScheduleRecordings.delete(row.id);
                try {
                    db.prepare("UPDATE dvr_schedule SET status = 'completed' WHERE id = ?").run(row.id);
                } catch (e) {}
                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.webContents.send('recording-status-change', {
                        id: recordingId,
                        status: 'completed',
                        channelName: meta.channelName,
                        programName: meta.programName,
                        filename
                    });
                }
            };
            
            const handleError = (err) => {
                activeRecordings.delete(recordingId);
                activeScheduleRecordings.delete(row.id);
                try {
                    db.prepare("UPDATE dvr_schedule SET status = 'error' WHERE id = ?").run(row.id);
                } catch (e) {}
                console.error('[DVR SCHEDULER ERROR] Recording failed:', err.message);
                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.webContents.send('recording-status-change', {
                        id: recordingId,
                        status: 'error',
                        channelName: meta.channelName,
                        programName: meta.programName,
                        filename,
                        error: err.message
                    });
                }
            };
            
            startScheduledDownload();
        }
        
        // 2. Stop ongoing scheduled recordings whose end time has arrived
        const active = db.prepare("SELECT * FROM dvr_schedule WHERE status = 'recording' AND end_time <= ?").all(nowIso);
        for (const row of active) {
            console.log(`[DVR SCHEDULER] Ending scheduled recording id ${row.id}`);
            const recordingId = activeScheduleRecordings.get(row.id);
            if (recordingId) {
                const rec = activeRecordings.get(recordingId);
                if (rec) {
                    rec.cancel();
                }
                activeRecordings.delete(recordingId);
            }
            activeScheduleRecordings.delete(row.id);
            db.prepare("UPDATE dvr_schedule SET status = 'completed' WHERE id = ?").run(row.id);
        }
        
    } catch (e) {
        console.error('[DVR SCHEDULER LOOP ERROR]', e);
    }
}

setInterval(checkScheduledRecordings, 5000);
