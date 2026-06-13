const { app, BrowserWindow, ipcMain, dialog, Menu, MenuItem, clipboard, Tray, Notification, screen, protocol, net: electronNet } = require('electron');
const path = require('path');
const { spawn, execFile, exec } = require('child_process');
const net = require('net');
const fs = require('fs');
const crypto = require('crypto');
const https = require('https');
const http = require('http');

protocol.registerSchemesAsPrivileged([
  { scheme: 'aivue-logo', privileges: { bypassCSP: true, secure: true, corsEnabled: true, supportFetchAPI: true } }
]);

function downloadImage(url, destPath, redirectCount = 0) {
    if (redirectCount > 5) {
        return Promise.reject(new Error('Too many redirects'));
    }
    return new Promise((resolve, reject) => {
        // Ensure parent directory exists
        const dir = path.dirname(destPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        const file = fs.createWriteStream(destPath);
        const protocolLib = url.startsWith('https') ? https : http;
        
        const req = protocolLib.get(url, { headers: { 'User-Agent': 'VLC/3.0.9 LibVLC/3.0.9' }, timeout: 15000 }, (response) => {
            if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                file.close();
                fs.unlink(destPath, () => {});
                try {
                    const redirectUrl = new URL(response.headers.location, url).toString();
                    downloadImage(redirectUrl, destPath, redirectCount + 1).then(resolve).catch(reject);
                } catch (urlErr) {
                    reject(urlErr);
                }
                return;
            }
            if (response.statusCode !== 200) {
                file.close();
                fs.unlink(destPath, () => {});
                reject(new Error(`Failed to download: ${response.statusCode}`));
                return;
            }
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                resolve();
            });
        });
        
        req.on('error', (err) => {
            file.close();
            fs.unlink(destPath, () => {});
            reject(err);
        });
        
        req.on('timeout', () => {
            req.destroy();
            file.close();
            fs.unlink(destPath, () => {});
            reject(new Error('Download timeout'));
        });
    });
}

// --- Background Logo Cache System ---
// Downloads EPG logo images to local ChannelLogos/ directory and updates the DB
// so subsequent loads serve logos from disk (aivue-logo://) with zero network requests.

const logoDownloadQueue = [];
let logoDownloadRunning = false;

function queueLogoDownload(epgId, remoteUrl) {
    logoDownloadQueue.push({ epgId, remoteUrl });
    if (!logoDownloadRunning) {
        processLogoDownloadQueue();
    }
}

async function processLogoDownloadQueue() {
    if (logoDownloadQueue.length === 0) {
        logoDownloadRunning = false;
        return;
    }
    logoDownloadRunning = true;
    const { epgId, remoteUrl } = logoDownloadQueue.shift();
    try {
        const logosDir = path.join(app.getPath('userData'), 'ChannelLogos');
        if (!fs.existsSync(logosDir)) fs.mkdirSync(logosDir, { recursive: true });

        // Use MD5 of URL as filename, keep original extension
        const hash = crypto.createHash('md5').update(remoteUrl).digest('hex');
        const ext = path.extname(new URL(remoteUrl).pathname) || '.png';
        const filename = hash + ext;
        const destPath = path.join(logosDir, filename);
        const cachedUrl = 'aivue-logo://' + filename;

        if (!fs.existsSync(destPath)) {
            await downloadImage(remoteUrl, destPath);
        }

        // Update DB with cached URL
        if (db) {
            await db.prepare('UPDATE epg_logos SET cached_logo = ? WHERE epg_id = ?').run(cachedUrl, epgId);
        }
        console.log(`[Logo Cache] Cached logo for "${epgId}": ${cachedUrl}`);
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('logo-cached', { originalUrl: remoteUrl, cachedUrl });
        }
    } catch (err) {
        console.warn(`[Logo Cache] Failed to download logo for "${epgId}" (${remoteUrl}): ${err.message}`);
    }
    // Small delay between downloads to avoid rate limiting
    setTimeout(processLogoDownloadQueue, 200);
}

function normalizeName(name) {
    if (!name) return '';
    let str = name.toLowerCase();
    
    // Remove brackets and their content, e.g. [HD], (US), |UK|
    str = str.replace(/[\[\(\{\|\<].*?[\]\)\}\|\>]/g, ' ');
    
    // Remove common prefixes/suffixes/badges and quality terms
    const termsToRemove = [
        'hd', 'uhd', 'fhd', 'sd', '4k', '1080p', '720p', 'hevc', 'h264', 'h.264', '50fps', '60fps',
        'us', 'uk', 'in', 'ca', 'fr', 'es', 'de', 'it', 'mx', 'ar', 'co', 'pe', 'br', 'la', 'latam',
        'backup', 'back', 'main', 'tv', 'ch', 'channel', 'premium', 'vip', 'east', 'west', 'direct',
        'fhd', '1080', '720', 'live', 'air'
    ];
    
    // Replace non-alphanumeric with space
    str = str.replace(/[^a-z0-9]/g, ' ');
    
    // Remove terms as words
    termsToRemove.forEach(term => {
        const regex = new RegExp(`\\b${term}\\b`, 'g');
        str = str.replace(regex, ' ');
    });
    
    // Convert word numbers to digits
    const wordToDigit = {
        'zero': '0', 'one': '1', 'two': '2', 'three': '3', 'four': '4',
        'five': '5', 'six': '6', 'seven': '7', 'eight': '8', 'nine': '9', 'ten': '10'
    };
    for (const [word, digit] of Object.entries(wordToDigit)) {
        str = str.replace(new RegExp(`\\b${word}\\b`, 'g'), digit);
    }
    
    // Replace multiple spaces with a single space
    str = str.replace(/\s+/g, ' ').trim();
    
    return str;
}

// --- Logger Initialization & Error Handling ---
const logger = require('./logger');
logger.init();

// Log application startup details
console.log(`[APP] Version ${app.getVersion() || '1.0.0'} started`);
console.log(`[APP] OS: ${process.platform} (${process.arch})`);
console.log(`[APP] User data path: ${app.getPath('userData')}`);
console.log(`[APP] App installation path: ${app.getAppPath()}`);
console.log(`[APP] Resources/Base path: ${app.isPackaged ? process.resourcesPath : __dirname}`);

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
const db = require('./db.js');

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

// --- TMDB API Binds ---
const tmdb = require('./tmdb.js');

// --- Remote Control Server ---
const remoteServer = require('./remote-server.js');

ipcMain.handle('get-tmdb-config', () => tmdb.getConfig());
ipcMain.handle('save-tmdb-config', async (event, config) => tmdb.saveConfig(config));
ipcMain.handle('fetch-tmdb-by-title', async (event, { title, type }) => tmdb.fetchByTitle(title, type));
ipcMain.handle('fetch-tmdb-by-id', async (event, { tmdbId, type }) => tmdb.fetchById(tmdbId, type));
ipcMain.handle('fetch-tmdb-season-episodes', async (event, { tmdbId, seasonNumber }) => tmdb.fetchSeasonEpisodes(tmdbId, seasonNumber));

let mainWindow;
let playerWindow;
let mpvProcess;
let currentDOMBounds = null;
let ipcClient = null;
let isMpvReady = false;
let currentMpvTrackList = [];
let currentMpvAid = null;
let currentMpvSid = null;
let trackSelectorWindow = null;
let tray = null;
let lastActiveStreamData = null;
let currentMpvPath = null;
let wasPlayingBeforeTray = false;
let isQuitting = false;
let ipcConnectionAttempts = 0;
let reconnectTimer = null;
let splashWindow = null;
let nativeToastWindow = null;
let nativeToastTimer = null;
let remoteOverrideWindow = null;
let playerWindowHwnd = null;
let lastPlayerWindowShapeKey = null;
let decoderRecoveryState = {
    url: '',
    errorCount: 0,
    recoveryAttempts: 0,
    hwDisabled: false,
    lastErrorTime: 0,
    recoveryInProgress: false
};
let playerShapeProcess = null;
let playerShapeReady = false;
let pendingPlayerShapeCommands = [];
let playerShapeDebounceTimer = null;
let isMainReadyToShow = false;
let shouldShowMainWindow = false;
let isSplashEnded = false;
const ipcPath = process.platform === 'win32' ? '\\\\.\\pipe\\mpv-electron-ipc' : '/tmp/mpv-electron-ipc';

