const { parentPort, workerData } = require('worker_threads');
const fs = require('fs');
const http = require('http');
const https = require('https');
const zlib = require('zlib');
const sax = require('sax');

// Inputs from main process
const { cacheDir, epgSource, forceRefresh, validChannelsList, cachedMeta } = workerData;
const validChannels = new Set(validChannelsList);

let cancelled = false;

// Time retention window
const nowSec = Math.floor(Date.now() / 1000);
const retentionStart = nowSec - 24 * 3600; // Now - 24h
const retentionEnd = nowSec + 7 * 24 * 3600;  // Now + 7 days

// Cache state
const channelsUpdatedSet = new Set();
let progressInterval;

// Listen for cancel signal
parentPort.on('message', (msg) => {
    if (msg.type === 'cancel') {
        cancelled = true;
        cleanup();
    }
});

function cleanup() {
    if (progressInterval) {
        clearInterval(progressInterval);
    }
}

// Convert XMLTV date to epoch seconds
function parseEpgTime(timeStr) {
    if (!timeStr) return null;
    const clean = timeStr.replace(/[^0-9+-]/g, '');
    const match = clean.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})(?:([+-])(\d{2})(\d{2}))?/);
    if (!match) return null;
    
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    const day = parseInt(match[3], 10);
    const hour = parseInt(match[4], 10);
    const min = parseInt(match[5], 10);
    const sec = parseInt(match[6], 10);
    
    let date = new Date(Date.UTC(year, month, day, hour, min, sec));
    if (match[7]) {
        const sign = match[7] === '+' ? 1 : -1;
        const offsetHours = parseInt(match[8] || '0', 10);
        const offsetMins = parseInt(match[9] || '0', 10);
        const offsetMs = (offsetHours * 60 + offsetMins) * 60 * 1000 * sign;
        date = new Date(date.getTime() - offsetMs);
    }
    return Math.floor(date.getTime() / 1000);
}

// Helper to download stream (handling redirects)
function getStream(url, headers = {}) {
    return new Promise((resolve, reject) => {
        const client = url.startsWith('https') ? https : http;
        const reqHeaders = {
            'User-Agent': 'VLC/3.0.9 LibVLC/3.0.9',
            'Accept-Encoding': 'gzip',
            ...headers
        };
        client.get(url, { headers: reqHeaders, timeout: 30000 }, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                // Handle Redirect
                resolve(getStream(res.headers.location, headers));
            } else {
                resolve(res);
            }
        }).on('error', reject);
    });
}

