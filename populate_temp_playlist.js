const { app } = require('electron');
const path = require('path');
const { execFile } = require('child_process');
const Database = require('better-sqlite3');

// Force Electron to use the 'play' app's data folder instead of the default 'Electron' folder
app.name = 'play';

async function parseM3u(source) {
    return new Promise((resolve) => {
        const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
        const scriptPath = path.join(__dirname, 'backend', 'parser.py');
        
        const args = [scriptPath, source, '', '{}']; // source, epgSource, mappings

        const env = Object.assign({}, process.env, { 
            AIVUE_CACHE_DIR: path.join(app.getPath('userData'), 'cache'),
            AIVUE_FORCE_REFRESH: '1'
        });

        console.log(`[TempScript] Starting Python parser for: ${source}`);
        execFile(pythonCmd, args, { maxBuffer: 1024 * 1024 * 500, windowsHide: true, timeout: 120000, env }, (error, stdout, stderr) => {
            console.log(`[TempScript] Python parser finished.`);
            if (error) {
                console.error(`[TempScript] Error:`, error.message, stderr);
                return resolve({ error: `${error.message}\n${stderr || ''}` });
            }
            if (!stdout || stdout.trim() === '') {
                return resolve({ error: "Python executed but returned absolutely nothing." });
            }
            try { resolve(JSON.parse(stdout)); } 
            catch (e) { resolve({ error: `Failed to parse Python output. Raw: ${stdout.substring(0, 100)}` }); }
        });
    });
}

function savePlaylistToDb(db, playlist) {
    if (!db) return false;
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

    const saveTx = db.transaction((p) => {
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
                    group_name: c.group || 'Uncategorized',
                    stream_url: c.url || '',
                    is_favourite: c.favourite ? 1 : 0,
                    is_disabled: c.disabled ? 1 : 0
                });
            }
        }
    });

    saveTx(playlist);
    console.log(`[TempScript] Saved ${playlist.channels.length} channels from playlist "${playlist.name}" to the database.`);
    return true;
}

app.whenReady().then(async () => {
    const dbPath = path.join(app.getPath('userData'), 'iptv.db');
    let db;
    try {
        db = new Database(dbPath);
        console.log("[TempScript] SQLite Database opened at", dbPath);

        // Ensure DB schema is created, copying from index.js
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
        `);
        console.log("[TempScript] Database schema verified.");
    } catch (err) {
        console.error("[TempScript] Failed to open database:", err);
        app.quit();
        return;
    }

    const m3uPath = path.join(__dirname, 'filtered.m3u');
    const parsedData = await parseM3u(m3uPath);

    if (parsedData.error || !parsedData.channels) {
        console.error('[TempScript] Failed to parse M3U:', parsedData.error || 'No channels found.');
    } else {
        const tempPlaylist = {
            id: 'filtered-temp-playlist',
            name: 'Filtered Business Channels',
            source: m3uPath,
            epg: parsedData.epg_url || 'Not Configured',
            disabled: false,
            channels: parsedData.channels.map(c => ({ ...c, favourite: false, disabled: false }))
        };
        savePlaylistToDb(db, tempPlaylist);
    }

    db.close();
    app.quit();
});