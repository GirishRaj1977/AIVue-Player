const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { app } = require('electron');
const db = require('./db.js');
const tmdb = require('./tmdb.js');

let expressServer = null;
let sseClients = [];

function broadcastSse(data) {
    sseClients.forEach(c => {
        try {
            c.write(`data: ${JSON.stringify(data)}\n\n`);
        } catch (e) {
            console.error('[REMOTE SSE ERR] Failed to write to client:', e.message);
        }
    });
}

function stopRemoteServer() {
    if (expressServer) {
        expressServer.close();
        expressServer = null;
        console.log('[REMOTE] Express server stopped.');
    }
    sseClients = [];
}

function initRemoteServer(options) {
    stopRemoteServer();

    const remoteSettings = options.getRemoteSettings();
    if (!remoteSettings || !remoteSettings.enabled) return;

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

            const currentSettings = options.getRemoteSettings();
            if (!currentSettings || !currentSettings.enabled) {
                return res.status(403).send('Remote control is disabled in Settings.');
            }

            // Sync query parameters (token / deviceId) to cookies so that sub-pages/API calls are fully authorized in WebViews
            if (req.query.deviceId) {
                res.cookie('aivue_device_id', req.query.deviceId, { maxAge: 31536000000, httpOnly: true });
                req.headers.cookie = (req.headers.cookie || '') + `; aivue_device_id=${req.query.deviceId}`;
            }
            if (req.query.token && currentSettings.password && req.query.token === currentSettings.password) {
                const expectedAuth = Buffer.from((currentSettings.username || 'aivue') + ':' + currentSettings.password).toString('base64');
                res.cookie('aivue_auth', expectedAuth, { maxAge: 31536000000, httpOnly: true });
                req.headers.cookie = (req.headers.cookie || '') + `; aivue_auth=${expectedAuth}`;
            }

            if (currentSettings.username && currentSettings.password) {
                const expectedAuth = Buffer.from(currentSettings.username + ':' + currentSettings.password).toString('base64');
                const authCookie = getCookie(req, 'aivue_auth');

                // Support legacy basic auth (for the auto-login URL)
                const b64auth = (req.headers.authorization || '').split(' ')[1] || '';
                const [login, password] = Buffer.from(b64auth, 'base64').toString().split(':');
                const isBasicAuthValid = (login === currentSettings.username && password === currentSettings.password);

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
                deviceId = crypto.randomUUID();
                res.cookie('aivue_device_id', deviceId, { maxAge: 31536000000, httpOnly: true });
            }

            console.log(`[REMOTE API] Current Device ID: ${deviceId} | Active Paired Device: ${currentSettings.activeDeviceId}`);

            if (req.path === '/manifest.json' || req.path === '/icon.svg' || req.path === '/sw.js' || req.path === '/login' || req.path === '/favicon.ico' || req.path === '/player.png') {
                console.log(`[REMOTE API] Bypassing device lock for public path: ${req.path}`);
                return next();
            }

            if (!currentSettings.activeDeviceId) {
                console.log(`[REMOTE API] No active device found. Requiring pairing via login.`);
                res.clearCookie('aivue_auth');
                return res.redirect('/login');
            } else if (currentSettings.activeDeviceId !== deviceId) {
                console.log(`[REMOTE API] Device mismatch detected. (Current: ${deviceId}, Active: ${currentSettings.activeDeviceId})`);
                if (pendingDevicePrompt) {
                    console.log(`[REMOTE API] Toast prompt already pending. Sending wait message.`);
                    return res.status(403).send('<html style="background:#121212;color:white;font-family:sans-serif;text-align:center;padding:50px;"><h2>Access Denied</h2><p>Waiting for pairing approval on PC...</p></html>');
                }
                pendingDevicePrompt = true;
                let response = 1;
                const mainWindow = options.getMainWindow();
                if (mainWindow && !mainWindow.isDestroyed()) {
                    console.log(`[REMOTE API] Triggering new device override toast on PC.`);
                    const allowOverride = await options.showRemoteOverridePrompt();
                    console.log(`[REMOTE API] PC user responded to toast: ${allowOverride ? 'Allow' : 'Deny'}`);
                    response = allowOverride ? 0 : 1;
                }
                pendingDevicePrompt = false;

                if (response === 0) {
                    console.log(`[REMOTE API] New device allowed. Overriding active device.`);
                    currentSettings.activeDeviceId = deviceId;
                    options.saveRemoteSettings(currentSettings);
                    try { fs.writeFileSync(options.remoteSettingsPath, JSON.stringify(currentSettings)); } catch (e) { }
                    const mw = options.getMainWindow();
                    if (mw && !mw.isDestroyed()) mw.webContents.send('remote-settings-updated');
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
            const mw = options.getMainWindow();
            if (mw && !mw.isDestroyed()) {
                mw.webContents.send('remote-search', text);
            }
            res.send('OK');
        });

        app.get('/login', (req, res) => {
            const currentSettings = options.getRemoteSettings();
            if (!currentSettings.username || !currentSettings.password) {
                // Auto-pair on connect if password protection is disabled!
                let deviceId = getCookie(req, 'aivue_device_id');
                if (deviceId) {
                    currentSettings.activeDeviceId = deviceId;
                    options.saveRemoteSettings(currentSettings);
                    try { fs.writeFileSync(options.remoteSettingsPath, JSON.stringify(currentSettings)); } catch (e) { }
                    const mw = options.getMainWindow();
                    if (mw && !mw.isDestroyed()) mw.webContents.send('remote-settings-updated');
                }
                return res.redirect('/remote');
            }

            const expectedAuth = Buffer.from(currentSettings.username + ':' + currentSettings.password).toString('base64');
            let deviceId = getCookie(req, 'aivue_device_id');

            // If already logged in AND activeDeviceId matches, redirect directly to remote
            if (getCookie(req, 'aivue_auth') === expectedAuth && currentSettings.activeDeviceId === deviceId) {
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
<h2>AIVue Remote Login</h2>
<input type="text" name="username" placeholder="Username" required autofocus>
<input type="password" name="password" placeholder="Password" required>
<button type="submit">Sign In</button>
</form>
</body>
</html>`);
        });

        app.post('/login', (req, res) => {
            const currentSettings = options.getRemoteSettings();
            const { username, password } = req.body;
            if (username === currentSettings.username && password === currentSettings.password) {
                const expectedAuth = Buffer.from(currentSettings.username + ':' + currentSettings.password).toString('base64');
                res.cookie('aivue_auth', expectedAuth, { maxAge: 31536000000, httpOnly: true });

                // Pair this device on login
                let deviceId = getCookie(req, 'aivue_device_id');
                if (!deviceId) {
                    deviceId = crypto.randomUUID();
                    res.cookie('aivue_device_id', deviceId, { maxAge: 31536000000, httpOnly: true });
                }
                currentSettings.activeDeviceId = deviceId;
                options.saveRemoteSettings(currentSettings);
                try { fs.writeFileSync(options.remoteSettingsPath, JSON.stringify(currentSettings)); } catch (e) { }
                const mw = options.getMainWindow();
                if (mw && !mw.isDestroyed()) mw.webContents.send('remote-settings-updated');

                res.redirect('/remote');
            } else {
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
<h2>AIVue Remote Login</h2>
<div class="err">Invalid credentials, please try again.</div>
<input type="text" name="username" placeholder="Username" required autofocus>
<input type="password" name="password" placeholder="Password" required>
<button type="submit">Sign In</button>
</form>
</body>
</html>`);
            }
        });

        // ------------------ API Endpoints ------------------
        app.get('/api/channels', async (req, res) => {
            try {
                const playlists = await options.loadChannelsFromDb();
                let list = [];
                playlists.forEach(p => {
                    if (p.channels && !p.disabled) {
                        list.push(...p.channels.filter(c => !c.disabled && c.type === 'live').map(c => {
                            let logoUrl = c.logo || '';
                            if (logoUrl && logoUrl.startsWith('aivue-logo://')) {
                                // Strip 'aivue-logo://' (2 slashes) or 'aivue-logo:///' (3 slashes)
                                const filename = logoUrl.replace(/^aivue-logo:\/\/\/?/, '');
                                logoUrl = `/api/logo/${filename}`;
                            }
                            return { ...c, logo: logoUrl, playlistId: p.id, playlistName: p.name, source: p.source, epg: p.epg };
                        }));
                    }
                });
                res.json(list);
            } catch (e) {
                res.status(500).json({ error: 'Failed to load channels' });
            }
        });

        app.get('/api/logo/:filename', (req, res) => {
            const filename = req.params.filename;
            const logosDir = path.join(app.getPath('userData'), 'ChannelLogos');
            const filePath = path.join(logosDir, filename);
            if (filePath.startsWith(logosDir) && fs.existsSync(filePath)) {
                res.sendFile(filePath);
            } else {
                res.status(404).send('Not Found');
            }
        });

        app.get('/api/mappings', async (req, res) => {
            try {
                if (!db) return res.json({});
                const rows = await db.prepare("SELECT * FROM mappings").all();
                const map = rows.reduce((acc, r) => {
                    acc[r.channel_title] = r.epg_id;
                    return acc;
                }, {});
                res.json(map);
            } catch (e) {
                res.status(500).json({ error: 'Failed to get mappings' });
            }
        });

        app.post('/api/epg', async (req, res) => {
            const { ids, start, end } = req.body;
            if (!ids || !Array.isArray(ids) || ids.length === 0) {
                return res.json({});
            }
            const epgData = await options.getEpgDataFromDb(ids, start, end);
            res.json(epgData);
        });

        app.get('/api/epg-logos', async (req, res) => {
            try {
                const playlists = await options.loadChannelsFromDb();
                const epgSources = [...new Set(
                    playlists.map(p => p.epg).filter(e =>
                        e && e !== 'Not Configured' && !e.startsWith('stalker:') && !e.startsWith('xtream-epg:')
                    )
                )].join(',');
                if (!epgSources) return res.json({});
                const logos = await options.getEpgLogos(epgSources);
                res.json(logos || {});
            } catch (e) {
                console.error('[REMOTE] /api/epg-logos error:', e.message);
                res.json({});
            }
        });
        app.get('/api/reminders', (req, res) => {
            res.json([]);
        });

        app.post('/api/toggle-reminder', (req, res) => {
            res.json({ success: true });
        });
        app.post('/api/play', (req, res) => {
            const { url, title, position, type, tmdbId, season, episodeNum } = req.body;
            const mw = options.getMainWindow();
            if (mw && !mw.isDestroyed() && url && title) {
                if (mw.isMinimized()) mw.restore();
                mw.focus();
                mw.webContents.send('remote-play-channel', { url, title, position, type, tmdbId, season, episodeNum });
            }
            res.send('OK');
        });

        app.get('/api/movies', async (req, res) => {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
            const playlists = await options.loadChannelsFromDb();
            let movies = [];
            playlists.forEach(p => {
                if (p.channels && !p.disabled) {
                    movies.push(...p.channels.filter(c => !c.disabled && (c.type === 'movie' || c.type === 'movie_category')).map(c => {
                        let logoUrl = c.logo || '';
                        if (logoUrl && logoUrl.startsWith('aivue-logo://')) {
                            const filename = logoUrl.replace(/^aivue-logo:\/\/\/?/, '');
                            logoUrl = `/api/logo/${filename}`;
                        }
                        return { ...c, logo: logoUrl, playlistId: p.id, playlistName: p.name, source: p.source, epg: p.epg };
                    }));
                }
            });
            res.json(movies);
        });

        app.get('/api/series', async (req, res) => {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
            const playlists = await options.loadChannelsFromDb();
            let series = [];
            playlists.forEach(p => {
                if (p.channels && !p.disabled) {
                    series.push(...p.channels.filter(c => !c.disabled && (c.type === 'series' || c.type === 'series_category' || c.type === 'vod' || c.type === 'vod_category' || c.group === 'Series Categories')).map(c => {
                        let logoUrl = c.logo || '';
                        if (logoUrl && logoUrl.startsWith('aivue-logo://')) {
                            const filename = logoUrl.replace(/^aivue-logo:\/\/\/?/, '');
                            logoUrl = `/api/logo/${filename}`;
                        }
                        return { ...c, logo: logoUrl, playlistId: p.id, playlistName: p.name, source: p.source, epg: p.epg };
                    }));
                }
            });
            res.json(series);
        });

        app.get('/api/tmdb/search', async (req, res) => {
            const { title, type } = req.query;
            if (!title) return res.status(400).json({ error: 'Title is required' });
            try {
                const result = await tmdb.fetchByTitle(title, type);
                res.json(result);
            } catch (e) {
                res.status(500).json({ error: e.message });
            }
        });

        app.get('/api/tmdb/details', async (req, res) => {
            const { id, type } = req.query;
            if (!id) return res.status(400).json({ error: 'ID is required' });
            try {
                const result = await tmdb.fetchById(id, type);
                res.json(result);
            } catch (e) {
                res.status(500).json({ error: e.message });
            }
        });

        app.get('/api/tmdb/season', async (req, res) => {
            const { id, season } = req.query;
            if (!id || !season) return res.status(400).json({ error: 'ID and season required' });
            try {
                const result = await tmdb.fetchSeasonEpisodes(id, season);
                res.json(result);
            } catch (e) {
                res.status(500).json({ error: e.message });
            }
        });

        app.get('/api/progress', async (req, res) => {
            const { id } = req.query;
            if (!id) return res.status(400).json({ error: 'ID required' });
            try {
                const row = await db.prepare("SELECT * FROM playback_progress WHERE id = ?").get(id);
                res.json(row || null);
            } catch (e) {
                res.status(500).json({ error: e.message });
            }
        });

        app.post('/api/load-stalker-category', async (req, res) => {
            try {
                const data = await options.executeLoadStalkerCategory(req.body);
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
                    <script>
                    if (window.location.username || window.location.password) {
                        const cleanUrl = window.location.protocol + '//' + window.location.host + window.location.pathname + window.location.search + window.location.hash;
                        window.location.replace(cleanUrl);
                    }
                    </script>
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
                    
                    <script>
                    if ('serviceWorker' in navigator) {
                        navigator.serviceWorker.getRegistrations().then(registrations => {
                            if (registrations.length > 0) {
                                Promise.all(registrations.map(r => r.unregister())).then(() => {
                                    window.location.reload();
                                });
                            }
                        });
                    }
                    </script>
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
                    <script>
                    if (window.location.username || window.location.password) {
                        const cleanUrl = window.location.protocol + '//' + window.location.host + window.location.pathname + window.location.search + window.location.hash;
                        window.location.replace(cleanUrl);
                    }
                    </script>
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
                    
                    <script>
                    if ('serviceWorker' in navigator) {
                        navigator.serviceWorker.getRegistrations().then(registrations => {
                            if (registrations.length > 0) {
                                Promise.all(registrations.map(r => r.unregister())).then(() => {
                                    window.location.reload();
                                });
                            }
                        });
                    }
                    </script>
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
            } catch (e) {
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
            } catch (e) {
                res.status(404).send('console.error("remote_movies.js not found");');
            }
        });

        // ------------------ Unified Command API ------------------
        app.get('/cmd/:command', (req, res) => {
            const cmd = req.params.command;
            const mw = options.getMainWindow();
            switch (cmd) {
                case 'guide':
                    res.redirect('/epg');
                    return;
                case 'playpause': options.sendMpvCommand(['cycle', 'pause']); break;
                case 'mute': options.sendMpvCommand(['cycle', 'mute']); break;
                case 'volup': options.sendMpvCommand(['add', 'volume', 5]); break;
                case 'voldown': options.sendMpvCommand(['add', 'volume', -5]); break;
                case 'forward': options.sendMpvCommand(['seek', 30]); break;
                case 'rewind': options.sendMpvCommand(['seek', -30]); break;
                case 'chup':
                    if (mw && !mw.isDestroyed()) mw.webContents.send('mpv-next-channel');
                    break;
                case 'chdown':
                    if (mw && !mw.isDestroyed()) mw.webContents.send('mpv-previous-channel');
                    break;
                case 'power': case 'home': case 'back': case 'favorites':
                case 'up': case 'down': case 'left': case 'right': case 'ok': case 'search':
                case 'livetv': case 'playlist': case 'settings': case 'fullscreen': case 'vod':
                    if (mw && !mw.isDestroyed()) mw.webContents.send('remote-action', cmd);
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
            res.send("self.addEventListener('install', e => self.skipWaiting());\nself.addEventListener('activate', e => e.waitUntil(clients.claim()));\nself.addEventListener('fetch', e => {\n    const url = new URL(e.request.url);\n    if (url.pathname.startsWith('/cmd/') || url.pathname.startsWith('/api/') || url.pathname === '/search' || url.pathname === '/events') {\n        e.respondWith(fetch(e.request));\n        return;\n    }\n    e.respondWith(fetch(e.request).catch(() => new Response('AIVue Remote is offline.')));\n});");
        });

        app.get('/icon.svg', (req, res) => {
            res.setHeader('Content-Type', 'image/svg+xml');
            res.send('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="112" fill="#7c3aed"/><text x="50%" y="50%" font-family="Arial, sans-serif" font-size="240" font-weight="bold" fill="white" dominant-baseline="central" text-anchor="middle">AV</text></svg>');
        });

        // ------------------ Web UI Remote ------------------
        app.get('/remote', (req, res) => {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
            res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
<script>
if (window.location.username || window.location.password) {
    const cleanUrl = window.location.protocol + '//' + window.location.host + window.location.pathname + window.location.search + window.location.hash;
    window.location.replace(cleanUrl);
}
</script>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<meta name="theme-color" content="#0f172a">
<link rel="icon" href="/favicon.ico" type="image/x-icon">
<link rel="manifest" href="/manifest.json" crossorigin="use-credentials">
<link rel="apple-touch-icon" href="/icon.svg">
<title>AIVue Remote</title>
<style>
*{ margin:0; padding:0; box-sizing:border-box; -webkit-tap-highlight-color:transparent; }
body{ background:#0B0F19; font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color:#E2E8F0; min-height:100vh; display:flex; justify-content:center; align-items:center; padding:16px; overflow-x:hidden; }
.remote{ width:100%; max-width:390px; display:flex; flex-direction:column; gap:16px; margin:auto; }
.row{ display:grid; gap:10px; }
.row-4{ grid-template-columns:repeat(4,1fr); }
.row-3{ grid-template-columns:repeat(3,1fr); }
.row-2{ grid-template-columns:repeat(2,1fr); }
button, a.top-btn { border:none; border-radius:16px; background:#1A2035; color:#E2E8F0; font-size:15px; font-weight:600; height:54px; cursor:pointer; transition:all 0.15s ease; text-decoration:none; display:flex; align-items:center; justify-content:center; box-shadow: 0 4px 12px rgba(0,0,0,0.15); border: 1px solid rgba(255,255,255,0.03); }
button:active, a.top-btn:active { transform:scale(.95); background:#232A46; }
.top-btn{ height:48px; border-radius:14px; }
.power{ background:linear-gradient(135deg, #EF4444, #DC2626); color:white; box-shadow: 0 4px 14px rgba(239, 68, 68, 0.25); }
.power:active{ background:#B91C1C; }
.secondary{ background:#2A334D; }
.header-img{ display:block; margin:0 auto; max-height:100px; min-height:80px; max-width:100%; object-fit:contain; filter: drop-shadow(0 8px 16px rgba(124, 58, 237, 0.25)); }

/* Circular D-Pad Styling */
.dpad-container {
    display: flex;
    justify-content: center;
    align-items: center;
    margin: 10px 0;
}
.dpad-wheel {
    position: relative;
    width: 220px;
    height: 220px;
    background: radial-gradient(circle, #1A2035 40%, #101424 100%);
    border-radius: 50%;
    border: 2px solid rgba(124, 58, 237, 0.35);
    box-shadow: 0 10px 30px rgba(0,0,0,0.4), inset 0 2px 8px rgba(255,255,255,0.05);
    display: flex;
    justify-content: center;
    align-items: center;
}
.dpad-btn {
    position: absolute;
    background: transparent;
    border: none;
    color: #94A3B8;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.12s ease;
    box-shadow: none;
    border-radius: 0;
}
.dpad-btn:active {
    color: #A78BFA;
    transform: scale(0.9);
}
.dpad-btn.up {
    top: 12px;
    left: 50%;
    transform: translateX(-50%);
    width: 60px;
    height: 50px;
}
.dpad-btn.right {
    top: 50%;
    right: 12px;
    transform: translateY(-50%);
    width: 50px;
    height: 60px;
}
.dpad-btn.down {
    bottom: 12px;
    left: 50%;
    transform: translateX(-50%);
    width: 60px;
    height: 50px;
}
.dpad-btn.left {
    top: 50%;
    left: 12px;
    transform: translateY(-50%);
    width: 50px;
    height: 60px;
}
.dpad-btn.ok {
    position: relative;
    width: 84px;
    height: 84px;
    background: linear-gradient(135deg, #7C3AED, #4F46E5);
    color: white;
    border-radius: 50%;
    font-size: 18px;
    font-weight: bold;
    box-shadow: 0 6px 20px rgba(124, 58, 237, 0.4);
    border: 1px solid rgba(255, 255, 255, 0.15);
}
.dpad-btn.ok:active {
    transform: scale(0.95);
    background: #6D28D9;
}
</style>
</head>
<body>
<div class="remote">
    <!-- Search -->
    <input type="text" id="remoteSearchBox" placeholder="Search channels..." autocomplete="off" style="width:100%; padding:14px; border-radius:14px; border:none; background:#1A2035; color:white; font-size:16px; outline:none; text-align:center; margin-bottom: 2px; border: 1px solid rgba(255,255,255,0.03); box-shadow: 0 4px 10px rgba(0,0,0,0.15);">
    <!-- Top Buttons -->
    <div class="row row-4">
        <button class="top-btn" data-cmd="livetv" style="background:linear-gradient(135deg, #EF4444, #DC2626); display:flex; align-items:center; justify-content:center;">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M21,3H3C1.89,3 1,3.89 1,5V17A2,2 0 0,0 3,19H8V21H16V19H21A2,2 0 0,0 23,17V5C23,3.89 22.1,3 21,3M21,17H3V5H21V17Z"/></svg>
        </button>
        <button class="top-btn" onclick="window.location.href='/movies'" style="background:linear-gradient(135deg, #22C55E, #16A34A); display:flex; align-items:center; justify-content:center;" title="Movies">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M18 4v1h-2V4c0-.55-.45-1-1-1H9c-.55 0-1 .45-1 1v1H6V4c0-.55-.45-1-1-1s-1 .45-1 1v16c0 .55.45 1 1 1s1-.45 1-1v-1h2v1c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-1h2v1c0 .55.45 1 1 1s1-.45 1-1V4c0-.55-.45-1-1-1s-1 .45-1 1zM8 17H6v-2h2v2zm0-4H6v-2h2v2zm0-4H6V7h2v2zm10 8h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V7h2v2z"/></svg>
        </button>
        <button class="top-btn" onclick="window.location.href='/series'" style="background:linear-gradient(135deg, #F59E0B, #D97706); display:flex; align-items:center; justify-content:center;" title="Series">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-8 12.5v-9l6 4.5-6 4.5z"/></svg>
        </button>
        <button class="top-btn" onclick="window.location.href='/epg'" style="background:linear-gradient(135deg, #3B82F6, #2563EB); display:flex; align-items:center; justify-content:center;" title="Guide">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M19,4H18V2H16V4H8V2H6V4H5C3.89,4 3.01,4.9 3.01,6L3,20A2,2 0 0,0 5,22H19A2,2 0 0,0 21,20V6A2,2 0 0,0 19,4M19,20H5V10H19V20M9,14H7V12H9V14M13,14H11V12H13V14M17,14H15V12H17V14M9,18H7V16H9V18M13,18H11V16H13V18M17,18H15V16H17V18Z"/></svg>
        </button>
        <button class="top-btn" data-cmd="home" style="background:#1A2035; display:flex; align-items:center; justify-content:center;">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
        </button>
        <button class="top-btn" data-cmd="fullscreen" style="background:#1A2035; display:flex; align-items:center; justify-content:center; grid-column: span 2;" title="Fullscreen">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>
        </button>
        <button class="top-btn" data-cmd="back" style="background:#1A2035; display:flex; align-items:center; justify-content:center;">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
        </button>
    </div>
    <!-- Circular D-Pad -->
    <div class="dpad-container">
        <div class="dpad-wheel">
            <button class="dpad-btn up" data-cmd="up" aria-label="Up">
                <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor"><path d="M7.41,15.41L12,10.83L16.59,15.41L18,14L12,8L6,14L7.41,15.41Z"/></svg>
            </button>
            <button class="dpad-btn right" data-cmd="right" aria-label="Right">
                <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor"><path d="M8.59,16.58L13.17,12L8.59,7.41L10,6L16,12L10,18L8.59,16.58Z"/></svg>
            </button>
            <button class="dpad-btn down" data-cmd="down" aria-label="Down">
                <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor"><path d="M7.41,8.58L12,13.17L16.59,8.58L18,10L12,16L6,10L7.41,8.58Z"/></svg>
            </button>
            <button class="dpad-btn left" data-cmd="left" aria-label="Left">
                <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor"><path d="M15.41,16.58L10.83,12L15.41,7.41L14,6L8,12L14,18L15.41,16.58Z"/></svg>
            </button>
            <button class="dpad-btn ok" data-cmd="ok" aria-label="OK">OK</button>
        </div>
    </div>
    <!-- Volume / Channel -->
    <div class="row row-2">
        <button data-cmd="volup" style="display:flex; gap:8px;"><svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M14,3.23V5.29C16.89,6.15 19,8.83 19,12C19,15.17 16.89,17.85 14,18.71V20.77C18,19.86 21,16.28 21,12C21,7.72 18,4.14 14,3.23M16.5,12C16.5,10.23 15.5,8.71 14,7.97V16C15.5,15.29 16.5,13.77 16.5,12M3,9V15H7L12,20V4L7,9H3Z"/></svg> VOL +</button>
        <button data-cmd="chup">CH +</button>
        <button data-cmd="voldown" style="display:flex; gap:8px;"><svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12,4L7,9H3V15H7L12,20V4M16.5,12C16.5,10.23 15.5,8.71 14,7.97V16C15.5,15.29 16.5,13.77 16.5,12M14,3.23V5.29C16.89,6.15 19,8.83 19,12C19,15.17 16.89,17.85 14,18.71V20.77C18,19.86 21,16.28 21,12C21,7.72 18,4.14 14,3.23Z"/></svg> VOL −</button>
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
    navigator.serviceWorker.getRegistrations().then(registrations => {
        if (registrations.length > 0) {
            Promise.all(registrations.map(r => r.unregister())).then(() => {
                window.location.reload();
            });
        }
    });
}
const _base = window.location.protocol + '//' + window.location.host;

document.querySelectorAll('button').forEach(btn => {
    if (btn.dataset.cmd) {
        const sendCmd = () => {
            const cmd = btn.dataset.cmd;
            fetch(_base + '/cmd/' + cmd).catch(e => console.error(e));
            try {
                if (navigator.vibrate) navigator.vibrate(50);
            } catch (e) {}
        };
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            sendCmd();
        });
    }
});

const searchBox = document.getElementById('remoteSearchBox');
searchBox.addEventListener('input', () => {
    fetch(_base + '/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: searchBox.value })
    }).catch(e => console.error(e));
});

const evtSource = new EventSource(_base + '/events');
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
            const mw = options.getMainWindow();
            if (mw && !mw.isDestroyed()) mw.webContents.send('remote-error', err.message);
        });
    } catch (err) {
        console.warn("[REMOTE] Express not installed. Run 'npm install express' to enable the web remote API.", err);
    }
}

module.exports = {
    initRemoteServer,
    stopRemoteServer,
    broadcastSse
};
