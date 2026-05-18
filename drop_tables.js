const { app } = require('electron');
const path = require('path');
const Database = require('better-sqlite3');

app.whenReady().then(() => {
    const dbPath = path.join(app.getPath('userData'), 'iptv.db');
    console.log("[Script] Opening database at:", dbPath);
    
    try {
        const db = new Database(dbPath);
        
        console.log("[Script] Dropping tables...");
        db.exec(`
            DROP TABLE IF EXISTS channels;
            DROP TABLE IF EXISTS playlists;
            DROP TABLE IF EXISTS epg;
            DROP TABLE IF EXISTS external_epgs;
            DROP TABLE IF EXISTS mappings;
            DROP TABLE IF EXISTS dvr_schedule;
        `);
        
        console.log("[Script] All tables dropped successfully. The database is now completely blank.");
        db.close();
    } catch (err) {
        console.error("[Script] Failed to drop tables:", err);
    }
    
    app.quit();
});