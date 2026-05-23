const fs = require('fs');
const path = require('path');
const { app, ipcMain } = require('electron');

// Store original console methods to prevent infinite loop/recursion
const originalConsole = {
    log: console.log,
    warn: console.warn,
    error: console.error,
    info: console.info
};

// Resolve the user logs directory
const logDir = path.join(app.getPath('userData'), 'logs');

// Ensure the logs directory exists
if (!fs.existsSync(logDir)) {
    try {
        fs.mkdirSync(logDir, { recursive: true });
    } catch (err) {
        originalConsole.error('[LOGGER ERROR] Failed to create logs directory:', err);
    }
}

/**
 * Clean up old rotated logs from the directory that are older than the retention days.
 * Rotated files are named matching: category-YYYY-MM-DD.log
 * @param {number} retentionDays 
 */
function cleanOldLogs(retentionDays = 7) {
    try {
        const files = fs.readdirSync(logDir);
        const now = Date.now();
        const msInDay = 24 * 60 * 60 * 1000;
        
        files.forEach(file => {
            if (file.match(/-\d{4}-\d{2}-\d{2}\.log$/)) {
                const filePath = path.join(logDir, file);
                const stats = fs.statSync(filePath);
                const ageInDays = (now - stats.mtime.getTime()) / msInDay;
                
                if (ageInDays > retentionDays) {
                    fs.unlinkSync(filePath);
                    originalConsole.log(`[LOGGER] Deleted old rotated log file: ${file}`);
                }
            }
        });
    } catch (err) {
        originalConsole.error('[LOGGER] Error cleaning old logs:', err);
    }
}

/**
 * Rotates a log file on startup if it was last modified on a previous day.
 * Renames e.g. app.log -> app-YYYY-MM-DD.log
 * @param {string} fileName 
 */
function rotateLogFile(fileName) {
    const filePath = path.join(logDir, fileName);
    if (fs.existsSync(filePath)) {
        try {
            const stats = fs.statSync(filePath);
            const mtime = new Date(stats.mtime);
            
            const lastModifiedDateStr = mtime.toISOString().split('T')[0];
            const currentDateStr = new Date().toISOString().split('T')[0];
            
            if (lastModifiedDateStr !== currentDateStr) {
                const rotatedName = fileName.replace('.log', `-${lastModifiedDateStr}.log`);
                const rotatedPath = path.join(logDir, rotatedName);
                
                if (fs.existsSync(rotatedPath)) {
                    const content = fs.readFileSync(filePath);
                    fs.appendFileSync(rotatedPath, content);
                    fs.writeFileSync(filePath, ''); 
                } else {
                    fs.renameSync(filePath, rotatedPath);
                }
                originalConsole.log(`[LOGGER] Rotated log file ${fileName} -> ${rotatedName}`);
            }
        } catch (err) {
            originalConsole.error(`[LOGGER] Error rotating ${fileName}:`, err);
        }
    }
}

/**
 * Mask sensitive data like passwords, user names, mac addresses, and stream tokens.
 * @param {any} message 
 * @returns {string}
 */