// Stability fixes for Windows GPU / sandbox issues
app.commandLine.appendSwitch('no-sandbox');
// Use software compositing only — prevents GPU compositor crashes without fully disabling
// GPU rasterization (keeps CSS gradients, animations and layout GPU-accelerated)
app.commandLine.appendSwitch('disable-gpu-compositing');
// Suppress harmless DirectComposition GPU driver warnings on Windows
app.commandLine.appendSwitch('log-level', '3'); // Suppress Chromium console spam

ipcMain.on('splash-ended', () => {
    console.log('[EVENT] splash-ended');
    isSplashEnded = true;
    shouldShowMainWindow = true; // Show window immediately when splash screen ends!
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
            const shouldStartHidden = process.argv.includes('--hidden');
            if (shouldStartHidden) {
                console.log('[STARTUP] Starting minimized to tray...');
                showTrayNotification('AIVue Player', 'App started minimized in system tray.');
                syncPlayerWindow();
                return;
            }
            mainWindow.maximize();
            mainWindow.setAlwaysOnTop(true);
            mainWindow.show();
            mainWindow.setAlwaysOnTop(false);
            mainWindow.focus();
            syncPlayerWindow();
        }
    }
}

ipcMain.on('sync-remote-search', (event, text) => {
    remoteServer.broadcastSse({ type: 'searchSync', text });
});

