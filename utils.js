// Utility pure functions extracted from renderer.js

function formatDateToEpgString(date) {
    const pad = n => n.toString().padStart(2, '0');
    return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}`;
}

function sortAlphaNum(a, b) {
    return (a || '').toString().localeCompare((b || '').toString(), undefined, { numeric: true, sensitivity: 'base' });
}

function formatPlaylistName(name) {
    if (!name) return name;
    if (name.startsWith('http://') || name.startsWith('https://')) {
        try {
            const urlObj = new URL(name);
            const hostname = urlObj.hostname;
            
            // Skip IPv4 formatting
            if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) {
                return hostname;
            }
            
            const hostParts = hostname.split('.');
            if (hostParts.length >= 2) {
                const word1 = hostParts[0].charAt(0).toUpperCase() + hostParts[0].slice(1);
                const word2 = hostParts[1].charAt(0).toUpperCase() + hostParts[1].slice(1);
                return `${word1} ${word2}`;
            }
        } catch (e) {}
    }
    return name;
}

function normalizeChannelName(name) {
    if (!name) return '';
    let str = name.toLowerCase();

    // Normalize common substitutions
    str = str.replace(/&amp;/g, ' and ').replace(/&/g, ' and ');

    // Remove brackets and their content, e.g. [HD], (US), |UK|
    str = str.replace(/[\[\(\{\|<].*?[\]\)\}\|>]/g, ' ');

    // Remove common quality/country badge terms
    const termsToRemove = [
        'hd', 'uhd', 'fhd', 'sd', '4k', '1080p', '720p', '480p', 'hevc', 'h264', 'h265',
        'h.264', 'h.265', '50fps', '60fps',
        'us', 'uk', 'in', 'ca', 'fr', 'es', 'de', 'it', 'mx', 'ar', 'co', 'pe', 'br',
        'la', 'latam', 'india', 'hindi', 'english',
        'backup', 'back', 'main', 'tv', 'ch', 'channel', 'premium', 'vip',
        'east', 'west', 'direct', '1080', '720', 'live', 'air', 'new'
    ];

    // Replace non-alphanumeric with space (preserve digits)
    str = str.replace(/[^a-z0-9]/g, ' ');

    // Remove terms as whole words
    termsToRemove.forEach(term => {
        const regex = new RegExp(`\\b${term}\\b`, 'g');
        str = str.replace(regex, ' ');
    });

    // Normalize attached digit suffixes: "ten1" → "ten 1", "sports2" → "sports 2"
    str = str.replace(/([a-z])(\d)/g, '$1 $2').replace(/(\d)([a-z])/g, '$1 $2');

    // Convert word numbers to digits
    const wordToDigit = {
        'zero': '0', 'one': '1', 'two': '2', 'three': '3', 'four': '4',
        'five': '5', 'six': '6', 'seven': '7', 'eight': '8', 'nine': '9', 'ten': '10'
    };
    for (const [word, digit] of Object.entries(wordToDigit)) {
        str = str.replace(new RegExp(`\\b${word}\\b`, 'g'), digit);
    }

    // Collapse whitespace
    str = str.replace(/\s+/g, ' ').trim();
    return str;
}

function levenshteinRatio(a, b) {
    if (!a || !b) return 0;
    if (a === b) return 100;
    const la = a.length, lb = b.length;
    const maxLen = Math.max(la, lb);
    if (maxLen === 0) return 100;
    let prev = Array.from({ length: lb + 1 }, (_, i) => i);
    for (let i = 1; i <= la; i++) {
        const curr = [i];
        for (let j = 1; j <= lb; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
        }
        prev = curr;
    }
    return Math.round((1 - prev[lb] / maxLen) * 100);
}

function tokenOverlapScore(a, b) {
    if (!a || !b) return 0;
    const ta = new Set(a.split(' ').filter(Boolean));
    const tb = new Set(b.split(' ').filter(Boolean));
    if (!ta.size || !tb.size) return 0;
    let common = 0;
    ta.forEach(t => { if (tb.has(t)) common++; });
    return Math.round((common / Math.max(ta.size, tb.size)) * 100);
}

function tokenSortRatio(a, b) {
    if (!a || !b) return 0;
    const sa = a.split(' ').filter(Boolean).sort().join(' ');
    const sb = b.split(' ').filter(Boolean).sort().join(' ');
    return levenshteinRatio(sa, sb);
}

function tokenSetRatio(a, b) {
    if (!a || !b) return 0;
    const ta   = new Set(a.split(' ').filter(Boolean));
    const tb   = new Set(b.split(' ').filter(Boolean));
    const inter = [...ta].filter(t => tb.has(t)).sort().join(' ');
    const remA  = [...ta].filter(t => !tb.has(t)).sort().join(' ');
    const remB  = [...tb].filter(t => !ta.has(t)).sort().join(' ');
    const s2 = [inter, remA].filter(Boolean).join(' ');
    const s3 = [inter, remB].filter(Boolean).join(' ');
    return Math.max(
        levenshteinRatio(inter, s2),
        levenshteinRatio(inter, s3),
        levenshteinRatio(s2, s3)
    );
}