function maskSensitiveInfo(message) {
    let str = '';
    if (message instanceof Error) {
        str = message.stack || message.message;
    } else if (typeof message === 'object') {
        try {
            str = JSON.stringify(message);
        } catch (e) {
            str = String(message);
        }
    } else {
        str = String(message);
    }
    
    let masked = str;
    masked = masked.replace(/\b(password|pass|pw|token|play_token|api_key|apiKey|apiToken|username|user)\b\s*=\s*[^&\s"']+/gi, '$1=*****');
    masked = masked.replace(/"(password|pass|pw|token|play_token|api_key|apiKey|apiToken|username|user)"\s*:\s*"[^"]+"/gi, '"$1":"*****"');

    const macRegex = /\b([0-9a-fA-F]{2}[:-][0-9a-fA-F]{2}[:-][0-9a-fA-F]{2})[:-][0-9a-fA-F]{2}[:-][0-9a-fA-F]{2}[:-]([0-9a-fA-F]{2})\b/gi;
    masked = masked.replace(macRegex, (match, prefix, suffix) => {
        const separator = match.includes('-') ? '-' : ':';
        return `${prefix}${separator}**${separator}**${separator}${suffix}`;
    });

    masked = masked.replace(/(\/(?:live|movie|series|xmltv\.php)\/)([^/]+)\/([^/&?#\s]+)/gi, (match, prefix) => {
        return `${prefix}*****/*****`;
    });
    
    return masked;
}

/**
 * General function to format and write logs
 * @param {string} fileName 
 * @param {string} level 
 * @param {any} message 
 */
function writeLog(fileName, level, message) {
    const maskedMessage = maskSensitiveInfo(message);
    const timestamp = new Date().toISOString();
    const formatted = `[${timestamp}] [${level.toUpperCase()}] ${maskedMessage}\n`;
    
    const category = fileName.replace('.log', '').toUpperCase();
    
    if (level === 'error') {
        originalConsole.error(`[${category}] ${maskedMessage}`);
    } else if (level === 'warn') {
        originalConsole.warn(`[${category}] ${maskedMessage}`);
    } else {
        originalConsole.log(`[${category}] ${maskedMessage}`);
    }

    const filePath = path.join(logDir, fileName);
    fs.appendFile(filePath, formatted, (err) => {
        if (err) {
            originalConsole.error(`[LOGGER ERROR] Failed to write to ${fileName}:`, err);
        }
    });
}

/**
 * Determine log category based on log text and prefixes
 * @param {string} msg 
 * @returns {string}
 */
function determineCategory(msg) {
    const lower = msg.toLowerCase();
    
    if (lower.includes('[epg]') || lower.includes('[stalker epg]') || lower.includes('[epg error]')) {
        return 'epg';
    }
    
    if (
        lower.includes('[player]') || 
        lower.includes('[mpv]') || 
        lower.includes('[sync]') || 
        lower.includes('playback') || 
        lower.includes('stream opened') || 
        lower.includes('codec') || 
        lower.includes('[stats]')
    ) {
        return 'player';
    }
    
    if (
        lower.includes('[xtream]') || 
        lower.includes('[m3u]') || 
        lower.includes('[stalker]') || 
        lower.includes('parse-m3u') || 
        lower.includes('[remote]') || 
        lower.includes('[remote api]') || 
        lower.includes('[tmdb')
    ) {
        return 'portal';
    }
    
    if (lower.includes('[crash]') || lower.includes('uncaughtexception') || lower.includes('unhandledrejection')) {
        return 'crash';
    }
    
    return 'app';
}

/**
 * Intercepts Electron standard console outputs to route them automatically to logger files.
 */
function interceptConsole() {
    const formatArgs = (args) => {
        return args.map(arg => {
            if (arg instanceof Error) return arg.stack || arg.message;
            if (typeof arg === 'object') {
                try { return JSON.stringify(arg); } catch (e) { return String(arg); }
            }
            return String(arg);
        }).join(' ');
    };

    console.log = (...args) => {
        const msg = formatArgs(args);
        const category = determineCategory(msg);
        writeLog(`${category}.log`, 'info', msg);
    };

    console.info = (...args) => {
        const msg = formatArgs(args);
        const category = determineCategory(msg);
        writeLog(`${category}.log`, 'info', msg);
    };

    console.warn = (...args) => {
        const msg = formatArgs(args);
        const category = determineCategory(msg);
        writeLog(`${category}.log`, 'warn', msg);
    };

    console.error = (...args) => {
        const msg = formatArgs(args);
        const category = determineCategory(msg);
        const isCrash = msg.toLowerCase().includes('crash') || msg.toLowerCase().includes('uncaught') || msg.toLowerCase().includes('fatal');
        const file = isCrash ? 'crash.log' : `${category}.log`;
        writeLog(file, 'error', msg);
    };
}

const logger = {
    app: (level, msg) => writeLog('app.log', level, msg),
    player: (level, msg) => writeLog('player.log', level, msg),
    portal: (level, msg) => writeLog('portal.log', level, msg),
    epg: (level, msg) => writeLog('epg.log', level, msg),
    crash: (level, msg) => writeLog('crash.log', level, msg),
    
    init: () => {
        // Run log rotations on startup
        ['app.log', 'player.log', 'portal.log', 'epg.log', 'crash.log'].forEach(rotateLogFile);
        // Prune logs older than 7 days
        cleanOldLogs(7);
        
        // Start intercepting standard console logs
        interceptConsole();
        
        logger.app('info', 'Logger system initialized. Console interception active. Rotations and retention cleanups completed.');
        
        // Expose IPC listener for renderer logging
        ipcMain.on('write-log', (event, { category, level, message }) => {
            if (logger[category]) {
                logger[category](level, message);
            } else {
                writeLog('app.log', level, `[IPC RENDERER] ${message}`);
            }
        });
    }
};

module.exports = logger;