ipcMain.on('focus-remote-search', (event) => {
    remoteServer.broadcastSse({ type: 'focusSearch' });
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
        backgroundColor: '#10002b',
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
        setTimeout(showMainWindowAndHideSplash, 3000);
    });

    // Intercept Close Button to Hide window into System Tray
    mainWindow.on('close', (event) => {
        if (!isQuitting) {
            event.preventDefault();
            mainWindow.hide();
            showTrayNotification('AIVue Player', 'App minimized to tray. IPTV playing and recording in background.');
        } else {
            console.log('[EVENT] mainWindow close - quitting');
            if (mpvProcess) mpvProcess.kill();
            if (playerWindow && !playerWindow.isDestroyed()) playerWindow.destroy();
            if (trackSelectorWindow && !trackSelectorWindow.isDestroyed()) trackSelectorWindow.destroy();
        }
    });

    mainWindow.on('closed', () => {
        console.log('[EVENT] mainWindow closed');
        mainWindow = null;
    });

    mainWindow.on('minimize', () => {
        console.log('[EVENT] mainWindow minimize');
        syncPlayerWindow();
    });
    mainWindow.on('restore', () => {
        console.log('[EVENT] mainWindow restore');
        debouncedSyncPlayerWindow();
    });
    mainWindow.on('hide', () => {
        console.log('[EVENT] mainWindow hide');
        if (currentMpvPath && lastActiveStreamData) {
            console.log('[TRAY] Window hidden/trayed. Saving playback state and stopping playback.');
            wasPlayingBeforeTray = true;
            stopActivePlayback();
        } else {
            wasPlayingBeforeTray = false;
        }
        syncPlayerWindow();
    });
    mainWindow.on('show', () => {
        console.log('[EVENT] mainWindow show');
        debouncedSyncPlayerWindow();
    });

    // Ensure the video child window moves seamlessly when you move or resize the app
    mainWindow.on('move', () => {
        console.log('[EVENT] mainWindow move');
        debouncedSyncPlayerWindow();
        syncNativeOverlayWindows();
    });
    mainWindow.on('resize', () => {
        console.log('[EVENT] mainWindow resize');
        debouncedSyncPlayerWindow();
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

let syncPlayerWindowTimer = null;
function debouncedSyncPlayerWindow() {
    if (syncPlayerWindowTimer) {
        clearTimeout(syncPlayerWindowTimer);
    }
    syncPlayerWindowTimer = setTimeout(() => {
        syncPlayerWindowTimer = null;
        syncPlayerWindow();
    }, 16);
}

function syncPlayerWindow() {
    console.log('[SYNC] Syncing player window bounds');
    if (playerWindow && !playerWindow.isDestroyed() && mainWindow && !mainWindow.isDestroyed() && currentDOMBounds) {
        if (!isMpvReady || currentDOMBounds.width === 0 || currentDOMBounds.height === 0 || !mainWindow.isVisible() || mainWindow.isMinimized()) {
            playerWindow.setOpacity(0); // Make completely invisible (Bypasses OS bounds clamping)
            playerWindow.setBounds({ x: -10000, y: -10000, width: 10, height: 10 });
            return;
        }
        playerWindow.setOpacity(1); // Restore visibility when active

        playerWindow.setIgnoreMouseEvents(true); // Re-enforce OS click fallthrough after opacity changes
        const contentBounds = mainWindow.getContentBounds();
        const scale = currentDOMBounds.scale || 1.0;

        const physicalBounds = {
            x: Math.round(contentBounds.x + currentDOMBounds.x),
            y: Math.round(contentBounds.y + currentDOMBounds.y),
            width: Math.round(currentDOMBounds.width),
            height: Math.round(currentDOMBounds.height)
        };

        playerWindow.setBounds(physicalBounds);

        // Force repaint native surface to prevent GPU lag / black frames on resize
        playerWindow.showInactive();
        if (typeof playerWindow.invalidateShadow === 'function') {
            playerWindow.invalidateShadow();
        }

        schedulePlayerWindowShape(
            Math.round(currentDOMBounds.width * scale),
            Math.round(currentDOMBounds.height * scale),
            mainWindow.isFullScreen() ? 0 : Math.round(24 * scale)
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

function initRemoteServer() {
    remoteServer.stopRemoteServer();

    remoteServer.initRemoteServer({
        getMainWindow: () => mainWindow,
        getRemoteSettings: () => remoteSettings,
        saveRemoteSettings: (settings) => { remoteSettings = settings; },
        remoteSettingsPath,
        showRemoteOverridePrompt,
        getEpgDataFromDb,
        loadChannelsFromDb,
        getEpgLogos: getEpgLogosInternal,
        executeLoadStalkerCategory,
        sendMpvCommand: (cmd) => {
            if (ipcClient && !ipcClient.destroyed) {
                ipcClient.write(JSON.stringify({ command: cmd }) + '\n');
            }
        }
    });
}

app.whenReady().then(async () => {
    try {
        await db.initPromise;
    } catch (e) {
        console.error('[DB Ready Error] SQLite schema load failed:', e);
    }

    // Register custom protocol handler for EPG logos cached on disk
    protocol.handle('aivue-logo', (request) => {
        try {
            const url = new URL(request.url);
            const filename = decodeURIComponent(url.pathname.replace(/^\/+/, ''));
            const logosDir = path.join(app.getPath('userData'), 'ChannelLogos');
            const filePath = path.join(logosDir, filename);
            const resolvedPath = path.resolve(filePath);
            const resolvedLogosDir = path.resolve(logosDir);
            if (resolvedPath.startsWith(resolvedLogosDir) && fs.existsSync(resolvedPath)) {
                const data = fs.readFileSync(resolvedPath);
                let mimeType = 'image/png';
                if (filename.toLowerCase().endsWith('.jpg') || filename.toLowerCase().endsWith('.jpeg')) mimeType = 'image/jpeg';
                else if (filename.toLowerCase().endsWith('.gif')) mimeType = 'image/gif';
                else if (filename.toLowerCase().endsWith('.webp')) mimeType = 'image/webp';
                return new Response(data, { headers: { 'Content-Type': mimeType } });
            }
        } catch (err) {
            console.error('[Protocol Handler] Error serving cached logo:', err);
        }
        return new Response('Not Found', { status: 404 });
    });

    populateEpgLogosIfEmpty();
    createTray();
    createWindow();
    ensurePlayerShapeProcess();
    initMpv();
    initRemoteServer(); // Spin up the HTTP API server

    // Listen for display monitor metrics/DPI changes (e.g. moving between monitors)
    screen.on('display-metrics-changed', () => {
        console.log('[EVENT] Display metrics changed, triggering renderer sync.');
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('trigger-renderer-bounds-sync');
        }
    });
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
            initMpv();
        }
    });
});

app.on('before-quit', () => {
    isQuitting = true;
});

app.on('window-all-closed', () => {
    console.log('[APP] Shutdown requested (all windows closed)');
    if (isQuitting && process.platform !== 'darwin') app.quit();
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
        `--cache-secs=10`,
        `--demuxer-readahead-secs=5`,
        `--vd-lavc-dr=no`,
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
        `--stream-lavf-o=reconnect_delay_max=5`,
        `--idle=yes`,
        `--screenshot-directory=${app.getPath('pictures')}`,
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
    mpvProcess.stderr.on('data', (data) => {
        const text = data.toString();
        console.error(`[MPV ERR] ${text.trim()}`);

        // Parse for specific decoder failures (non-existing SPS, decode_slice_header, no frame!)
        if (text.includes('non-existing SPS') || text.includes('decode_slice_header') || text.includes('no frame!')) {
            const now = Date.now();
            // Reset error counter if the last error occurred more than 8 seconds ago
            if (now - decoderRecoveryState.lastErrorTime > 8000) {
                decoderRecoveryState.errorCount = 0;
            }
            decoderRecoveryState.lastErrorTime = now;
            decoderRecoveryState.errorCount++;

            console.warn(`[DECODER RECOVERY] Stream decoder issue detected (${decoderRecoveryState.errorCount}/5): ${text.trim()}`);

            if (decoderRecoveryState.errorCount >= 5 && !decoderRecoveryState.recoveryInProgress && decoderRecoveryState.url) {
                decoderRecoveryState.recoveryInProgress = true;
                decoderRecoveryState.errorCount = 0; // Reset counter for next tier
                decoderRecoveryState.recoveryAttempts++;

                if (decoderRecoveryState.recoveryAttempts === 1) {
                    // TIER 1: Silently reload the stream to request a fresh keyframe / GOP
                    console.log(`[DECODER RECOVERY] Tier 1: Forcing silent stream reload to request fresh keyframe/SPS.`);
                    if (ipcClient && !ipcClient.destroyed) {
                        ipcClient.write(JSON.stringify({ command: ["loadfile", decoderRecoveryState.url, "replace"] }) + '\n');
                    }
                    setTimeout(() => {
                        decoderRecoveryState.recoveryInProgress = false;
                    }, 5000);
                } else if (decoderRecoveryState.recoveryAttempts >= 2 && !decoderRecoveryState.hwDisabled) {
                    // TIER 2: Disable hardware acceleration dynamically and reload stream in software fallback mode
                    console.log(`[DECODER RECOVERY] Tier 2: Decoder errors persist. Switching to software decoding (hwdec=no) and reloading.`);
                    decoderRecoveryState.hwDisabled = true;
                    if (ipcClient && !ipcClient.destroyed) {
                        ipcClient.write(JSON.stringify({ command: ["set_property", "hwdec", "no"] }) + '\n');
                        ipcClient.write(JSON.stringify({ command: ["loadfile", decoderRecoveryState.url, "replace"] }) + '\n');
                    }
                    if (mainWindow && !mainWindow.isDestroyed()) {
                        mainWindow.webContents.send('show-native-toast', 'Malformed stream detected. Switched to software decoder fallback.', 4000);
                    }
                    setTimeout(() => {
                        decoderRecoveryState.recoveryInProgress = false;
                    }, 5000);
                }
            }
        }
    });

    mpvProcess.on('exit', () => {
        console.log(`[MPV] Process exited with code: ${mpvProcess ? mpvProcess.exitCode : 'unknown'}`);
        currentMpvPath = null;
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
        ipcClient.write(JSON.stringify({ command: ["observe_property", 12, "track-list"] }) + '\n');
        ipcClient.write(JSON.stringify({ command: ["observe_property", 13, "aid"] }) + '\n');
        ipcClient.write(JSON.stringify({ command: ["observe_property", 14, "sid"] }) + '\n');
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
                        if (msg.name === 'path') {
                            currentMpvPath = msg.data;
                            console.log('[MPV] Path changed to:', currentMpvPath);
                        }
                        if (msg.name === 'track-list') {
                            currentMpvTrackList = msg.data || [];
                        }
                        if (msg.name === 'aid') {
                            currentMpvAid = msg.data;
                        }
                        if (msg.name === 'sid') {
                            currentMpvSid = msg.data;
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
                    if (msg.args[0] === 'electron-select-aid') {
                        showPremiumTrackSelectorWindow('audio');
                    }
                    if (msg.args[0] === 'electron-select-sid') {
                        showPremiumTrackSelectorWindow('sub');
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
    if (data) {
        lastActiveStreamData = data;
    }
    if (data && data.url) {
        if (decoderRecoveryState.url !== data.url) {
            decoderRecoveryState.url = data.url;
            decoderRecoveryState.errorCount = 0;
            decoderRecoveryState.recoveryAttempts = 0;
            if (decoderRecoveryState.hwDisabled) {
                console.log('[DECODER RECOVERY] Resetting hwdec to auto-safe for new channel.');
                decoderRecoveryState.hwDisabled = false;
                if (ipcClient && !ipcClient.destroyed) {
                    ipcClient.write(JSON.stringify({ command: ["set_property", "hwdec", "auto-safe"] }) + '\n');
                }
            }
            decoderRecoveryState.recoveryInProgress = false;
        }
    }
    currentDOMBounds = data ? data.bounds : currentDOMBounds;
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
    debouncedSyncPlayerWindow();
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

function runParser(args, options, callback) {
    const baseDir = app.isPackaged ? process.resourcesPath : __dirname;
    const env = Object.assign({}, process.env, options.env || {});
    const scriptPath = path.join(baseDir, 'backend', 'parser.py');
    const exePath = path.join(baseDir, 'backend', 'parser.exe');
    
    if (process.platform === 'win32') {
        if (fs.existsSync(exePath)) {
            console.log(`[Parser] Running compiled parser.exe: ${exePath}`);
            const runArgs = args.slice(1);
            return execFile(exePath, runArgs, { ...options, env }, (err, stdout, stderr) => {
                if (err) {
                    console.error(`[Parser Error] Compiled parser.exe failed to run: ${err.message}`);
                    console.error(`  - Compiled path: ${exePath} (exists: ${fs.existsSync(exePath)})`);
                    console.error(`  - Falling back to Python interpreter if installed...`);
                }
                callback(err, stdout, stderr);
            });
        } else {
            console.log(`[Parser] Compiled parser.exe not found at: ${exePath}`);
        }
    }
    
    const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
    console.log(`[Parser] Running script with fallback: ${pythonCmd} ${args.join(' ')}`);
    return execFile(pythonCmd, args, { ...options, env }, (err, stdout, stderr) => {
        if (err) {
            console.error(`[Parser Error] Fallback parser run failed: ${err.message}`);
            console.error(`  - Script path: ${scriptPath} (exists: ${fs.existsSync(scriptPath)})`);
            console.error(`  - Executable path tried: ${exePath} (exists: ${fs.existsSync(exePath)})`);
            console.error(`  - App Installation / Resources: ${baseDir}`);
            console.error(`  - User Data Path: ${app.getPath('userData')}`);
        }
        callback(err, stdout, stderr);
    });
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
        runParser(args, { maxBuffer: 1024 * 1024 * 500, windowsHide: true, timeout: 120000, env }, (error, stdout, stderr) => {
            console.log(`[Backend] Python parser finished.`);
            console.timeEnd('parse-m3u');
            console.log('[IPC HANDLE] parse-m3u END');
            if (error) {
                const baseDir = app.isPackaged ? process.resourcesPath : __dirname;
                const scriptPath = path.join(baseDir, 'backend', 'parser.py');
                const exePath = path.join(baseDir, 'backend', 'parser.exe');
                console.error(`[Backend] Parser execution failed! Error details:`, error.message);
                console.error(`[Backend] Diagnostics:`);
                console.error(`  - Executable path tried: ${exePath} (Exists: ${fs.existsSync(exePath)})`);
                console.error(`  - Script path tried: ${scriptPath} (Exists: ${fs.existsSync(scriptPath)})`);
                console.error(`  - User Data Path: ${app.getPath('userData')}`);
                console.error(`  - App Installation / Resources Path: ${baseDir}`);
                console.error(`  - System Path environment: ${process.env.PATH}`);
                
                return resolve({ 
                    error: `Python Parser failed to execute.\n\n` +
                           `Error: ${error.message}\n\n` +
                           `Diagnostics:\n` +
                           `  - Tried compiled exe: ${exePath} (exists: ${fs.existsSync(exePath)})\n` +
                           `  - Tried script path: ${scriptPath} (exists: ${fs.existsSync(scriptPath)})\n` +
                           `  - App installation folder: ${baseDir}\n` +
                           `  - Logs/User data folder: ${app.getPath('userData')}\n\n` +
                           `Ensure Python is installed on your system (or compiled parser.exe is in the resources folder), and added to PATH.`
                });
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
        const baseDir = app.isPackaged ? process.resourcesPath : __dirname;
        const scriptPath = path.join(baseDir, 'backend', 'parser.py');
        
        const args = [scriptPath, '--epg-dict', epgSources || '', filterIds || ''];

        const env = Object.assign({}, process.env, { AIVUE_CACHE_DIR: cacheDir, AIVUE_FORCE_REFRESH: '0' });

        runParser(args, { maxBuffer: 1024 * 1024 * 500, windowsHide: true, timeout: 60000, env }, (error, stdout) => {
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
let epgLogosCache = {};

async function getEpgLogosInternal(epgSources) {
    console.log('[EPG LOGOS INTERNAL]', { epgSources });
    if (!epgSources) return {};
    if (epgLogosCache[epgSources]) {
        console.log('[CACHE HIT] Returning cached EPG logos');
        return epgLogosCache[epgSources];
    }
    return new Promise((resolve) => {
        const baseDir = app.isPackaged ? process.resourcesPath : __dirname;
        const scriptPath = path.join(baseDir, 'backend', 'parser.py');
        const args = [scriptPath, '--epg-logos', epgSources];
        const env = Object.assign({}, process.env, { AIVUE_CACHE_DIR: cacheDir, AIVUE_FORCE_REFRESH: '0' });
        runParser(args, { maxBuffer: 1024 * 1024 * 50, windowsHide: true, timeout: 30000, env }, (error, stdout) => {
            if (error) return resolve({});
            try {
                const rawLogos = JSON.parse(stdout);
                const lowercaseLogos = {};
                for (const [key, val] of Object.entries(rawLogos || {})) {
                    lowercaseLogos[key.toLowerCase()] = val;
                }
                epgLogosCache[epgSources] = lowercaseLogos;
                resolve(lowercaseLogos);
            } catch (e) { resolve({}); }
        });
    });
}

ipcMain.handle('get-epg-logos', async (event, epgSources) => {
    return getEpgLogosInternal(epgSources);
});

async function populateEpgLogosIfEmpty() {
    try {
        if (!db) return;
        const row = await db.prepare('SELECT COUNT(*) as count FROM epg_logos').get();
        if (row && row.count === 0) {
            console.log('[DB] epg_logos table is empty. Attempting background population from existing EPG sources...');
            
            const playlists = await db.prepare('SELECT epg_url FROM playlists').all();
            const extEpgs = await db.prepare('SELECT source_url FROM external_epgs').all();
            
            const sources = new Set();
            playlists.forEach(p => {
                const url = p.epg_url;
                if (url && url !== 'Not Configured' && !url.startsWith('stalker:') && !url.startsWith('xtream-epg:')) {
                    sources.add(url);
                }
            });
            extEpgs.forEach(e => {
                if (e.source_url && !e.source_url.startsWith('stalker:') && !e.source_url.startsWith('xtream-epg:')) {
                    sources.add(e.source_url);
                }
            });
            
            if (sources.size === 0) {
                console.log('[DB] No active EPG sources found to populate epg_logos.');
                return;
            }
            
            // Populate in background
            (async () => {
                for (const source of sources) {
                    try {
                        console.log(`[DB Background Logo Populate] Fetching logos for source: ${source}`);
                        const logoMap = await getEpgLogosInternal(source);
                        if (logoMap && Object.keys(logoMap).length > 0) {
                            const insertLogo = db.prepare(`
                                INSERT OR REPLACE INTO epg_logos (epg_id, logo_url)
                                VALUES (@epgId, @logoUrl)
                            `);
                            const logoTx = db.transaction(async (logos) => {
                                for (const [epgId, logoUrl] of Object.entries(logos)) {
                                    await insertLogo.run({ epgId: String(epgId).toLowerCase(), logoUrl });
                                }
                            });
                            await logoTx(logoMap);
                            console.log(`[DB Background Logo Populate] Successfully saved ${Object.keys(logoMap).length} logos for ${source}`);
                        }
                    } catch (err) {
                        console.error(`[DB Background Logo Populate] Failed for source ${source}:`, err.message);
                    }
                }
            })();
        }
    } catch (e) {
        console.error('[DB] Failed to check/populate epg_logos table:', e.message);
    }
}

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
            const baseDir = app.isPackaged ? process.resourcesPath : __dirname;
            const scriptPath = path.join(baseDir, 'backend', 'parser.py');
            
            const args = [scriptPath, '--epg-only', otherSources.join(',')];
            const env = Object.assign({}, process.env, { AIVUE_CACHE_DIR: cacheDir, AIVUE_FORCE_REFRESH: '0' });
            
            runParser(args, { maxBuffer: 1024 * 1024 * 100, windowsHide: true, timeout: 60000, env }, (error, stdout) => {
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
                const rows = await db.prepare(`
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

    const baseDir = app.isPackaged ? process.resourcesPath : __dirname;
    const scriptPath = path.join(baseDir, 'backend', 'parser.py');
    const env = Object.assign({}, process.env, { AIVUE_CACHE_DIR: cacheDir, AIVUE_FORCE_REFRESH: forceRefresh ? '1' : '0' });

    for (const source of sources) {
        if (source.startsWith('xtream-epg:')) {
            console.log(`[XTREAM EPG] Fetching EPG for: ${source}`);
            try {
                const playlistRow = await db.prepare('SELECT source_url FROM playlists WHERE epg_url = ?').get(source);
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
                        
                        const saveTx = db.transaction(async (epgDict) => {
                            await deleteOld.run(source);
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
                                        await insert.run({
                                            channel_id: String(streamId).toLowerCase(),
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
                        await saveTx(res.epg_data);
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
                const playlistRow = await db.prepare('SELECT source_url FROM playlists WHERE epg_url = ?').get(source);
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
                        const rows = await db.prepare(`
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
                
                // Smart Optimization: Filter EPG fetching list to only channels mapped in database plus a safety limit of unmapped ones.
                // This prevents freezing/hanging the application and getting banned/rate-limited on massive Stalker playlists (e.g. 10,000+ channels).
                let filteredStalkerChannels = [];
                try {
                    const mappedEpgIds = new Set();
                    const rows = await db.prepare('SELECT DISTINCT epg_id FROM mappings WHERE epg_id IS NOT NULL').all();
                    rows.forEach(r => mappedEpgIds.add(String(r.epg_id)));

                    let unmappedCount = 0;
                    const UNMAPPED_LIMIT = 100;
                    
                    for (const ch of stalkerChannels) {
                        const chId = String(chooseStalkerChannelId(ch));
                        if (mappedEpgIds.has(chId)) {
                            filteredStalkerChannels.push(ch);
                        } else if (unmappedCount < UNMAPPED_LIMIT) {
                            filteredStalkerChannels.push(ch);
                            unmappedCount++;
                        }
                    }
                    console.log(`[STALKER EPG] Filtered EPG fetch: total ${stalkerChannels.length} channels reduced to ${filteredStalkerChannels.length} (Mapped: ${filteredStalkerChannels.length - unmappedCount}, Unmapped safety limit: ${unmappedCount})`);
                    stalkerChannels = filteredStalkerChannels;
                } catch (filterErr) {
                    console.error('[STALKER EPG] Failed to apply smart channels filter:', filterErr);
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
                
                const saveTx = db.transaction(async (epgDict) => {
                    await deleteOld.run(source);
                    let insertCount = 0;
                    for (const [chId, progs] of Object.entries(epgDict)) {
                        for (const p of progs) {
                            await insert.run({
                                channel_id: String(chId).toLowerCase(),
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
                
                await saveTx(stalkerEpgDict);
            } catch (err) {
                console.error(`[STALKER EPG] Failed to update for ${source}:`, err);
            }
            continue;
        }

        try {
            const args = [scriptPath, '--epg-dict', source, filterIds || ''];
            const stdout = await new Promise((resolve, reject) => {
                runParser(args, { maxBuffer: 1024 * 1024 * 500, windowsHide: true, timeout: 120000, env }, (error, stdout) => {
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

            const saveTx = db.transaction(async (epgDict) => {
                await deleteOld.run(source);
                for (const [chId, progs] of Object.entries(epgDict)) {
                    for (const p of progs) {
                        await insert.run({
                            channel_id: String(chId).toLowerCase(),
                            start: p.start || '',
                            stop: p.stop || '',
                            title: p.title || '',
                            desc: p.desc || '',
                            source: source
                        });
                    }
                }
            });

            await saveTx(dict);

            // Save EPG logos for this XMLTV source
            try {
                const logoMap = await getEpgLogosInternal(source);
                if (logoMap && Object.keys(logoMap).length > 0) {
                    const insertLogo = db.prepare(`
                        INSERT OR REPLACE INTO epg_logos (epg_id, logo_url)
                        VALUES (@epgId, @logoUrl)
                    `);
                    const logoTx = db.transaction(async (logos) => {
                        for (const [epgId, logoUrl] of Object.entries(logos)) {
                            await insertLogo.run({ epgId: String(epgId).toLowerCase(), logoUrl });
                        }
                    });
                    await logoTx(logoMap);
                    console.log(`[EPG Update] Saved ${Object.keys(logoMap).length} logos for ${source}`);
                }
            } catch (logoErr) {
                console.error(`[EPG Update] Failed to save logos for ${source}:`, logoErr);
            }
        } catch (err) {
            console.error(`[EPG Update] Failed for ${source}:`, err);
        }
    }
    console.timeEnd('update-epg');
    console.log('[IPC HANDLE] update-epg END');
    return true;
});

async function getEpgDataFromDb(channelIds, startLimit, endLimit) {
    if (!db || !channelIds || channelIds.length === 0) return {};
    try {
        const result = {};
        const safeChannelIds = channelIds.filter(id => id !== null && id !== undefined).map(id => String(id).toLowerCase());
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
            
            const rows = await db.prepare(query).all(...params);
            
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

ipcMain.handle('get-epg', async (event, channelIds, startLimit, endLimit) => {
    console.log('[IPC HANDLE] get-epg START', { channelIds_count: channelIds ? channelIds.length : 0 });
    console.time('get-epg');
    const result = await getEpgDataFromDb(channelIds, startLimit, endLimit);
    console.timeEnd('get-epg');
    console.log('[IPC HANDLE] get-epg END');
    return result;
});

// Native file dialog for selecting playlists
ipcMain.handle('open-file-dialog', async (event, type = 'playlist') => {
    console.log('[IPC HANDLE] open-file-dialog', { type });
    const filters = type === 'epg'
        ? [{ name: 'XMLTV EPG files', extensions: ['xml', 'xml.gz', 'gz'] }]
        : [{ name: 'M3U Playlists', extensions: ['m3u', 'm3u8'] }];
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
        title: 'AIVue Player',
        properties: ['openFile'],
        filters
    });
    if (canceled) return [];
    return filePaths;
});

// Channels persistence
async function saveChannelsToDb(playlists) {
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

    const clearChannels = db.prepare(`DELETE FROM channels WHERE playlist_id = ?`);
    const deletePlaylist = db.prepare(`DELETE FROM playlists WHERE id = ?`);

    const saveTx = db.transaction(async (pls) => {
        const incomingIds = pls.map(p => p.id.toString());
        const existingPlaylists = await db.prepare(`SELECT id FROM playlists`).all();
        for (const row of existingPlaylists) {
            if (!incomingIds.includes(row.id)) {
                await deletePlaylist.run(row.id);
            }
        }

        for (const p of pls) {
            await insertPlaylist.run({
                id: p.id.toString(),
                name: p.name || 'Unnamed',
                source: p.source || '',
                epg: p.epg || 'Not Configured',
                disabled: p.disabled ? 1 : 0,
                exp_date: p.exp_date || null
            });

            await clearChannels.run(p.id.toString());
            
            if (p.channels && p.channels.length > 0) {
                // Bulk insert channels to prevent UI hang from event loop saturation
                await new Promise((resolve, reject) => {
                    db.native.serialize(() => {
                        const stmt = db.native.prepare(`
                            INSERT INTO channels (playlist_id, tvg_id, tvg_name, title, logo, group_name, stream_url, is_favourite, is_disabled, type)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        `);
                        
                        let errorOccurred = false;
                        let opsRemaining = p.channels.length;
                        
                        for (const c of p.channels) {
                            stmt.run([
                                p.id.toString(),
                                c.tvg_id || '',
                                c.tvg_name || '',
                                c.title || '',
                                c.logo || '',
                                c.group || '',
                                c.url || '',
                                c.favourite ? 1 : 0,
                                c.disabled ? 1 : 0,
                                c.type || 'live'
                            ], function(err) {
                                if (err && !errorOccurred) {
                                    errorOccurred = true;
                                    stmt.finalize();
                                    return reject(err);
                                }
                                opsRemaining--;
                                if (opsRemaining === 0 && !errorOccurred) {
                                    stmt.finalize();
                                    resolve();
                                }
                            });
                        }
                    });
                });
            }
        }
    });

    try {
        await saveTx(playlists);
    } catch (e) {
        console.error('[DB ERR] Transaction failed:', e);
        console.timeEnd('saveChannelsToDb');
        throw e;
    }
    
    console.timeEnd('saveChannelsToDb');
    console.log('[DB] Saving channels to database END.');
    return true;
}

ipcMain.handle('save-channels', async (event, channels) => {
    console.log('[IPC HANDLE] save-channels START', { playlist_count: channels ? channels.length : 0 });
    try {
        const result = await saveChannelsToDb(channels);
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
        
        const deleteTx = db.transaction(async (id) => {
            await deleteChannels.run(id);
            await deletePlaylist.run(id);
        });
        
        await deleteTx(playlistId.toString());
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
        await db.transaction(async () => {
            await db.prepare('DELETE FROM channels').run();
            await db.prepare('DELETE FROM playlists').run();
            await db.prepare('DELETE FROM epg').run();
            await db.prepare('DELETE FROM mappings').run();
            await db.prepare('DELETE FROM external_epgs').run();
        })();
        console.log('[IPC HANDLE] clear-all-playlists END');
        return true;
    } catch (e) {
        console.error('[DB ERR] Failed to clear all playlists:', e);
        return false;
    }
});

ipcMain.handle('get-external-epgs', async () => {
    console.log('[IPC HANDLE] get-external-epgs START');
    if (!db) return [];
    try {
        const rows = await db.prepare('SELECT source_url FROM external_epgs').all();
        console.log('[IPC HANDLE] get-external-epgs END');
        return rows.map(r => r.source_url);
    } catch (e) {
        console.error('[DB ERR] Failed to get external EPGs:', e);
        throw e;
    }
});

ipcMain.handle('add-external-epg', async (event, url) => {
    console.log('[IPC HANDLE] add-external-epg', { url });
    if (!db) return false;
    try {
        await db.prepare('INSERT OR IGNORE INTO external_epgs (source_url) VALUES (?)').run(url);
        return true;
    } catch (e) {
        return false;
    }
});

ipcMain.handle('remove-external-epg', async (event, url) => {
    console.log('[IPC HANDLE] remove-external-epg', { url });
    if (!db) return false;
    try {
        await db.prepare('DELETE FROM external_epgs WHERE source_url = ?').run(url);
        return true;
    } catch (e) {
        return false;
    }
});

async function loadChannelsFromDb() {
    try {
        if (!db) return [];
        const oldFilePath = path.join(app.getPath('userData'), 'saved_channels.json');
        
        const dbCount = await db.prepare(`SELECT COUNT(*) as count FROM playlists`).get();
        if (dbCount.count === 0 && fs.existsSync(oldFilePath)) {
            console.log("[DB] Starting with a blank database, deleting old JSON data...");
            fs.unlinkSync(oldFilePath);
            console.log("[DB] Old JSON deleted.");
        }

        const playlists = await db.prepare(`SELECT * FROM playlists`).all();
        const getChannels = db.prepare(`SELECT * FROM channels WHERE playlist_id = ?`);
        
        // Load mappings
        const mappings = {};
        try {
            const mappingsRows = await db.prepare('SELECT channel_title, epg_id FROM mappings').all();
            for (const row of mappingsRows) {
                mappings[row.channel_title] = row.epg_id;
            }
        } catch (mapErr) {
            console.error('[loadChannelsFromDb] Mappings load error:', mapErr.message);
        }

        // Load EPG logos — prefer locally cached aivue-logo:// URLs over remote URLs
        const epgLogos = {};      // epg_id -> effective logo URL (cached preferred)
        const epgLogoRemote = {}; // epg_id -> remote URL (for queuing uncached downloads)
        try {
            const epgLogosRows = await db.prepare('SELECT epg_id, logo_url, cached_logo FROM epg_logos').all();

            // Build a Set of existing cached filenames with a single readdirSync call
            // instead of calling fs.existsSync() per channel (avoids O(n) blocking disk I/O
            // which causes "Window Not Responding" on startup with large playlists)
            const logosDir = path.join(app.getPath('userData'), 'ChannelLogos');
            let cachedLogoFiles = new Set();
            try {
                if (fs.existsSync(logosDir)) {
                    cachedLogoFiles = new Set(fs.readdirSync(logosDir));
                }
            } catch (_dirErr) { /* If directory unreadable, treat all logos as uncached */ }

            for (const row of epgLogosRows) {
                const key = row.epg_id.toLowerCase();
                // If a local cached file exists on disk, use it — otherwise use remote URL
                if (row.cached_logo) {
                    const filename = row.cached_logo.replace('aivue-logo://', '');
                    if (cachedLogoFiles.has(filename)) {
                        epgLogos[key] = row.cached_logo;
                        continue;
                    }
                }
                // Fall back to remote URL and remember it for background caching
                epgLogos[key] = row.logo_url;
                if (row.logo_url) epgLogoRemote[key] = { epgId: row.epg_id, url: row.logo_url };
            }
        } catch (logoErr) {
            console.error('[loadChannelsFromDb] EPG logos load error:', logoErr.message);
        }

        const result = [];
        for (const p of playlists) {
            const pChannels = await getChannels.all(p.id);
            const mappedChannels = [];
            
            for (const c of pChannels) {
                let effectiveLogo = c.logo;
                
                // Treat Stalker portal paths (/logo/...) and other non-absolute URLs as missing logos.
                // Only real HTTP(S) URLs or our cached aivue-logo:// protocol are valid for display.
                const isValidLogoUrl = effectiveLogo &&
                    (effectiveLogo.startsWith('http://') || effectiveLogo.startsWith('https://') || effectiveLogo.startsWith('aivue-logo://'));
                
                if (!isValidLogoUrl) {
                    effectiveLogo = ''; // Reset to empty so EPG lookup triggers below
                    let matchedEpgId = mappings[c.title];
                    
                    if (!matchedEpgId) {
                        const tvgIdLow = c.tvg_id ? String(c.tvg_id).toLowerCase() : '';
                        const tvgNameLow = c.tvg_name ? String(c.tvg_name).toLowerCase() : '';
                        if (tvgIdLow && epgLogos[tvgIdLow]) {
                            matchedEpgId = tvgIdLow;
                        } else if (tvgNameLow && epgLogos[tvgNameLow]) {
                            matchedEpgId = tvgNameLow;
                        }
                    }
                    
                    if (!matchedEpgId && c.title) {
                        const normTitle = normalizeName(c.title);
                        if (normTitle) {
                            for (const epgId of Object.keys(epgLogos)) {
                                if (normalizeName(epgId) === normTitle) {
                                    matchedEpgId = epgId;
                                    break;
                                }
                            }
                        }
                    }
                    
                    if (matchedEpgId) {
                        const logoUrl = epgLogos[matchedEpgId.toLowerCase()];
                        if (logoUrl) {
                            effectiveLogo = logoUrl;
                        }
                    }
                }

                // (Removed local caching of logos, relying on Chromium's built-in caching)
                
                mappedChannels.push({
                    tvg_id: c.tvg_id,
                    tvg_name: c.tvg_name,
                    title: c.title,
                    logo: effectiveLogo,
                    group: c.group_name,
                    url: c.stream_url,
                    favourite: c.is_favourite === 1,
                    disabled: c.is_disabled === 1,
                    type: c.type || 'live'
                });
            }
            
            const logoCached = mappedChannels.filter(c => c.logo && c.logo.startsWith('aivue-logo://')).length;
            const logoRemote = mappedChannels.filter(c => c.logo && (c.logo.startsWith('http://') || c.logo.startsWith('https://'))).length;
            console.log(`[loadChannelsFromDb] Playlist "${p.name}": ${mappedChannels.length} channels, ${logoCached} cached locally, ${logoRemote} using remote URLs`);

            // Queue background downloads for any logos not yet cached locally
            // We track which epg_id's were actually used so we only download needed ones
            const usedEpgIds = new Set();
            for (const c of mappedChannels) {
                if (c.logo && (c.logo.startsWith('http://') || c.logo.startsWith('https://'))) {
                    // Find which epg_id resolved to this logo
                    for (const [key, info] of Object.entries(epgLogoRemote)) {
                        if (info.url === c.logo) {
                            if (!usedEpgIds.has(key)) {
                                usedEpgIds.add(key);
                                queueLogoDownload(info.epgId, info.url);
                            }
                        }
                    }
                }
            }

            result.push({
                id: p.id,
                name: p.name,
                source: p.source_url,
                epg: p.epg_url,
                disabled: p.is_disabled === 1,
                exp_date: p.exp_date,
                channels: mappedChannels
            });
        }
        return result;
    } catch (e) {
        console.error('[DB ERR] Failed to load channels:', e);
        throw e;
    }
}

ipcMain.handle('load-channels', async (event) => {
    console.log('[IPC HANDLE] load-channels START');
    const result = await loadChannelsFromDb();
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

async function getPortalProfile(portalUrl) {
    if (!db) return null;
    try {
        const row = await db.prepare('SELECT * FROM portal_profiles WHERE portal_url = ?').get(portalUrl);
        return row || null;
    } catch (e) {
        console.error('[DB] Failed to get portal profile:', e.message);
        return null;
    }
}

async function updatePortalProfile(portalUrl, updates) {
    if (!db) return;
    try {
        const existing = await getPortalProfile(portalUrl);
        if (!existing) {
            await db.prepare(`
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
            await db.prepare(`UPDATE portal_profiles SET ${setClause.join(', ')} WHERE portal_url = ?`).run(...params);
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
    const profile = await getPortalProfile(cleanServer);
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

                await updatePortalProfile(cleanServer, {
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
    await updatePortalProfile(cleanServer, {
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
            const response = await fetch(handshakeUrl, { headers, signal: AbortSignal.timeout(15000) });
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
            const response = await fetch(profileUrl, { headers: authHeaders, signal: AbortSignal.timeout(15000) });
            
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
        const response = await fetch(requestUrl, { headers: reqHeaders, signal: AbortSignal.timeout(15000) });
        
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
            } else {
                console.warn(`[STALKER] Retry also empty for ${action}`);
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
            if (isRetry) {
                console.log(`[STALKER] Retry succeeded for ${action}!`);
            }
            return parsed;
        } catch (err) {
            console.error(`[STALKER] Invalid JSON for ${action}`);
            if (!isRetry) {
                console.warn(`[STALKER] Retrying invalid JSON response once...`);
                stalkerTokens.delete(cacheKey);
                return stalkerRequest(baseUrl, mac, action, extraParams, true);
            } else {
                console.error(`[STALKER] Retry also failed (Invalid JSON) for ${action}`);
            }
            return {};
        }
    } catch (err) {
        console.error(`[STALKER ERR] Network error for ${action}:`, err.message);
        if (!isRetry) {
            console.warn(`[STALKER] Retrying network failure once...`);
            stalkerTokens.delete(cacheKey);
            return stalkerRequest(baseUrl, mac, action, extraParams, true);
        } else {
            console.error(`[STALKER] Retry also failed (Network error) for ${action}:`, err.message);
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
            const chunkSize = 5; // Reduced from 10 to 5 to protect overloaded Stalker portals from aggressive concurrency rate-limiting
            for (let i = 2; i <= totalPages; i += chunkSize) {
                const chunkPromises = [];
                for (let p = i; p < i + chunkSize && p <= totalPages; p++) {
                    chunkPromises.push(stalkerRequest(baseUrl, mac, action, { ...extraParams, p }));
                }
                const results = await Promise.all(chunkPromises);
                let foundAnyData = false;
                for (const res of results) {
                    if (!res || !res.js) {
                        console.warn(`[STALKER] No js payload returned`, extraParams);
                        continue;
                    }
                    let chunkData = res.js?.data || (Array.isArray(res.js) ? res.js : []);
                    if (chunkData.length > 0) {
                        foundAnyData = true;
                    }
                    allItems.push(...chunkData);
                }
                if (!foundAnyData) {
                    console.log(`[STALKER] Pagination returned no items at chunk starting page ${i}. Stopping early.`);
                    break;
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
            if (profileRes && profileRes.error) {
                console.error('[STALKER] Profile fetch returned error:', profileRes.error);
                return { error: profileRes.error };
            }
            if (profileRes && profileRes.js && profileRes.js.error) {
                console.error('[STALKER] Profile fetch returned js.error:', profileRes.js.error);
                return { error: profileRes.js.error };
            }
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
            return await db.prepare('SELECT * FROM portal_profiles').all();
        }
        return await getPortalProfile(portalUrl);
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
    epgLogosCache = {};
    cachedEpgDict = null;
    cachedEpgDictKey = '';
    
    if (db) {
        try { await db.prepare('DELETE FROM epg WHERE source_url = ?').run(url); } 
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
ipcMain.handle('get-mappings', async () => {
    console.log('[IPC HANDLE] get-mappings START');
    if (!db) return {};
    try {
        const rows = await db.prepare('SELECT channel_title, epg_id FROM mappings').all();
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

ipcMain.handle('save-mapping', async (event, title, epgId) => {
    console.log('[IPC HANDLE] save-mapping START', { title, epgId });
    if (!db) return false;
    try {
        if (epgId) {
            await db.prepare(`
                INSERT INTO mappings (channel_title, epg_id)
                VALUES (@title, @epg)
                ON CONFLICT(channel_title) DO UPDATE SET epg_id = @epg
            `).run({ title, epg: String(epgId).toLowerCase() });
        } else {
            await db.prepare('DELETE FROM mappings WHERE channel_title = ?').run(title);
        }
        console.log('[IPC HANDLE] save-mapping END');
        return true;
    } catch (e) {
        console.error('[DB ERR] Failed to save mapping:', e);
        throw e;
    }
});

ipcMain.handle('save-mappings-bulk', async (event, mappingsArray) => {
    console.log('[IPC HANDLE] save-mappings-bulk START', mappingsArray.length);
    if (!db) return false;
    try {
        const insertStmt = db.prepare(`
            INSERT INTO mappings (channel_title, epg_id)
            VALUES (@title, @epg)
            ON CONFLICT(channel_title) DO UPDATE SET epg_id = @epg
        `);
        const deleteStmt = db.prepare('DELETE FROM mappings WHERE channel_title = ?');
        
        const transaction = db.transaction(async (mappings) => {
            for (const { title, epgId } of mappings) {
                if (epgId) {
                    await insertStmt.run({ title, epg: String(epgId).toLowerCase() });
                } else {
                    await deleteStmt.run(title);
                }
            }
        });
        
        await transaction(mappingsArray);
        console.log('[IPC HANDLE] save-mappings-bulk END');
        return true;
    } catch (e) {
        console.error('[DB ERR] Failed to save mappings bulk:', e);
        throw e;
    }
});

ipcMain.handle('get-playback-progress', async (event, id) => {
    try {
        if (!db) return null;
        const row = await db.prepare("SELECT * FROM playback_progress WHERE id = ?").get(id);
        return row || null;
    } catch (e) {
        console.error('[DB ERR] Failed to get playback progress:', e);
        return null;
    }
});

ipcMain.handle('save-playback-progress', async (event, { id, tmdb_id, title, stream_url, season, episode, position, duration, completed }) => {
    try {
        if (!db) return false;
        const last_watched = new Date().toISOString();
        await db.prepare(`
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

ipcMain.handle('get-all-playback-progress', async () => {
    try {
        if (!db) return [];
        return await db.prepare("SELECT * FROM playback_progress").all();
    } catch (e) {
        console.error('[DB ERR] Failed to get all playback progress:', e);
        return [];
    }
});

ipcMain.handle('factory-reset', async () => {
    console.log('[IPC HANDLE] factory-reset START. Relaunching app.');
    try {
        if (db) await db.close(); // Safely release SQLite locks
        const dbPath = path.join(app.getPath('userData'), 'iptv.db');
        const walPath = dbPath + '-wal';
        const shmPath = dbPath + '-shm';
        if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
        if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
        if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);
        
        const cacheDir = path.join(app.getPath('userData'), 'cache');
        if (fs.existsSync(cacheDir)) {
            try {
                fs.rmSync(cacheDir, { recursive: true, force: true });
            } catch (cacheErr) {
                console.error("[DB ERR] Failed to delete cache folder:", cacheErr);
            }
        }
        
        console.log('[IPC HANDLE] factory-reset END');
        app.relaunch();
        app.quit();
        return true;
    } catch (e) {
        console.error("[DB ERR] Factory reset failed:", e);
        throw e;
    }
});

ipcMain.handle('clear-logs', () => {
    console.log('[IPC HANDLE] clear-logs START');
    try {
        const logDir = path.join(app.getPath('userData'), 'logs');
        if (fs.existsSync(logDir)) {
            const files = fs.readdirSync(logDir);
            for (const file of files) {
                const filePath = path.join(logDir, file);
                try {
                    if (fs.statSync(filePath).isFile()) {
                        fs.unlinkSync(filePath);
                    }
                } catch (unlinkErr) {
                    try {
                        // Empty the file if it's locked by the running process
                        fs.writeFileSync(filePath, '');
                    } catch (writeErr) {
                        console.error(`[LOGGER] Failed to clear locked log file ${file}:`, writeErr);
                    }
                }
            }
        }
        console.log('[IPC HANDLE] clear-logs END');
        return true;
    } catch (e) {
        console.error("[LOGGER] Clear logs failed:", e);
        return false;
    }
});

// ==========================================
// --- DVR LIVE TV CHANNELS RECORDING ENGINE ---
// ==========================================
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

ipcMain.handle('get-recording-path', async () => {
    try {
        if (!db) return path.join(app.getPath('documents'), 'AIVueRecordings');
        const row = await db.prepare("SELECT value FROM dvr_settings WHERE key = 'recording_path'").get();
        if (row && row.value) return row.value;
    } catch (e) {
        console.error('[DB ERR] Failed to read recording path settings:', e);
    }
    return path.join(app.getPath('documents'), 'AIVueRecordings');
});

ipcMain.handle('save-recording-path', async (event, targetPath) => {
    try {
        if (!db) return false;
        await db.prepare("INSERT OR REPLACE INTO dvr_settings (key, value) VALUES ('recording_path', ?)").run(targetPath);
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
        const row = await db.prepare("SELECT value FROM dvr_settings WHERE key = 'recording_path'").get();
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
        buildTrayMenu();
        showTrayNotification('Recording Completed', `Saved "${programName}" from ${channelName}`);
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
        buildTrayMenu();
        showTrayNotification('Recording Failed', `Error on "${programName}" from ${channelName}: ${err.message}`);
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
    buildTrayMenu();
    showTrayNotification('Recording Started', `Now recording "${programName}" on ${channelName}`);
    
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
        buildTrayMenu();
        showTrayNotification('Recording Stopped', `Stopped recording "${rec.programName}" on ${rec.channelName}`);
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
        const row = await db.prepare("SELECT value FROM dvr_settings WHERE key = 'recording_path'").get();
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
        const row = await db.prepare("SELECT value FROM dvr_settings WHERE key = 'recording_path'").get();
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

ipcMain.handle('schedule-recording', async (event, channelUrl, channelName, programName, startTime, endTime, headers = []) => {
    console.log('[DVR SCHEDULER IPC] schedule-recording:', channelName, '--', programName, '-- Start:', startTime);
    try {
        if (!db) return false;
        
        const metadata = JSON.stringify({ channelName, programName, headers });
        const res = await db.prepare(`
            INSERT INTO dvr_schedule (channel_url, start_time, end_time, status, file_path)
            VALUES (?, ?, ?, 'pending', ?)
        `).run(channelUrl, startTime, endTime, metadata);
        
        return res.lastInsertRowid;
    } catch (e) {
        console.error('[DB ERR] Failed to schedule recording:', e);
        return false;
    }
});

ipcMain.handle('get-scheduled-recordings', async () => {
    try {
        if (!db) return [];
        const rows = await db.prepare("SELECT * FROM dvr_schedule ORDER BY start_time ASC").all();
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

ipcMain.handle('cancel-scheduled-recording', async (event, scheduleId) => {
    console.log('[DVR SCHEDULER IPC] cancel-scheduled-recording:', scheduleId);
    try {
        if (!db) return false;
        
        const row = await db.prepare("SELECT * FROM dvr_schedule WHERE id = ?").get(scheduleId);
        if (row && row.status === 'recording') {
            const recordingId = activeScheduleRecordings.get(scheduleId);
            if (recordingId) {
                const rec = activeRecordings.get(recordingId);
                if (rec) rec.cancel();
                activeRecordings.delete(recordingId);
            }
            activeScheduleRecordings.delete(scheduleId);
        }
        
        await db.prepare("DELETE FROM dvr_schedule WHERE id = ?").run(scheduleId);
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
        const pending = await db.prepare("SELECT * FROM dvr_schedule WHERE status = 'pending' AND start_time <= ?").all(nowIso);
        for (const row of pending) {
            let meta = { channelName: 'Scheduled', programName: 'Program', headers: [] };
            try {
                if (row.file_path) meta = JSON.parse(row.file_path);
            } catch (e) {}
            
            console.log(`[DVR SCHEDULER] Starting scheduled recording: ${meta.programName} on ${meta.channelName}`);
            
            await db.prepare("UPDATE dvr_schedule SET status = 'recording' WHERE id = ?").run(row.id);
            
            let folder = path.join(app.getPath('documents'), 'AIVueRecordings');
            try {
                const setting = await db.prepare("SELECT value FROM dvr_settings WHERE key = 'recording_path'").get();
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
                    buildTrayMenu();
                    showTrayNotification('Recording Started (Scheduled)', `Now recording "${meta.programName}" on ${meta.channelName}`);
                } catch (err) {
                    console.error('[DVR SCHEDULER] Failed to start downloader:', err);
                    db.prepare("UPDATE dvr_schedule SET status = 'error' WHERE id = ?").run(row.id);
                    db.prepare("UPDATE dvr_schedule SET status = 'error' WHERE id = ?").run(row.id).catch(() => {});
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
            
            const handleDone = async () => {
                activeRecordings.delete(recordingId);
                activeScheduleRecordings.delete(row.id);
                buildTrayMenu();
                showTrayNotification('Recording Completed (Scheduled)', `Saved "${meta.programName}" from ${meta.channelName}`);
                try {
                    await db.prepare("UPDATE dvr_schedule SET status = 'completed' WHERE id = ?").run(row.id);
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
            
            const handleError = async (err) => {
                activeRecordings.delete(recordingId);
                activeScheduleRecordings.delete(row.id);
                buildTrayMenu();
                showTrayNotification('Recording Failed (Scheduled)', `Error on "${meta.programName}" from ${meta.channelName}: ${err.message}`);
                try {
                    await db.prepare("UPDATE dvr_schedule SET status = 'error' WHERE id = ?").run(row.id);
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
        const active = await db.prepare("SELECT * FROM dvr_schedule WHERE status = 'recording' AND end_time <= ?").all(nowIso);
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
            await db.prepare("UPDATE dvr_schedule SET status = 'completed' WHERE id = ?").run(row.id);
            buildTrayMenu();
        }
        
    } catch (e) {
        console.error('[DVR SCHEDULER LOOP ERROR]', e);
    }
}

setInterval(checkScheduledRecordings, 5000);

// ----------------------------------------------------
// Transparent Overlay Track Selector Window spawning
// ----------------------------------------------------
function showPremiumTrackSelectorWindow(type) {
    if (!playerWindow || playerWindow.isDestroyed()) return;
    
    // Close any existing track selector window
    if (trackSelectorWindow && !trackSelectorWindow.isDestroyed()) {
        trackSelectorWindow.destroy();
    }
    
    // Temporarily allow mouse events on the playerWindow so the child selector can be clicked!
    playerWindow.setIgnoreMouseEvents(false);
    
    const bounds = playerWindow.getBounds();
    
    trackSelectorWindow = new BrowserWindow({
        parent: playerWindow,
        show: false,
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
        transparent: true,
        frame: false,
        hasShadow: false,
        resizable: false,
        skipTaskbar: true,
        focusable: false,
        acceptFirstMouse: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    // Re-enable click fallthrough on playerWindow if the child selector gets closed/destroyed
    trackSelectorWindow.on('closed', () => {
        if (playerWindow && !playerWindow.isDestroyed()) {
            playerWindow.setIgnoreMouseEvents(true);
        }
    });

    const currentId = type === 'audio' ? currentMpvAid : currentMpvSid;
    const tracks = currentMpvTrackList || [];

    const url = `file://${__dirname}/track_selector.html?type=${type}&currentId=${currentId}&tracks=${encodeURIComponent(JSON.stringify(tracks))}`;
    trackSelectorWindow.loadURL(url);
    
    trackSelectorWindow.once('ready-to-show', () => {
        trackSelectorWindow.showInactive();
    });
}

ipcMain.on('select-mpv-track', (event, { type, id }) => {
    if (ipcClient && !ipcClient.destroyed) {
        ipcClient.write(JSON.stringify({ command: ["set_property", type === 'audio' ? 'aid' : 'sid', id] }) + '\n');
    }
    if (trackSelectorWindow && !trackSelectorWindow.isDestroyed()) {
        trackSelectorWindow.close();
    }
    if (playerWindow && !playerWindow.isDestroyed()) {
        playerWindow.setIgnoreMouseEvents(true);
    }
});

ipcMain.on('close-mpv-track-selector', () => {
    if (trackSelectorWindow && !trackSelectorWindow.isDestroyed()) {
        trackSelectorWindow.close();
    }
    if (playerWindow && !playerWindow.isDestroyed()) {
        playerWindow.setIgnoreMouseEvents(true);
    }
});

// ==========================================
// --- SYSTEM TRAY & NOTIFICATION SERVICE ---
// ==========================================

function createTray() {
    console.log('[TRAY] Initializing system tray...');
    try {
        const iconPath = path.join(__dirname, 'assets', 'logo.ico');
        if (!fs.existsSync(iconPath)) {
            console.warn('[TRAY WARNING] Tray icon not found at:', iconPath);
        }
        tray = new Tray(iconPath);
        tray.setToolTip('AIVue Player');
        
        tray.on('double-click', () => {
            restoreWindow();
        });
        
        buildTrayMenu();
    } catch (err) {
        console.error('[TRAY ERROR] Failed to create system tray:', err);
    }
}

function restoreWindow() {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    
    if (mainWindow.isMinimized()) {
        mainWindow.restore();
    }
    mainWindow.show();
    mainWindow.focus();
    syncPlayerWindow();
    syncNativeOverlayWindows();

    if (wasPlayingBeforeTray) {
        wasPlayingBeforeTray = false;
        console.log('[TRAY] Restoring from tray, sending mpv-restore-playback...');
        mainWindow.webContents.send('mpv-restore-playback');
    }
}

function stopActivePlayback() {
    if (ipcClient && !ipcClient.destroyed) {
        console.log('[TRAY] Hiding/minimizing app, stopping background active playback...');
        ipcClient.write(JSON.stringify({ command: ['stop'] }) + '\n');
    }
}

function buildTrayMenu() {
    if (!tray) return;
    try {
        const activeCount = activeRecordings.size;
        const isStartupEnabled = app.getLoginItemSettings().openAtLogin;
        
        const contextMenu = Menu.buildFromTemplate([
            {
                label: 'Open Player',
                click: restoreWindow
            },
            {
                type: 'separator'
            },
            {
                label: `Active Recordings: ${activeCount}`,
                enabled: false
            },
            {
                label: 'Scheduled Recordings',
                click: () => {
                    restoreWindow();
                    if (mainWindow && !mainWindow.isDestroyed()) {
                        mainWindow.webContents.send('open-dvr-page');
                    }
                }
            },
            {
                type: 'separator'
            },
            {
                label: 'Start with Windows',
                type: 'checkbox',
                checked: isStartupEnabled,
                click: (item) => {
                    app.setLoginItemSettings({
                        openAtLogin: item.checked,
                        args: item.checked ? ['--hidden'] : []
                    });
                    console.log(`[TRAY] Start with Windows toggled to: ${item.checked}`);
                }
            },
            {
                type: 'separator'
            },
            {
                label: 'Quit',
                click: async () => {
                    console.log('[TRAY] Quit requested. Cleaning up and exiting...');
                    isQuitting = true;
                    
                    // Cancel all active recordings
                    for (const [id, rec] of activeRecordings.entries()) {
                        try {
                            console.log(`[TRAY] Cancelling recording ID: ${id}`);
                            rec.cancel();
                        } catch (e) {
                            console.error('[TRAY] Error cancelling recording:', e);
                        }
                    }
                    activeRecordings.clear();
                    
                    if (mpvProcess) {
                        try {
                            mpvProcess.kill();
                        } catch (e) {}
                    }
                    
                    app.quit();
                }
            }
        ]);
        
        tray.setContextMenu(contextMenu);
    } catch (err) {
        console.error('[TRAY ERROR] Failed to build tray menu:', err);
    }
}

function showTrayNotification(title, message) {
    console.log(`[NOTIFICATION] ${title} - ${message}`);
    try {
        if (Notification.isSupported()) {
            const notif = new Notification({
                title: title,
                body: message,
                icon: path.join(__dirname, 'assets', 'logo.ico')
            });
            notif.show();
        } else {
            console.warn('[NOTIFICATION WARNING] Native HTML5 notifications are not supported on this platform');
        }
    } catch (err) {
        console.error('[NOTIFICATION ERROR] Failed to display notification:', err);
    }
}
