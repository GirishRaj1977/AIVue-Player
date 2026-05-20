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
        app.get('/stop', (req, res) => { sendMpvCommand(['stop']); res.send('OK'); });
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

        // ------------------ Unified Command API ------------------
        app.get('/cmd/:command', (req, res) => {
            const cmd = req.params.command;
            switch(cmd) {
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
button{ border:none; border-radius:12px; background:#1e293b; color:white; font-size:16px; font-weight:600; height:50px; cursor:pointer; transition:.15s; }
button:active{ transform:scale(.95); }
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
        <button class="top-btn" data-cmd="guide" style="background:#eab308; display:flex; align-items:center; justify-content:center;">
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
    btn.addEventListener('click', () => {
        const cmd = btn.dataset.cmd;
        fetch('/cmd/' + cmd).catch(e => console.error(e));
        if(navigator.vibrate) navigator.vibrate(50);
    });
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