async function start() {
    try {
        if (validChannels.size === 0) {
            console.log('[Worker] No valid channels provided. Skipping EPG parse.');
            parentPort.postMessage({ type: 'done', count: 0 });
            cleanup();
            return;
        }

        console.log(`[Worker] Started EPG update for: ${epgSource}. Active channel IDs count: ${validChannels.size}`);

        let stream;
        let etagHeader = null;
        let lastModifiedHeader = null;
        let isGzip = epgSource.endsWith('.gz');

        if (epgSource.startsWith('http://') || epgSource.startsWith('https://')) {
            const headers = {};
            if (cachedMeta.etag) headers['If-None-Match'] = cachedMeta.etag;
            if (cachedMeta.lastModified) headers['If-Modified-Since'] = cachedMeta.lastModified;

            const res = await getStream(epgSource, headers);
            if (res.statusCode === 304) {
                console.log(`[Worker] EPG source 304 Not Modified: ${epgSource}`);
                parentPort.postMessage({ type: 'done', count: 0, status: 'not_modified' });
                cleanup();
                return;
            }
            if (res.statusCode >= 400) {
                throw new Error(`Server returned HTTP ${res.statusCode}`);
            }

            etagHeader = res.headers['etag'] || null;
            lastModifiedHeader = res.headers['last-modified'] || null;
            
            const encoding = res.headers['content-encoding'];
            if (encoding === 'gzip' || res.headers['content-type'] === 'application/x-gzip') {
                isGzip = true;
            }
            stream = res;
        } else {
            // Local file
            if (!fs.existsSync(epgSource)) {
                throw new Error(`File not found: ${epgSource}`);
            }
            stream = fs.createReadStream(epgSource);
        }

        // Start throttled progress updates to main process every 2 seconds
        progressInterval = setInterval(() => {
            if (channelsUpdatedSet.size > 0 && !cancelled) {
                const list = Array.from(channelsUpdatedSet);
                channelsUpdatedSet.clear();
                parentPort.postMessage({ type: 'progress', channelsUpdated: list });
            }
        }, 2000);

        // Pipe gzip if needed
        let inputStream = stream;
        if (isGzip) {
            const gunzip = zlib.createGunzip();
            inputStream = stream.pipe(gunzip);
        }

        // Setup SAX streaming parser
        const saxStream = sax.createStream(true, { lowercase: true, trim: true });
        let currentTag = null;
        let currentChannelId = null;
        let currentChannel = null;
        let currentProgramme = null;
        let textBuffer = '';
        let programmeCount = 0;
        let skippedCount = 0;

        let batch = [];
        const BATCH_LIMIT = 500;

        function flushBatch() {
            if (batch.length === 0) return;
            parentPort.postMessage({ type: 'insert_batch', batch });
            batch = [];
        }

        saxStream.on('opentag', (node) => {
            currentTag = node.name;
            if (node.name === 'channel') {
                currentChannelId = node.attributes.id ? node.attributes.id.toLowerCase().trim() : null;
                if (currentChannelId) {
                    currentChannel = { id: currentChannelId, name: '', logo: '' };
                }
            } else if (node.name === 'icon' && currentChannelId && currentChannel) {
                currentChannel.logo = node.attributes.src || '';
            } else if (node.name === 'programme') {
                const ch = node.attributes.channel ? node.attributes.channel.toLowerCase().trim() : null;
                if (ch && validChannels.has(ch)) {
                    const start = parseEpgTime(node.attributes.start);
                    const stop = parseEpgTime(node.attributes.stop);
                    
                    // Filter by time window
                    if (start && stop && stop >= retentionStart && start <= retentionEnd) {
                        currentProgramme = {
                            channel_id: ch,
                            start,
                            stop,
                            title: 'No Title',
                            desc: ''
                        };
                    } else {
                        currentProgramme = null;
                        skippedCount++;
                    }
                } else {
                    currentProgramme = null;
                    skippedCount++;
                }
            }
            textBuffer = '';
        });

        saxStream.on('text', (text) => {
            textBuffer += text;
        });

        saxStream.on('cdata', (text) => {
            textBuffer += text;
        });

        saxStream.on('closetag', (name) => {
            if (cancelled) {
                inputStream.destroy();
                return;
            }

            if (name === 'channel') {
                if (currentChannel && currentChannel.id) {
                    parentPort.postMessage({
                        type: 'save_epg_channel',
                        channel: {
                            id: currentChannel.id,
                            name: currentChannel.name || currentChannel.id,
                            logo: currentChannel.logo || ''
                        }
                    });
                }
                currentChannelId = null;
                currentChannel = null;
            } else if (name === 'programme') {
                if (currentProgramme) {
                    batch.push(currentProgramme);
                    channelsUpdatedSet.add(currentProgramme.channel_id);
                    programmeCount++;
                    
                    if (batch.length >= BATCH_LIMIT) {
                        flushBatch();
                    }
                }
                currentProgramme = null;
            } else if (currentProgramme) {
                if (name === 'title') {
                    currentProgramme.title = textBuffer.trim();
                } else if (name === 'desc') {
                    currentProgramme.desc = textBuffer.trim();
                }
            } else if (currentChannelId && currentChannel) {
                if (name === 'display-name') {
                    currentChannel.name = textBuffer.trim();
                }
            }
            currentTag = null;
        });

        saxStream.on('end', () => {
            if (cancelled) return;
            try {
                flushBatch();
                
                // Final update push
                if (channelsUpdatedSet.size > 0) {
                    parentPort.postMessage({ type: 'progress', channelsUpdated: Array.from(channelsUpdatedSet) });
                }
                
                parentPort.postMessage({ 
                    type: 'done', 
                    count: programmeCount,
                    etag: etagHeader,
                    lastModified: lastModifiedHeader
                });
            } catch (err) {
                console.error('[Worker finalization error]', err);
                parentPort.postMessage({ type: 'error', message: err.message });
            } finally {
                cleanup();
            }
        });

        saxStream.on('error', (err) => {
            console.error('[Worker Sax Error]', err);
            parentPort.postMessage({ type: 'error', message: err.message });
            cleanup();
        });

        inputStream.pipe(saxStream);

    } catch (err) {
        console.error('[Worker Boot Error]', err);
        parentPort.postMessage({ type: 'error', message: err.message });
        cleanup();
    }
}

start();
