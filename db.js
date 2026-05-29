const path = require('path');
const { app } = require('electron');

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
    console.warn("[DB] better-sqlite3 initialization failed:", err);
    throw err;
}

module.exports = db;
