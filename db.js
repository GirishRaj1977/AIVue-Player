const path = require('path');
const { app } = require('electron');

const dbPath = path.join(app.getPath('userData'), 'iptv.db');
let db;

try {
    // Using standard sqlite3 which features reliable pre-built binaries
    const sqlite3 = require('sqlite3').verbose();
    
    // Open the database connection
    const nativeDb = new sqlite3.Database(dbPath);

    // Helper to map better-sqlite3 style named parameters to node-sqlite3
    function mapParams(params) {
        if (params.length === 1 && typeof params[0] === 'object' && params[0] !== null && !Array.isArray(params[0])) {
            const obj = params[0];
            const mapped = {};
            for (const key in obj) {
                if (key.startsWith('@') || key.startsWith('$') || key.startsWith(':')) {
                    mapped[key] = obj[key];
                } else {
                    mapped['@' + key] = obj[key];
                }
            }
            return mapped;
        }
        return params;
    }

    let transactionPromise = Promise.resolve();

    // Create an async Promise API wrapper around sqlite3
    db = {
        native: nativeDb,
        exec: (sql) => new Promise((resolve, reject) => {
            nativeDb.exec(sql, err => err ? reject(err) : resolve());
        }),
        pragma: (sql) => new Promise((resolve, reject) => {
            nativeDb.run(`PRAGMA ${sql}`, err => err ? reject(err) : resolve());
        }),
        prepare: (sql) => {
            return {
                get: (...params) => new Promise((resolve, reject) => {
                    nativeDb.get(sql, mapParams(params), (err, row) => err ? reject(err) : resolve(row));
                }),
                all: (...params) => new Promise((resolve, reject) => {
                    nativeDb.all(sql, mapParams(params), (err, rows) => err ? reject(err) : resolve(rows));
                }),
                run: (...params) => new Promise((resolve, reject) => {
                    nativeDb.run(sql, mapParams(params), function(err) {
                        if (err) reject(err);
                        else resolve({ lastInsertRowid: this.lastID, changes: this.changes });
                    });
                })
            };
        },
        transaction: (fn) => {
            return (...args) => {
                const execute = async () => {
                    await new Promise((resolve, reject) => nativeDb.run('BEGIN TRANSACTION', err => err ? reject(err) : resolve()));
                    try {
                        const result = await fn(...args);
                        await new Promise((resolve, reject) => nativeDb.run('COMMIT', err => err ? reject(err) : resolve()));
                        return result;
                    } catch (err) {
                        await new Promise((resolve, reject) => nativeDb.run('ROLLBACK', err => err ? reject(err) : resolve()));
                        throw err;
                    }
                };
                const nextPromise = transactionPromise.then(execute);
                transactionPromise = nextPromise.catch(() => {});
                return nextPromise;
            };
        },
        close: () => new Promise((resolve, reject) => nativeDb.close(err => err ? reject(err) : resolve()))
    };

    // Database schema initialization
    const initPromise = (async () => {
        try {
            await db.pragma('journal_mode = WAL');
            
            await db.exec(`
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

                CREATE TABLE IF NOT EXISTS epg_logos (
                    epg_id TEXT PRIMARY KEY,
                    logo_url TEXT,
                    cached_logo TEXT
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
            
            await db.exec("ALTER TABLE channels ADD COLUMN type TEXT DEFAULT 'live'").catch(() => {});
            
            await db.exec(`
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
            
            await db.exec("ALTER TABLE playlists ADD COLUMN exp_date TEXT").catch(() => {});
            await db.exec("ALTER TABLE epg_logos ADD COLUMN cached_logo TEXT").catch(() => {});
            await db.exec("ALTER TABLE playlists ADD COLUMN stalker_username TEXT").catch(() => {});
            await db.exec("ALTER TABLE playlists ADD COLUMN stalker_password TEXT").catch(() => {});
            
            // Clean up any malformed database rows from previous named parameter binding bugs
            await db.exec(`
                DELETE FROM playlists WHERE id = '[object Object]' OR name = '[object Object]' OR source_url = '[object Object]';
                DELETE FROM channels WHERE playlist_id = '[object Object]' OR tvg_id = '[object Object]' OR title = '[object Object]';
                DELETE FROM mappings WHERE channel_title = '[object Object]' OR epg_id = '[object Object]';
            `);
            
            console.log("[DB] SQLite Database initialized at", dbPath);
        } catch (err) {
            console.error("[DB] SQLite schema initialization failed:", err);
            throw err;
        }
    })();

    db.initPromise = initPromise;
} catch (err) {
    console.warn("[DB] SQLite initialization failed:", err);
    throw err;
}

// Expose the wrapper instance to match your older implementation exports
module.exports = db;