const { app, BrowserWindow, ipcMain, dialog, Menu, MenuItem } = require('electron');
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
    console.log("[DB] SQLite Database initialized at", dbPath);
} catch (err) {
    console.warn("[DB] better-sqlite3 not installed yet. Run 'npm install better-sqlite3'.");
}

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
const ipcPath = process.platform === 'win32' ? '\\\\.\\pipe\\mpv-electron-ipc' : '/tmp/mpv-electron-ipc';

// Fix for "Network service crashed" on Windows (disables Chromium sandbox and HW acceleration)
app.commandLine.appendSwitch('no-sandbox');
app.disableHardwareAcceleration();
// Suppress harmless DirectComposition GPU driver warnings on Windows
app.commandLine.appendSwitch('log-level', '3'); // Suppress Chromium console spam

function showMainWindowAndHideSplash() {
    shouldShowMainWindow = true;
    if (isMainReadyToShow) {
        if (splashWindow && !splashWindow.isDestroyed()) {
            splashWindow.destroy();
        }
        if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isVisible()) {
            mainWindow.show();
        }
    }
}

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
        icon: path.join(__dirname, 'assets', 'logo.ico')
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
        if (shouldShowMainWindow) {
            showMainWindowAndHideSplash();
        }
        
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
        if (!isMpvReady || currentDOMBounds.width === 0 || currentDOMBounds.height === 0) {
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

app.whenReady().then(() => {
    createWindow();
    initMpv();
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
        `--script-opts=modernz-osc_on_start=yes,modernz-bottomhover=no,modernz-window_controls=no,modernz-playlist_button=no,modernz-info_button=no,modernz-ontop_button=no,modernz-jump_buttons=no,modernz-chapter_skip_buttons=no,modernz-track_nextprev_buttons=yes`,
        `--input-cursor=yes`,   
        `--input-vo-keyboard=yes`, 
        `--osc=no`,             
        `--demuxer-lavf-analyzeduration=20`,
        `--demuxer-lavf-probescore=100`,
        `--keep-open=yes`,
        `--prefetch-playlist=yes`,
        `--stream-lavf-o=reconnect=1`,
        `--stream-lavf-o=reconnect_streamed=1`,
        `--idle=yes` 
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

    if (ipcClient && !ipcClient.destroyed) {
        console.log('[MPV IPC SEND]', JSON.stringify({ command: ["loadfile", data.url, "replace"] }));
        ipcClient.write(JSON.stringify({ command: ["loadfile", data.url, "replace"] }) + '\n');
    } else {
        setTimeout(() => {
            if (ipcClient && !ipcClient.destroyed) {
                console.log('[MPV IPC SEND]', JSON.stringify({ command: ["loadfile", data.url, "replace"] }));
                ipcClient.write(JSON.stringify({ command: ["loadfile", data.url, "replace"] }) + '\n');
            }
        }, 1500);
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
    return new Promise((resolve) => {
        const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
        const baseDir = app.isPackaged ? process.resourcesPath : __dirname;
        const scriptPath = path.join(baseDir, 'backend', 'parser.py');
        
        const args = [scriptPath, '--epg-only', epgSources || ''];

        const env = Object.assign({}, process.env, { AIVUE_CACHE_DIR: cacheDir, AIVUE_FORCE_REFRESH: '0' });

        execFile(pythonCmd, args, { maxBuffer: 1024 * 1024 * 100, windowsHide: true, env }, (error, stdout) => {
            if (error) return resolve([]);
            try { resolve(JSON.parse(stdout)); } 
            catch (e) { resolve([]); }
        });
    });
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

ipcMain.handle('get-epg', (event, channelIds) => {
    console.log('[IPC HANDLE] get-epg START', { channelIds_count: channelIds ? channelIds.length : 0 });
    console.time('get-epg');
    if (!db || !channelIds || channelIds.length === 0) {
        console.timeEnd('get-epg');
        return {};
    }
    try {
        const result = {};
        // SQLite has a limit on bind variables, process array elements in safe chunks
        const chunkSize = 900;
        for (let i = 0; i < channelIds.length; i += chunkSize) {
            const chunk = channelIds.slice(i, i + chunkSize);
            const placeholders = chunk.map(() => '?').join(',');
            const query = `SELECT channel_id, start_time, stop_time, title, description FROM epg WHERE channel_id IN (${placeholders}) ORDER BY start_time ASC`;
            const rows = db.prepare(query).all(...chunk);
            
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
        console.timeEnd('get-epg');
        console.log('[IPC HANDLE] get-epg END');
        return result;
    } catch (e) {
        console.error('[DB ERR] Failed to get EPG:', e);
        console.timeEnd('get-epg');
        throw e;
    }
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
        INSERT INTO playlists (id, name, source_url, epg_url, is_disabled)
        VALUES (@id, @name, @source, @epg, @disabled)
        ON CONFLICT(id) DO UPDATE SET
            name = @name,
            source_url = @source,
            epg_url = @epg,
            is_disabled = @disabled
    `);

    const insertChannel = db.prepare(`
        INSERT INTO channels (playlist_id, tvg_id, tvg_name, title, logo, group_name, stream_url, is_favourite, is_disabled)
        VALUES (@playlist_id, @tvg_id, @tvg_name, @title, @logo, @group_name, @stream_url, @is_favourite, @is_disabled)
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
                disabled: p.disabled ? 1 : 0
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
                        is_disabled: c.disabled ? 1 : 0
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

ipcMain.handle('load-channels', (event) => {
    console.log('[IPC HANDLE] load-channels START');
    console.time('load-channels');
    try {
        if (!db) {
            console.timeEnd('load-channels');
            return []; // Fallback if DB failed to load
        }
        const oldFilePath = path.join(app.getPath('userData'), 'saved_channels.json');
        const bakFilePath = path.join(app.getPath('userData'), 'saved_channels.json.bak');
        
        // Migration Check: If DB is empty but JSON exists, delete it
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
                disabled: c.is_disabled === 1
            }));
            
            result.push({
                id: p.id,
                name: p.name,
                source: p.source_url,
                epg: p.epg_url,
                disabled: p.is_disabled === 1,
                channels: pChannels
            });
        }
        console.timeEnd('load-channels');
        console.log('[IPC HANDLE] load-channels END');
        return result;
    } catch (e) {
        console.error('[DB ERR] Failed to load channels:', e);
        console.timeEnd('load-channels');
        throw e;
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