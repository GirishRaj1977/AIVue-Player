// Connect the renderer console logs directly to the main process logger
if (window.iptvAPI && window.iptvAPI.log) {
    const originalConsoleLog = console.log;
    const originalConsoleWarn = console.warn;
    const originalConsoleError = console.error;

    console.log = (...args) => {
        const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
        originalConsoleLog(...args);
        let cat = 'app';
        if (msg.toLowerCase().includes('epg')) cat = 'epg';
        else if (msg.toLowerCase().includes('play') || msg.toLowerCase().includes('mpv')) cat = 'player';
        else if (msg.toLowerCase().includes('m3u') || msg.toLowerCase().includes('stalker') || msg.toLowerCase().includes('xtream')) cat = 'portal';
        window.iptvAPI.log(cat, 'info', `[RENDERER] ${msg}`);
    };

    console.warn = (...args) => {
        const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
        originalConsoleWarn(...args);
        let cat = 'app';
        if (msg.toLowerCase().includes('epg')) cat = 'epg';
        else if (msg.toLowerCase().includes('play') || msg.toLowerCase().includes('mpv')) cat = 'player';
        else if (msg.toLowerCase().includes('m3u') || msg.toLowerCase().includes('stalker') || msg.toLowerCase().includes('xtream')) cat = 'portal';
        window.iptvAPI.log(cat, 'warn', `[RENDERER] ${msg}`);
    };

    console.error = (...args) => {
        const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
        originalConsoleError(...args);
        let cat = 'app';
        if (msg.toLowerCase().includes('epg')) cat = 'epg';
        else if (msg.toLowerCase().includes('play') || msg.toLowerCase().includes('mpv')) cat = 'player';
        else if (msg.toLowerCase().includes('m3u') || msg.toLowerCase().includes('stalker') || msg.toLowerCase().includes('xtream')) cat = 'portal';
        window.iptvAPI.log(cat, 'error', `[RENDERER] ${msg}`);
    };
}

// Inject Aero styles for buttons, hover text size increase, and global font colour tinge
const aeroStyles = document.createElement('style');
aeroStyles.textContent = `
    /* Custom Fonts mapping from /assets/Font */
    @font-face {
        font-family: 'Inter';
        src: url('assets/Font/inter_18pt-Regular.ttf') format('truetype');
        font-weight: normal;
        font-style: normal;
    }
    @font-face {
        font-family: 'Inter';
        src: url('assets/Font/inter_18pt-Medium.ttf') format('truetype');
        font-weight: 500;
        font-style: normal;
    }
    @font-face {
        font-family: 'Inter';
        src: url('assets/Font/inter_18pt-SemiBold.ttf') format('truetype');
        font-weight: 600;
        font-style: normal;
    }
    @font-face {
        font-family: 'Inter';
        src: url('assets/Font/inter_18pt-Bold.ttf') format('truetype');
        font-weight: bold;
        font-style: normal;
    }

    /* Alias Outfit to Inter globally to map legacy fonts instantly */
    @font-face {
        font-family: 'Outfit';
        src: url('assets/Font/inter_18pt-Regular.ttf') format('truetype');
        font-weight: normal;
        font-style: normal;
    }
    @font-face {
        font-family: 'Outfit';
        src: url('assets/Font/inter_18pt-Medium.ttf') format('truetype');
        font-weight: 500;
        font-style: normal;
    }
    @font-face {
        font-family: 'Outfit';
        src: url('assets/Font/inter_18pt-SemiBold.ttf') format('truetype');
        font-weight: 600;
        font-style: normal;
    }
    @font-face {
        font-family: 'Outfit';
        src: url('assets/Font/inter_18pt-Bold.ttf') format('truetype');
        font-weight: bold;
        font-style: normal;
    }

    /* Global Typography & Deep Obsidian Background with Neon Glows */
    body { 
        font-family: 'Inter', sans-serif; 
        font-weight: normal; 
        background: radial-gradient(circle at 10% 20%, rgba(139, 92, 246, 0.05) 0%, transparent 40%),
                    radial-gradient(circle at 90% 80%, rgba(59, 130, 246, 0.04) 0%, transparent 40%),
                    #08080a !important;
    }

    /* Headings and Titles */
    h1, h2, h3, h4, h5, h6, #detail-name { 
        font-weight: 600 !important; 
    }

    /* Stable text transitions (no bold font wobbling on hover/focus) */
    .channel-item, .group-item, .mapping-ch-item, .mapping-epg-item, .epg-program-cell, .epg-play-channel, .live-epg-item { 
        font-weight: normal; 
    }
    *:focus, .active, .channel-item:hover, .epg-program-cell:hover, .epg-play-channel:hover, .mapping-ch-item:hover, .mapping-epg-item:hover, .live-epg-item:hover { 
        font-weight: inherit !important; 
    }

    /* Premium Neon Purple & Emerald Accent Variables */
    :root {
        --primary-accent: #bb86fc;
        --accent-glow: rgba(187, 134, 252, 0.35);
        --emerald-live: #10b981;
        --emerald-glow: rgba(16, 185, 129, 0.3);
    }

    /* Spatial Navigation Focus Outline */
    *:focus {
        outline: 1.5px solid var(--primary-accent) !important;
        outline-offset: 1px !important;
        box-shadow: 0 0 12px var(--accent-glow) !important;
    }

    .channel-item:focus, .group-item:focus, .mapping-ch-item:focus, .playlist-btn:focus, .nav-btn:focus, button:focus, input:focus, select:focus {
        background-color: rgba(187, 134, 252, 0.1) !important;
        outline: 1.5px solid var(--primary-accent) !important;
        outline-offset: -1px !important;
    }
    
    .mapping-epg-item:focus, .epg-program-cell:focus, .epg-play-channel:focus {
        background-color: var(--primary-accent) !important;
        outline: 2px solid var(--primary-accent) !important;
        outline-offset: -2px;
        color: #000 !important;
    }

    .epg-program-cell:focus {
        z-index: 5 !important;
    }

    .mapping-epg-item:focus span, .epg-program-cell:focus div, .epg-play-channel:focus span {
        color: #000 !important;
    }

    select.remote-open {
        background-color: rgba(187, 134, 252, 0.2) !important;
        border: 1px solid #bb86fc !important;
        outline: 2px solid #bb86fc !important;
    }

    /* Dropdown options color matching */
    select option {
        background-color: #121215 !important;
        color: #e4e4e7 !important;
    }

    /* Left Menu Bar glass styling */
    #nav-bar {
        display: none !important;
    }

    /* Modern sleek style for side menu buttons */
    .nav-btn {
        font-weight: 500;
        background-color: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.04);
        border-radius: 10px;
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        color: #a1a1aa !important;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.15);
        transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        cursor: pointer;
    }

    .nav-btn:hover {
        background-color: rgba(255, 255, 255, 0.08);
        border-color: rgba(255, 255, 255, 0.12);
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.3);
        color: #ffffff !important;
        transform: translateY(-2px);
    }

    .nav-btn.active {
        background-color: rgba(187, 134, 252, 0.12);
        border-color: rgba(187, 134, 252, 0.25);
        box-shadow: 0 4px 16px rgba(187, 134, 252, 0.15);
        color: var(--primary-accent) !important;
    }

    /* Refined Group Indicators in Channel List */
    .group-item {
        background: rgba(255, 255, 255, 0.015) !important;
        border: 1px solid rgba(255, 255, 255, 0.04) !important;
        border-radius: 8px !important;
        margin: 6px 10px 2px 10px !important;
        width: calc(100% - 20px) !important;
        padding: 6px 12px !important;
        font-size: 0.72rem !important; /* Smaller, crisp font */
        font-weight: 600 !important;
        text-transform: uppercase !important;
        letter-spacing: 0.06em !important;
        color: #a78bfa !important; /* Pastel lavender/purple accent */
        transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important;
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
    }
    .group-item:hover, .group-item:focus {
        background: rgba(255, 255, 255, 0.04) !important;
        border-color: rgba(187, 134, 252, 0.2) !important;
        color: #ffffff !important;
        transform: translateY(-1px) !important;
    }
    .group-item span[style*="color:#888"] {
        color: rgba(255, 255, 255, 0.4) !important;
        font-size: 0.85em !important;
        margin-left: 6px !important;
        font-weight: 500 !important;
    }
    .group-expand-icon {
        color: rgba(255, 255, 255, 0.4) !important;
        font-size: 0.75em !important;
        transition: transform 0.2s ease !important;
    }
    .group-item:hover .group-expand-icon,
    .group-item:focus .group-expand-icon {
        color: #ffffff !important;
    }

    /* Sidebar Channels panel glass layout */
    #sidebar {
        background: rgba(15, 15, 18, 0.45) !important;
        backdrop-filter: blur(24px) !important;
        -webkit-backdrop-filter: blur(24px) !important;
        border: 1px solid rgba(255, 255, 255, 0.05) !important;
        border-radius: 16px !important;
        box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3) !important;
        padding: 8px 0 !important;
        padding: 2px 0 !important;
    }

    /* Channel List selection styles (Premium Glass Cards) */
    .channel-item {
        padding: 6px 12px !important;
        margin: 6px 12px !important;
        width: calc(100% - 24px) !important;
        border-radius: 10px !important;
        border: 1px solid rgba(255, 255, 255, 0.03) !important;
        border-left: 4px solid transparent !important;
        background: rgba(255, 255, 255, 0.01) !important;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1) !important;
        transition: all 0.28s cubic-bezier(0.4, 0, 0.2, 1) !important;
        display: flex !important;
        align-items: center !important;
        box-sizing: border-box !important;
    }
    .channel-item:hover {
        background: rgba(255, 255, 255, 0.04) !important;
        border-color: rgba(255, 255, 255, 0.1) !important;
        border-left-color: rgba(255, 255, 255, 0.3) !important;
        transform: translateX(4px) scale(1.015) !important;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2) !important;
    }
    .channel-item.active {
        background: rgba(187, 134, 252, 0.08) !important;
        border-color: rgba(187, 134, 252, 0.25) !important;
        border-left: 4px solid var(--primary-accent) !important;
        box-shadow: 0 4px 20px rgba(187, 134, 252, 0.12), inset 0 0 10px rgba(187, 134, 252, 0.04) !important;
    }
    
    .channel-item span {
        font-weight: 600 !important;
        font-size: 0.76rem !important;
        letter-spacing: -0.01em !important;
        color: #a1a1aa !important;
        font-family: 'Inter', sans-serif !important;
        transition: color 0.2s ease !important;
    }
    .channel-item.active span {
        color: var(--primary-accent) !important;
        font-weight: 700 !important;
        text-shadow: 0 0 12px rgba(187, 134, 252, 0.25) !important;
    }
    .channel-item:hover span {
        color: #ffffff !important;
    }

    /* Channel list logo enhancements */
    .channel-item img {
        width: 34px !important;
        height: 34px !important;
        min-width: 34px !important;
        border-radius: 8px !important;
        background: #232328 !important;
        border: 1px solid rgba(255, 255, 255, 0.08) !important;
        padding: 3px !important;
        object-fit: contain !important;
        margin-right: 12px !important;
        box-shadow: 0 3px 8px rgba(0,0,0,0.3) !important;
        transition: all 0.25s ease !important;
    }
    .channel-item:hover img {
        border-color: rgba(255, 255, 255, 0.25) !important;
        transform: scale(1.05) !important;
    }
    .channel-item.active img {
        border-color: rgba(187, 134, 252, 0.35) !important;
        background: #2a2533 !important;
    }

    /* Premium Bouncing Mini Equalizer for Currently Playing Channel */
    .mini-equalizer {
        display: flex !important;
        align-items: flex-end !important;
        gap: 2px !important;
        width: 14px !important;
        height: 12px !important;
        margin-left: 8px !important;
        flex-shrink: 0 !important;
    }
    .mini-equalizer span {
        display: block !important;
        width: 2px !important;
        height: 100% !important;
        background-color: var(--primary-accent) !important;
        animation: eq-bounce 0.8s ease-in-out infinite alternate !important;
        transform-origin: bottom !important;
        border-radius: 1px !important;
        padding: 0 !important;
        margin: 0 !important;
    }
    .mini-equalizer span:nth-child(2) {
        animation-delay: -0.25s !important;
    }
    .mini-equalizer span:nth-child(3) {
        animation-delay: -0.5s !important;
    }
    @keyframes eq-bounce {
        0% { transform: scaleY(0.25); }
        100% { transform: scaleY(1); }
    }

    /* General Modern buttons */
    /* Unified Global Button Redesign (Harmonious Premium Glass Theme) */
    .playlist-btn, #episodes-modal-close, #premium-details-close, #import-browse-btn {
        background: rgba(255, 255, 255, 0.03) !important;
        border: 1px solid rgba(255, 255, 255, 0.05) !important;
        color: #a1a1aa !important;
        border-radius: 8px !important;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;
        backdrop-filter: blur(8px) !important;
        -webkit-backdrop-filter: blur(8px) !important;
        transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important;
        cursor: pointer !important;
        padding: 8px 16px !important;
        font-size: 0.85em !important;
        font-family: 'Inter', sans-serif !important;
        font-weight: 500 !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        gap: 6px !important;
    }
    .playlist-btn:hover, #episodes-modal-close:hover, #premium-details-close:hover, #import-browse-btn:hover {
        transform: translateY(-2px) !important;
        box-shadow: 0 8px 20px rgba(0,0,0,0.3) !important;
        background: rgba(255, 255, 255, 0.08) !important;
        border-color: rgba(255, 255, 255, 0.12) !important;
        color: #ffffff !important;
    }
    .playlist-btn:active, #episodes-modal-close:active, #premium-details-close:active, #import-browse-btn:active {
        transform: translateY(0) !important;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2) !important;
    }

    /* Primary Accent Glowing Buttons (Purple Gradient) */
    #import-submit-btn, #import-stalker-submit-btn, #import-xtreme-submit-btn, #details-play-btn {
        background: linear-gradient(135deg, #bb86fc 0%, #905cfc 100%) !important;
        color: #000000 !important;
        font-weight: 700 !important;
        border-radius: 8px !important;
        border: none !important;
        transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important;
        box-shadow: 0 4px 14px rgba(187, 134, 252, 0.25) !important;
        padding: 10px 24px !important;
        font-size: 0.9em !important;
        cursor: pointer !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        gap: 8px !important;
    }
    #import-submit-btn:hover, #import-stalker-submit-btn:hover, #import-xtreme-submit-btn:hover, #details-play-btn:hover {
        transform: translateY(-2px) !important;
        box-shadow: 0 8px 24px rgba(187, 134, 252, 0.45) !important;
        filter: brightness(1.1) !important;
        color: #000000 !important;
    }
    #import-submit-btn:active, #import-stalker-submit-btn:active, #import-xtreme-submit-btn:active, #details-play-btn:active {
        transform: translateY(0) !important;
        box-shadow: 0 2px 4px rgba(187, 134, 252, 0.2) !important;
    }

    /* Secondary Cancel Buttons */
    #import-cancel-btn, #import-stalker-cancel-btn, #import-xtreme-cancel-btn {
        background: rgba(255, 255, 255, 0.03) !important;
        border: 1px solid rgba(255, 255, 255, 0.05) !important;
        color: #a1a1aa !important;
        border-radius: 8px !important;
        transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important;
        cursor: pointer !important;
        font-weight: 500 !important;
        padding: 10px 24px !important;
        font-size: 0.9em !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        gap: 8px !important;
    }
    #import-cancel-btn:hover, #import-stalker-cancel-btn:hover, #import-xtreme-cancel-btn:hover {
        transform: translateY(-2px) !important;
        box-shadow: 0 8px 20px rgba(0,0,0,0.3) !important;
        background: rgba(255, 255, 255, 0.08) !important;
        border-color: rgba(255, 255, 255, 0.12) !important;
        color: #ffffff !important;
    }
    #import-cancel-btn:active, #import-stalker-cancel-btn:active, #import-xtreme-cancel-btn:active {
        transform: translateY(0) !important;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2) !important;
    }

    /* Positive/Confirm Buttons (Emerald Green) */
    .mapping-confirm-btn, #toast-confirm-btn {
        background: rgba(16, 185, 129, 0.15) !important;
        border: 1px solid rgba(16, 185, 129, 0.3) !important;
        color: #34d399 !important;
        border-radius: 6px !important;
        font-weight: 600 !important;
        transition: all 0.25s ease !important;
        cursor: pointer !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
    }
    .mapping-confirm-btn:hover, #toast-confirm-btn:hover {
        background: rgba(16, 185, 129, 0.3) !important;
        border-color: rgba(16, 185, 129, 0.5) !important;
        color: #ffffff !important;
        box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25) !important;
        transform: translateY(-1px) !important;
    }
    .mapping-confirm-btn:active, #toast-confirm-btn:active {
        transform: translateY(0) !important;
        box-shadow: 0 1px 2px rgba(16, 185, 129, 0.2) !important;
    }

    /* Destructive/Delete Buttons (Rose/Coral Red) */
    .playlist-btn.delete {
        background: rgba(207, 102, 121, 0.15) !important;
        border: 1px solid rgba(207, 102, 121, 0.3) !important;
        color: #ffb4c1 !important;
        font-weight: 600 !important;
    }
    .playlist-btn.delete:hover {
        background: rgba(207, 102, 121, 0.3) !important;
        border-color: rgba(207, 102, 121, 0.5) !important;
        color: #ffffff !important;
        box-shadow: 0 4px 12px rgba(207, 102, 121, 0.25) !important;
        transform: translateY(-2px) !important;
    }
    .playlist-btn.delete:active {
        transform: translateY(0) !important;
        box-shadow: 0 1px 2px rgba(207, 102, 121, 0.2) !important;
    }

    /* Layout settings */
    #nav-bar {
        display: none !important;
    }
    .nav-btn {
        margin-bottom: 0 !important;
        width: 100% !important;
        box-sizing: border-box !important;
    }
    #btn-exit {
        color: #cf6679 !important;
    }
    #btn-exit:hover {
        background-color: rgba(207, 102, 121, 0.12) !important;
        border-color: rgba(207, 102, 121, 0.25) !important;
        color: #ffb4c1 !important;
        box-shadow: 0 4px 12px rgba(207, 102, 121, 0.15) !important;
    }

    /* Header Round Action Buttons */
    .header-round-btn {
        width: 36px !important;
        height: 36px !important;
        min-width: 36px !important;
        border-radius: 50% !important;
        padding: 0 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        background: transparent !important;
        border: none !important;
        box-shadow: none !important;
        color: #a1a1aa !important;
        cursor: pointer !important;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
        margin: 0 !important;
        pointer-events: auto !important;
    }
    
    #top-header {
        top: 2px !important;
        margin-bottom: 2px !important;
    }
    .header-round-btn:hover, .header-round-btn:focus {
        color: #ffffff !important;
        background: rgba(255, 255, 255, 0.1) !important;
        transform: scale(1.1) !important;
    }
    .header-round-btn.active {
        color: var(--primary-accent) !important;
        background: rgba(187, 134, 252, 0.15) !important;
        box-shadow: 0 0 10px rgba(187, 134, 252, 0.2) !important;
    }
    #btn-exit.header-round-btn:hover, #btn-exit.header-round-btn:focus {
        color: #cf6679 !important;
        background: rgba(207, 102, 121, 0.15) !important;
        box-shadow: none !important;
        border: none !important;
    }

    #player-overlay {
        pointer-events: none !important;
    }

    /* Live TV Screen Split Layout */
    #main-view {
        flex: 1 !important;
        display: flex !important;
        flex-direction: column !important;
        min-width: 0 !important;
        min-height: 0 !important;
        overflow: hidden !important;
        gap: 6px !important;
        padding: 0 12px 12px 0 !important; /* Visual padding wrapper around panels */
        gap: 4px !important;
        padding: 0 4px 4px 0 !important; /* Visual padding wrapper around panels */
    }
    #live-top-half {
        display: flex !important;
        flex-direction: row !important;
        height: 50% !important;
        width: 100% !important;
        gap: 12px !important;
        gap: 4px !important;
        min-width: 0 !important;
        min-height: 0 !important;
    }
    #live-bottom-half {
        height: 50% !important;
        width: 100% !important;
        min-width: 0 !important;
        min-height: 0 !important;
        background: rgba(18, 18, 24, 0.45) !important;
        backdrop-filter: blur(20px) !important;
        -webkit-backdrop-filter: blur(20px) !important;
        border: 1px solid rgba(255, 255, 255, 0.05) !important;
        border-radius: 0 !important;
        box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3) !important;
        padding: 0 !important;
        box-sizing: border-box !important;
        overflow: hidden !important;
    }
    
    #player-wrapper {
        flex: none !important;
        aspect-ratio: 16 / 9 !important;
        height: 100% !important;
        width: auto !important;
        order: 1 !important;
        margin-left: 24px !important;
        margin-left: 0 !important;
        background-color: #050507 !important;
        padding: 1px !important;
        box-sizing: border-box !important;
        border: 1px solid rgba(255, 255, 255, 0.05) !important;
        border-radius: 24px !important;
        position: relative !important;
        display: flex !important;
        flex-direction: column !important;
        overflow: hidden !important;
        min-width: 0 !important;
        min-height: 0 !important;
        box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.4) !important;
    }
    #player-container {
        flex: 1 !important;
        position: relative !important;
        width: 100% !important;
        height: 100% !important;
        min-width: 0 !important;
        min-height: 0 !important;
        background: #000 !important;
    }

    /* Channel details premium info widget styling */
    #channel-details {
        flex: 1 !important;
        order: 2 !important;
        overflow-y: auto !important;
        min-width: 0 !important;
        min-height: 0 !important;
        background: rgba(18, 18, 24, 0.45) !important;
        backdrop-filter: blur(20px) !important;
        -webkit-backdrop-filter: blur(20px) !important;
        border: 1px solid rgba(255, 255, 255, 0.05) !important;
        border-radius: 24px !important;
        box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3) !important;
        display: flex !important;
        flex-direction: row !important;
        align-items: stretch !important;
        justify-content: flex-start !important;
        padding: 20px !important;
        box-sizing: border-box !important;
        gap: 20px !important;
    }
    
    #detail-logo {
        background: #232328 !important;
        border: 1px solid rgba(255, 255, 255, 0.08) !important;
        border-radius: 10px !important;
        padding: 6px !important;
        box-shadow: 0 4px 14px rgba(0,0,0,0.4) !important;
        margin-bottom: 10px !important;
        width: 100px !important;
        height: 100px !important;
        max-width: 100px !important;
        max-height: 100px !important;
        object-fit: contain !important;
        align-self: center !important;
        transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1) !important;
    }
    #detail-logo:hover {
        border-color: rgba(255, 255, 255, 0.25) !important;
        transform: scale(1.05) !important;
        box-shadow: 0 6px 20px rgba(0,0,0,0.5) !important;
    }
    
    #detail-name {
        color: #ffffff !important;
        text-align: center !important;
        font-size: 0.92rem !important;
        font-weight: 700 !important;
        letter-spacing: -0.01em !important;
        margin: 0 !important;
        width: 100% !important;
        word-break: break-word !important;
        white-space: normal !important;
        font-family: 'Inter', sans-serif !important;
        line-height: 1.35 !important;
        overflow: visible !important;
        text-overflow: clip !important;
        height: auto !important;
        max-height: none !important;
    }

    #detail-info {
        display: flex !important;
        flex-direction: column !important;
        gap: 8px !important;
        width: 100% !important;
        max-width: none !important;
        font-family: 'Inter', sans-serif !important;
        font-size: 0.85rem !important;
        color: #a1a1aa !important;
        border-top: none !important;
        padding-top: 0 !important;
    }
    
    #detail-info strong {
        font-weight: 600 !important;
        color: #e4e4e7 !important;
        text-transform: uppercase !important;
        font-size: 0.68rem !important;
        letter-spacing: 0.08em !important;
        display: inline-block;
        margin-bottom: 2px;
    }
    
    #detail-program {
        color: #ffffff !important;
        font-size: 0.82rem !important;
        font-weight: 500 !important;
        line-height: 1.5 !important;
        background: rgba(187, 134, 252, 0.04) !important;
        border: 1px solid rgba(187, 134, 252, 0.08) !important;
        padding: 8px 12px 8px 28px !important;
        border-radius: 8px !important;
        position: relative !important;
        box-shadow: 0 2px 6px rgba(0,0,0,0.1) !important;
    }

    /* Pulsing active Live Broadcast Indicator */
    #detail-program::before {
        content: "";
        position: absolute;
        left: 12px;
        top: 50%;
        transform: translateY(-50%);
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background-color: var(--emerald-live);
        box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
        animation: livePulse 1.8s infinite;
    }
    @keyframes livePulse {
        0% {
            transform: translateY(-50%) scale(0.95);
            box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
        }
        70% {
            transform: translateY(-50%) scale(1);
            box-shadow: 0 0 0 5px rgba(16, 185, 129, 0);
        }
        100% {
            transform: translateY(-50%) scale(0.95);
            box-shadow: 0 0 0 0 rgba(16, 185, 129, 0);
        }
    }

    /* EPG Timeline Card layout */
    #epg-container {
        display: flex !important;
        flex-direction: column !important;
        gap: 12px !important;
        padding-bottom: 20px !important;
    }
    
    .live-epg-item {
        background: rgba(255, 255, 255, 0.015) !important;
        border: 1px solid rgba(255, 255, 255, 0.04) !important;
        padding: 4px 8px !important;
        border-radius: 12px !important;
        border-left: 3px solid rgba(255, 255, 255, 0.08) !important;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;
        transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important;
        outline: none !important;
        cursor: pointer !important;
    }
    
    .live-epg-item:hover, .live-epg-item:focus {
        background: rgba(255, 255, 255, 0.035) !important;
        border-color: rgba(187, 134, 252, 0.15) !important;
        transform: translateY(-2px) !important;
        box-shadow: 0 6px 18px rgba(0,0,0,0.25) !important;
    }
    
    /* Highlight the current EPG live program */
    .live-epg-item[style*="border-left: 4px solid rgb(67, 203, 68)"],
    .live-epg-item[style*="border-left-color: rgb(67, 203, 68)"],
    .live-epg-item[style*="#43CB44"] {
        border-left: 3px solid var(--emerald-live) !important;
        background: rgba(16, 185, 129, 0.02) !important;
        border-color: rgba(16, 185, 129, 0.08) !important;
        box-shadow: 0 4px 14px rgba(16, 185, 129, 0.04) !important;
    }
    
    /* Current program title glow */
    .live-epg-item div[style*="color: rgb(67, 203, 68)"],
    .live-epg-item div[style*="#43CB44"] {
        color: #34d399 !important;
        font-weight: 600 !important;
        text-shadow: 0 0 10px rgba(52, 211, 153, 0.2) !important;
    }

    /* Subtitle (EPG item title wrapper) */
    .live-epg-item div[style*="font-weight: bold"],
    .live-epg-item div[style*="bold"] {
        font-weight: 600 !important;
        font-size: 0.95rem !important;
        letter-spacing: -0.01em !important;
        color: #ffffff !important;
    }
    
    .live-epg-item span {
        font-size: 0.88rem !important;
        color: #e4e4e7 !important;
        font-weight: 500 !important;
    }
    
    /* EPG list times styling */
    .live-epg-item div[style*="color: rgb(187, 134, 252)"],
    .live-epg-item div[style*="#bb86fc"] {
        color: #a78bfa !important;
        font-size: 0.76rem !important;
        font-weight: 600 !important;
        letter-spacing: 0.02em !important;
        text-transform: uppercase !important;
    }
    
    /* EPG program description text styling */
    .live-epg-item div[style*="color: rgb(136, 136, 136)"],
    .live-epg-item div[style*="#888"] {
        color: #a1a1aa !important;
        font-size: 0.8rem !important;
        line-height: 1.55 !important;
        margin-top: 6px !important;
    }

    /* Unified Global Premium Scrollbar Styling (EPG Guide Pill Style) */
    ::-webkit-scrollbar {
        width: 12px !important;
        height: 12px !important;
    }
    
    ::-webkit-scrollbar-track {
        background: #121212 !important;
        border-left: 1px solid rgba(255, 255, 255, 0.05) !important;
        border-top: 1px solid rgba(255, 255, 255, 0.05) !important;
    }
    
    ::-webkit-scrollbar-thumb {
        background: #5c5c66 !important; /* Brighter pill thumb */
        border-radius: 6px !important;
        border: 3px solid #121212 !important; /* Elegant inset boundary */
    }
    
    ::-webkit-scrollbar-thumb:hover {
        background: #bb86fc !important; /* Glowing hover neon purple */
    }

    ::-webkit-scrollbar-corner {
        background: #121212 !important;
    }

    /* Fullscreen button overlay */
    #fullscreen-btn {
        position: absolute;
        top: 20px;
        right: 20px;
        background: rgba(0,0,0,0.7);
        backdrop-filter: blur(10px);
        color: white;
        border: 1px solid rgba(255,255,255,0.2);
        border-radius: 12px;
        width: 96px;
        height: 96px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        z-index: 100;
        transition: opacity 0.3s, background-color 0.2s, transform 0.2s;
        opacity: 0;
    }
    #fullscreen-btn:hover {
        background: rgba(0,0,0,0.9);
        transform: scale(1.05);
    }
    #player-container:hover #fullscreen-btn {
        opacity: 1;
    }

    #import-submit-btn, #import-cancel-btn {
        padding: 8px 16px !important;
        font-size: 0.9em !important;
        height: auto !important;
        width: fit-content !important;
        min-width: 100px;
        white-space: nowrap;
    }

    .settings-menu-btn {
        background: transparent;
        border: none;
        color: #888;
        padding: 10px 15px;
        text-align: left;
        border-radius: 8px;
        cursor: pointer;
        font-weight: 500;
        font-size: 0.95em;
        font-family: 'Outfit', 'Inter', sans-serif;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        width: 100%;
        box-sizing: border-box;
    }
    .settings-menu-btn:hover {
        color: #bb86fc;
        background: rgba(187, 134, 252, 0.08);
    }
    .settings-menu-btn.active {
        color: #000 !important;
        background: #bb86fc !important;
        font-weight: bold !important;
    }

    /* ========================================== */
    /*   EPG Guide Page Premium Redesign Overlays */
    /* ========================================== */

    /* Glass layout for EPG guide outer wrapper */
    #epg-view {
        background: transparent !important;
        border: none !important;
        padding: 2px 24px 24px 24px !important;
    }

    #epg-playlist-filter, #epg-group-filter {
        background: rgba(255, 255, 255, 0.03) !important;
        border: 1px solid rgba(255, 255, 255, 0.06) !important;
        color: #e4e4e7 !important;
        border-radius: 8px !important;
        font-size: 0.85em !important;
        font-weight: 500 !important;
        padding: 8px 14px !important;
        font-family: 'Inter', sans-serif !important;
        transition: all 0.2s ease !important;
        outline: none !important;
        cursor: pointer;
    }
    #epg-playlist-filter:hover, #epg-group-filter:hover {
        background: rgba(255, 255, 255, 0.06) !important;
        border-color: rgba(187, 134, 252, 0.25) !important;
    }

    #epg-now-btn {
        background: rgba(187, 134, 252, 0.12) !important;
        border: 1px solid rgba(187, 134, 252, 0.25) !important;
        color: var(--primary-accent) !important;
        font-weight: bold !important;
        box-shadow: 0 4px 12px rgba(187, 134, 252, 0.1) !important;
        padding: 8px 20px !important;
        border-radius: 8px !important;
        transition: all 0.2s ease !important;
        font-family: 'Inter', sans-serif !important;
        font-size: 0.85em !important;
    }
    #epg-now-btn:hover {
        background: var(--primary-accent) !important;
        color: #000000 !important;
        transform: translateY(-2px) !important;
        box-shadow: 0 6px 16px rgba(187, 134, 252, 0.3) !important;
        border-color: var(--primary-accent) !important;
    }

    #epg-layout-wrapper {
        background: rgba(18, 18, 24, 0.45) !important;
        backdrop-filter: blur(24px) !important;
        -webkit-backdrop-filter: blur(24px) !important;
        border: 1px solid rgba(255, 255, 255, 0.05) !important;
        border-radius: 16px !important;
        box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3) !important;
    }

    /* EPG guide header row container override */
    #epg-layout-wrapper > div:first-child {
        background: rgba(255, 255, 255, 0.02) !important;
        border-bottom: 1px solid rgba(255, 255, 255, 0.06) !important;
        height: 38px !important;
    }
    
    /* EPG left channel header title block */
    #epg-layout-wrapper > div:first-child > div:first-child {
        background: rgba(0, 0, 0, 0.15) !important;
        border-bottom: none !important;
        border-right: 1px solid rgba(255, 255, 255, 0.05) !important;
        color: #e4e4e7 !important;
        font-size: 0.72rem !important;
        font-weight: 600 !important;
        text-transform: uppercase !important;
        letter-spacing: 0.06em !important;
        height: 38px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
    }

    /* Dynamic timeline hour items */
    #epg-header-scroll div {
        border-right: 1px solid rgba(255, 255, 255, 0.04) !important;
        border-bottom: none !important;
        color: #a1a1aa !important;
        font-size: 0.74rem !important;
        font-weight: 500 !important;
        text-transform: uppercase !important;
        letter-spacing: 0.02em !important;
        height: 38px !important;
        display: flex !important;
        align-items: center !important;
        padding-left: 12px !important;
        background: transparent !important;
    }
    
    #epg-header-spacer {
        background: transparent !important;
        border-bottom: none !important;
        height: 38px !important;
    }

    /* Channels left fixed column */
    #epg-channels-col {
        background: rgba(0, 0, 0, 0.15) !important;
        border-right: 1px solid rgba(255, 255, 255, 0.05) !important;
    }

    /* Channels rows in full EPG guide */
    #epg-channels-inner > .epg-play-channel {
        background: rgba(255, 255, 255, 0.01) !important;
        border-bottom: 1px solid rgba(255, 255, 255, 0.03) !important;
        padding: 10px 14px !important;
        transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important;
        display: flex !important;
        align-items: center !important;
    }
    #epg-channels-inner > .epg-play-channel:hover {
        background: rgba(187, 134, 252, 0.05) !important;
        transform: scale(0.98) !important;
    }
    #epg-channels-inner > .epg-play-channel img {
        width: 32px !important;
        height: 32px !important;
        min-width: 32px !important;
        border-radius: 6px !important;
        background: #2A2A2A !important;
        border: 1px solid rgba(255, 255, 255, 0.06) !important;
        padding: 4px !important;
        object-fit: contain !important;
        margin-right: 12px !important;
        box-shadow: 0 2px 5px rgba(0,0,0,0.3) !important;
    }
    #epg-channels-inner > .epg-play-channel span {
        font-size: 0.8rem !important;
        font-weight: 500 !important;
        color: #e4e4e7 !important;
        font-family: 'Inter', sans-serif !important;
    }

    /* Scroll Container & Rows */
    #epg-scroll-container {
        background: rgba(0, 0, 0, 0.22) !important;
    }
    
    /* Program timeline cells styling */
    .epg-program-cell {
        border-right: 1px solid rgba(255, 255, 255, 0.15) !important;
        border-bottom: 1px solid rgba(255, 255, 255, 0.15) !important;
        border-top: 1px solid rgba(255, 255, 255, 0.15) !important;
        background: rgba(255, 255, 255, 0.015) !important;
        padding: 2px 4px !important;
        transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important;
        box-sizing: border-box !important;
    }
    .epg-program-cell:hover, .epg-program-cell:focus {
        background: rgba(255, 255, 255, 0.035) !important;
        border-top-color: var(--primary-accent) !important;
        box-shadow: inset 0 0 10px rgba(187, 134, 252, 0.05) !important;
    }
    
    /* Highlight the currently active program on timeline */
    .epg-program-cell[style*="border-top: 2px solid rgb(187, 134, 252)"],
    .epg-program-cell[style*="border-top-color: rgb(187, 134, 252)"],
    .epg-program-cell[style*="border-top: 2px solid #bb86fc"],
    .epg-program-cell[style*="border-top-color: #bb86fc"] {
        background: rgba(187, 134, 252, 0.12) !important;
        border-top: 1px solid rgba(255, 255, 255, 0.15) !important;
        box-shadow: inset 0 0 14px rgba(187, 134, 252, 0.35), 0 0 10px rgba(187, 134, 252, 0.2) !important;
    }
    
    .epg-program-cell div:first-child {
        font-size: 0.8rem !important;
        font-weight: 600 !important;
        color: #ffffff !important;
        letter-spacing: -0.01em !important;
    }
    
    .epg-program-cell div:last-child {
        font-size: 0.72rem !important;
        color: #a1a1aa !important;
        margin-top: 4px !important;
    }

    /* Sleek glowing current timeline vertical tracker */
    #epg-time-indicator {
        background: #ec4899 !important; /* Glowing hot pink */
        box-shadow: 0 0 8px rgba(236, 72, 153, 0.8) !important;
        width: 1.5px !important;
        z-index: 15 !important;
    }

    /* Guide custom scrollbars */
    #epg-scroll-container::-webkit-scrollbar {
        width: 12px !important;
        height: 12px !important;
    }
    #epg-scroll-container::-webkit-scrollbar-track {
        background: #121212 !important;
        border-left: 1px solid rgba(255, 255, 255, 0.05) !important;
        border-top: 1px solid rgba(255, 255, 255, 0.05) !important;
    }
    #epg-scroll-container::-webkit-scrollbar-thumb {
        background: #5c5c66 !important;
        border-radius: 6px !important;
        border: 3px solid #121212 !important;
    }
    #epg-scroll-container::-webkit-scrollbar-thumb:hover {
        background: #bb86fc !important;
    }
    #epg-scroll-container::-webkit-scrollbar-corner {
        background: #121212 !important;
    }

    /* ========================================== */
    /*   Playlists Page Premium Redesign Overlays */
    /* ========================================== */

    #playlist-view {
        background: transparent !important;
        border: none !important;
        padding: 24px !important;
    }

    #playlist-view > div > div {
        background: rgba(18, 18, 24, 0.45) !important;
        backdrop-filter: blur(24px) !important;
        -webkit-backdrop-filter: blur(24px) !important;
        border: 1px solid rgba(255, 255, 255, 0.05) !important;
        border-radius: 16px !important;
        box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3) !important;
        padding: 24px !important;
        box-sizing: border-box !important;
        transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important;
    }
    #playlist-view > div > div:hover {
        border-color: rgba(187, 134, 252, 0.2) !important;
        transform: translateY(-4px) !important;
        box-shadow: 0 12px 36px rgba(0, 0, 0, 0.4) !important;
    }

    #playlist-view input[type="text"],
    #playlist-view input[type="password"] {
        background: rgba(255, 255, 255, 0.03) !important;
        border: 1px solid rgba(255, 255, 255, 0.06) !important;
        color: #ffffff !important;
        border-radius: 8px !important;
        padding: 10px 14px !important;
        font-family: 'Inter', sans-serif !important;
        font-size: 0.85em !important;
        transition: all 0.25s ease !important;
        outline: none !important;
        box-shadow: inset 0 2px 4px rgba(0,0,0,0.3) !important;
        width: 100%;
        box-sizing: border-box;
    }
    #playlist-view input[type="text"]:focus,
    #playlist-view input[type="password"]:focus {
        border-color: var(--primary-accent) !important;
        background: rgba(255, 255, 255, 0.05) !important;
        box-shadow: inset 0 2px 4px rgba(0,0,0,0.3), 0 0 10px rgba(187, 134, 252, 0.15) !important;
    }

    .import-mode-btn {
        background: rgba(255, 255, 255, 0.03) !important;
        border: 1px solid rgba(255, 255, 255, 0.05) !important;
        color: #a1a1aa !important;
        border-radius: 8px !important;
        padding: 8px 12px !important;
        font-weight: 600 !important;
        font-size: 0.82em !important;
        font-family: 'Inter', sans-serif !important;
        transition: all 0.2s ease !important;
    }
    .import-mode-btn:hover {
        background: rgba(255, 255, 255, 0.08) !important;
        color: #ffffff !important;
    }
    .import-mode-btn.active {
        background: rgba(187, 134, 252, 0.12) !important;
        color: var(--primary-accent) !important;
        border-color: rgba(187, 134, 252, 0.25) !important;
        box-shadow: 0 4px 12px rgba(187, 134, 252, 0.1) !important;
    }

    #import-browse-btn {
        background: rgba(255, 255, 255, 0.05) !important;
        border: 1px solid rgba(255, 255, 255, 0.08) !important;
        color: #ffffff !important;
        border-radius: 8px !important;
        transition: all 0.2s ease !important;
        padding: 10px 20px !important;
    }
    #import-browse-btn:hover {
        background: rgba(255, 255, 255, 0.1) !important;
        transform: translateY(-1px) !important;
    }

    #import-submit-btn, #import-stalker-submit-btn, #import-xtreme-submit-btn {
        background: var(--primary-accent) !important;
        color: #000000 !important;
        font-weight: bold !important;
        border-radius: 8px !important;
        border: none !important;
        transition: all 0.25s ease !important;
        box-shadow: 0 4px 14px rgba(187, 134, 252, 0.25) !important;
        padding: 10px 20px !important;
    }
    #import-submit-btn:hover, #import-stalker-submit-btn:hover, #import-xtreme-submit-btn:hover {
        transform: translateY(-2px) !important;
        box-shadow: 0 6px 20px rgba(187, 134, 252, 0.4) !important;
        filter: brightness(1.1) !important;
    }

    #playlist-cards > div {
        background: rgba(18, 18, 24, 0.45) !important;
        backdrop-filter: blur(24px) !important;
        -webkit-backdrop-filter: blur(24px) !important;
        border: 1px solid rgba(255, 255, 255, 0.05) !important;
        border-radius: 16px !important;
        box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3) !important;
        padding: 24px !important;
        box-sizing: border-box !important;
        margin-bottom: 16px !important;
        transition: all 0.25s ease !important;
    }
    #playlist-cards > div:hover {
        border-color: rgba(187, 134, 252, 0.15) !important;
        transform: translateY(-3px) !important;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35) !important;
    }
    #playlist-cards h3 {
        font-size: 1rem !important;
        font-weight: 700 !important;
        letter-spacing: -0.01em !important;
    }
    #playlist-cards span {
        font-size: 0.8rem !important;
        color: #a1a1aa !important;
    }
    #playlist-cards strong {
        color: #e4e4e7 !important;
        font-weight: 600 !important;
    }

    /* ========================================== */
    /*   Settings Page Premium Redesign Overlays  */
    /* ========================================== */

    #settings-view {
        background: transparent !important;
        border: none !important;
        padding: 24px !important;
    }

    /* Left Mini Menu Panel */
    #settings-view > div > div:first-child {
        background: rgba(18, 18, 24, 0.45) !important;
        backdrop-filter: blur(24px) !important;
        -webkit-backdrop-filter: blur(24px) !important;
        border: 1px solid rgba(255, 255, 255, 0.05) !important;
        border-radius: 16px !important;
        box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3) !important;
        padding: 20px !important;
    }

    .settings-menu-btn {
        background: rgba(255, 255, 255, 0.02) !important;
        border: 1px solid rgba(255, 255, 255, 0.04) !important;
        color: #a1a1aa !important;
        padding: 10px 15px !important;
        text-align: left !important;
        border-radius: 10px !important;
        cursor: pointer !important;
        font-weight: 500 !important;
        font-size: 0.88rem !important;
        font-family: 'Inter', sans-serif !important;
        transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important;
        display: flex !important;
        align-items: center !important;
        width: 100% !important;
        box-sizing: border-box !important;
        margin-bottom: 6px !important;
    }
    .settings-menu-btn:hover {
        color: #ffffff !important;
        background: rgba(255, 255, 255, 0.08) !important;
        border-color: rgba(255, 255, 255, 0.08) !important;
        transform: translateY(-1px) !important;
    }
    .settings-menu-btn.active {
        color: var(--primary-accent) !important;
        background: rgba(187, 134, 252, 0.12) !important;
        border-color: rgba(187, 134, 252, 0.25) !important;
        box-shadow: 0 4px 16px rgba(187, 134, 252, 0.1) !important;
        font-weight: 600 !important;
    }

    .settings-menu-btn[data-target="card-danger"] {
        color: #ff6b6b !important;
        border-color: rgba(207, 102, 121, 0.15) !important;
    }
    .settings-menu-btn[data-target="card-danger"]:hover {
        color: #ffffff !important;
        background: rgba(207, 102, 121, 0.15) !important;
        border-color: rgba(207, 102, 121, 0.3) !important;
    }
    .settings-menu-btn[data-target="card-danger"].active {
        color: #ffffff !important;
        background: rgba(207, 102, 121, 0.3) !important;
        border-color: rgba(207, 102, 121, 0.5) !important;
        box-shadow: 0 4px 16px rgba(207, 102, 121, 0.2) !important;
    }

    /* Right column panels overrides */
    #card-epg, #card-reminders, #card-mapping, #card-remote, #card-tmdb {
        background: rgba(18, 18, 24, 0.45) !important;
        backdrop-filter: blur(24px) !important;
        -webkit-backdrop-filter: blur(24px) !important;
        border: 1px solid rgba(255, 255, 255, 0.05) !important;
        border-radius: 16px !important;
        box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3) !important;
        padding: 24px !important;
        box-sizing: border-box !important;
        transition: all 0.25s ease !important;
    }
    #card-epg:hover, #card-reminders:hover, #card-mapping:hover, #card-remote:hover, #card-tmdb:hover {
        border-color: rgba(187, 134, 252, 0.1) !important;
    }

    #card-danger {
        background: linear-gradient(135deg, rgba(207, 102, 121, 0.08), rgba(207, 102, 121, 0.02)) !important;
        backdrop-filter: blur(24px) !important;
        -webkit-backdrop-filter: blur(24px) !important;
        border: 1px solid rgba(207, 102, 121, 0.35) !important;
        border-radius: 16px !important;
        box-shadow: 0 8px 32px rgba(207, 102, 121, 0.1), inset 0 0 20px rgba(207, 102, 121, 0.05) !important;
        padding: 24px !important;
        box-sizing: border-box !important;
        transition: all 0.25s ease !important;
    }
    #card-danger:hover {
        border-color: rgba(207, 102, 121, 0.5) !important;
        box-shadow: 0 12px 40px rgba(207, 102, 121, 0.15), inset 0 0 20px rgba(207, 102, 121, 0.08) !important;
    }

    #settings-factory-reset-btn {
        background: #ff5252 !important;
        color: white !important;
        border: 1px solid rgba(255, 82, 82, 0.2) !important;
        box-shadow: 0 4px 15px rgba(255, 82, 82, 0.3) !important;
        font-weight: bold !important;
        transition: all 0.2s ease !important;
    }
    #settings-factory-reset-btn:hover {
        background: #ff6b6b !important;
        transform: translateY(-2px) !important;
        box-shadow: 0 8px 20px rgba(255, 82, 82, 0.4) !important;
    }
    #settings-factory-reset-btn:active {
        background: #e63946 !important;
        transform: translateY(0) !important;
        box-shadow: 0 2px 4px rgba(255, 82, 82, 0.2) !important;
    }
    
    #settings-view h3 {
        font-size: 1.05rem !important;
        font-weight: 700 !important;
        letter-spacing: -0.01em !important;
        color: #ffffff !important;
        margin-top: 0 !important;
    }
    #settings-view p {
        font-size: 0.82rem !important;
        color: #a1a1aa !important;
        line-height: 1.5 !important;
    }

    #settings-new-epg, 
    #settings-remote-user, 
    #settings-remote-pass, 
    #settings-remote-port,
    #settings-tmdb-key,
    #settings-tmdb-token {
        background: rgba(255, 255, 255, 0.03) !important;
        border: 1px solid rgba(255, 255, 255, 0.06) !important;
        color: #ffffff !important;
        border-radius: 8px !important;
        padding: 10px 14px !important;
        font-family: 'Inter', sans-serif !important;
        font-size: 0.85em !important;
        transition: all 0.25s ease !important;
        outline: none !important;
        box-shadow: inset 0 2px 4px rgba(0,0,0,0.3) !important;
    }
    #settings-new-epg:focus, 
    #settings-remote-user:focus, 
    #settings-remote-pass:focus,
    #settings-remote-port:focus,
    #settings-tmdb-key:focus,
    #settings-tmdb-token:focus {
        border-color: var(--primary-accent) !important;
        background: rgba(255, 255, 255, 0.05) !important;
        box-shadow: inset 0 2px 4px rgba(0,0,0,0.3), 0 0 10px rgba(187, 134, 252, 0.15) !important;
    }

    /* Inner rows list settings panels */
    #settings-epg-list > div,
    #settings-reminders-list > div {
        background: rgba(255, 255, 255, 0.015) !important;
        border: 1px solid rgba(255, 255, 255, 0.03) !important;
        border-radius: 10px !important;
        padding: 12px 16px !important;
        margin-bottom: 10px !important;
        transition: all 0.2s ease !important;
        display: flex !important;
        justify-content: space-between !important;
        align-items: center !important;
    }
    #settings-epg-list > div:hover,
    #settings-reminders-list > div:hover {
        background: rgba(255, 255, 255, 0.03) !important;
        border-color: rgba(255, 255, 255, 0.08) !important;
    }
    #settings-epg-list span,
    #settings-reminders-list span {
        font-family: 'Inter', sans-serif !important;
    }

    /* Pinned sub-columns in Channel Mapping widget */
    #card-mapping > div > div > div {
        background: rgba(0, 0, 0, 0.15) !important;
        border: 1px solid rgba(255, 255, 255, 0.04) !important;
        border-radius: 10px !important;
    }
    
    /* Headers in sub-columns */
    #card-mapping > div > div > div > div:first-child {
        background: rgba(255, 255, 255, 0.015) !important;
        border-bottom: 1px solid rgba(255, 255, 255, 0.04) !important;
        color: #e4e4e7 !important;
        font-size: 0.85em !important;
        font-weight: 600 !important;
    }
    
    /* Selects and inputs inside mapping columns */
    #card-mapping select,
    #card-mapping input[type="text"] {
        background: rgba(0, 0, 0, 0.3) !important;
        border: 1px solid rgba(255, 255, 255, 0.06) !important;
        color: #ffffff !important;
        border-radius: 6px !important;
        font-size: 0.8em !important;
        padding: 6px 10px !important;
        transition: all 0.2s ease !important;
    }
    #card-mapping select:focus,
    #card-mapping input[type="text"]:focus {
        border-color: var(--primary-accent) !important;
    }

    .mapping-ch-item, .mapping-epg-item, .mapping-mapped-item {
        padding: 8px 12px !important;
        margin: 4px 6px !important;
        border-radius: 6px !important;
        font-size: 0.78rem !important;
        font-family: 'Inter', sans-serif !important;
        transition: all 0.2s ease !important;
        box-sizing: border-box !important;
    }
    .mapping-ch-item {
        border: 1px solid rgba(255, 255, 255, 0.02) !important;
        background: transparent !important;
        color: #d1d5db !important;
    }
    .mapping-ch-item:hover, .mapping-ch-item:focus {
        background: rgba(255, 255, 255, 0.03) !important;
        border-color: rgba(255, 255, 255, 0.08) !important;
        color: #ffffff !important;
    }
    .mapping-ch-item[style*="background: rgb(26, 58, 26)"],
    .mapping-ch-item[style*="background: #1a3a1a"],
    .mapping-ch-item[style*="border: 1px solid rgb(67, 203, 68)"],
    .mapping-ch-item[style*="#43CB44"] {
        background: rgba(16, 185, 129, 0.08) !important;
        border-color: rgba(16, 185, 129, 0.3) !important;
        color: #34d399 !important;
    }
    
    .mapping-epg-item {
        border: 1px solid rgba(255, 255, 255, 0.02) !important;
        background: transparent !important;
        color: #d1d5db !important;
    }
    .mapping-epg-item:hover, .mapping-epg-item:focus {
        background: rgba(255, 255, 255, 0.03) !important;
        border-color: rgba(255, 255, 255, 0.08) !important;
        color: #ffffff !important;
    }
    .mapping-epg-item[style*="background: rgb(26, 58, 26)"],
    .mapping-epg-item[style*="background: #1a3a1a"],
    .mapping-epg-item[style*="border: 1px solid rgb(67, 203, 68)"],
    .mapping-epg-item[style*="#43CB44"] {
        background: rgba(16, 185, 129, 0.08) !important;
        border-color: rgba(16, 185, 129, 0.3) !important;
        color: #34d399 !important;
    }
    
    .mapping-mapped-item {
        border: 1px solid rgba(255, 255, 255, 0.03) !important;
        background: rgba(255, 255, 255, 0.01) !important;
        color: #d1d5db !important;
    }
    .mapping-mapped-item:hover {
        background: rgba(255, 255, 255, 0.02) !important;
        border-color: rgba(255, 255, 255, 0.06) !important;
    }
`;
document.head.appendChild(aeroStyles);

const channelList = document.getElementById('channel-list');
const playerContainer = document.getElementById('player-container');
const clearBtn = document.getElementById('clear-btn');
const loadingMsg = document.getElementById('loading');

const importNameInput = document.getElementById('import-name');
const btnModeFile = document.getElementById('btn-mode-file');
const btnModeUrl = document.getElementById('btn-mode-url');
const containerFile = document.getElementById('input-container-file');
const containerUrl = document.getElementById('input-container-url');
const importFilePath = document.getElementById('import-file-path');
const importUrlPath = document.getElementById('import-url-path');
const importBrowseBtn = document.getElementById('import-browse-btn');
const importSubmitBtn = document.getElementById('import-submit-btn');
const importEpgInput = document.getElementById('import-epg-path'); // New Input Field
const importCancelBtn = document.getElementById('import-cancel-btn');

const importStalkerName = document.getElementById('import-stalker-name');
const importStalkerUrl = document.getElementById('import-stalker-url');
const importStalkerMac = document.getElementById('import-stalker-mac');
const importStalkerSubmitBtn = document.getElementById('import-stalker-submit-btn');
const importStalkerCancelBtn = document.getElementById('import-stalker-cancel-btn');

const importXtremeName = document.getElementById('import-xtreme-name');
const importXtremeUrl = document.getElementById('import-xtreme-url');
const importXtremeUser = document.getElementById('import-xtreme-user');
const importXtremePass = document.getElementById('import-xtreme-pass');
const importXtremeSubmitBtn = document.getElementById('import-xtreme-submit-btn');
const importXtremeCancelBtn = document.getElementById('import-xtreme-cancel-btn');

let savedPlaylists = [];
let allChannels = [];
let streamActive = false;
let currentPlayingChannelIndex = -1;
let editingPlaylistIndex = -1;

let savedEpgs = [];
let channelMappings = {};

let savedReminders = JSON.parse(localStorage.getItem('iptv_reminders') || '[]');
let clientActiveRecordings = [];
let clientScheduledRecordings = [];

window.isAutoplayEnabled = localStorage.getItem('iptv_autoplay_next') !== 'false';
window.currentPlayingSeriesEpisodes = [];

// Prevent forms from reloading the Electron application
document.addEventListener('submit', (e) => {
    e.preventDefault();
});

function saveReminders() {
    console.log('[REMINDER] Saving reminders to localStorage');
    localStorage.setItem('iptv_reminders', JSON.stringify(savedReminders));
}

function toggleReminder(channelTitle, progTitle, startTimeStr, stopTimeStr) {
    const existingIdx = savedReminders.findIndex(r => r.channelTitle === channelTitle && r.progTitle === progTitle && r.startTime === startTimeStr);
    if (existingIdx >= 0) {
        savedReminders.splice(existingIdx, 1);
    } else {
        savedReminders.push({ channelTitle, progTitle, startTime: startTimeStr, stopTime: stopTimeStr, notified: false });
    }
    saveReminders();
    if (document.getElementById('settings-view') && document.getElementById('settings-view').style.display === 'flex') {
        renderSettings();
    }
}

function showToast(message) {
    console.log(`[UI] showToast: "${message}"`);
    let toast = document.getElementById('toast-notification');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast-notification';
        document.body.appendChild(toast);
    }
    
    if (toast.hideTimeout) clearTimeout(toast.hideTimeout);
    
    // Style passive toast in the modern, premium obsidian-purple-glass theme
    toast.style.cssText = 'position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%) translateY(20px); background: rgba(18, 18, 24, 0.85); color: #ffffff; border: 1px solid rgba(187, 134, 252, 0.45); padding: 14px 28px; border-radius: 16px; z-index: 10000; font-weight: 600; font-family: "Inter", sans-serif; box-shadow: 0 10px 30px rgba(187, 134, 252, 0.15), 0 5px 15px rgba(0,0,0,0.5); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); transition: opacity 0.3s cubic-bezier(0.25, 0.8, 0.25, 1), transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1); opacity: 0; pointer-events: none; white-space: pre-wrap; text-align: center; font-size: 0.92em; letter-spacing: -0.01em;';
    
    toast.textContent = message;
    
    requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(-50%) translateY(0)';
    });
    
    toast.hideTimeout = setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(20px)';
    }, 3000);
}

function showConfirmToast(message, onConfirm) {
    console.log(`[UI] showConfirmToast: "${message}"`);
    let toast = document.getElementById('toast-notification');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast-notification';
        document.body.appendChild(toast);
    }
    if (toast.hideTimeout) clearTimeout(toast.hideTimeout);
    
    // Style for modern premium interactive look matching the purple-obsidian-glass theme
    toast.style.cssText = 'position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%) translateY(20px); background: rgba(18, 18, 24, 0.85); color: #ffffff; border: 1px solid rgba(187, 134, 252, 0.45); padding: 18px 26px; border-radius: 16px; z-index: 10000; font-family: "Inter", sans-serif; box-shadow: 0 10px 30px rgba(187, 134, 252, 0.15), 0 5px 15px rgba(0,0,0,0.5); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); transition: opacity 0.3s cubic-bezier(0.25, 0.8, 0.25, 1), transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1); opacity: 0; display: flex; flex-direction: column; gap: 12px; align-items: center; pointer-events: auto; min-width: 320px; text-align: center;';
    
    toast.innerHTML = `
        <div style="font-weight: 600; font-size: 0.95em; color: #e4e4e7; line-height: 1.45; letter-spacing: -0.01em;">${message}</div>
        <div style="display: flex; gap: 12px; width: 100%; justify-content: center; margin-top: 4px;">
            <button id="toast-confirm-btn" style="background: #cf6679; color: #000; border: none; padding: 8px 16px; border-radius: 8px; font-weight: bold; cursor: pointer; transition: background 0.2s, transform 0.1s; font-family: 'Inter', sans-serif; font-size: 0.85em; flex: 1;">Delete</button>
            <button id="toast-cancel-btn" style="background: #2a2a2a; color: #fff; border: 1px solid #444; padding: 8px 16px; border-radius: 8px; font-weight: bold; cursor: pointer; transition: background 0.2s, transform 0.1s; font-family: 'Inter', sans-serif; font-size: 0.85em; flex: 1;">Cancel</button>
        </div>
    `;
    
    requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(-50%) translateY(0)';
    });
    
    const hideToast = () => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(20px)';
        toast.style.pointerEvents = 'none';
        setTimeout(() => {
            toast.innerHTML = '';
            // Restore default passive styling just in case
            toast.style.cssText = 'position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%) translateY(20px); background: rgba(18, 18, 24, 0.85); color: #ffffff; border: 1px solid rgba(187, 134, 252, 0.45); padding: 14px 28px; border-radius: 16px; z-index: 10000; font-weight: 600; font-family: "Inter", sans-serif; box-shadow: 0 10px 30px rgba(187, 134, 252, 0.15), 0 5px 15px rgba(0,0,0,0.5); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); transition: opacity 0.3s cubic-bezier(0.25, 0.8, 0.25, 1), transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1); opacity: 0; pointer-events: none; white-space: pre-wrap; text-align: center; font-size: 0.92em; letter-spacing: -0.01em;';
        }, 300);
    };
    
    const confirmBtn = document.getElementById('toast-confirm-btn');
    const cancelBtn = document.getElementById('toast-cancel-btn');
    
    confirmBtn.addEventListener('mouseover', () => confirmBtn.style.background = '#e57386');
    confirmBtn.addEventListener('mouseout', () => confirmBtn.style.background = '#cf6679');
    confirmBtn.addEventListener('mousedown', () => confirmBtn.style.transform = 'scale(0.95)');
    confirmBtn.addEventListener('mouseup', () => confirmBtn.style.transform = 'scale(1)');
    
    cancelBtn.addEventListener('mouseover', () => cancelBtn.style.background = '#383838');
    cancelBtn.addEventListener('mouseout', () => cancelBtn.style.background = '#2a2a2a');
    cancelBtn.addEventListener('mousedown', () => cancelBtn.style.transform = 'scale(0.95)');
    cancelBtn.addEventListener('mouseup', () => cancelBtn.style.transform = 'scale(1)');
    
    confirmBtn.addEventListener('click', () => {
        hideToast();
        onConfirm();
    });
    
    cancelBtn.addEventListener('click', () => {
        hideToast();
    });
    
    toast.hideTimeout = setTimeout(hideToast, 8000);
}

// Variables for the 2-column Mapping UI
let mappingSelectedPlaylist = 'all';
let mappingSelectedChannel = null;
let mappingSelectedEpg = null;
let epgChannelsData = null;

let epgSelectedPlaylist = 'all';
let epgSelectedGroup = 'all';

let playerEpgSelectedPlaylist = 'all';
let playerEpgSelectedGroup = 'all';

// Global variables for virtualized EPG Guide
let epgGridState = null;
let epgChannelsToRender = [];
let epgCache = {};
let epgLoadingSet = new Set();
let epgLastStartIndex = -1;
let epgLastEndIndex = -1;
let epgLastScrollLeft = -1;
let epgScrollTicking = false;

function formatDateToEpgString(date) {
    const pad = n => n.toString().padStart(2, '0');
    return `${date.getUTCFullYear()}${pad(date.getUTCMonth()+1)}${pad(date.getUTCDate())}${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}`;
}

let mappingDebounceTimer;
function debouncedRenderMappingColumns() {
    clearTimeout(mappingDebounceTimer);
    mappingDebounceTimer = setTimeout(renderMappingColumns, 200);
}

function getEpgName(url) {
    if (!url || url === 'Not Configured') return 'Not Configured';
    try {
        return new URL(url).hostname;
    } catch (e) {
        return url.split('\\').pop().split('/').pop();
    }
}

function sortAlphaNum(a, b) {
    return (a || '').toString().localeCompare((b || '').toString(), undefined, { numeric: true, sensitivity: 'base' });
}

async function autoMapChannels(showSummaryAlert = false, skipSave = false) {
    console.log('[MAPPING] Starting auto-map process...');
    let mappedCount = 0;
    const epgLookup = {};
    if (epgChannelsData) {
        epgChannelsData.forEach(epg => {
            if (epg.id) epgLookup[epg.id.toLowerCase()] = epg.id;
            if (epg.name) epgLookup[epg.name.toLowerCase()] = epg.id;
        });
    }

    const uniqueTitles = new Set();
    const mappingsToSave = [];

    for (const ch of allChannels) {
        const title = ch.title || 'Unknown Channel';
        if (uniqueTitles.has(title)) continue;
        uniqueTitles.add(title);
        
        if (channelMappings[title]) continue; // Skip already mapped channels

        let matchedEpgId = null;
        const tvgIdLow = ch.tvg_id ? String(ch.tvg_id).toLowerCase() : null;
        const tvgNameLow = ch.tvg_name ? String(ch.tvg_name).toLowerCase() : null;
        const titleLow = ch.title ? String(ch.title).toLowerCase() : null;

        if (tvgIdLow && epgLookup[tvgIdLow]) matchedEpgId = epgLookup[tvgIdLow];
        else if (tvgNameLow && epgLookup[tvgNameLow]) matchedEpgId = epgLookup[tvgNameLow];
        else if (titleLow && epgLookup[titleLow]) matchedEpgId = epgLookup[titleLow];

        if (matchedEpgId) {
            channelMappings[title] = matchedEpgId;
            mappingsToSave.push({ title, epgId: matchedEpgId });
            mappedCount++;
        }
    }

    if (mappingsToSave.length > 0) {
        console.log(`[MAPPING] Saving ${mappingsToSave.length} mappings in bulk...`);
        await window.iptvAPI.saveMappingsBulk(mappingsToSave);
    }

    if (mappedCount > 0) {
        console.log(`[MAPPING] Auto-mapped ${mappedCount} new channels.`);
        updateState(skipSave);
        renderMappingColumns();
        if (showSummaryAlert) showToast(`Successfully auto-mapped ${mappedCount} channels!`);
    } else {
        console.log('[MAPPING] No new channels could be auto-mapped.');
        if (showSummaryAlert) showToast("No new channels could be auto-mapped.");
    }
}

function updateNavLockState() {
    console.log('[UI] Updating navigation lock state.');
    const hasPlaylists = savedPlaylists.length > 0;
    const btnLiveTv = document.getElementById('btn-live-tv');
    const btnEpg = document.getElementById('btn-epg');
    const btnSettings = document.getElementById('btn-settings');
    
    if (btnLiveTv) {
        btnLiveTv.disabled = !hasPlaylists;
        btnLiveTv.style.opacity = hasPlaylists ? '1' : '0.3';
        btnLiveTv.style.cursor = hasPlaylists ? 'pointer' : 'not-allowed';
    }
    if (btnEpg) {
        btnEpg.disabled = !hasPlaylists;
        btnEpg.style.opacity = hasPlaylists ? '1' : '0.3';
        btnEpg.style.cursor = hasPlaylists ? 'pointer' : 'not-allowed';
    }
    if (btnSettings) {
        btnSettings.disabled = !hasPlaylists;
        btnSettings.style.opacity = hasPlaylists ? '1' : '0.3';
        btnSettings.style.cursor = hasPlaylists ? 'pointer' : 'not-allowed';
    }
    
    ['btn-movies', 'btn-vod', 'btn-recording'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
            btn.disabled = !hasPlaylists;
            btn.style.opacity = hasPlaylists ? '1' : '0.3';
            btn.style.cursor = hasPlaylists ? 'pointer' : 'not-allowed';
        }
    });
}

function renderMappingColumns() {
    console.log('[MAPPING] Rendering mapping columns.');
    const channelListEl = document.getElementById('mapping-channel-list');
    const epgListEl = document.getElementById('mapping-epg-list');
    const mappedListEl = document.getElementById('mapping-mapped-list');
    if (!channelListEl || !epgListEl || !mappedListEl) return;

    // Blur active element inside mapping columns to prevent focus-loss scroll resetting
    if (document.activeElement && (
        channelListEl.contains(document.activeElement) ||
        epgListEl.contains(document.activeElement) ||
        mappedListEl.contains(document.activeElement)
    )) {
        document.activeElement.blur();
    }

    // Save outer settings scroll container position to prevent screen scroll jumping/resetting to top
    const settingsView = document.getElementById('settings-view');
    const settingsScrollTop = settingsView ? settingsView.scrollTop : 0;
    const docScrollTop = document.documentElement.scrollTop || document.body.scrollTop;

    // Save current column scroll positions
    const chScrollTop = channelListEl.scrollTop;
    const epgScrollTop = epgListEl.scrollTop;
    const mappedScrollTop = mappedListEl.scrollTop;

    const chSearch = (document.getElementById('mapping-channel-search').value || '').toLowerCase();
    const epgSearch = (document.getElementById('mapping-epg-search').value || '').toLowerCase();
    const mappedSearch = (document.getElementById('mapping-mapped-search').value || '').toLowerCase();
    const epgSourceFilter = document.getElementById('mapping-epg-filter').value;

    const playlistNameLookup = {};
    savedPlaylists.forEach(p => { playlistNameLookup[p.id] = p.name; });

    const titleToPlaylistId = {};
    allChannels.forEach(c => { if (!titleToPlaylistId[c.title]) titleToPlaylistId[c.title] = c.playlistId; });

    // 1. Render Left Column (Channels)
    let chHtmlArr = [];
    let filteredChannels = mappingSelectedPlaylist === 'all' ? allChannels : allChannels.filter(c => String(c.playlistId) === String(mappingSelectedPlaylist));
    const validTitlesForPlaylist = new Set(filteredChannels.map(c => c.title));

    const matchingChannels = [];
    const seenTitles = new Set();
    for (let c of filteredChannels) {
        if (c.title && !channelMappings[c.title] && !seenTitles.has(c.title)) {
            if (!chSearch || String(c.title).toLowerCase().includes(chSearch)) {
                matchingChannels.push(c);
                seenTitles.add(c.title);
            }
        }
    }

    matchingChannels.sort((a, b) => sortAlphaNum(a.title, b.title));

    const maxChDisplay = 300;
    const displayChannels = matchingChannels.slice(0, maxChDisplay);

    displayChannels.forEach(c => {
        const title = c.title || 'Unknown Channel';
        const safeTitle = title.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

        let bg = 'transparent';
        let color = '#e0e0e0';
        let border = '1px solid #333';
        
        if (mappingSelectedChannel === title) {
            bg = '#1a3a1a'; // Selected: Green highlight
            border = '1px solid #43CB44';
            color = '#43CB44';
        }

        let playlistNameStr = '';
        if (mappingSelectedPlaylist === 'all' && c.playlistId && playlistNameLookup[c.playlistId]) {
            playlistNameStr = ` <span style="color: #888; font-size: 0.9em; font-weight: normal;">[${playlistNameLookup[c.playlistId]}]</span>`;
        }

        chHtmlArr.push(`
            <div class="mapping-ch-item" tabindex="0" data-title="${safeTitle.replace(/"/g, '&quot;')}" style="padding: 10px; margin-bottom: 6px; background: ${bg}; border: ${border}; border-radius: 4px; cursor: pointer; transition: 0.1s; outline: none;">
                <div style="color: ${color}; font-weight: ${mappingSelectedChannel === title ? 'bold' : 'normal'}; pointer-events: none; font-size: 0.8em; font-family: 'Inter', sans-serif;">${safeTitle}${playlistNameStr}</div>
            </div>
        `);
    });
    
    let chHtml = chHtmlArr.join('');
    if (matchingChannels.length > maxChDisplay) {
        chHtml += `<div style="color: #888; text-align: center; margin-top: 10px; font-size: 0.9em;">Showing ${maxChDisplay} of ${matchingChannels.length} channels. Use search to find more.</div>`;
    } else if (!chHtml) {
        chHtml = '<div style="color: #888; text-align: center; margin-top: 20px;">No channels found.</div>';
    }
    channelListEl.innerHTML = chHtml;

    // 2. Render Right Column (EPG)
    let epgHtmlArr = [];
    let filteredEpgs = (epgChannelsData || []).filter(e => {
        if (epgSourceFilter !== 'all' && e.source !== epgSourceFilter) return false;
        if (epgSearch && !String(e.name || '').toLowerCase().includes(epgSearch) && !String(e.id || '').toLowerCase().includes(epgSearch)) return false;
        return true;
    });
    
    filteredEpgs.sort((a, b) => sortAlphaNum(a.name || a.id, b.name || b.id));

    const maxEpgDisplay = 300; // Limits DOM nodes for massive XML files
    let displayEpgs = filteredEpgs.slice(0, maxEpgDisplay);

    displayEpgs.forEach(epg => {
        const isSelected = mappingSelectedEpg === epg.id;
        let bg = isSelected ? '#1a3a1a' : 'transparent';
        let color = isSelected ? '#43CB44' : '#e0e0e0';
        let border = isSelected ? '1px solid #43CB44' : '1px solid #333';

        const safeName = (epg.name || epg.id).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        const safeId = epg.id.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        const sourceDomain = epgSourceFilter === 'all' && epg.source ? `<span style="color: #888; font-size: 0.8em; margin-left: 8px;">(${getEpgName(epg.source)})</span>` : '';

        epgHtmlArr.push(`
            <div class="mapping-epg-item" tabindex="0" data-id="${safeId.replace(/"/g, '&quot;')}" style="display: flex; justify-content: space-between; align-items: center; padding: 10px; margin-bottom: 6px; background: ${bg}; border: ${border}; border-radius: 4px; cursor: pointer; transition: 0.1s; outline: none;">
                <span style="color: ${color}; font-weight: ${isSelected ? 'bold' : 'normal'}; pointer-events: none; font-size: 0.8em; font-family: 'Inter', sans-serif;">${safeName}${sourceDomain}</span>
                ${isSelected ? `<button class="mapping-confirm-btn playlist-btn" style="background: #43CB44; color: black; border: none; font-size: 0.9em; padding: 2px 8px; cursor: pointer; border-radius: 4px; font-weight: bold;">✔️</button>` : ''}
            </div>
        `);
    });
    
    let epgHtml = epgHtmlArr.join('');
    if (filteredEpgs.length > maxEpgDisplay) {
        epgHtml += `<div style="color: #888; text-align: center; margin-top: 10px; font-size: 0.9em;">Showing ${maxEpgDisplay} of ${filteredEpgs.length} EPGs. Use search to find more.</div>`;
    } else if (!epgHtml) {
        epgHtml = '<div style="color: #888; text-align: center; margin-top: 20px;">No EPG channels found.</div>';
    }
    epgListEl.innerHTML = epgHtml;

    // 3. Render Right Column (Mapped List)
    let mappedHtmlArr = [];
    
    // Quick lookup for EPG names
    const epgNameLookup = {};
    const epgSourceLookup = {};
    if (epgChannelsData) {
        epgChannelsData.forEach(e => { 
            epgNameLookup[e.id] = e.name || e.id; 
            epgSourceLookup[e.id] = e.source;
        });
    }

    const filteredMapped = Object.entries(channelMappings).filter(([chTitle, epgId]) => {
        if (!epgId) return false;
        if (!titleToPlaylistId[chTitle]) return false; // Hide mappings for channels that no longer exist
        if (mappingSelectedPlaylist !== 'all' && !validTitlesForPlaylist.has(chTitle)) return false;

        const safeTitle = String(chTitle).replace(/</g, "&lt;").replace(/>/g, "&gt;");
        const epgName = epgNameLookup[epgId] || epgId;
        const safeEpgName = String(epgName).replace(/</g, "&lt;").replace(/>/g, "&gt;");

        if (mappedSearch && !safeTitle.toLowerCase().includes(mappedSearch) && !safeEpgName.toLowerCase().includes(mappedSearch)) return false;
        return true;
    }).sort((a, b) => sortAlphaNum(a[0], b[0]));

    const maxMappedDisplay = 300;
    const displayMapped = filteredMapped.slice(0, maxMappedDisplay);

    displayMapped.forEach(([chTitle, epgId]) => {
        const safeTitle = String(chTitle).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        const epgName = epgNameLookup[epgId] || epgId;
        const safeEpgName = String(epgName).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

        let sourceDomainStr = '';
        const rawSource = epgSourceLookup[epgId];
        if (rawSource) {
            let domain = getEpgName(rawSource);
            if (domain && domain !== 'Not Configured') {
                sourceDomainStr = `<span style="color: #888; font-size: 0.8em; margin-left: 8px;">(${domain})</span>`;
            }
        }

        let playlistNameStr = '';
        if (mappingSelectedPlaylist === 'all') {
            const pId = titleToPlaylistId[chTitle];
            if (pId && playlistNameLookup[pId]) {
                playlistNameStr = ` <span style="color: #888; font-size: 0.9em; font-weight: normal;">[${playlistNameLookup[pId]}]</span>`;
            }
        }

        mappedHtmlArr.push(`
            <div class="mapping-mapped-item" style="display: flex; justify-content: space-between; align-items: center; padding: 10px; margin-bottom: 6px; background: transparent; border: 1px solid #333; border-radius: 4px;">
                <div style="font-size: 0.8em; color: #e0e0e0; font-family: 'Inter', sans-serif; flex-grow: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-right: 10px;" title="${safeTitle} ⇄ ${safeEpgName}">
                    ${safeTitle}${playlistNameStr} <span style="color: #bb86fc; font-weight: bold; margin: 0 4px;">⇄</span> ${safeEpgName}${sourceDomainStr}
                </div>
                <button class="mapping-unmap-btn playlist-btn" data-title="${safeTitle.replace(/"/g, '&quot;')}" style="background: transparent; color: #cf6679; border: none; font-size: 1.2em; padding: 0 5px; cursor: pointer;">&times;</button>
            </div>
        `);
    });
    
    let mappedHtml = mappedHtmlArr.length ? mappedHtmlArr.join('') : '<div style="color: #888; text-align: center; margin-top: 20px;">No mappings yet.</div>';
    if (filteredMapped.length > maxMappedDisplay) {
        mappedHtml += `<div style="color: #888; text-align: center; margin-top: 10px; font-size: 0.9em;">Showing ${maxMappedDisplay} of ${filteredMapped.length} mapped channels. Use search to find more.</div>`;
    }
    mappedListEl.innerHTML = mappedHtml;

    // Restore scroll positions synchronously
    channelListEl.scrollTop = chScrollTop;
    epgListEl.scrollTop = epgScrollTop;
    mappedListEl.scrollTop = mappedScrollTop;

    // Restore outer settings scroll position
    if (settingsView) {
        settingsView.scrollTop = settingsScrollTop;
    }
    document.documentElement.scrollTop = docScrollTop;
    document.body.scrollTop = docScrollTop;

    // Restore focus to a stable EPG mapping element to prevent global focus-recovery timer from resetting scroll
    const restoreEpgMappingFocus = () => {
        const activeTagName = document.activeElement ? document.activeElement.tagName : '';
        if (activeTagName === 'INPUT' || activeTagName === 'SELECT') {
            return;
        }

        if (mappingSelectedChannel) {
            const safeTitle = mappingSelectedChannel.replace(/"/g, '&quot;');
            const targetEl = channelListEl.querySelector(`.mapping-ch-item[data-title="${safeTitle}"]`);
            if (targetEl) {
                targetEl.focus();
                return;
            }
        }
        if (mappingSelectedEpg) {
            const safeId = mappingSelectedEpg.replace(/"/g, '&quot;');
            const targetEl = epgListEl.querySelector(`.mapping-epg-item[data-id="${safeId}"]`);
            if (targetEl) {
                targetEl.focus();
                return;
            }
        }
        // Fallback: focus mapping search inputs so activeElement is never body
        const chSearchEl = document.getElementById('mapping-channel-search');
        if (chSearchEl && (document.activeElement === document.body || !document.activeElement)) {
            chSearchEl.focus();
        }
    };

    restoreEpgMappingFocus();

    // Failsafe: Restore scroll positions in the next tick to override any async browser scroll-to-top on focus shift
    setTimeout(() => {
        channelListEl.scrollTop = chScrollTop;
        epgListEl.scrollTop = epgScrollTop;
        mappedListEl.scrollTop = mappedScrollTop;
        if (settingsView) {
            settingsView.scrollTop = settingsScrollTop;
        }
        document.documentElement.scrollTop = docScrollTop;
        document.body.scrollTop = docScrollTop;
        restoreEpgMappingFocus();
    }, 0);

    // 4. Attach Event Listeners for the dynamic items
    document.querySelectorAll('.mapping-ch-item').forEach(el => {
        el.addEventListener('click', (e) => {
            const title = el.getAttribute('data-title');
            if (mappingSelectedChannel === title) {
                mappingSelectedChannel = null;
            } else {
                mappingSelectedChannel = title;
            }
            renderMappingColumns();
        });
    });

    document.querySelectorAll('.mapping-epg-item').forEach(el => {
        el.addEventListener('click', (e) => {
            if (e.target.closest('.mapping-confirm-btn')) return;
            const id = el.getAttribute('data-id');
            if (mappingSelectedEpg === id) {
                mappingSelectedEpg = null;
            } else {
                mappingSelectedEpg = id;
            }
            renderMappingColumns();
        });
    });

    document.querySelectorAll('.mapping-confirm-btn').forEach(el => {
        el.addEventListener('click', async (e) => {
            e.stopPropagation();
            if (!mappingSelectedChannel || !mappingSelectedEpg) {
                showToast("Select a channel and an EPG source first.");
                return;
            }
            
            const btn = e.target;
            btn.innerHTML = '⏳';
            btn.disabled = true;

            await applySingleMapping(mappingSelectedChannel, mappingSelectedEpg);
            
            mappingSelectedChannel = null;
            mappingSelectedEpg = null;
            renderMappingColumns();
        });
    });

    document.querySelectorAll('.mapping-unmap-btn').forEach(el => {
        el.addEventListener('click', async (e) => {
            e.stopPropagation();
            const title = el.getAttribute('data-title');
            
            const btn = e.target;
            btn.innerHTML = '⏳';
            btn.disabled = true;

            await applySingleMapping(title, null); // null unmaps
            
            if (mappingSelectedChannel === title) mappingSelectedChannel = null;
            renderMappingColumns();
        });
    });
}

async function renderSettings() {
    const settingsView = document.getElementById('settings-view');
    console.log('[UI] Rendering settings view.');
    if (!settingsView) return;

    // Fetch EPG channels list dynamically in background when settings tab is opened
    if (!epgChannelsData) {
        console.log('[BACKGROUND] epgChannelsData is null. Fetching dynamically in renderSettings...');
        const allEpgSources = savedPlaylists.map(p => p.epg).filter(e => e && e !== 'Not Configured');
        savedEpgs.forEach(e => { if (!allEpgSources.includes(e)) allEpgSources.push(e); });
        const combinedEpgs = allEpgSources.join(',');
        if (combinedEpgs) {
            window.iptvAPI.getEpgChannels(combinedEpgs).then(data => {
                epgChannelsData = data;
                console.log('[BACKGROUND] EPG channels list loaded successfully in renderSettings.', data.length);
                renderMappingColumns();
            }).catch(err => {
                console.error('[BACKGROUND] Failed to fetch EPG channels list in renderSettings:', err);
            });
        }
    }

    let remoteSettings = {};
    savedEpgs.sort((a, b) => sortAlphaNum(getEpgName(a), getEpgName(b)));

    let epgListHtml = savedEpgs.map((epg, idx) => `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; background: #2a2a2a; margin-bottom: 8px; border-radius: 6px;">
            <div style="display: flex; flex-direction: column; flex-grow: 1; margin-right: 15px; overflow: hidden; min-width: 0;">
                <span style="color: #bb86fc; font-weight: bold; margin-bottom: 4px;">${getEpgName(epg)}</span>
                <span style="color: #888; font-size: 0.85em; word-break: break-all;">${epg}</span>
            </div>
            <div style="display: flex; gap: 8px; align-items: center;">
                <button class="playlist-btn refresh-epg-btn" data-idx="${idx}" style="background: #43CB44; color: black; padding: 6px 12px; border-radius: 4px; font-weight: bold;">Refresh</button>
                <button class="playlist-btn remove-epg-btn" data-idx="${idx}" style="background: #cf6679; color: black; padding: 6px 12px; border-radius: 4px;">Remove</button>
            </div>
        </div>
    `).join('');

    const now = new Date();
    const futureReminders = (savedReminders || []).filter(r => parseEpgTime(r.startTime) > now).sort((a,b) => parseEpgTime(a.startTime) - parseEpgTime(b.startTime));
    
    let remindersHtml = futureReminders.length ? futureReminders.map((r, i) => {
        const st = parseEpgTime(r.startTime).toLocaleString([], {weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'});
        return `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; background: #2a2a2a; margin-bottom: 8px; border-radius: 6px;">
            <div style="display: flex; flex-direction: column; flex-grow: 1; overflow: hidden; min-width: 0;">
                <span style="color: #bb86fc; font-weight: bold; margin-bottom: 4px;">${r.progTitle}</span>
                <span style="color: #888; font-size: 0.85em;">${r.channelTitle} &bull; ${st}</span>
            </div>
            <button class="playlist-btn remove-reminder-btn" data-idx="${i}" style="background: transparent; color: #cf6679; border: none; font-size: 1.2em; padding: 0 5px; cursor: pointer;" title="Remove Reminder">&times;</button>
        </div>`;
    }).join('') : '<div style="color:#666; font-style: italic;">No upcoming reminders.</div>';

    // Inject immediate skeleton HTML synchronously to make tab transition instantaneous
    settingsView.innerHTML = `
        <div style="display: flex; gap: 20px; width: 100%; max-width: 1200px; margin: 0 auto; box-sizing: border-box; min-width: 0; align-items: flex-start; padding: 10px 0;">
            <!-- Left Sticky Mini-Menu -->
            <div style="width: 200px; flex-shrink: 0; position: sticky; top: 10px; background: rgba(30, 30, 30, 0.75); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); border: 1px solid #333; border-radius: 12px; padding: 15px; display: flex; flex-direction: column; gap: 8px; box-shadow: 0 8px 32px rgba(0,0,0,0.4); z-index: 10;">
                <h3 style="color: #bb86fc; margin: 0 0 10px 0; font-size: 1.25em; font-family: 'Outfit', 'Inter', sans-serif; font-weight: bold; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 8px;">Settings</h3>
                <button class="settings-menu-btn active" data-target="card-epg">EPG Sources</button>
                <button class="settings-menu-btn" data-target="card-playback">Playback Settings</button>
                <button class="settings-menu-btn" data-target="card-reminders">Reminders</button>
                <button class="settings-menu-btn" data-target="card-mapping">Channel Mapping</button>
                <button class="settings-menu-btn" data-target="card-remote">Remote Control</button>
                <button class="settings-menu-btn" data-target="card-dvr">Recording Path</button>
                <button class="settings-menu-btn" data-target="card-tmdb">TMDB Integration</button>
                <button class="settings-menu-btn" data-target="card-danger">Danger Zone</button>
            </div>
            
            <!-- Right Column Cards -->
            <div style="flex-grow: 1; min-width: 0; display: flex; flex-direction: column; gap: 30px;">
                <!-- External EPG Sources Card -->
                <div id="card-epg" style="background: #1e1e1e; padding: 25px; border-radius: 8px; border: 1px solid #333; min-width: 0;">
                    <h3 style="color: #e0e0e0; margin-top: 0; margin-bottom: 5px; font-family: 'Outfit', 'Inter', sans-serif;">External EPG Sources</h3>
                    <p style="color: #888; font-size: 0.9em; margin-bottom: 20px;">Add multiple XMLTV EPG URLs to load automatically for your playlists. (Requires refreshing your playlist to take effect).</p>
                    <div style="display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap;">
                        <input type="text" id="settings-new-epg" placeholder="http://.../epg.xml" style="flex: 1; min-width: 250px; background: #121212; border: 1px solid #444; color: white; padding: 10px; border-radius: 4px; outline: none; box-sizing: border-box;">
                        <button id="settings-add-epg-btn" class="playlist-btn" style="background: #bb86fc; color: black; font-weight: bold; padding: 10px 20px; white-space: nowrap;">Add EPG</button>
                    </div>
                    <div id="settings-epg-list">${epgListHtml || '<div style="color:#666; font-style: italic;">No external EPGs added.</div>'}</div>
                </div>

                <!-- Reminders Card -->
                <div id="card-reminders" style="background: #1e1e1e; padding: 25px; border-radius: 8px; border: 1px solid #333; min-width: 0;">
                    <h3 style="color: #e0e0e0; margin-top: 0; margin-bottom: 5px; font-family: 'Outfit', 'Inter', sans-serif;">Upcoming Reminders</h3>
                    <p style="color: #888; font-size: 0.9em; margin-bottom: 20px;">Manage your scheduled program notifications.</p>
                    <div id="settings-reminders-list" style="max-height: 300px; overflow-y: auto;">
                        ${remindersHtml}
                    </div>
                </div>

                <!-- 3-Column Channel Mapping UI -->
                <div id="card-mapping" style="background: #1e1e1e; padding: 25px; border-radius: 8px; border: 1px solid #333; display: flex; flex-direction: column; height: 600px; min-width: 0;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 10px;">
                        <div style="flex: 1; min-width: 250px;">
                            <h3 style="color: #e0e0e0; margin: 0; font-family: 'Outfit', 'Inter', sans-serif;">Channel Mapping</h3>
                            <p style="color: #888; font-size: 0.9em; margin: 5px 0 15px 0;">Select a channel on the left and an EPG on the right. Instant apply updates Live TV/Guide immediately.</p>
                        </div>
                        <button id="mapping-auto-map-btn" class="playlist-btn" style="background: #43CB44; color: black; font-weight: bold; padding: 6px 12px; border-radius: 4px; font-size: 0.9em; cursor: pointer; white-space: nowrap;">Auto Map</button>
                    </div>
                    
                    <div style="display: flex; gap: 15px; flex-grow: 1; min-height: 0; min-width: 0;">
                        <!-- Left Column: Playlist Channels -->
                        <div style="flex: 28; display: flex; flex-direction: column; background: #121212; border: 1px solid #444; border-radius: 6px; overflow: hidden; min-width: 0;">
                            <div style="padding: 10px; background: #252525; border-bottom: 1px solid #444;">
                                <select id="mapping-playlist-filter" style="width: 100%; background: #121212; color: white; border: 1px solid #555; padding: 6px; border-radius: 4px; outline: none; margin-bottom: 8px;">
                                    <option value="all">All Playlists</option>
                                    ${savedPlaylists.map(p => `<option value="${p.id}" ${mappingSelectedPlaylist === String(p.id) ? 'selected' : ''}>${p.name}</option>`).join('')}
                                </select>
                                <input type="text" id="mapping-channel-search" placeholder="Search Channels..." style="width: 100%; background: #121212; color: white; border: 1px solid #555; padding: 6px; border-radius: 4px; outline: none; box-sizing: border-box;">
                            </div>
                            <div id="mapping-channel-list" style="flex-grow: 1; overflow-y: auto; padding: 10px;"></div>
                        </div>
                        
                        <!-- Right Column: Available EPG Channels -->
                        <div style="flex: 28; display: flex; flex-direction: column; background: #121212; border: 1px solid #444; border-radius: 6px; overflow: hidden; min-width: 0;">
                            <div style="padding: 10px; background: #252525; border-bottom: 1px solid #444;">
                                <select id="mapping-epg-filter" style="width: 100%; background: #121212; color: white; border: 1px solid #555; padding: 6px; border-radius: 4px; outline: none; margin-bottom: 8px;">
                                    <option value="all">All EPG Sources</option>
                                </select>
                                <input type="text" id="mapping-epg-search" placeholder="Search EPG..." style="width: 100%; background: #121212; color: white; border: 1px solid #555; padding: 6px; border-radius: 4px; outline: none; box-sizing: border-box;">
                            </div>
                            <div id="mapping-epg-list" style="flex-grow: 1; overflow-y: auto; padding: 10px;">
                                <div style="padding: 20px; text-align: center; color: #888;">Fetching EPG Data...</div>
                            </div>
                        </div>

                        <!-- Right Column: Mapped List -->
                        <div style="flex: 44; display: flex; flex-direction: column; background: #121212; border: 1px solid #444; border-radius: 6px; overflow: hidden; min-width: 0;">
                            <div style="padding: 10px; background: #252525; border-bottom: 1px solid #444;">
                                <h3 style="color: #e0e0e0; margin: 0; font-size: 1em; padding: 6px 0; margin-bottom: 6px;">Mapped Channels</h3>
                                <input type="text" id="mapping-mapped-search" placeholder="Search Mapped..." style="width: 100%; background: #121212; color: white; border: 1px solid #555; padding: 6px; border-radius: 4px; outline: none; box-sizing: border-box;">
                            </div>
                            <div id="mapping-mapped-list" style="flex-grow: 1; overflow-y: auto; padding: 10px;">
                                <div style="padding: 20px; text-align: center; color: #888;">Fetching EPG Data...</div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Remote Control -->
                <div id="card-remote" style="background: #1e1e1e; padding: 25px; border-radius: 8px; border: 1px solid #333; min-width: 0;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; flex-wrap: wrap; gap: 10px;">
                        <div>
                            <h3 style="color: #e0e0e0; margin-top: 0; margin-bottom: 5px; font-family: 'Outfit', 'Inter', sans-serif;">Remote Control</h3>
                            <p style="color: #888; font-size: 0.9em; margin: 0;">Control AIVue Player from your smartphone or tablet on the same Wi-Fi network.</p>
                        </div>
                        <label style="display: flex; align-items: center; cursor: pointer; background: #121212; padding: 8px 12px; border-radius: 6px; border: 1px solid #444;">
                            <input type="checkbox" id="settings-remote-toggle" disabled style="margin-right: 10px; width: 18px; height: 18px; cursor: pointer;">
                            <span id="settings-remote-status" style="color: #888; font-weight: bold;">Loading...</span>
                        </label>
                    </div>
                    
                    <div id="settings-remote-config" style="border-top: 1px solid #333; padding-top: 20px; margin-top: 10px;">
                    </div>
                </div>

                <!-- Recording Settings Card -->
                <div id="card-dvr" style="background: #1e1e1e; padding: 25px; border-radius: 8px; border: 1px solid #333; min-width: 0;">
                    <h3 style="color: #e0e0e0; margin-top: 0; margin-bottom: 5px; font-family: 'Outfit', 'Inter', sans-serif;">Recording Storage Path</h3>
                    <p style="color: #888; font-size: 0.9em; margin-bottom: 20px;">Choose where recorded live streams (.ts files) will be saved on your computer.</p>
                    <div style="display: flex; gap: 10px; margin-bottom: 10px; flex-wrap: wrap;">
                        <input type="text" id="settings-recording-path" readonly style="flex: 1; min-width: 250px; background: #121212; border: 1px solid #444; color: white; padding: 10px; border-radius: 4px; outline: none; box-sizing: border-box;">
                        <button id="settings-browse-recording-btn" class="playlist-btn" style="background: #333; color: white; border: 1px solid #444; font-weight: bold; padding: 10px 20px; white-space: nowrap;">Browse</button>
                        <button id="settings-save-recording-btn" class="playlist-btn" style="background: #bb86fc; color: black; font-weight: bold; padding: 10px 20px; white-space: nowrap;">Save Path</button>
                    </div>
                </div>

                <!-- TMDB Integration -->
                <div id="card-tmdb" style="background: #1e1e1e; padding: 25px; border-radius: 8px; border: 1px solid #333; min-width: 0;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; flex-wrap: wrap; gap: 10px;">
                        <div>
                            <h3 style="color: #e0e0e0; margin-top: 0; margin-bottom: 5px; font-family: 'Outfit', 'Inter', sans-serif;">TMDB API Integration</h3>
                            <p style="color: #888; font-size: 0.9em; margin: 0;">Scrape premium poster art, cast lists, backdrops, and rich descriptions dynamically from The Movie Database.</p>
                        </div>
                        <div>
                            <span id="settings-tmdb-status" style="background: #88822; color: #888; border: 1px solid #888; padding: 6px 14px; border-radius: 20px; font-size: 0.85em; font-weight: bold; transition: all 0.3s ease;">Loading...</span>
                        </div>
                    </div>
                    
                    <div style="border-top: 1px solid #333; padding-top: 20px; margin-top: 10px;">
                        <div style="display: flex; gap: 15px; flex-wrap: wrap; margin-bottom: 15px;">
                            <div style="flex: 1; min-width: 250px;">
                                <label style="color: #bbb; font-size: 0.9em; display: block; margin-bottom: 5px;">TMDB API Key (v3)</label>
                                <input type="text" id="settings-tmdb-key" value="" placeholder="Loading Key..." style="width: 100%; background: #121212; border: 1px solid #444; color: white; padding: 10px; border-radius: 4px; outline: none; box-sizing: border-box; font-family: monospace;">
                            </div>
                            <div style="flex: 2; min-width: 350px;">
                                <label style="color: #bbb; font-size: 0.9em; display: block; margin-bottom: 5px;">TMDB Bearer Token (v4)</label>
                                <input type="password" id="settings-tmdb-token" value="" placeholder="Loading Token..." style="width: 100%; background: #121212; border: 1px solid #444; color: white; padding: 10px; border-radius: 4px; outline: none; box-sizing: border-box; font-family: monospace;">
                            </div>
                        </div>
                        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
                            <span style="color: #666; font-size: 0.85em;">Need a key? Register on <a href="https://www.themoviedb.org/" target="_blank" style="color: #bb86fc; text-decoration: none;">themoviedb.org</a> and generate an API key in settings.</span>
                            <button id="settings-save-tmdb-btn" class="playlist-btn" style="background: #bb86fc; color: black; font-weight: bold; padding: 10px 24px; border-radius: 4px; white-space: nowrap;">Save & Test Connection</button>
                        </div>
                    </div>
                </div>

                <!-- Playback Settings -->
                <div id="card-playback" style="background: #1e1e1e; padding: 25px; border-radius: 8px; border: 1px solid #333; min-width: 0;">
                    <h3 style="color: #e0e0e0; margin-top: 0; margin-bottom: 5px; font-family: 'Outfit', 'Inter', sans-serif;">Playback Settings</h3>
                    <p style="color: #888; font-size: 0.9em; margin-bottom: 20px;">Configure video player behaviors and automated navigation preferences.</p>
                    <div style="display: flex; justify-content: space-between; align-items: center; background: #121212; padding: 15px; border-radius: 8px; border: 1px solid #2d2d2d;">
                        <div style="margin-right: 15px;">
                            <span style="color: #e0e0e0; font-weight: bold; display: block; margin-bottom: 4px; font-size: 0.95em;">Auto-Play Next Episode</span>
                            <span style="color: #888; font-size: 0.85em;">Automatically resolves and plays the next episode with an interactive 30s countdown overlay.</span>
                        </div>
                        <label class="autoplay-toggle-container" style="position: relative; display: inline-block; width: 46px; height: 24px; flex-shrink: 0; cursor: pointer;">
                            <input type="checkbox" id="settings-autoplay-toggle" style="opacity: 0; width: 0; height: 0;">
                            <span class="slider" style="position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #444; transition: .3s; border-radius: 24px;"></span>
                        </label>
                    </div>
                </div>

                <!-- Danger Zone -->
                <div id="card-danger" style="background: linear-gradient(135deg, rgba(207, 102, 121, 0.08), rgba(207, 102, 121, 0.02)); padding: 25px; border-radius: 12px; border: 1px solid rgba(207, 102, 121, 0.35); box-shadow: 0 8px 32px rgba(207, 102, 121, 0.1), inset 0 0 20px rgba(207, 102, 121, 0.05); min-width: 0; transition: all 0.3s ease;">
                    <h3 style="color: #ff6b6b; margin-top: 0; margin-bottom: 8px; font-family: 'Outfit', 'Inter', sans-serif; font-weight: bold; text-shadow: 0 0 10px rgba(255,107,107,0.2);">Danger Zone</h3>
                    <p style="color: rgba(255, 179, 179, 0.85); font-size: 0.9em; margin-bottom: 20px; font-family: 'Inter', sans-serif;">Completely wipe the database and reset the application to its default state. This action cannot be undone.</p>
                    <button id="settings-factory-reset-btn" class="playlist-btn" style="background: #ff5252; color: white; font-weight: bold; padding: 10px 20px; border-radius: 6px; border: none; cursor: pointer; transition: all 0.2s ease; box-shadow: 0 4px 15px rgba(255, 82, 82, 0.3);">Factory Reset</button>
                </div>
            </div>
        </div>
    `;

    // Playback autoplay toggle listener
    const autoplayToggle = document.getElementById('settings-autoplay-toggle');
    if (autoplayToggle) {
        autoplayToggle.checked = window.isAutoplayEnabled;
        autoplayToggle.addEventListener('change', (e) => {
            window.isAutoplayEnabled = e.target.checked;
            localStorage.setItem('iptv_autoplay_next', e.target.checked ? 'true' : 'false');
            console.log('[SETTINGS] Autoplay Next Episode toggled to:', window.isAutoplayEnabled);
        });
    }

    // 1. Immediately attach all static event listeners to avoid input lockups
    document.getElementById('settings-add-epg-btn').addEventListener('click', async () => {
        const val = document.getElementById('settings-new-epg').value.trim();
        console.log('[SETTINGS] Add EPG button clicked. Value:', val);
        if (val && !savedEpgs.includes(val)) {
            const btn = document.getElementById('settings-add-epg-btn');
            const originalText = btn.textContent;
            btn.textContent = '⏳';
            btn.disabled = true;

            savedEpgs.push(val);
            await window.iptvAPI.addExternalEpg(val);

            let allEpgSources = savedEpgs.slice();
            savedPlaylists.forEach(p => {
                if (p.epg && p.epg !== 'Not Configured' && !allEpgSources.includes(p.epg)) {
                    allEpgSources.push(p.epg);
                }
            });
            const combinedEpgs = allEpgSources.join(',');

            await window.iptvAPI.updateEpg(combinedEpgs, null, true);
            epgChannelsData = await window.iptvAPI.getEpgChannels(combinedEpgs);

            btn.textContent = originalText;
            btn.disabled = false;
            renderSettings();
        }
    });

    document.querySelectorAll('.refresh-epg-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const idx = parseInt(e.target.getAttribute('data-idx'));
            console.log('[SETTINGS] Refresh EPG button clicked for index:', idx);
            const epgSource = savedEpgs[idx];
            
            const originalText = e.target.textContent;
            e.target.textContent = '⏳';
            e.target.disabled = true;

            console.log('[API] Calling clearCache for', epgSource);
            await window.iptvAPI.clearCache(epgSource);

            let allEpgSources = savedEpgs.slice();
            console.log('[API] Calling getEpgChannels for all sources.');
            savedPlaylists.forEach(p => {
                if (p.epg && p.epg !== 'Not Configured' && !allEpgSources.includes(p.epg)) {
                    allEpgSources.push(p.epg);
                }
            });
            const combinedEpgs = allEpgSources.join(',');

            console.log('[API] Calling updateEpg to repopulate database.');
            await window.iptvAPI.updateEpg(combinedEpgs, null, true);
            epgChannelsData = await window.iptvAPI.getEpgChannels(combinedEpgs);

            renderMappingColumns();
            
            e.target.textContent = 'Refreshed ✔️';
            setTimeout(() => {
                e.target.textContent = originalText;
                e.target.disabled = false;
            }, 2000);
        });
    });

    document.querySelectorAll('.remove-epg-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = parseInt(e.target.getAttribute('data-idx'));
            console.log('[SETTINGS] Remove EPG button clicked for index:', idx);
            const epgSource = savedEpgs[idx];
            if (!epgSource) return;
            
            showConfirmToast(`Are you sure you want to remove the EPG source "${epgSource}"?`, async () => {
                const epgIdsToRemove = new Set();
                if (epgChannelsData) {
                    epgChannelsData.forEach(epg => {
                        if (epg.source === epgSource) {
                            epgIdsToRemove.add(epg.id);
                        }
                    });
                }

                const titlesToUnmap = [];
                Object.entries(channelMappings).forEach(([chTitle, epgId]) => {
                    if (epgIdsToRemove.has(epgId)) {
                        titlesToUnmap.push(chTitle);
                    }
                });

                if (titlesToUnmap.length > 0) {
                    console.log(`[MAPPING] Unmapping ${titlesToUnmap.length} channels associated with removed EPG.`);
                    const mappingsToSave = [];
                    for (const title of titlesToUnmap) {
                        delete channelMappings[title];
                        mappingsToSave.push({ title, epgId: null });
                    }
                    await window.iptvAPI.saveMappingsBulk(mappingsToSave);
                    updateState(true);
                }

                const isUsedByPlaylist = savedPlaylists.some(p => p.epg === epgSource);
                if (epgSource && !isUsedByPlaylist) {
                    await window.iptvAPI.clearCache(epgSource);
                    console.log('[API] Cache cleared for unused EPG:', epgSource);
                }
                
                savedEpgs.splice(idx, 1);
                await window.iptvAPI.removeExternalEpg(epgSource);
                
                if (epgChannelsData) {
                    epgChannelsData = epgChannelsData.filter(epg => epg.source !== epgSource);
                }

                renderSettings();
                showToast(`EPG source removed.`);
            });
        });
    });

    document.querySelectorAll('.remove-reminder-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = parseInt(e.currentTarget.getAttribute('data-idx'));
            console.log('[SETTINGS] Remove reminder button clicked for index:', idx);
            const reminderToRemove = futureReminders[idx];
            if (!reminderToRemove) return;
            
            showConfirmToast(`Are you sure you want to remove the reminder for "${reminderToRemove.progTitle}"?`, () => {
                const realIdx = savedReminders.findIndex(r => r.channelTitle === reminderToRemove.channelTitle && r.progTitle === reminderToRemove.progTitle && r.startTime === reminderToRemove.startTime);
                if (realIdx > -1) {
                    savedReminders.splice(realIdx, 1);
                    saveReminders();
                    renderSettings();
                    showToast(`Reminder removed.`);
                }
            });
        });
    });

    document.getElementById('mapping-auto-map-btn').addEventListener('click', async (e) => {
        const btn = e.target;
        console.log('[SETTINGS] Auto-map button clicked.');
        const originalText = btn.textContent;
        btn.textContent = '⏳';
        btn.disabled = true;

        await autoMapChannels(true);

        btn.textContent = originalText;
        btn.disabled = false;
    });

    document.getElementById('settings-save-tmdb-btn').addEventListener('click', async (e) => {
        const btn = e.target;
        const apiKey = document.getElementById('settings-tmdb-key').value.trim();
        const apiToken = document.getElementById('settings-tmdb-token').value.trim();
        const statusSpan = document.getElementById('settings-tmdb-status');
        
        const originalText = btn.textContent;
        btn.textContent = 'Testing connection... ⏳';
        btn.disabled = true;
        
        try {
            const result = await window.iptvAPI.saveTmdbConfig({ apiKey, apiToken });
            
            let statusColor = '#888';
            if (result.status === 'Connected') {
                statusColor = '#43CB44';
                showToast('TMDB Connection successful!');
            } else if (result.status === 'Invalid Credentials') {
                statusColor = '#cf6679';
                showToast('TMDB Connection failed: Invalid Credentials', true);
            } else {
                statusColor = '#cf6679';
                showToast(`TMDB Connection failed: ${result.error || 'Unknown error'}`, true);
            }
            
            statusSpan.textContent = result.status;
            statusSpan.style.background = `${statusColor}22`;
            statusSpan.style.color = statusColor;
            statusSpan.style.borderColor = statusColor;
        } catch (err) {
            console.error('Error saving TMDB config:', err);
            showToast('Error testing connection.', true);
        } finally {
            btn.textContent = originalText;
            btn.disabled = false;
        }
    });

    // Load and wire recording directory configurations
    try {
        window.iptvAPI.getRecordingPath().then(p => {
            const pathInput = document.getElementById('settings-recording-path');
            if (pathInput) pathInput.value = p;
        });
    } catch (e) {
        console.error('Error loading recording path settings:', e);
    }

    const browseRecordingBtn = document.getElementById('settings-browse-recording-btn');
    if (browseRecordingBtn) {
        browseRecordingBtn.addEventListener('click', async () => {
            const filePaths = await window.iptvAPI.openFileDialog();
            if (filePaths && filePaths.length > 0) {
                const pathInput = document.getElementById('settings-recording-path');
                if (pathInput) pathInput.value = filePaths[0];
            }
        });
    }

    const saveRecordingBtn = document.getElementById('settings-save-recording-btn');
    if (saveRecordingBtn) {
        saveRecordingBtn.addEventListener('click', async () => {
            const pathInput = document.getElementById('settings-recording-path');
            if (pathInput) {
                const success = await window.iptvAPI.saveRecordingPath(pathInput.value.trim());
                if (success) {
                    showToast('Recording path saved successfully!');
                } else {
                    showToast('Failed to save recording path.', true);
                }
            }
        });
    }

    document.getElementById('settings-factory-reset-btn').addEventListener('click', async () => {
        console.log('[SETTINGS] Factory reset button clicked.');
        if (confirm("Are you sure you want to completely wipe all data? The application will restart.")) {
            await window.iptvAPI.factoryReset();
        }
    });

    // Mapping Filter Events
    document.getElementById('mapping-playlist-filter').addEventListener('change', (e) => {
        mappingSelectedPlaylist = e.target.value;
        console.log('[MAPPING] Playlist filter changed to:', mappingSelectedPlaylist);
        mappingSelectedChannel = null;
        renderMappingColumns();
    });
    document.getElementById('mapping-channel-search').addEventListener('input', debouncedRenderMappingColumns);
    document.getElementById('mapping-epg-filter').addEventListener('change', renderMappingColumns);
    document.getElementById('mapping-epg-search').addEventListener('input', debouncedRenderMappingColumns);
    document.getElementById('mapping-mapped-search').addEventListener('input', debouncedRenderMappingColumns);

    // Left mini-menu smooth scrolling click handlers
    document.querySelectorAll('.settings-menu-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-target');
            const targetEl = document.getElementById(targetId);
            if (targetEl && settingsView) {
                const containerRect = settingsView.getBoundingClientRect();
                const targetRect = targetEl.getBoundingClientRect();
                const relativeTop = targetRect.top - containerRect.top + settingsView.scrollTop;
                const targetScrollTop = Math.max(0, relativeTop - 30);
                settingsView.scrollTo({ top: targetScrollTop, behavior: 'smooth' });
            }
        });
    });

    // Real-time active menu item highlight scroll listener
    const updateActiveMenuButton = () => {
        if (settingsView.style.display === 'none') return;
        const containerRect = settingsView.getBoundingClientRect();
        const cards = ['card-epg', 'card-reminders', 'card-mapping', 'card-remote', 'card-dvr', 'card-tmdb', 'card-danger'];
        let currentActive = 'card-epg';
        
        for (const cardId of cards) {
            const el = document.getElementById(cardId);
            if (el) {
                const elRect = el.getBoundingClientRect();
                const triggerPoint = containerRect.top + 150;
                if (elRect.top <= triggerPoint) {
                    currentActive = cardId;
                }
            }
        }
        
        if (Math.abs((settingsView.scrollHeight - settingsView.scrollTop) - settingsView.clientHeight) < 10) {
            currentActive = 'card-danger';
        }
        
        document.querySelectorAll('.settings-menu-btn').forEach(btn => {
            if (btn.getAttribute('data-target') === currentActive) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    };
    
    settingsView.removeEventListener('scroll', window.updateSettingsActiveMenu);
    window.updateSettingsActiveMenu = updateActiveMenuButton;
    settingsView.addEventListener('scroll', window.updateSettingsActiveMenu);
    updateActiveMenuButton();

    // 2. Immediately populate local mapping channels (no-epg-data fallback loaded)
    renderMappingColumns();

    // 3. Load TMDB configuration in the background asynchronously
    window.iptvAPI.getTmdbConfig().then(tmdbConfig => {
        const keyInput = document.getElementById('settings-tmdb-key');
        const tokenInput = document.getElementById('settings-tmdb-token');
        if (keyInput) keyInput.value = tmdbConfig.apiKey || '';
        if (tokenInput) tokenInput.value = tmdbConfig.apiToken || '';
        
        const statusSpan = document.getElementById('settings-tmdb-status');
        if (statusSpan) {
            if (tmdbConfig.apiKey || tmdbConfig.apiToken) {
                statusSpan.textContent = 'Configured';
                statusSpan.style.color = '#43CB44';
                statusSpan.style.background = '#43CB4422';
                statusSpan.style.borderColor = '#43CB44';
            } else {
                statusSpan.textContent = 'Not Configured';
                statusSpan.style.color = '#888';
                statusSpan.style.background = '#88822';
                statusSpan.style.borderColor = '#888';
            }
        }
    }).catch(e => console.error('Error auto-loading TMDB config:', e));

    // 4. Load Remote settings and IP address in the background asynchronously
    Promise.all([
        window.iptvAPI.getRemoteSettings(),
        window.iptvAPI.getIpAddress()
    ]).then(([rSettings, ipAddress]) => {
        remoteSettings = rSettings;
        
        const toggle = document.getElementById('settings-remote-toggle');
        const status = document.getElementById('settings-remote-status');
        const configDiv = document.getElementById('settings-remote-config');
        
        const port = remoteSettings.port || 8088;
        const remoteUrl = `http://${ipAddress}:${port}/remote`;
        let remoteUrlWithAuth = remoteUrl;
        if (remoteSettings.username && remoteSettings.password) {
            remoteUrlWithAuth = `http://${encodeURIComponent(remoteSettings.username)}:${encodeURIComponent(remoteSettings.password)}@${ipAddress}:${port}/remote`;
        }

        if (toggle) {
            toggle.checked = !!remoteSettings.enabled;
            toggle.disabled = false;
        }
        if (status) {
            status.textContent = remoteSettings.enabled ? 'Enabled' : 'Disabled';
            status.style.color = remoteSettings.enabled ? '#43CB44' : '#cf6679';
        }
        
        if (configDiv) {
            configDiv.style.display = remoteSettings.enabled ? 'block' : 'none';
            configDiv.innerHTML = `
                <div style="display: flex; gap: 15px; flex-wrap: wrap; margin-bottom: 20px;">
                    <div style="flex: 1; min-width: 150px;">
                         <label style="color: #bbb; font-size: 0.9em; display: block; margin-bottom: 5px;">Port</label>
                         <input type="number" id="settings-remote-port" value="${port}" placeholder="8088" style="width: 100%; background: #121212; border: 1px solid #444; color: white; padding: 10px; border-radius: 4px; outline: none; box-sizing: border-box;">
                    </div>
                    <div style="flex: 2; min-width: 200px;">
                         <label style="color: #bbb; font-size: 0.9em; display: block; margin-bottom: 5px;">Username (min 5 chars)</label>
                         <input type="text" id="settings-remote-user" value="${remoteSettings.username || ''}" placeholder="Username" style="width: 100%; background: #121212; border: 1px solid #444; color: white; padding: 10px; border-radius: 4px; outline: none; box-sizing: border-box;">
                    </div>
                    <div style="flex: 2; min-width: 200px;">
                         <label style="color: #bbb; font-size: 0.9em; display: block; margin-bottom: 5px;">Password (min 5 chars)</label>
                         <input type="password" id="settings-remote-pass" value="${remoteSettings.password || ''}" placeholder="Password" style="width: 100%; background: #121212; border: 1px solid #444; color: white; padding: 10px; border-radius: 4px; outline: none; box-sizing: border-box;">
                    </div>
                    <div style="display: flex; align-items: flex-end;">
                         <button id="settings-save-remote-btn" class="playlist-btn" style="background: #bb86fc; color: black; font-weight: bold; padding: 10px 24px; height: 39px; white-space: nowrap;">Save Credentials</button>
                    </div>
                </div>
                
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; padding: 10px; background: #252525; border: 1px solid #444; border-radius: 4px;">
                     <span style="color: #bbb; font-size: 0.9em;">Paired Device: <strong style="color: ${remoteSettings.activeDeviceId ? '#43CB44' : '#888'};">${remoteSettings.activeDeviceId ? 'Connected' : 'None'}</strong></span>
                     <button id="settings-revoke-device-btn" class="playlist-btn" style="background: ${remoteSettings.activeDeviceId ? '#cf6679' : '#333'}; color: ${remoteSettings.activeDeviceId ? 'black' : '#888'}; font-weight: bold; padding: 6px 12px; border-radius: 4px;" ${!remoteSettings.activeDeviceId ? 'disabled' : ''}>Revoke Access</button>
                </div>

                <label style="color: #bbb; font-size: 0.9em; display: block; margin-bottom: 5px;">Remote URL</label>
                <div style="display: flex; align-items: center; justify-content: space-between; background: #121212; border: 1px solid #444; border-radius: 4px; padding: 10px 15px; gap: 15px; flex-wrap: wrap;">
                     <span style="font-family: monospace; color: #bb86fc; font-size: 1.1em; word-break: break-all; flex: 1; min-width: 200px;">${remoteUrl}</span>
                     <button id="settings-copy-remote-btn" class="playlist-btn" data-url="${remoteUrlWithAuth}" style="background: #2a2a2a; color: #e0e0e0; padding: 8px 16px; border-radius: 4px; font-weight: bold; white-space: nowrap; flex-shrink: 0;" title="Copies a link with embedded login credentials">Copy Auto-Login URL</button>
                </div>
            `;

            // Dynamic Remote listeners
            document.getElementById('settings-save-remote-btn').addEventListener('click', async (btnEvt) => {
                 const newPort = parseInt(document.getElementById('settings-remote-port').value) || 8088;
                 const user = document.getElementById('settings-remote-user').value.trim();
                 const pass = document.getElementById('settings-remote-pass').value.trim();
                 
                 if ((user.length > 0 || pass.length > 0) && (user.length < 5 || pass.length < 5)) {
                     showToast('Username and Password must be at least 5 characters long, or completely blank to disable password protection.');
                     document.getElementById('settings-remote-user').focus();
                     return;
                 }
                 
                 remoteSettings.port = newPort;
                 remoteSettings.username = user;
                 remoteSettings.password = pass;
                 await window.iptvAPI.saveRemoteSettings(remoteSettings);
                 
                 const originalText = btnEvt.target.textContent;
                 btnEvt.target.textContent = 'Saved ✔️';
                 setTimeout(() => { 
                     renderSettings();
                 }, 1000);
            });

            const revokeBtn = document.getElementById('settings-revoke-device-btn');
            if (revokeBtn) {
                 revokeBtn.addEventListener('click', async () => {
                     remoteSettings.activeDeviceId = null;
                     await window.iptvAPI.saveRemoteSettings(remoteSettings);
                     renderSettings();
                     showToast('Paired device revoked.');
                 });
            }

            document.getElementById('settings-copy-remote-btn').addEventListener('click', (btnEvt) => {
                 const url = btnEvt.target.getAttribute('data-url');
                 window.iptvAPI.copyToClipboard(url);
                 const originalText = btnEvt.target.textContent;
                 btnEvt.target.textContent = 'Copied!';
                 setTimeout(() => { btnEvt.target.textContent = originalText; }, 2000);
            });
        }

        if (toggle) {
            // Setup toggle listener now that settings loaded
            toggle.addEventListener('change', async (e) => {
                 const isEnabled = e.target.checked;
                 const configDivEl = document.getElementById('settings-remote-config');
                 const statusSpanEl = document.getElementById('settings-remote-status');
                 
                 if (configDivEl) configDivEl.style.display = isEnabled ? 'block' : 'none';
                 if (statusSpanEl) {
                     statusSpanEl.textContent = isEnabled ? 'Enabled' : 'Disabled';
                     statusSpanEl.style.color = isEnabled ? '#43CB44' : '#cf6679';
                 }
                 
                 remoteSettings.enabled = isEnabled;
                 await window.iptvAPI.saveRemoteSettings(remoteSettings);
                 showToast(`Remote Control ${isEnabled ? 'Enabled' : 'Disabled'}`);
            });
        }
    }).catch(e => console.error('Error auto-loading remote settings:', e));

    // 5. Load EPG channels in the background asynchronously
    const allEpgSources = savedPlaylists.map(p => p.epg).filter(e => e && e !== 'Not Configured');
    savedEpgs.forEach(e => { if (!allEpgSources.includes(e)) allEpgSources.push(e); });
    const combinedEpgs = allEpgSources.join(',');
    
    window.iptvAPI.getEpgChannels(combinedEpgs).then(data => {
        epgChannelsData = data;
        
        // Populate EPG filter list
        const epgFilter = document.getElementById('mapping-epg-filter');
        if (epgFilter) {
            epgFilter.innerHTML = '<option value="all">All EPG Sources</option>';
            const epgSourcesSet = new Set();
            if (epgChannelsData) epgChannelsData.forEach(e => { if (e.source) epgSourcesSet.add(e.source); });
            Array.from(epgSourcesSet).sort((a, b) => sortAlphaNum(getEpgName(a), getEpgName(b))).forEach(src => {
                 const opt = document.createElement('option');
                 opt.value = src;
                 opt.textContent = getEpgName(src);
                 epgFilter.appendChild(opt);
            });
        }
        
        // Refresh mapping lists to overlay active EPG mapping names
        renderMappingColumns();
    }).catch(err => {
        console.error('Error fetching EPG channels in settings:', err);
        const listContainer = document.getElementById('mapping-epg-list');
        if (listContainer) listContainer.innerHTML = '<div style="padding: 20px; text-align: center; color: #cf6679;">Failed to load EPG channels.</div>';
    });
}

async function applySingleMapping(channelTitle, epgId) {
    console.log('[MAPPING] Applying single mapping:', { channelTitle, epgId });
    if (epgId) channelMappings[channelTitle] = epgId;
    else delete channelMappings[channelTitle];
    
    await window.iptvAPI.saveMapping(channelTitle, epgId);

    updateState();

    // Update active Live TV sidebar detail view
    if (streamActive) {
        const currentUrl = localStorage.getItem('lastPlayedChannelUrl');
        if (currentUrl) {
            const currentChannel = allChannels.find(c => c.url === currentUrl);
            if (currentChannel && currentChannel.title === channelTitle) {
                embedStream(currentChannel);
            }
        }
    }
    
    // Update Guide if we happen to switch over to it or if it is currently visible
    const epgView = document.getElementById('epg-view');
    if (epgView && epgView.style.display === 'flex') {
        renderFullEpg();
    }
}

function updateState(skipSave = false) {
    console.log('[STATE] Updating global state and re-rendering.');
    allChannels = [];
    
    savedPlaylists.sort((a, b) => sortAlphaNum(a.name, b.name));

    const filterSelect = document.getElementById('playlist-filter');
    let currentFilter = 'all';
    if (filterSelect) {
        currentFilter = filterSelect.value;
        if (currentFilter === 'all' && !window.initialFilterLoaded) {
            currentFilter = localStorage.getItem('iptv_playlist_filter') || 'all';
            window.initialFilterLoaded = true;
        }
        filterSelect.innerHTML = '<option value="all">All Merged</option><option value="favs">Favourites</option>';
    }

    savedPlaylists.forEach(p => {
        if (p.channels) {
            p.channels.sort((a, b) => sortAlphaNum(a.title, b.title));
        }
        if (p.channels && !p.disabled) {
            if (filterSelect) {
                const opt = document.createElement('option');
                opt.value = p.id;
                opt.textContent = p.name;
                filterSelect.appendChild(opt);
            }
            
            // Group channels together as they appear in the playlist
            let groupedChannels = {};
            let groupOrder = [];
            
            p.channels.forEach(c => {
                if (c.disabled) return;
                // Segregate Stalker Movies/Series out of Live channels
                const channelType = c.type || 'live';
                if (channelType !== 'live') return;
                
                c.playlistId = p.id; // Attach playlist ID for easy filtering
                const groupName = c.group || 'Uncategorized';
                if (!groupedChannels[groupName]) {
                    groupedChannels[groupName] = [];
                    groupOrder.push(groupName);
                }
                groupedChannels[groupName].push(c);
            });
            
            groupOrder.sort(sortAlphaNum).forEach(g => {
                groupedChannels[g].forEach(c => allChannels.push(c));
            });
        }
    });
    
    allChannels.sort((a, b) => sortAlphaNum(a.title, b.title));

    if (streamActive) {
        const currentUrl = localStorage.getItem('lastPlayedChannelUrl');
        const detailName = document.getElementById('detail-name');
        const currentTitle = detailName ? detailName.textContent : '';
        currentPlayingChannelIndex = allChannels.findIndex(c => c.url === currentUrl && (c.title || 'Unknown Channel') === currentTitle);
    } else {
        currentPlayingChannelIndex = -1;
    }

    if (filterSelect && Array.from(filterSelect.options).some(o => o.value === currentFilter)) {
        filterSelect.value = currentFilter;
    } else if (filterSelect) {
        filterSelect.value = 'all';
        localStorage.setItem('iptv_playlist_filter', 'all');
    }

    let groupFilter = document.getElementById('group-filter');
    if (groupFilter) groupFilter.remove();

    let channelSearch = document.getElementById('channel-search');
    if (!channelSearch && filterSelect) {
        channelSearch = document.createElement('input');
        channelSearch.id = 'channel-search';
        channelSearch.type = 'text';
        channelSearch.placeholder = 'Search channels...';
        channelSearch.style.marginTop = '10px';
        channelSearch.style.width = '100%';
        channelSearch.style.padding = '8px';
        channelSearch.style.borderRadius = '4px';
        channelSearch.style.background = '#1e1e1e';
        channelSearch.style.color = '#fff';
        channelSearch.style.border = '1px solid #333';
        channelSearch.style.boxSizing = 'border-box';
        filterSelect.parentNode.insertBefore(channelSearch, filterSelect.nextSibling);
        channelSearch.addEventListener('input', () => {
            renderChannels();
            renderLiveEpgGrid();
        });
    }

    renderChannels();
    renderPlaylists();
    if (!skipSave) {
        window.iptvAPI.saveChannels(savedPlaylists);
    }
    updateNavLockState();
}

async function addPlaylist(source, customName, epgSource, editIndex = -1) {
    console.log('[PLAYLIST] Adding/editing playlist:', { source, customName, epgSource, editIndex });
    try {
        const isStalker = epgSource && epgSource.startsWith('stalker:');
        let result;
        if (isStalker) {
            console.log('[API] Calling parseStalker for new playlist.');
            result = await window.iptvAPI.parseStalker({ url: source, mac: epgSource.substring(8) });
        } else {
            console.log('[API] Calling parseM3u for new playlist.');
            result = await window.iptvAPI.parseM3u(source);
        }
        if (result && result.error) {
            showToast(`Failed to import.\nReason: ${result.error}`);
            return false;
        } else if (!result || (!Array.isArray(result) && !result.channels)) {
            showToast(`Failed to import.\nReason: Received invalid data from source.`);
            return false;
        } else {
            let channels = Array.isArray(result) ? result : result.channels;
            let finalEpgSource = epgSource || 'Not Configured';
            
            if (!isStalker && (!epgSource || epgSource === 'Not Configured') && result.epg_url) {
                finalEpgSource = result.epg_url;
            }

            if (isStalker && editIndex >= 0 && savedPlaylists[editIndex] && savedPlaylists[editIndex].channels) {
                const existingLive = savedPlaylists[editIndex].channels.filter(c => 
                    c.type !== 'itv_category' && 
                    c.type !== 'vod_category' && 
                    c.type !== 'movie_category' && 
                    c.type !== 'series_category'
                );
                channels = [...channels, ...existingLive];
            }

            if (editIndex >= 0 && savedPlaylists[editIndex] && savedPlaylists[editIndex].channels) {
                const oldMap = new Map();
                let newCount = 0;
                savedPlaylists[editIndex].channels.forEach(c => oldMap.set(c.title, c));
                channels.forEach(newCh => {
                    const old = oldMap.get(newCh.title);
                    if (old) {
                        newCh.disabled = old.disabled;
                        newCh.favourite = old.favourite;
                        if (old.isNew) newCh.isNew = true;
                    } else {
                        const isVod = newCh.type === 'movie' || newCh.type === 'series' || newCh.type === 'movie_category' || newCh.type === 'vod_category' || newCh.type === 'series_category';
                        newCh.disabled = isVod ? false : true;
                        if (!isVod) {
                            newCh.isNew = true;
                            newCount++;
                        }
                    }
                });
                if (newCount > 0) showToast(`Update complete: Found ${newCount} new channels.`);
            } else {
                channels.forEach(newCh => {
                    const isVod = newCh.type === 'movie' || newCh.type === 'series' || newCh.type === 'movie_category' || newCh.type === 'vod_category' || newCh.type === 'series_category';
                    newCh.disabled = isVod ? false : true;
                    if (!isVod) newCh.isNew = true;
                });
            }

            const tempPlaylist = {
                id: editIndex >= 0 ? savedPlaylists[editIndex].id : (Date.now() + Math.random()),
                source: source,
                name: customName,
                channels: channels,
                epg: finalEpgSource,
                disabled: false,
                editIndex: editIndex,
                exp_date: result.exp_date || null
            };
            
            openManageChannelsModal(-1, tempPlaylist);
            return 'pending';
        }
    } catch (err) {
        showToast(`UI Error (${source}):\n${err.message}`);
        return false;
    }
}

function openManageChannelsModal(playlistIndex, pendingData = null) {
    console.log('[UI] Opening manage channels modal for playlist index:', playlistIndex, pendingData ? 'is new import' : '');
    const isNew = pendingData !== null;
    let playlist;
    let originalChannels = [];
    if (isNew) {
        playlist = pendingData;
        originalChannels = playlist.channels;
    } else {
        playlist = savedPlaylists[playlistIndex];
        originalChannels = playlist.channels;
    }

    if (!playlist || !originalChannels) return;

    let modal = document.getElementById('manage-channels-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'manage-channels-modal';
        modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 1000; display: flex; align-items: center; justify-content: center;';
        document.body.appendChild(modal);
    }
    
    const isStalker = playlist.epg && playlist.epg.startsWith('stalker:');
    
    const groupsMap = {};
    const stalkerParents = {};

    originalChannels.forEach((c, idx) => {
        const isVod = c.type === 'movie' || c.type === 'series' || c.type === 'movie_category' || c.type === 'vod_category' || c.type === 'series_category';
        if (isVod) {
            return; // Skip adding to UI entirely
        }

        if (isStalker && c.type && c.type.endsWith('_category')) {
            const parent = c.group || 'Categories';
            if (!stalkerParents[parent]) stalkerParents[parent] = [];
            stalkerParents[parent].push(c.title);
            
            if (!groupsMap[c.title]) groupsMap[c.title] = { channels: [], category: c, categoryIndex: idx };
            else { groupsMap[c.title].category = c; groupsMap[c.title].categoryIndex = idx; }
        } else {
            const g = c.group || 'Ungrouped';
            if (!groupsMap[g]) groupsMap[g] = { channels: [] };
            groupsMap[g].channels.push({ channel: c, originalIndex: idx });
        }
    });
    
    const tempDisabled = new Set();
    const tempSelected = new Set();
    
    originalChannels.forEach((c, idx) => {
        if (c.disabled !== false) tempDisabled.add(idx);
    });

    let currentGroupFilter = null;
    let sortedGroups = [];

    if (isStalker) {
        if (Object.keys(stalkerParents).length > 0) {
            const firstParent = Object.keys(stalkerParents).sort(sortAlphaNum)[0];
            if (stalkerParents[firstParent].length > 0) {
                currentGroupFilter = stalkerParents[firstParent].sort(sortAlphaNum)[0];
            }
        }
    } else {
        sortedGroups = Array.from(Object.keys(groupsMap)).sort(sortAlphaNum);
        currentGroupFilter = sortedGroups.length > 0 ? sortedGroups[0] : null;
    }

    const newCount = originalChannels.filter(c => c.isNew).length;
    const newTitleStr = newCount > 0 ? ` <span style="color: #FFD700; font-size: 0.85em; font-weight: normal;">(${newCount} New Channels Found)</span>` : '';

    let groupsHtml = '';
    if (isStalker) {
        Object.keys(stalkerParents).sort(sortAlphaNum).forEach(parent => {
            groupsHtml += `<div style="padding: 10px; background: #1a1a1a; font-weight: bold; color: #bb86fc; font-size: 0.9em; text-transform: uppercase; border-bottom: 1px solid #333; border-top: 1px solid #333;">${parent.replace(/</g, '&lt;')}</div>`;
            
            stalkerParents[parent].sort(sortAlphaNum).forEach(g => {
                const total = groupsMap[g].channels.length;
                const enabled = groupsMap[g].channels.filter(item => !tempDisabled.has(item.originalIndex)).length;
                const hasNew = groupsMap[g].channels.some(item => item.channel.isNew);
                const newLabel = hasNew ? ' <span style="color: #FFD700; font-size: 0.85em;">(New)</span>' : '';
                
                groupsHtml += `
                <div class="modal-group-item" data-group="${g.replace(/"/g, '&quot;')}" style="padding: 10px 20px; cursor: pointer; border-left: 4px solid transparent; color: #e0e0e0; transition: 0.2s; font-family: 'Inter', sans-serif; font-size: 0.9em;">
                    ${g.replace(/</g, '&lt;')}${newLabel} <span class="group-count-span" style="color: #666; font-size: 0.85em; float: right;">${enabled} (${total})</span>
                </div>`;
            });
        });
        
        const looseGroups = Object.keys(groupsMap).filter(g => !Object.values(stalkerParents).flat().includes(g));
        if (looseGroups.length > 0) {
            groupsHtml += `<div style="padding: 10px; background: #1a1a1a; font-weight: bold; color: #bb86fc; font-size: 0.9em; text-transform: uppercase; border-bottom: 1px solid #333; border-top: 1px solid #333;">Other Channels</div>`;
            looseGroups.sort(sortAlphaNum).forEach(g => {
                const total = groupsMap[g].channels.length;
                const enabled = groupsMap[g].channels.filter(item => !tempDisabled.has(item.originalIndex)).length;
                const hasNew = groupsMap[g].channels.some(item => item.channel.isNew);
                const newLabel = hasNew ? ' <span style="color: #FFD700; font-size: 0.85em;">(New)</span>' : '';
                
                groupsHtml += `
                <div class="modal-group-item" data-group="${g.replace(/"/g, '&quot;')}" style="padding: 10px 20px; cursor: pointer; border-left: 4px solid transparent; color: #e0e0e0; transition: 0.2s; font-family: 'Inter', sans-serif; font-size: 0.9em;">
                    ${g.replace(/</g, '&lt;')}${newLabel} <span class="group-count-span" style="color: #666; font-size: 0.85em; float: right;">${enabled} (${total})</span>
                </div>`;
            });
        }
    } else {
        sortedGroups.forEach(g => {
            const total = groupsMap[g].channels.length;
            const enabled = groupsMap[g].channels.filter(item => !tempDisabled.has(item.originalIndex)).length;
            const hasNew = groupsMap[g].channels.some(item => item.channel.isNew);
            const newLabel = hasNew ? ' <span style="color: #FFD700; font-size: 0.85em;">(New)</span>' : '';
            
            groupsHtml += `
            <div class="modal-group-item" data-group="${g.replace(/"/g, '&quot;')}" style="padding: 10px 20px; cursor: pointer; border-left: 4px solid transparent; color: #e0e0e0; transition: 0.2s; font-family: 'Inter', sans-serif; font-size: 0.9em;">
                ${g.replace(/</g, '&lt;')}${newLabel} <span class="group-count-span" style="color: #666; font-size: 0.85em; float: right;">${enabled} (${total})</span>
            </div>`;
        });
    }

    modal.innerHTML = `
        <div style="background: #1e1e1e; border: 1px solid #333; border-radius: 8px; width: 90%; max-width: 1000px; height: 85%; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
            <div style="padding: 15px 20px; border-bottom: 1px solid #333; display: flex; justify-content: space-between; align-items: center; background: #252525;">
                <h2 style="margin: 0; color: #bb86fc; font-size: 1.2em;">Manage Channels: ${playlist.name}${newTitleStr}</h2>
                <div style="display: flex; gap: 10px;">
                    <input type="text" id="modal-channel-search" placeholder="Search channels..." value="" style="background: #121212; color: #fff; border: 1px solid #444; padding: 6px 12px; border-radius: 4px; outline: none; width: 250px;">
                </div>
            </div>
            
            <div style="display: flex; flex-grow: 1; overflow: hidden;">
                <!-- Left Column: Groups -->
                <div style="width: 250px; background: #121212; border-right: 1px solid #333; display: flex; flex-direction: column;">
                    <div style="padding: 10px; background: #1a1a1a; border-bottom: 1px solid #333; font-weight: bold; color: #888; font-size: 0.9em; text-transform: uppercase;">
                        Groups
                    </div>
                    <div id="modal-groups-list" style="flex-grow: 1; overflow-y: auto; padding: 10px 0;">
                        ${groupsHtml}
                    </div>
                </div>

                <!-- Right Column: Channels -->
                <div style="flex-grow: 1; display: flex; flex-direction: column; background: #1a1a1a; min-width: 0;">
                    <div style="padding: 10px 20px; background: #252525; border-bottom: 1px solid #333; display: flex; align-items: center; gap: 15px;">
                        <label style="display: flex; align-items: center; cursor: pointer; color: #bb86fc; font-weight: bold; margin-right: 10px;">
                            <input type="checkbox" id="modal-select-all" style="margin-right: 10px; width: 18px; height: 18px;">
                            Select All
                        </label>
                        <button id="modal-enable-btn" class="playlist-btn" style="background: #43CB44; color: black; font-weight: bold; padding: 4px 12px; border-radius: 4px;">Enable</button>
                        <button id="modal-disable-btn" class="playlist-btn" style="background: #cf6679; color: black; font-weight: bold; padding: 4px 12px; border-radius: 4px;">Disable</button>
                        <span id="modal-channels-count" style="color: #888; font-size: 0.9em; flex-grow: 1; text-align: right;">Showing 0 channels</span>
                    </div>
                    <div id="modal-channels-list" style="flex-grow: 1; overflow-y: auto; padding: 10px 20px;">
                    </div>
                </div>
            </div>
            <div style="padding: 15px 20px; border-top: 1px solid #333; display: flex; justify-content: flex-end; gap: 10px; background: #252525;">
                <button id="modal-cancel-btn" class="playlist-btn" style="background: #333;">Cancel</button>
                <button id="modal-save-btn" class="playlist-btn" style="background: #bb86fc; color: #000; font-weight: bold;">${isNew ? 'Import Selected' : 'Save Changes'}</button>
            </div>
        </div>
    `;

    let currentFilteredChannels = [];
    const renderChannelsList = () => {
        const searchVal = (document.getElementById('modal-channel-search') ? document.getElementById('modal-channel-search').value : '').toLowerCase();

        let channelsToRender = (currentGroupFilter && groupsMap[currentGroupFilter]) ? groupsMap[currentGroupFilter].channels : [];

        if (searchVal) {
            channelsToRender = channelsToRender.filter(item => {
                const title = String(item.channel.title || 'Unknown Channel').toLowerCase();
                return title.includes(searchVal);
            });
        }

        const sorter = (a, b) => sortAlphaNum(a.channel.title, b.channel.title);
        
        const enabledList = [];
        const disabledList = [];

        channelsToRender.forEach(item => {
            if (tempDisabled.has(item.originalIndex)) {
                disabledList.push(item);
            } else {
                enabledList.push(item);
            }
        });

        enabledList.sort(sorter);
        disabledList.sort(sorter);

        currentFilteredChannels = [...enabledList, ...disabledList];
        let visibleCount = currentFilteredChannels.length;

        let channelsHtml = currentFilteredChannels.map(item => {
            const { channel, originalIndex } = item;
            const isDisabled = tempDisabled.has(originalIndex);
            const isSelected = tempSelected.has(originalIndex);
            const isNew = channel.isNew;
            const safeTitle = (channel.title || 'Unknown Channel').replace(/</g, "&lt;").replace(/>/g, "&gt;");
            
            const newLabel = isNew ? ' <span style="color: #FFD700;">(New)</span>' : '';
            const titleColor = isDisabled ? (isNew ? '#FFD700' : '#cf6679') : '#43CB44';

            return `
                <label style="display: flex; align-items: center; padding: 8px; border-bottom: 1px solid #333; cursor: pointer; background: ${isSelected ? '#2a2a2a' : 'transparent'};">
                    <input type="checkbox" class="channel-select-cb" data-idx="${originalIndex}" ${isSelected ? 'checked' : ''} style="margin-right: 15px; width: 18px; height: 18px;">
                    <span style="flex-grow: 1; color: ${titleColor}; font-weight: bold; font-size: 0.85em; font-family: 'Inter', sans-serif;">${safeTitle}${newLabel}</span>
                </label>
            `;
        }).join('');

        let allVisibleSelectedCalc = visibleCount > 0;
        if (allVisibleSelectedCalc) {
            currentFilteredChannels.forEach(item => {
                if (!tempSelected.has(item.originalIndex)) {
                    allVisibleSelectedCalc = false;
                }
            });
        }

        const countSpan = document.getElementById('modal-channels-count');
        if (countSpan) countSpan.textContent = `Showing ${visibleCount} channels`;

        const selectAllCb = document.getElementById('modal-select-all');
        if (selectAllCb) selectAllCb.checked = allVisibleSelectedCalc;

        const listDiv = document.getElementById('modal-channels-list');
        if (listDiv) listDiv.innerHTML = channelsHtml;

        document.querySelectorAll('.channel-select-cb').forEach(cb => {
            cb.addEventListener('change', (e) => {
                const idx = parseInt(e.target.getAttribute('data-idx'));
                if (e.target.checked) tempSelected.add(idx);
                else tempSelected.delete(idx);
                
                const label = e.target.closest('label');
                if (e.target.checked) {
                    label.style.background = '#2a2a2a';
                } else {
                    label.style.background = 'transparent';
                }
                let allVisibleSelectedCheck = true;
                document.querySelectorAll('.channel-select-cb').forEach(c => {
                    if (!c.checked) allVisibleSelectedCheck = false;
                });
                document.getElementById('modal-select-all').checked = allVisibleSelectedCheck;
            });
        });
        
        document.querySelectorAll('.modal-group-item').forEach(el => {
            const g = el.getAttribute('data-group');
            if (!groupsMap[g]) return;
            const total = groupsMap[g].channels.length;
            const enabled = groupsMap[g].channels.filter(item => !tempDisabled.has(item.originalIndex)).length;
            const countSpan = el.querySelector('.group-count-span');
            if (countSpan) countSpan.textContent = `${enabled} (${total})`;

            if (g === currentGroupFilter) {
                el.style.borderLeftColor = '#bb86fc';
                el.style.background = '#2a2a2a';
                el.style.color = '#bb86fc';
                el.style.fontWeight = 'bold';
            } else {
                el.style.borderLeftColor = 'transparent';
                el.style.background = 'transparent';
                el.style.color = '#e0e0e0';
                el.style.fontWeight = 'normal';
            }
        });
    };

    document.querySelectorAll('.modal-group-item').forEach(el => {
        el.addEventListener('click', async (e) => {
            const g = el.getAttribute('data-group');
            currentGroupFilter = g;
            
            if (isStalker && groupsMap[g] && groupsMap[g].category && groupsMap[g].channels.length === 0) {
                const listDiv = document.getElementById('modal-channels-list');
                listDiv.innerHTML = '<div style="color: #888; text-align: center; padding: 20px;">Fetching channels...</div>';
                
                try {
                    const cat = groupsMap[g].category;
                    const mac = playlist.epg.substring(8);
                    let categoryType = 'movie';
                    if (cat.type === 'itv_category') categoryType = 'itv';
                    else if (cat.type === 'series_category' || cat.type === 'vod_category') categoryType = 'series';
                    
                    const fetched = await window.iptvAPI.loadStalkerCategory({
                        url: playlist.source,
                        mac: mac,
                        categoryId: cat.tvg_id,
                        categoryType: categoryType,
                        categoryName: cat.title,
                        isSeries: categoryType === 'series'
                    });
                    
                    fetched.forEach(newCh => {
                        newCh.disabled = true;
                        newCh.isNew = true;
                        
                        const newIdx = originalChannels.length;
                        originalChannels.push(newCh);
                        tempDisabled.add(newIdx);
                        groupsMap[g].channels.push({ channel: newCh, originalIndex: newIdx });
                    });
                    
                } catch (err) {
                    showToast("Failed to fetch channels for category.");
                }
            }
            
            renderChannelsList();
        });
    });

    document.getElementById('modal-channel-search').addEventListener('input', renderChannelsList);

    document.getElementById('modal-select-all').addEventListener('change', (e) => {
        const checkAll = e.target.checked;
        currentFilteredChannels.forEach(item => {
            if (checkAll) tempSelected.add(item.originalIndex);
            else tempSelected.delete(item.originalIndex);
        });
        renderChannelsList();
    });

    document.getElementById('modal-enable-btn').addEventListener('click', () => {
        if (tempSelected.size === 0) return;
        tempSelected.forEach(idx => tempDisabled.delete(idx));
        tempSelected.clear();
        renderChannelsList();
    });

    document.getElementById('modal-disable-btn').addEventListener('click', () => {
        if (tempSelected.size === 0) return;
        tempSelected.forEach(idx => tempDisabled.add(idx));
        tempSelected.clear();
        renderChannelsList();
    });

    document.getElementById('modal-cancel-btn').addEventListener('click', () => {
        modal.style.display = 'none';
        modal.innerHTML = '';
        if (isNew) {
            if (document.getElementById('import-submit-btn')) {
                document.getElementById('import-submit-btn').textContent = 'Import';
                document.getElementById('import-submit-btn').disabled = false;
            }
            if (document.getElementById('import-stalker-submit-btn')) {
                document.getElementById('import-stalker-submit-btn').textContent = 'Import';
                document.getElementById('import-stalker-submit-btn').disabled = false;
            }
        }
    });

    document.getElementById('modal-save-btn').addEventListener('click', async () => {
        modal.style.display = 'none';
        modal.innerHTML = '';
        
        originalChannels.forEach((c, idx) => {
            c.disabled = tempDisabled.has(idx);
            delete c.isNew;
        });
        playlist.channels = originalChannels;

        if (isNew) {
            if (playlist.editIndex >= 0) {
                savedPlaylists[playlist.editIndex] = playlist;
            } else {
                savedPlaylists.push(playlist);
            }
            
            updateState(true);
            
            const isStalker = playlist.epg && playlist.epg.startsWith('stalker:');
            if (isStalker) {
                updateState(); 
            } else {
                let allEpgSources = savedEpgs.slice();
                if (playlist.epg && playlist.epg !== 'Not Configured' && !allEpgSources.includes(playlist.epg)) {
                    allEpgSources.push(playlist.epg);
                }
                
                if (!window.activeEpgParsing) window.activeEpgParsing = new Set();
                if (playlist.epg && playlist.epg !== 'Not Configured') {
                    window.activeEpgParsing.add(playlist.epg);
                }
                updateState(true);
                
                if (allEpgSources.length > 0) {
                    console.log('[API] Calling updateEpg after adding playlist.');
                    const combinedEpgs = allEpgSources.join(',');
                    await window.iptvAPI.updateEpg(combinedEpgs, null, true);
                    epgChannelsData = await window.iptvAPI.getEpgChannels(combinedEpgs);
                    await autoMapChannels(false, true);
                    updateState(); 
                } else {
                    updateState(); 
                }
                
                if (playlist.epg && playlist.epg !== 'Not Configured') {
                    window.activeEpgParsing.delete(playlist.epg);
                }
                updateState(); 
            }
            
            editingPlaylistIndex = -1;
            const importCancelBtn = document.getElementById('import-cancel-btn');
            const importStalkerCancelBtn = document.getElementById('import-stalker-cancel-btn');
            if (importCancelBtn) importCancelBtn.style.display = 'none';
            if (importNameInput) importNameInput.value = '';
            if (importFilePath) importFilePath.value = '';
            if (importUrlPath) importUrlPath.value = '';
            if (importEpgInput) importEpgInput.value = '';
            if (importStalkerCancelBtn) importStalkerCancelBtn.style.display = 'none';
            if (importStalkerName) importStalkerName.value = '';
            if (importStalkerUrl) importStalkerUrl.value = '';
            if (importStalkerMac) importStalkerMac.value = '';
            
            if (document.getElementById('import-submit-btn')) {
                document.getElementById('import-submit-btn').textContent = 'Import';
                document.getElementById('import-submit-btn').disabled = false;
            }
            if (document.getElementById('import-stalker-submit-btn')) {
                document.getElementById('import-stalker-submit-btn').textContent = 'Import';
                document.getElementById('import-stalker-submit-btn').disabled = false;
            }

        } else {
            updateState();
        }
    });

    renderChannelsList();
    modal.style.display = 'flex';
}

function renderPlaylists() {
    console.log('[UI] Rendering playlist cards.');
    const container = document.getElementById('playlist-cards');
    if (!container) return;
    container.innerHTML = '';
    
    if (clearBtn) {
        clearBtn.style.display = savedPlaylists.length > 0 ? 'block' : 'none';
    }

    savedPlaylists.forEach((playlist, index) => {
        const card = document.createElement('div');
        card.style.cssText = "border: 1px solid #333; border-radius: 12px; padding: 20px; background: #1e1e1e; display: flex; flex-direction: column; gap: 10px;";
        
        let epgInfo = '';
        let mappedChannels = 0;
        let totalPrograms = 0;
        if (playlist.channels) {
            playlist.channels.forEach(ch => {
                if (ch.type !== 'live') return;
                let isMapped = false;
                if (ch.title && channelMappings[ch.title]) {
                    isMapped = true;
                }
                if (ch.epg_programmes && ch.epg_programmes.length > 0) {
                    isMapped = true;
                    totalPrograms += ch.epg_programmes.length;
                }
                if (isMapped) mappedChannels++;
            });
        }
        if (totalPrograms > 0) {
            epgInfo = ` <span style="color: #43CB44; font-size: 0.9em;">(${mappedChannels} channels mapped, ${totalPrograms} programs)</span>`;
        } else if (mappedChannels > 0) {
            epgInfo = ` <span style="color: #43CB44; font-size: 0.9em;">(${mappedChannels} channels mapped)</span>`;
        } else if (window.activeEpgParsing && window.activeEpgParsing.has(playlist.epg)) {
            epgInfo = ` <span style="color: #bb86fc; font-size: 0.9em;">(Parsing EPG...)</span>`;
        } else if (playlist.epg && playlist.epg !== 'Not Configured') {
            const isEpgLoaded = epgChannelsData && epgChannelsData.some(e => e.source === playlist.epg);
            if (isEpgLoaded) {
                epgInfo = ` <span style="color: #bb86fc; font-size: 0.9em;">(0 channels mapped)</span>`;
            } else if (epgChannelsData) {
                epgInfo = ` <span style="color: #cf6679; font-size: 0.9em;">(EPG not loaded)</span>`;
            }
        }

        let totalChannels = 0;
        let enabledChannels = 0;
        let disabledChannels = 0;
        let groups = new Set();
        let enabledGroups = new Set();
        
        if (playlist.channels) {
            playlist.channels.forEach(ch => {
                if (ch.type !== 'live') return;
                totalChannels++;
                groups.add(ch.group || 'Uncategorized');
                if (ch.disabled) {
                    disabledChannels++;
                } else {
                    enabledChannels++;
                    enabledGroups.add(ch.group || 'Uncategorized');
                }
            });
        }

        let expInfo = '';
        if (playlist.exp_date) {
            let expStr = playlist.exp_date;
            if (/^\d{10}$/.test(expStr)) {
                expStr = new Date(parseInt(expStr) * 1000).toLocaleDateString();
            } else if (/^\d{13}$/.test(expStr)) {
                expStr = new Date(parseInt(expStr)).toLocaleDateString();
            } else {
                const parsedDate = new Date(expStr);
                if (!isNaN(parsedDate)) expStr = parsedDate.toLocaleDateString();
            }
            expInfo = `<span><strong>Expires:</strong> <span style="color: #FFD700;">${expStr}</span></span>`;
        }

        const isStalker = playlist.epg && playlist.epg.startsWith('stalker:');
        let statsHtml = '';
        
        if (isStalker) {
            const mac = playlist.epg.substring(8);
            statsHtml = `
                <span><strong>MAC:</strong> <span style="color: #bb86fc;">${mac}</span></span>
                <span><strong>Total Groups:</strong> ${groups.size}</span>
                <span><strong>Enabled Groups:</strong> <span style="color: #43CB44;">${enabledGroups.size}</span></span>
                <span><strong>Enabled Channels:</strong> <span style="color: #43CB44;">${enabledChannels}</span></span>
                ${expInfo}
            `;
        } else {
            statsHtml = `
                <span><strong>Total Channels:</strong> ${totalChannels}</span>
                <span><strong>Enabled:</strong> <span style="color: #43CB44;">${enabledChannels}</span></span>
                <span><strong>Disabled:</strong> <span style="color: #cf6679;">${disabledChannels}</span></span>
                <span><strong>Groups:</strong> ${groups.size}</span>
                ${expInfo}
            `;
        }

        card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <h3 style="margin: 0; color: ${playlist.disabled ? '#888' : '#bb86fc'};">${playlist.name} ${playlist.disabled ? '(Disabled)' : ''}</h3>
                <div style="display: flex; flex-direction: column; gap: 8px; align-items: flex-end;">
                    <div style="display: flex; gap: 10px;">
                        <button class="playlist-btn edit-btn" data-index="${index}">Edit</button>
                        <button class="playlist-btn manage-channels-btn" data-index="${index}">Manage Channels</button>
                        <button class="playlist-btn refresh-btn" data-index="${index}">Refresh</button>
                        <button class="playlist-btn delete delete-btn" data-index="${index}">Delete</button>
                    </div>
                    <div style="display: flex; gap: 10px;">
                        ${playlist.disabled 
                            ? `<button class="playlist-btn enable-btn" data-index="${index}" style="background: #43CB44; color: black; border: none; font-weight: bold;">Enable</button>` 
                            : `<button class="playlist-btn disable-btn" data-index="${index}">Disable</button>`
                        }
                    </div>
                </div>
            </div>
            <div style="color: #888; font-size: 0.9em; word-break: break-all;"><strong>Location:</strong> ${playlist.source}</div>
            <div style="color: #aaa; font-size: 0.95em; margin-top: 5px;">
                <div style="margin-bottom: 5px; display: flex; flex-wrap: wrap; gap: 15px;">
                    ${statsHtml}
                </div>
                <div>
                    <span><strong>EPG:</strong> <span title="${playlist.epg || 'Not Configured'}">${getEpgName(playlist.epg)}</span>${epgInfo}</span>
                </div>
            </div>
        `;
        container.appendChild(card);
    });

    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = parseInt(e.target.getAttribute('data-index'), 10);
            console.log('[EVENT] Edit playlist button clicked for index:', idx);
            const playlist = savedPlaylists[idx];
            editingPlaylistIndex = idx;
            
            if (playlist.epg && playlist.epg.startsWith('stalker:')) {
                const stalkerTab = document.getElementById('tab-playlist-stalker');
                if (stalkerTab) stalkerTab.click();
                if (importStalkerName) importStalkerName.value = playlist.name;
                if (importStalkerUrl) importStalkerUrl.value = playlist.source;
                const mac = playlist.epg.substring(8);
                if (importStalkerMac) importStalkerMac.value = mac;
                
                if (importStalkerSubmitBtn) importStalkerSubmitBtn.textContent = 'Update';
                if (importStalkerCancelBtn) importStalkerCancelBtn.style.display = 'block';
            } else if (playlist.source.startsWith('http://') || playlist.source.startsWith('https://')) {
                const m3uTab = document.getElementById('tab-playlist-m3u');
                if (m3uTab) m3uTab.click();
                if (importNameInput) importNameInput.value = playlist.name;
                if (btnModeUrl) btnModeUrl.click();
                if (importUrlPath) importUrlPath.value = playlist.source;
                if (importFilePath) importFilePath.value = '';
                if (importEpgInput) {
                    importEpgInput.value = playlist.epg === 'Not Configured' ? '' : playlist.epg;
                }
                if (importSubmitBtn) importSubmitBtn.textContent = 'Update';
                if (importCancelBtn) importCancelBtn.style.display = 'block';
            } else {
                const m3uTab = document.getElementById('tab-playlist-m3u');
                if (m3uTab) m3uTab.click();
                if (importNameInput) importNameInput.value = playlist.name;
                if (btnModeFile) btnModeFile.click();
                if (importFilePath) importFilePath.value = playlist.source;
                if (importUrlPath) importUrlPath.value = '';
                if (importEpgInput) {
                    importEpgInput.value = playlist.epg === 'Not Configured' ? '' : playlist.epg;
                }
                if (importSubmitBtn) importSubmitBtn.textContent = 'Update';
                if (importCancelBtn) importCancelBtn.style.display = 'block';
            }
            
            const view = document.getElementById('playlist-view');
            if (view) view.scrollTo({ top: 0, behavior: 'smooth' });
        });
    });

    document.querySelectorAll('.manage-channels-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = parseInt(e.target.getAttribute('data-index'), 10);
            console.log('[EVENT] Manage channels button clicked for index:', idx);
            openManageChannelsModal(idx);
        });
    });

    document.querySelectorAll('.refresh-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const idx = parseInt(e.target.getAttribute('data-index'), 10);
            console.log('[EVENT] Refresh playlist button clicked for index:', idx);
            const targetPlaylist = savedPlaylists[idx];
            const source = targetPlaylist.source;
            const epgSource = targetPlaylist.epg !== 'Not Configured' ? targetPlaylist.epg : '';
            
            const isStalker = targetPlaylist.epg && targetPlaylist.epg.startsWith('stalker:');
            
            let allEpgSources = savedEpgs.slice();
            if (epgSource && !allEpgSources.includes(epgSource)) {
                allEpgSources.push(epgSource);
            }
            const combinedEpgs = allEpgSources.join(',');

            const originalText = e.target.textContent;
            e.target.textContent = 'Refreshing...';
            e.target.disabled = true;

            try {
                if (!isStalker) {
                    console.log('[API] Wiping cache before refresh for:', source);
                    if (window.iptvAPI.clearCache) await window.iptvAPI.clearCache(source);
                }

                let result;
                if (isStalker) {
                    console.log('[API] Calling parseStalker for refresh.');
                    result = await window.iptvAPI.parseStalker({ url: source, mac: targetPlaylist.epg.substring(8) });
                } else {
                    console.log('[API] Calling parseM3u for refresh.');
                    result = await window.iptvAPI.parseM3u(source, null, null, true);
                }
                
                if (result && !result.error && (Array.isArray(result) || result.channels)) {
                    let channels = Array.isArray(result) ? result : result.channels;
                    
                    if (isStalker && targetPlaylist.channels) {
                        const existingLive = targetPlaylist.channels.filter(c => 
                            c.type !== 'itv_category' && 
                            c.type !== 'vod_category' && 
                            c.type !== 'movie_category' && 
                            c.type !== 'series_category'
                        );
                        channels = [...channels, ...existingLive];
                    }

                    const oldMap = new Map();
                    if (targetPlaylist.channels) {
                        targetPlaylist.channels.forEach(c => oldMap.set(c.title, c));
                    }
                    let newCount = 0;
                    channels.forEach(newCh => {
                        const old = oldMap.get(newCh.title);
                        if (old) {
                            newCh.disabled = old.disabled;
                            newCh.favourite = old.favourite;
                            if (old.isNew) newCh.isNew = true;
                        } else {
                            const isVod = newCh.type === 'movie' || newCh.type === 'series' || newCh.type === 'movie_category' || newCh.type === 'vod_category' || newCh.type === 'series_category';
                            newCh.disabled = isVod ? false : true;
                            if (!isVod) {
                                newCh.isNew = true;
                                newCount++;
                            }
                        }
                    });
                    
                    if (newCount > 0) {
                        showToast(`Refresh complete: Found ${newCount} new channels.`);
                    } else {
                        showToast(`Refresh complete: No new channels found.`);
                    }
                    
                    let finalEpgSource = targetPlaylist.epg;
                    if (!isStalker && result.epg_url && (!targetPlaylist.epg || targetPlaylist.epg === 'Not Configured')) {
                        finalEpgSource = result.epg_url;
                    }
                    
                    const tempPlaylist = {
                        id: targetPlaylist.id,
                        source: targetPlaylist.source,
                        name: targetPlaylist.name,
                        channels: channels,
                        epg: finalEpgSource,
                        disabled: targetPlaylist.disabled,
                        editIndex: idx,
                        exp_date: result.exp_date || targetPlaylist.exp_date || null
                    };
                    
                    if (newCount > 0) {
                        openManageChannelsModal(-1, tempPlaylist);
                    } else {
                        savedPlaylists[idx] = tempPlaylist;
                        updateState();
                    }
                } else {
                    showToast('Failed to refresh playlist: ' + (result ? result.error : 'Unknown error'));
                }
            } catch(err) {
                showToast('Refresh error: ' + err.message);
            }
            
            e.target.textContent = originalText;
            e.target.disabled = false;
        });
    });

    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = e.target.getAttribute('data-index');
            console.log('[EVENT] Delete playlist button clicked for index:', idx);
            const playlist = savedPlaylists[idx];
            if (!playlist) return;
            showConfirmToast(`Are you sure you want to delete the playlist "${playlist.name}"?`, async () => {
                if (playlist.source) window.iptvAPI.clearCache(playlist.source);
                await window.iptvAPI.deletePlaylist(playlist.id);
                savedPlaylists.splice(idx, 1);
                updateState(true); // skip slow full-save since it's already deleted in the database
                showToast(`Playlist "${playlist.name}" deleted.`);
            });
        });
    });

    document.querySelectorAll('.enable-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = e.target.getAttribute('data-index');
            console.log('[EVENT] Enable playlist button clicked for index:', idx);
            savedPlaylists[idx].disabled = false;
            updateState();
        });
    });

    document.querySelectorAll('.disable-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = e.target.getAttribute('data-index');
            console.log('[EVENT] Disable playlist button clicked for index:', idx);
            savedPlaylists[idx].disabled = true;
            updateState();
        });
    });
}

try {
    window.expandedGroups = new Set(JSON.parse(localStorage.getItem('iptv_expanded_groups') || '[]'));
} catch (e) {
    window.expandedGroups = new Set();
}

function renderChannels() {
    console.log('[UI] Rendering channel list.');
    const filterSelect = document.getElementById('playlist-filter');
    const filterVal = filterSelect ? filterSelect.value : 'all';

    const channelSearch = document.getElementById('channel-search');
    const searchVal = channelSearch ? channelSearch.value.toLowerCase() : '';

    const previousScroll = channelList.scrollTop;

    let html = '';
    
    const groupedChannels = {};

    allChannels.forEach((channel, index) => {
        if (filterVal === 'favs' && !channel.favourite) return;
        if (filterVal !== 'all' && filterVal !== 'favs' && String(channel.playlistId) !== String(filterVal)) return;
        
        const rawTitle = channel.title || 'Unknown Channel';
        if (searchVal && !rawTitle.toLowerCase().includes(searchVal)) return;
        
        const rawGroup = channel.group || 'Uncategorized';
        const channelGroup = rawGroup.trim();
        let groupKey = channelGroup;
        // Case-insensitive check to club groups from different playlists
        const existingKey = Object.keys(groupedChannels).find(k => k.toLowerCase() === channelGroup.toLowerCase());
        if (existingKey) {
            groupKey = existingKey;
        }
        if (!groupedChannels[groupKey]) {
            groupedChannels[groupKey] = [];
        }
        groupedChannels[groupKey].push({ channel, index });
    });

    const sortedGroups = Object.keys(groupedChannels).sort(sortAlphaNum);

    if (sortedGroups.length === 0) {
        html = `<div style="padding: 20px; color: #888; text-align: center;">No channels found.</div>`;
    } else {
        sortedGroups.forEach(groupName => {
            const channelsInGroup = groupedChannels[groupName];
            const safeGroupName = groupName.replace(/</g, "&lt;").replace(/>/g, "&gt;");
            
            const isExpanded = searchVal ? true : window.expandedGroups.has(groupName);
            const expandIcon = isExpanded ? '▼' : '▶';
            
            const attrGroupName = String(groupName).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            html += `<div class="group-item" data-group="${attrGroupName}" tabindex="0" style="display: flex; align-items: center; justify-content: space-between; width: 100%; box-sizing: border-box; padding: 10px; background: #252525; border-bottom: 1px solid #1e1e1e; cursor: pointer; outline: none; font-weight: bold; color: #bb86fc;">
                <span>${safeGroupName} <span style="color:#888;font-size:0.8em;font-weight:normal;">(${channelsInGroup.length})</span></span>
                <span class="group-expand-icon" style="color:#888;font-size:0.8em;">${expandIcon}</span>
            </div>`;
            
            if (isExpanded) {
                html += `<div class="group-channels-container" style="background: #1a1a1a;">`;
                channelsInGroup.forEach(({channel, index}) => {
                    const rawTitle = channel.title || 'Unknown Channel';
                    const safeTitle = rawTitle.replace(/</g, "&lt;").replace(/>/g, "&gt;");
                    const imgSrc = (channel.logo && channel.logo.trim() !== '') ? channel.logo : 'assets/logo.ico';
                    
                    const favClass = channel.favourite ? 'fav-btn active' : 'fav-btn';
                    const favBtnHtml = `<button class="${favClass}" data-fav-index="${index}" title="Toggle Favourite"><svg viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg></button>`;

                    const playlist = savedPlaylists.find(p => String(p.id) === String(channel.playlistId));
                    const playlistName = playlist ? playlist.name : '';
                    const playlistBadge = (filterVal === 'all' && playlistName) ? ` <span style="color: #666; font-size: 0.8em; font-weight: 500; margin-left: 4px;">[${playlistName}]</span>` : '';

                    const activeClass = (index === currentPlayingChannelIndex) ? ' active' : '';
                    const eqHtml = (index === currentPlayingChannelIndex) ? `
                        <div class="mini-equalizer" title="Playing">
                            <span></span>
                            <span></span>
                            <span></span>
                        </div>
                    ` : '';

                    html += `<div class="channel-item${activeClass}" tabindex="0" data-index="${index}" title="${safeTitle.replace(/"/g, '&quot;')}">
                        <img src="${imgSrc}">
                        <span style="flex-grow: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding-right: 4px;">${safeTitle}${playlistBadge}</span>
                        ${eqHtml}
                        ${favBtnHtml}
                    </div>`;
                });
                html += `</div>`;
            }
        });
    }

    channelList.innerHTML = html;

    // Attach error handlers after inserting into DOM to bypass CSP inline restrictions
    channelList.querySelectorAll('img').forEach(img => {
        img.onerror = function() {
            this.onerror = null;
            this.src = 'assets/logo.ico';
        };
    });
    
    if (!window.initialScrollLoaded) {
        const savedScroll = parseInt(localStorage.getItem('iptv_sidebar_scroll'), 10);
        if (!isNaN(savedScroll)) channelList.scrollTop = savedScroll;
        window.initialScrollLoaded = true;
    } else {
        channelList.scrollTop = previousScroll;
    }
}

const filterElement = document.getElementById('playlist-filter');
if (filterElement) {
    console.log('[INIT] Attaching change listener to playlist filter.');
    filterElement.addEventListener('change', () => {
        localStorage.setItem('iptv_playlist_filter', filterElement.value);
        renderChannels();
        if (document.getElementById('epg-view') && document.getElementById('epg-view').style.display === 'flex') {
            renderFullEpg();
        }
        renderLiveEpgGrid();
    });
}

// Use Event Delegation to handle clicks for all channels efficiently
channelList.addEventListener('click', (e) => {
    console.log('[EVENT] Click detected on channel list.');
    
    const groupItem = e.target.closest('.group-item');
    if (groupItem) {
        const groupName = groupItem.getAttribute('data-group');
        if (window.expandedGroups.has(groupName)) {
            window.expandedGroups.delete(groupName);
        } else {
            window.expandedGroups.clear(); // Collapse all other groups
            window.expandedGroups.add(groupName);
        }
        localStorage.setItem('iptv_expanded_groups', JSON.stringify(Array.from(window.expandedGroups)));
        renderChannels();
        renderLiveEpgGrid();
        return;
    }

    const favBtn = e.target.closest('.fav-btn');
    if (favBtn) {
        const index = favBtn.getAttribute('data-fav-index');
        const channel = allChannels[index];
        if (channel) {
            const wasFocused = (document.activeElement === favBtn || favBtn.contains(document.activeElement));
            channel.favourite = !channel.favourite;
            updateState(); // Re-render lists and save state to background file
            if (wasFocused) {
                setTimeout(() => {
                    const newFavBtn = document.querySelector(`.fav-btn[data-fav-index="${index}"]`);
                    if (newFavBtn) {
                        newFavBtn.focus();
                    } else {
                        const firstChannel = document.querySelector('.channel-item');
                        if (firstChannel) firstChannel.focus();
                    }
                }, 10);
            }
        }
        return; // Stop event so video doesn't play
    }

    const item = e.target.closest('.channel-item');
    if (item) {
        const index = item.getAttribute('data-index');
        const channel = allChannels[index];
        if (channel) embedStream(channel);
    }
});

let sidebarScrollTimeout;
channelList.addEventListener('scroll', () => {
    clearTimeout(sidebarScrollTimeout);
    sidebarScrollTimeout = setTimeout(() => {
        if (window.initialScrollLoaded) {
            localStorage.setItem('iptv_sidebar_scroll', channelList.scrollTop);
        }
    }, 150);
});
// Tab Switching for "Add Playlist"
const playlistTabs = document.querySelectorAll('.playlist-tab-btn');
const playlistContents = document.querySelectorAll('.playlist-tab-content');

playlistTabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
        e.preventDefault();
        playlistTabs.forEach(t => t.classList.remove('active'));
        playlistContents.forEach(c => {
            c.style.display = 'none';
        });
        
        tab.classList.add('active');
        const targetId = tab.id.replace('tab-', 'content-');
        const targetEl = document.getElementById(targetId);
        if (targetEl) {
            targetEl.style.display = 'flex';
        }
    });
});

let currentImportMode = 'file';

if (btnModeFile) {
    btnModeFile.addEventListener('click', (e) => {
        e.preventDefault();
        console.log('[EVENT] Import mode changed to file.');
        currentImportMode = 'file';
        btnModeFile.classList.add('active');
        btnModeUrl.classList.remove('active');
        containerFile.style.display = 'flex';
        containerUrl.style.display = 'none';
    });
}

if (btnModeUrl) {
    btnModeUrl.addEventListener('click', (e) => {
        e.preventDefault();
        console.log('[EVENT] Import mode changed to url.');
        currentImportMode = 'url';
        btnModeUrl.classList.add('active');
        btnModeFile.classList.remove('active');
        containerUrl.style.display = 'block';
        containerFile.style.display = 'none';
    });
}

if (importBrowseBtn) {
    importBrowseBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        console.log('[API] Calling openFileDialog.');
        const filePaths = await window.iptvAPI.openFileDialog();
        if (filePaths && filePaths.length > 0) {
            importFilePath.value = filePaths[0];
            const source = filePaths[0];
            if (importEpgInput && !importEpgInput.value.trim()) {
                try {
                    console.log('[API] Calling parseM3u to pre-fill EPG from file.');
                    const result = await window.iptvAPI.parseM3u(source);
                    if (result && !result.error && result.epg_url && !importEpgInput.value.trim()) {
                        importEpgInput.value = result.epg_url;
                    }
                } catch (e) { console.error(e); }
            }
        }
    });
}

if (importUrlPath) {
    importUrlPath.addEventListener('change', async () => {
        const source = importUrlPath.value.trim();
        if (source && importEpgInput && !importEpgInput.value.trim()) {
            try {
                console.log('[API] Calling parseM3u to pre-fill EPG from URL.');
                const result = await window.iptvAPI.parseM3u(source);
                if (result && !result.error && result.epg_url && !importEpgInput.value.trim()) {
                    importEpgInput.value = result.epg_url;
                }
            } catch (e) { console.error(e); }
        }
    });
}

if (importSubmitBtn) {
    importSubmitBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        console.log('[EVENT] M3U Import/Update submit button clicked.');
        const name = importNameInput.value.trim();
        if (!name) {
            showToast("Playlist name is mandatory.");
            importNameInput.focus();
            return;
        }

        let source = '';
        let epgSource = '';

        if (currentImportMode === 'file') {
            source = importFilePath.value.trim();
            if (!source) {
                showToast("Please select a file location.");
                return;
            }
            epgSource = importEpgInput ? importEpgInput.value.trim() : '';
        } else {
            source = importUrlPath.value.trim();
            if (!source) {
                showToast("Please enter a valid M3U URL.");
                importUrlPath.focus();
                return;
            }
            epgSource = importEpgInput ? importEpgInput.value.trim() : '';
            
            // Auto-detect Xtream Codes URL pasted in the M3U box
            const urlPattern = /^(https?:\/\/[^/]+)\/(?:get|player_api)\.php\?(?:.*&)?username=([^&]+)(?:.*&)?password=([^&]+)/i;
            const match = source.match(urlPattern);
            if (match) {
                const server = match[1];
                const username = match[2];
                const password = match[3];
                console.log('[AUTO FALLBACK] Detected Xtream Codes URL in M3U box! Parsing as Xtream Codes portal in background:', server, username);
                
                const loading = document.getElementById('loading');
                if (loading) loading.style.display = 'block';
                
                try {
                    const result = await window.iptvAPI.parseXtream({ name, server, username, password });
                    if (loading) loading.style.display = 'none';
                    
                    if (result && result.error) {
                        showToast(`Fallback authentication failed.\nReason: ${result.error}`);
                        return;
                    }
                    
                    let channels = result.channels;
                    channels.forEach(newCh => {
                        const isVod = newCh.type === 'movie' || newCh.type === 'series';
                        newCh.disabled = isVod ? false : true;
                        if (!isVod) newCh.isNew = true;
                    });
                    
                    const tempPlaylist = {
                        id: Date.now() + Math.random(),
                        source: `xtream-credentials:${server}|${username}|${password}`,
                        name: name,
                        channels: channels,
                        epg: result.epg_url || ('xtream-epg:' + server),
                        disabled: false,
                        editIndex: -1,
                        exp_date: result.exp_date || null
                    };
                    
                    // Clear inputs
                    importNameInput.value = '';
                    importUrlPath.value = '';
                    if (importEpgInput) importEpgInput.value = '';
                    
                    openManageChannelsModal(-1, tempPlaylist);
                    return;
                } catch (err) {
                    if (loading) loading.style.display = 'none';
                    showToast(`Fallback failed:\n${err.message}`);
                    return;
                }
            }
        }
        
        const originalText = importSubmitBtn.textContent;
        importSubmitBtn.textContent = 'Importing...';
        importSubmitBtn.disabled = true;
        if (loadingMsg) loadingMsg.style.display = 'none';

        const success = await addPlaylist(source, name, epgSource, editingPlaylistIndex);
        
        if (importSubmitBtn) {
            importSubmitBtn.textContent = originalText;
            importSubmitBtn.disabled = false;
        }

        if (success) {
            editingPlaylistIndex = -1;
            if (importCancelBtn) importCancelBtn.style.display = 'none';
            if (importNameInput) importNameInput.value = '';
            if (importFilePath) importFilePath.value = '';
            if (importUrlPath) importUrlPath.value = '';
            if (importEpgInput) importEpgInput.value = '';
        }
    });
}

if (importStalkerSubmitBtn) {
    importStalkerSubmitBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        console.log('[EVENT] Stalker Import/Update submit button clicked.');
        const name = importStalkerName.value.trim();
        if (!name) {
            showToast("Playlist name is mandatory.");
            importStalkerName.focus();
            return;
        }

        let source = importStalkerUrl.value.trim();
        const mac = importStalkerMac.value.trim();
        if (!source) {
            showToast("Please enter Stalker Portal URL.");
            importStalkerUrl.focus();
            return;
        }
        if (!mac) {
            showToast("Please enter MAC Address.");
            importStalkerMac.focus();
            return;
        }
        const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
        if (!macRegex.test(mac)) {
            showToast("Invalid MAC Address format.\nExample: 00:1A:79:00:11:22");
            importStalkerMac.focus();
            return;
        }
        let epgSource = `stalker:${mac.toUpperCase()}`;
        
        const originalText = importStalkerSubmitBtn.textContent;
        importStalkerSubmitBtn.textContent = 'Importing...';
        importStalkerSubmitBtn.disabled = true;
        if (loadingMsg) loadingMsg.style.display = 'none';

        const success = await addPlaylist(source, name, epgSource, editingPlaylistIndex);
        
        if (success !== 'pending') {
            if (importStalkerSubmitBtn) {
                importStalkerSubmitBtn.textContent = originalText;
                importStalkerSubmitBtn.disabled = false;
            }

            if (success) {
                editingPlaylistIndex = -1;
                if (importStalkerCancelBtn) importStalkerCancelBtn.style.display = 'none';
                if (importStalkerName) importStalkerName.value = '';
                if (importStalkerUrl) importStalkerUrl.value = '';
                if (importStalkerMac) importStalkerMac.value = '';
            }
        }
    });
}

if (importXtremeSubmitBtn) {
    importXtremeSubmitBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        
        const name = importXtremeName.value.trim();
        const rawUrl = importXtremeUrl.value.trim();
        const user = importXtremeUser.value.trim();
        const pass = importXtremePass.value.trim();
        
        if (!name) {
            showToast('Please enter a playlist name.');
            return;
        }
        if (!rawUrl) {
            showToast('Please enter the server URL.');
            return;
        }
        
        let server = rawUrl;
        let username = user;
        let password = pass;
        
        // Method B auto-extract regex
        const urlPattern = /^(https?:\/\/[^/]+)\/(?:get|player_api)\.php\?(?:.*&)?username=([^&]+)(?:.*&)?password=([^&]+)/i;
        const match = rawUrl.match(urlPattern);
        if (match) {
            server = match[1];
            username = match[2];
            password = match[3];
            console.log('[XTREAM IMPORT] Auto-extracted credentials from M3U URL:', server, username);
        }
        
        if (!username || !password) {
            showToast('Username and password are required.');
            return;
        }
        
        const loading = document.getElementById('loading');
        if (loading) loading.style.display = 'block';
        
        try {
            console.log('[API] Calling parseXtream for new playlist.');
            const result = await window.iptvAPI.parseXtream({ name, server, username, password });
            
            if (loading) loading.style.display = 'none';
            
            if (result && result.error) {
                showToast(`Failed to import Xtream Codes.\nReason: ${result.error}`);
                return;
            }
            
            if (!result || !result.channels) {
                showToast(`Failed to import.\nReason: Received invalid data from server.`);
                return;
            }
            
            let channels = result.channels;
            channels.forEach(newCh => {
                const isVod = newCh.type === 'movie' || newCh.type === 'series';
                newCh.disabled = isVod ? false : true;
                if (!isVod) newCh.isNew = true;
            });
            
            const tempPlaylist = {
                id: Date.now() + Math.random(),
                source: `xtream-credentials:${server}|${username}|${password}`,
                name: name,
                channels: channels,
                epg: result.epg_url || ('xtream-epg:' + server),
                disabled: false,
                editIndex: -1,
                exp_date: result.exp_date || null
            };
            
            // Clear input fields
            importXtremeName.value = '';
            importXtremeUrl.value = '';
            importXtremeUser.value = '';
            importXtremePass.value = '';
            
            openManageChannelsModal(-1, tempPlaylist);
        } catch (err) {
            if (loading) loading.style.display = 'none';
            showToast(`Error importing Xtream playlist:\n${err.message}`);
        }
    });
}

if (importCancelBtn) {
    importCancelBtn.addEventListener('click', (e) => {
        e.preventDefault();
        console.log('[EVENT] Import cancel button clicked.');
        editingPlaylistIndex = -1;
        if (importSubmitBtn) importSubmitBtn.textContent = 'Import';
        if (importCancelBtn) importCancelBtn.style.display = 'none';
        if (importNameInput) importNameInput.value = '';
        if (importFilePath) importFilePath.value = '';
        if (importUrlPath) importUrlPath.value = '';
        if (importEpgInput) importEpgInput.value = '';
    });
}

if (importStalkerCancelBtn) {
    importStalkerCancelBtn.addEventListener('click', (e) => {
        e.preventDefault();
        console.log('[EVENT] Stalker cancel button clicked.');
        editingPlaylistIndex = -1;
        if (importStalkerSubmitBtn) importStalkerSubmitBtn.textContent = 'Import';
        if (importStalkerCancelBtn) importStalkerCancelBtn.style.display = 'none';
        if (importStalkerName) importStalkerName.value = '';
        if (importStalkerUrl) importStalkerUrl.value = '';
        if (importStalkerMac) importStalkerMac.value = '';
    });
}

if (clearBtn) {
    clearBtn.addEventListener('click', (e) => {
        e.preventDefault();
        console.log('[EVENT] Clear all playlists button clicked.');
        showConfirmToast("Are you sure you want to delete all playlists and cached data?", async () => {
            savedPlaylists.forEach(p => {
                if (p.source) window.iptvAPI.clearCache(p.source);
            });
            await window.iptvAPI.clearAllPlaylists();
            savedPlaylists = [];
            savedEpgs = [];
            channelMappings = {};
            updateState(true); // skip slow full-save since database is already cleared
            switchTab('playlist', document.getElementById('btn-playlist'));
            showToast("All playlists and cached data deleted.");
        });
    });
}

// Listen for live hardware stats from MPV (Resolution display removed)
let allPlaybackProgress = [];
async function loadAllPlaybackProgress() {
    allPlaybackProgress = await window.iptvAPI.getAllPlaybackProgress();
}

function getPlaybackProgressId(channel) {
    if (channel.type === 'episode') {
        const season = channel.season || 1;
        const episode = channel.episodeNum || 1;
        if (channel.tmdbId) {
            return `tmdb:${channel.tmdbId}:s${season}:e${episode}`;
        } else if (channel.seriesTitle) {
            return `stalker:${channel.seriesTitle}:s${season}:e${episode}`;
        } else {
            return `url:${channel.url}`;
        }
    } else if (channel.type === 'movie' || channel.type === 'vod') {
        if (channel.tmdbId) {
            return `tmdb:${channel.tmdbId}`;
        } else {
            return `url:${channel.url}`;
        }
    }
    return null;
}

function getItemProgress(item, type) {
    const tmdbId = item.tmdb_id || item.tmdbId || '';
    const title = item.name || item.title;
    
    // Find all progress rows that match this item
    const matches = allPlaybackProgress.filter(p => {
        if (tmdbId && p.tmdb_id == tmdbId) return true;
        if ((item.url || item.cmd) && p.stream_url === (item.url || item.cmd)) return true;
        if (title && p.title === title) return true;
        
        // Match series episodes by ID prefix (for Stalker or M3U series without TMDB ID)
        if (type === 'vod' || type === 'series') {
            if (p.id.startsWith(`stalker:${title}:`)) return true;
        }
        return false;
    });
    
    if (matches.length === 0) return null;
    
    if (type === 'movie' || (type === 'vod' && item.type !== 'series')) {
        return matches[0]; // For movies, there is only one match
    }
    
    // For series, sort by last_watched to find the active episode
    matches.sort((a, b) => new Date(b.last_watched) - new Date(a.last_watched));
    
    const latest = matches[0];
    const allCompleted = matches.every(m => m.completed === 1);
    
    return {
        position: latest.position,
        duration: latest.duration,
        completed: allCompleted ? 1 : 0
    };
}

async function saveCurrentPlaybackProgress() {
    let currentChannel = null;
    if (currentPlayingChannelIndex >= 0) {
        currentChannel = allChannels[currentPlayingChannelIndex];
    }
    if (!currentChannel) {
        currentChannel = window.currentPlaybackChannel;
    }
    if (!currentChannel) return;
    const progressId = getPlaybackProgressId(currentChannel);
    if (!progressId) return;
    
    const position = window.currentPlaybackTime || 0;
    const duration = window.currentPlaybackDuration || 0;
    if (position <= 0 || duration <= 0) return;
    
    // Only save progress if watched for more than 5 seconds
    if (position < 5) return;
    
    const completed = (position / duration >= 0.90) ? 1 : 0;
    
    const params = {
        id: progressId,
        tmdb_id: currentChannel.tmdbId || null,
        title: currentChannel.title,
        stream_url: currentChannel.url,
        season: currentChannel.season ? parseInt(currentChannel.season) : null,
        episode: currentChannel.episodeNum ? parseInt(currentChannel.episodeNum) : null,
        position: position,
        duration: duration,
        completed: completed
    };
    
    await window.iptvAPI.savePlaybackProgress(params);
}

function showResumePromptModal(savedSeconds, onChoice) {
    let modal = document.getElementById('resume-prompt-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'resume-prompt-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(10, 10, 12, 0.7);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            font-family: 'Outfit', 'Inter', sans-serif;
        `;
        document.body.appendChild(modal);
    }
    
    const minutes = Math.floor(savedSeconds / 60);
    const seconds = Math.floor(savedSeconds % 60);
    const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    modal.innerHTML = `
        <div style="background: rgba(30, 30, 40, 0.95); border: 1px solid rgba(187, 134, 252, 0.2); border-radius: 16px; padding: 30px; max-width: 400px; width: 90%; text-align: center; box-shadow: 0 20px 50px rgba(0,0,0,0.5);">
            <h3 style="color: #bb86fc; margin: 0 0 15px 0; font-size: 1.5em; font-weight: 700;">Resume Playback</h3>
            <p style="color: #e0e0e0; margin: 0 0 25px 0; font-size: 1em; line-height: 1.6;">You watched this previously. Would you like to resume from <strong>${timeStr}</strong> or start from the beginning?</p>
            <div style="display: flex; gap: 15px; justify-content: center;">
                <button id="resume-btn-start-over" class="playlist-btn" style="background: #2a2a2d; color: white; padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; border: 1px solid #444;">Start Over</button>
                <button id="resume-btn-resume" class="playlist-btn" style="background: #bb86fc; color: black; padding: 10px 20px; border-radius: 8px; font-weight: 700; cursor: pointer; border: none;">Resume</button>
            </div>
        </div>
    `;
    
    modal.style.display = 'flex';
    
    const startOverBtn = document.getElementById('resume-btn-start-over');
    const resumeBtn = document.getElementById('resume-btn-resume');
    
    startOverBtn.replaceWith(startOverBtn.cloneNode(true));
    resumeBtn.replaceWith(resumeBtn.cloneNode(true));
    
    document.getElementById('resume-btn-start-over').addEventListener('click', () => {
        modal.style.display = 'none';
        onChoice(false);
    });
    document.getElementById('resume-btn-resume').addEventListener('click', () => {
        modal.style.display = 'none';
        onChoice(true);
    });
}

window.iptvAPI.onMpvFileLoaded(() => {
    console.log('[API RECV] onMpvFileLoaded');
    window.isFileLoaded = true;
    window.isSwitchingStream = false;
    
    if (window.pendingResumeSeekTime !== null && window.pendingResumeSeekTime !== undefined) {
        const seekTime = window.pendingResumeSeekTime;
        window.pendingResumeSeekTime = null; // Clear immediately
        console.log(`[STREAM] File loaded. Executing delayed seek to ${seekTime}`);
        window.iptvAPI.sendMpvCommand(`seek ${seekTime} absolute`);
    }
});

window.iptvAPI.onMpvPropChange((name, value) => {
    // console.log('[API RECV] onMpvPropChange', { name, value });
    
    if (name === 'duration' && value !== null) {
        window.currentPlaybackDuration = value;
    }

    if (name === 'playback-time') {
        if (!window.isFileLoaded) return; // Ignore stale values from previous streams
        
        window.hasStartedPlayback = true;
        if (window.playbackTimeout) {
            clearTimeout(window.playbackTimeout);
            window.playbackTimeout = null;
        }
        
        if (value !== null) {
            window.currentPlaybackTime = value;
            
            // Throttle progress saves to once every 5 seconds
            const now = Date.now();
            if (!window.lastProgressSaveTime || (now - window.lastProgressSaveTime >= 5000)) {
                window.lastProgressSaveTime = now;
                saveCurrentPlaybackProgress();
            }

            // Check remaining time for autoplay trigger
            if (window.isAutoplayEnabled && window.currentPlaybackDuration > 0) {
                const remaining = window.currentPlaybackDuration - value;
                if (remaining <= 30 && remaining > 5) {
                    if (!window.isAutoplayBlockedForCurrentEpisode && !nextEpisodeToPlay && !autoplayInterval) {
                        const nextEp = findNextEpisode();
                        if (nextEp) {
                            console.log('[AUTOPLAY] Nearing end of episode. Next Episode:', nextEp);
                            showAutoplayOverlay(nextEp);
                        }
                    }
                } else {
                    // Hide overlay if user seeks backward
                    if (remaining > 30 && (autoplayInterval || nextEpisodeToPlay)) {
                        hideAutoplayOverlay();
                        nextEpisodeToPlay = null;
                    }
                }
            }
        }

        if (window.pendingEpgUpdate) {
            const encoded = encodeURIComponent(JSON.stringify(window.pendingEpgUpdate));
            window.iptvAPI.sendMpvCommand(`script-message update-epg ${encoded}`);
            setTimeout(() => window.iptvAPI.sendMpvCommand(`script-message update-epg ${encoded}`), 500);
            window.pendingEpgUpdate = null;
        }
    }
});

function parseEpgTime(timeStr) {
    if (!timeStr || timeStr.length < 14) return new Date();
    // Format is usually "YYYYMMDDHHmmss +Z" -> "20231024000000 +0000"
    const year = timeStr.substring(0, 4);
    const month = timeStr.substring(4, 6);
    const day = timeStr.substring(6, 8);
    const hour = timeStr.substring(8, 10);
    const min = timeStr.substring(10, 12);
    const sec = timeStr.substring(12, 14);
    const offset = timeStr.substring(15).trim();
    const sign = (offset.charAt(0) === '-' || offset.charAt(0) === '+') ? offset.charAt(0) : '+';
    const offHours = offset.length >= 3 ? offset.substring(1, 3) : '00';
    const offMins = offset.length >= 5 ? offset.substring(3, 5) : '00';
    
    const isoStr = `${year}-${month}-${day}T${hour}:${min}:${sec}${sign}${offHours}:${offMins}`;
    const d = new Date(isoStr);
    return isNaN(d.getTime()) ? new Date() : d;
}

function getCurrentProgram(programmes) {
    if (!programmes || !programmes.length) return null;
    const now = new Date();
    for (const prog of programmes) {
        const start = parseEpgTime(prog.start);
        const stop = parseEpgTime(prog.stop);
        if (now >= start && now <= stop) return prog;
    }
    return programmes[0]; // fallback to first if none match
}

let liveEpgGridState = null;
let liveEpgChannelsToRender = [];
let liveEpgLastStartIndex = -1;
let liveEpgLastEndIndex = -1;
let liveEpgLastScrollLeft = -1;
let liveEpgScrollTicking = false;

function onLiveEpgScroll() {
    if (!liveEpgScrollTicking) {
        window.requestAnimationFrame(() => {
            const scrollContainer = document.getElementById('live-epg-scroll-container');
            const headerScroll = document.getElementById('live-epg-header-scroll');
            const channelsCol = document.getElementById('live-epg-channels-col');
            
            if (scrollContainer && headerScroll && channelsCol) {
                headerScroll.scrollLeft = scrollContainer.scrollLeft;
                channelsCol.scrollTop = scrollContainer.scrollTop;
            }
            
            renderVisibleLiveEpgRows();
            liveEpgScrollTicking = false;
        });
        liveEpgScrollTicking = true;
    }
}

function renderVisibleLiveEpgRows(force = false) {
    const scrollContainer = document.getElementById('live-epg-scroll-container');
    const rowsLayer = document.getElementById('live-epg-rows-layer');
    const channelsInner = document.getElementById('live-epg-channels-inner');
    if (!scrollContainer || !rowsLayer || !channelsInner || !liveEpgGridState) return;
    
    const scrollTop = scrollContainer.scrollTop;
    const scrollLeft = scrollContainer.scrollLeft;
    const viewportHeight = scrollContainer.clientHeight;
    const viewportWidth = scrollContainer.clientWidth;
    const rowHeight = 45;
    
    const timeIndicator = document.getElementById('live-epg-time-indicator');
    if (timeIndicator) {
        timeIndicator.style.top = `${scrollTop}px`;
        timeIndicator.style.height = `${viewportHeight}px`;
    }

    const overscan = 5; 
    let startIndex = Math.floor(scrollTop / rowHeight) - overscan;
    let endIndex = Math.ceil((scrollTop + viewportHeight) / rowHeight) + overscan;
    
    startIndex = Math.max(0, startIndex);
    endIndex = Math.min(liveEpgChannelsToRender.length - 1, endIndex);
    
    if (!force && startIndex === liveEpgLastStartIndex && endIndex === liveEpgLastEndIndex && Math.abs(scrollLeft - liveEpgLastScrollLeft) < (viewportWidth / 2)) {
        return; 
    }
    
    liveEpgLastStartIndex = startIndex;
    liveEpgLastEndIndex = endIndex;
    liveEpgLastScrollLeft = scrollLeft;
    
    const { gridStart, totalWidth, pxPerMinute, now } = liveEpgGridState;
    let gridHtml = '';
    let channelsHtml = '';
    const channelsToFetch = [];
    
    const horizontalOverscanPx = viewportWidth; 
    const viewStartPx = scrollLeft - horizontalOverscanPx;
    const viewEndPx = scrollLeft + viewportWidth + horizontalOverscanPx;

    for (let i = startIndex; i <= endIndex; i++) {
        const channel = liveEpgChannelsToRender[i];
        if (!channel) continue;

        const globalIdx = allChannels.findIndex(c => c.url === channel.url && c.title === channel.title);
        const topPos = i * rowHeight;
        const safeTitle = (channel.title || 'Unknown Channel').replace(/</g, "&lt;").replace(/>/g, "&gt;");
        const imgSrc = (channel.logo && channel.logo.trim() !== '') ? channel.logo : 'assets/logo.png';
        
        let programsHtml = '';
        const mappedId = channelMappings[channel.title];
        const epgId = mappedId || channel.tvg_id || channel.tvg_name;
        
        let programmes = null;
        if (epgId) {
            if (epgCache[epgId]) {
                programmes = epgCache[epgId];
            } else {
                channelsToFetch.push(channel);
            }
        }

        if (programmes) {
            if (programmes.length > 0) {
                for (const prog of programmes) {
                    const pStart = parseEpgTime(prog.start);
                    const pEnd = parseEpgTime(prog.stop);
                    
                    let startMin = (pStart.getTime() - gridStart.getTime()) / 60000;
                    let endMin = (pEnd.getTime() - gridStart.getTime()) / 60000;
                    
                    let left = Math.max(0, startMin * pxPerMinute);
                    let right = Math.min(totalWidth, endMin * pxPerMinute);
                    let width = right - left;

                    if (right < viewStartPx || left > viewEndPx) {
                        continue;
                    }

                    const isCurrent = (now >= pStart && now <= pEnd);
                    const isFuture = pStart > now;
                    const bg = isCurrent ? '#2c2c2c' : '#1e1e1e';
                    const borderCol = isCurrent ? '#bb86fc' : '#444';
                    const pTitle = (prog.title || 'Unknown').replace(/</g, "&lt;").replace(/>/g, "&gt;");
                    const timeStr = `${pStart.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - ${pEnd.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
                    const isReminderSet = savedReminders.some(r => r.progTitle === prog.title && r.startTime === prog.start && r.channelTitle === channel.title);
                    const reminderStyle = isReminderSet ? 'opacity: 1; filter: drop-shadow(0 0 4px #bb86fc);' : 'opacity: 0.3; filter: grayscale(100%);';
                    const reminderHtml = isFuture ? `<span class="reminder-btn-full" data-channel="${safeTitle.replace(/"/g, '&quot;')}" data-prog="${pTitle.replace(/"/g, '&quot;')}" data-start="${prog.start}" data-stop="${prog.stop}" style="cursor: pointer; margin-right: 4px; display: inline-block; transition: 0.2s; ${reminderStyle}" title="Set/Remove Reminder">🔔</span>` : '';
                    
                    const startTimeIso = pStart.toISOString();
                    const isScheduled = clientScheduledRecordings.some(s => s.channelName === channel.title && s.programName === prog.title && s.startTime === startTimeIso && s.status === 'pending');
                    const isRecording = clientActiveRecordings.some(r => r.channelName === channel.title && r.status === 'recording' && isCurrent);
                    const recordStyle = (isRecording || isScheduled) ? 'color: #ef4444; opacity: 1; filter: drop-shadow(0 0 4px #ef4444);' + (isRecording ? ' animation: pulse 1.5s infinite;' : '') : 'opacity: 0.4;';
                    const recordHtml = isFuture ? `<span class="epg-record-btn" data-channel="${safeTitle.replace(/"/g, '&quot;')}" data-url="${channel.url.replace(/"/g, '&quot;')}" data-prog="${pTitle.replace(/"/g, '&quot;')}" data-start="${prog.start}" data-stop="${prog.stop}" style="cursor: pointer; margin-right: 4px; display: inline-block; transition: 0.2s; ${recordStyle}" title="${isScheduled ? 'Cancel Scheduled Recording' : 'Schedule Recording'}">🔴</span>` : '';

                    programsHtml += `
                    <div class="epg-play-channel epg-program-cell" tabindex="0" data-index="${globalIdx}" style="position: absolute; left: ${left}px; top: 0; width: ${width}px; height: 45px; background: ${bg}; border-right: 1px solid rgba(255, 255, 255, 0.15); border-top: 2px solid ${borderCol}; border-bottom: 1px solid rgba(255, 255, 255, 0.15); box-sizing: border-box; padding: 2px 4px; overflow: hidden; cursor: pointer; transition: background 0.2s; outline: none;" title="${pTitle}\n${timeStr}\n${(prog.desc || '').replace(/</g, "&lt;").replace(/>/g, "&gt;")}">
                        <div style="font-size: 0.85em; font-weight: bold; color: ${isCurrent ? '#fff' : '#ccc'}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${reminderHtml}${recordHtml}${pTitle}</div>
                        <div style="font-size: 0.75em; color: #888; margin-top: 4px;">${timeStr}</div>
                    </div>`;
                }
            } else {
                programsHtml = `<div class="epg-play-channel" data-index="${globalIdx}" style="position: absolute; top: 0; left: 0; display: flex; align-items: center; padding-left: 20px; height: 45px; border-bottom: 1px solid rgba(255, 255, 255, 0.15); box-sizing: border-box; color: #555; font-size: 0.9em; width: 100%; cursor: pointer;">No EPG Data</div>`;
            }
        } else {
            programsHtml = `<div class="epg-play-channel" data-index="${globalIdx}" style="position: absolute; top: 0; left: 0; display: flex; align-items: center; padding-left: 20px; height: 45px; border-bottom: 1px solid rgba(255, 255, 255, 0.15); box-sizing: border-box; color: #888; font-size: 0.9em; width: 100%; cursor: pointer;">Loading...</div>`;
        }
        
        channelsHtml += `
        <div class="epg-play-channel" tabindex="0" data-index="${globalIdx}" style="position: absolute; top: ${topPos}px; left: 0; width: 250px; height: 45px; background: #1e1e1e; border-bottom: 1px solid rgba(255, 255, 255, 0.15); border-top: 1px solid rgba(255, 255, 255, 0.15); border-right: 1px solid rgba(255, 255, 255, 0.15); display: flex; align-items: center; padding: 4px 8px; box-sizing: border-box; cursor: pointer; outline: none;">
            <img src="${imgSrc}" data-eh="0" style="width: 32px; height: 32px; min-width: 32px; object-fit: contain; margin-right: 10px; background: #2A2A2A; border-radius: 4px;">
            <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 0.8em; font-weight: bold; font-family: 'Inter', sans-serif; color: #e0e0e0;" title="${safeTitle}">${safeTitle}</span>
        </div>`;
        
        gridHtml += `
        <div style="position: absolute; top: ${topPos}px; left: 0; width: ${totalWidth}px; height: 45px;">
            ${programsHtml}
        </div>`;
    }
    
    channelsInner.innerHTML = channelsHtml;
    rowsLayer.innerHTML = gridHtml;

    channelsInner.querySelectorAll('img[data-eh="0"]').forEach(img => {
        img.setAttribute('data-eh', '1');
        img.onerror = function() {
            this.onerror = null;
            this.src = 'assets/logo.ico';
        };
    });

    if (channelsToFetch.length > 0) {
        fetchEpgDataForChannels(channelsToFetch);
    }
}

async function renderLiveEpgGrid() {
    const container = document.getElementById('epg-container');
    if (!container) return;

    try {
        clientScheduledRecordings = await window.iptvAPI.getScheduledRecordings();
    } catch (e) {}

    if (allChannels.length === 0) {
        container.innerHTML = '<div style="color: #888; text-align: center; margin-top: 50px;">No channels available.</div>';
        return;
    }

    if (window.liveEpgTimeIndicatorInterval) clearInterval(window.liveEpgTimeIndicatorInterval);

    const pxPerMinute = 5;
    const hourWidth = 60 * pxPerMinute;
    const now = new Date();
    
    const gridStart = new Date(now.getTime());
    gridStart.setMinutes(0, 0, 0);
    gridStart.setHours(gridStart.getHours() - 1); // -1 hour
    
    const gridEnd = new Date(gridStart.getTime() + 9 * 60 * 60 * 1000); // +8 hours from now (9 hours total duration)
    const totalWidth = 9 * hourWidth;

    let playlistOptionsHtml = `<option value="all">All Playlists</option><option value="favs" ${playerEpgSelectedPlaylist === 'favs' ? 'selected' : ''}>Favourites</option>`;
    savedPlaylists.forEach(p => {
        playlistOptionsHtml += `<option value="${p.id}" ${playerEpgSelectedPlaylist === String(p.id) ? 'selected' : ''}>${p.name}</option>`;
    });

    let epgGroupOptions = new Set();
    allChannels.forEach(c => {
        if (playerEpgSelectedPlaylist === 'favs' && !c.favourite) return;
        if (playerEpgSelectedPlaylist !== 'all' && playerEpgSelectedPlaylist !== 'favs' && String(c.playlistId) !== String(playerEpgSelectedPlaylist)) return;
        epgGroupOptions.add(c.group || 'Uncategorized');
    });
    const sortedEpgGroups = Array.from(epgGroupOptions).sort(sortAlphaNum);
    
    let groupOptionsHtml = `<option value="all">All Groups</option>`;
    sortedEpgGroups.forEach(g => {
        groupOptionsHtml += `<option value="${g.replace(/"/g, '&quot;')}" ${playerEpgSelectedGroup === g ? 'selected' : ''}>${g.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</option>`;
    });

    const topBarHtml = `
        <div style="width: 100%; display: flex; justify-content: space-between; align-items: center; padding: 6px 10px 4px 10px; box-sizing: border-box; flex-shrink: 0;">
            <div style="display: flex; gap: 8px;">
                <button id="player-epg-now-btn" class="playlist-btn" style="background: #bb86fc; color: black; font-weight: bold; padding: 8px 16px; border-radius: 4px; cursor: pointer; border: none;">Now</button>
                <button id="player-epg-full-btn" class="playlist-btn" style="background: #333; color: white; font-weight: bold; padding: 8px 16px; border-radius: 8px; cursor: pointer; border: 1px solid #555;">Full EPG</button>
            </div>
            <div></div>
        </div>
    `;

    const sidebarFilterSelect = document.getElementById('playlist-filter');
    const sidebarFilterVal = sidebarFilterSelect ? sidebarFilterSelect.value : 'all';

    const sidebarChannelSearch = document.getElementById('channel-search');
    const sidebarSearchVal = sidebarChannelSearch ? sidebarChannelSearch.value.toLowerCase() : '';

    if (!window.expandedGroups || window.expandedGroups.size === 0) {
        container.innerHTML = topBarHtml + '<div style="color: #888; text-align: center; margin-top: 50px; font-family: \'Inter\', sans-serif;">Expand a group in the sidebar to view EPG schedules.</div>';
        return;
    }

    liveEpgChannelsToRender = allChannels.filter(channel => {
        if (sidebarFilterVal === 'favs' && !channel.favourite) return false;
        if (sidebarFilterVal !== 'all' && sidebarFilterVal !== 'favs' && String(channel.playlistId) !== String(sidebarFilterVal)) return false;
        
        const rawTitle = channel.title || 'Unknown Channel';
        if (sidebarSearchVal && !rawTitle.toLowerCase().includes(sidebarSearchVal)) return false;
        
        const channelGroup = channel.group || 'Uncategorized';
        if (!window.expandedGroups.has(channelGroup)) return false;
        
        return true;
    });

    liveEpgChannelsToRender.sort((a, b) => sortAlphaNum(a.title, b.title));

    liveEpgGridState = { gridStart, gridEnd, totalWidth, pxPerMinute, now };
    liveEpgLastStartIndex = -1;
    liveEpgLastEndIndex = -1;
    liveEpgLastScrollLeft = -1;

    let headerHtml = '';
    for (let i = 0; i < 9; i++) {
        const headerTime = new Date(gridStart.getTime() + i * 60 * 60 * 1000);
        const timeStr = headerTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        headerHtml += `<div style="position: absolute; left: ${i * hourWidth}px; width: ${hourWidth}px; height: 100%; border-right: 1px solid rgba(255,255,255,0.1); border-bottom: 2px solid #333; display: flex; align-items: center; padding-left: 10px; color: #fff; font-weight: normal; font-size: 0.9em; box-sizing: border-box;">${timeStr}</div>`;
    }

    const minutesSinceStart = (now.getTime() - gridStart.getTime()) / 60000;
    const nowPx = minutesSinceStart * pxPerMinute;
    let redLineHtml = '';
    if (nowPx > 0 && nowPx < totalWidth) {
        redLineHtml = `<div id="live-epg-time-indicator" style="position: absolute; left: ${nowPx}px; top: 0; height: 100%; width: 2px; background: #cf6679; z-index: 15; pointer-events: none;"></div>`;
    }

    let html = `
    <div id="live-epg-layout-wrapper" style="display: flex; flex-direction: column; flex-grow: 1; width: 100%; height: 100%; overflow: hidden; background: #121212; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 0;">
        <!-- Header Row -->
        <div style="display: flex; width: 100%; background: #121212; z-index: 20;">
            <div style="width: 250px; min-width: 250px; background: #121212; border-bottom: 2px solid #333; border-right: 1px solid rgba(255, 255, 255, 0.15); display: flex; align-items: center; justify-content: center; font-weight: normal; font-size: 0.9em; color: #fff; box-sizing: border-box; height: 30px;">Channels</div>
            <div id="live-epg-header-scroll" style="flex-grow: 1; overflow: hidden; position: relative; height: 30px;">
                <div style="width: ${totalWidth}px; height: 100%; position: relative;">
                    ${headerHtml}
                </div>
            </div>
            <!-- Scrollbar Spacer -->
            <div id="live-epg-header-spacer" style="width: 14px; min-width: 14px; background: #121212; border-bottom: 2px solid #333; flex-shrink: 0; box-sizing: border-box;"></div>
        </div>
        
        <!-- Content Area -->
        <div style="display: flex; flex-grow: 1; overflow: hidden; width: 100%;">
            <!-- Left Pinned Channels -->
            <div id="live-epg-channels-col" style="width: 250px; min-width: 250px; background: #1a1a1a; overflow: hidden; border-right: 1px solid rgba(255, 255, 255, 0.15); z-index: 10; position: relative;">
                <div id="live-epg-channels-inner" style="position: relative; width: 100%; height: ${liveEpgChannelsToRender.length * 45}px;"></div>
            </div>
            
            <!-- Right Scrolling Grid -->
            <div id="live-epg-scroll-container" style="flex-grow: 1; overflow-y: scroll; overflow-x: auto; position: relative; background: #121212;">
                <div id="live-epg-grid-inner" style="width: ${totalWidth}px; height: ${liveEpgChannelsToRender.length * 45}px; position: relative;">
                    <div id="live-epg-rows-layer" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"></div>
                    ${redLineHtml}
                </div>
            </div>
        </div>
    </div>`;

    container.innerHTML = topBarHtml + html;

    const channelsContainer = document.getElementById('live-epg-channels-col');
    const gridContainer = document.getElementById('live-epg-scroll-container');
    
    const handleEpgClick = (e) => {
            const recordBtn = e.target.closest('.epg-record-btn');
            if (recordBtn) {
                e.stopPropagation();
                const channelTitle = recordBtn.getAttribute('data-channel');
                const channelUrl = recordBtn.getAttribute('data-url');
                const progTitle = recordBtn.getAttribute('data-prog');
                const startRaw = recordBtn.getAttribute('data-start');
                const stopRaw = recordBtn.getAttribute('data-stop');
                
                const startTimeIso = parseEpgTime(startRaw).toISOString();
                const endTimeIso = parseEpgTime(stopRaw).toISOString();
                
                const existingSchedule = clientScheduledRecordings.find(s => s.channelName === channelTitle && s.programName === progTitle && s.startTime === startTimeIso && s.status === 'pending');
                
                if (existingSchedule) {
                    window.iptvAPI.cancelScheduledRecording(existingSchedule.id).then(success => {
                        if (success) {
                            showToast('Scheduled recording cancelled: ' + progTitle);
                            renderFullEpg();
                            renderLiveEpg();
                        } else {
                            showToast('Failed to cancel schedule.', true);
                        }
                    });
                } else {
                    const targetChannel = allChannels.find(c => c.title === channelTitle);
                    const resolveUrlAndSchedule = async () => {
                        try {
                            const originalUrl = targetChannel ? (targetChannel.stream_url || targetChannel.url) : channelUrl;
                            let customHeaders = [];
                            if (targetChannel && targetChannel.stream_url && targetChannel.stream_url.startsWith('stalker-cmd:')) {
                                const playlist = savedPlaylists.find(p => p.id === targetChannel.playlist_id || p.id === targetChannel.playlistId);
                                if (playlist && playlist.epg && playlist.epg.startsWith('stalker:')) {
                                    const mac = playlist.epg.substring(8);
                                    let portalUrl = playlist.source;
                                    let referer = portalUrl.replace('/server/load.php', '/c/index.html').replace('/portal.php', '/c/index.html');
                                    customHeaders = [
                                        `X-User-Agent: Model: MAG250; Link: Ethernet`,
                                        `Referer: ${referer}`,
                                        `STALKER-METADATA:${JSON.stringify({ portalUrl, mac, sourceType: 'stalker' })}`
                                    ];
                                }
                            } else if (targetChannel && targetChannel.url && targetChannel.url.startsWith('xtream-stream:')) {
                                const playlist = savedPlaylists.find(p => p.id === targetChannel.playlist_id || p.id === targetChannel.playlistId);
                                if (playlist && playlist.source && playlist.source.startsWith('xtream-credentials:')) {
                                    const credParts = playlist.source.substring(19).split('|');
                                    const server = credParts[0];
                                    const username = credParts[1];
                                    const password = credParts[2];
                                    const parts = targetChannel.url.substring(14).split('|');
                                    const type = parts[0];
                                    const streamId = parts[1];
                                    let extension = null;
                                    let directSourceUrl = null;
                                    if (type === 'live') {
                                        extension = null;
                                        if (parts[2]) directSourceUrl = decodeURIComponent(parts[2]);
                                    } else if (type === 'movie') {
                                        extension = parts[2] || null;
                                        if (parts[3]) directSourceUrl = decodeURIComponent(parts[3]);
                                    }
                                    customHeaders = [
                                        `User-Agent: IPTV Smarters Pro`,
                                        `Referer: ${server}`,
                                        `XTREAM-METADATA:${JSON.stringify({
                                            server,
                                            username,
                                            password,
                                            streamId,
                                            type,
                                            extension,
                                            directSourceUrl,
                                            sourceType: 'xtream'
                                        })}`
                                    ];
                                }
                            } else {
                                customHeaders = [
                                    `STALKER-METADATA:${JSON.stringify({ sourceType: 'm3u' })}`
                                ];
                            }
                            
                            window.iptvAPI.scheduleRecording(originalUrl, channelTitle, progTitle, startTimeIso, endTimeIso, customHeaders).then(res => {
                                if (res) {
                                    showToast(`Recording scheduled: ${progTitle}`);
                                    renderFullEpg();
                                    renderLiveEpg();
                                } else {
                                    showToast('Failed to schedule recording.', true);
                                }
                            });
                        } catch (err) {
                            console.error('Error scheduling recording:', err);
                            showToast('Failed to schedule: ' + err.message, true);
                        }
                    };
                    resolveUrlAndSchedule();
                }
                return;
            }

            const reminderBtn = e.target.closest('.reminder-btn-full');
            if (reminderBtn) {
                e.stopPropagation();
                const channelTitle = reminderBtn.getAttribute('data-channel');
                const progTitle = reminderBtn.getAttribute('data-prog');
                const start = reminderBtn.getAttribute('data-start');
                const stop = reminderBtn.getAttribute('data-stop');
                toggleReminder(channelTitle, progTitle, start, stop);
                const isSet = savedReminders.some(r => r.progTitle === progTitle && r.startTime === start && r.channelTitle === channelTitle);
                if (isSet) {
                    reminderBtn.style.opacity = '1';
                    reminderBtn.style.filter = 'drop-shadow(0 0 4px #bb86fc)';
                    showToast('Reminder Set: ' + progTitle);
                } else {
                    reminderBtn.style.opacity = '0.3';
                    reminderBtn.style.filter = 'grayscale(100%)';
                    showToast('Reminder Removed');
                }
                return;
            }

            const playChannel = e.target.closest('.epg-play-channel');
            if (playChannel) {
                const internalReminderBtn = playChannel.querySelector('.reminder-btn-full');
                if (internalReminderBtn && playChannel.classList.contains('epg-program-cell')) {
                    internalReminderBtn.click();
                    return;
                }

                const idx = playChannel.getAttribute('data-index');
                const targetChannel = allChannels[idx];
                if (targetChannel) {
                    embedStream(targetChannel);
                }
            }
    };
    
    if (channelsContainer) channelsContainer.addEventListener('click', handleEpgClick);
    if (gridContainer) gridContainer.addEventListener('click', handleEpgClick);
    
    const handleEpgWheel = (e) => {
        if (gridContainer) {
            gridContainer.scrollTop += e.deltaY;
            gridContainer.scrollLeft += e.deltaX;
        }
        e.preventDefault();
    };

    if (channelsContainer) channelsContainer.addEventListener('wheel', handleEpgWheel, { passive: false });
    if (gridContainer) gridContainer.addEventListener('wheel', handleEpgWheel, { passive: false });

    if (gridContainer) {
        gridContainer.addEventListener('scroll', onLiveEpgScroll);
    }

    const playerPlaylistFilter = document.getElementById('player-epg-playlist-filter');
    if (playerPlaylistFilter) {
        playerPlaylistFilter.addEventListener('change', (e) => {
            playerEpgSelectedPlaylist = e.target.value;
            playerEpgSelectedGroup = 'all';
            renderLiveEpgGrid();
        });
    }

    const playerGroupFilter = document.getElementById('player-epg-group-filter');
    if (playerGroupFilter) {
        playerGroupFilter.addEventListener('change', (e) => {
            playerEpgSelectedGroup = e.target.value;
            renderLiveEpgGrid();
        });
    }

    const playerNowBtn = document.getElementById('player-epg-now-btn');
    if (playerNowBtn) {
        playerNowBtn.addEventListener('click', () => {
            if (gridContainer && liveEpgGridState) {
                const pxPerMinute = liveEpgGridState.pxPerMinute;
                const minutesSinceStart = (new Date().getTime() - liveEpgGridState.gridStart.getTime()) / 60000;
                const nowPx = minutesSinceStart * pxPerMinute;
                const targetScroll = Math.max(0, nowPx - (30 * pxPerMinute));
                gridContainer.scrollLeft = targetScroll;
                const headerScroll = document.getElementById('live-epg-header-scroll');
                if (headerScroll) headerScroll.scrollLeft = targetScroll;
            }
        });
    }

    const playerFullBtn = document.getElementById('player-epg-full-btn');
    if (playerFullBtn) {
        playerFullBtn.addEventListener('click', () => {
            const epgBtn = document.getElementById('btn-epg');
            if (epgBtn) epgBtn.click();
        });
    }

    renderVisibleLiveEpgRows(true);

    if (!document.getElementById('live-epg-styles')) {
        const style = document.createElement('style');
        style.id = 'live-epg-styles';
        style.textContent = `
            #live-epg-scroll-container::-webkit-scrollbar { width: 12px !important; height: 12px !important; }
            #live-epg-scroll-container::-webkit-scrollbar-track { background: #121212 !important; border-left: 1px solid rgba(255, 255, 255, 0.05) !important; border-top: 1px solid rgba(255, 255, 255, 0.05) !important; }
            #live-epg-scroll-container::-webkit-scrollbar-thumb { background: #5c5c66 !important; border-radius: 6px !important; border: 3px solid #121212 !important; }
            #live-epg-scroll-container::-webkit-scrollbar-thumb:hover { background: #bb86fc !important; }
            #live-epg-scroll-container::-webkit-scrollbar-corner { background: #121212 !important; }
        `;
        document.head.appendChild(style);
    }

    if (gridContainer) {
        const targetScroll = Math.max(0, nowPx - (30 * pxPerMinute)); // Pad back 30 mins from red line
        setTimeout(() => {
            gridContainer.scrollLeft = targetScroll;
            const headerScroll = document.getElementById('live-epg-header-scroll');
            if (headerScroll) headerScroll.scrollLeft = targetScroll;

            // Scroll to the active channel if there is one
            if (currentPlayingChannelIndex >= 0) {
                const activeChannel = allChannels[currentPlayingChannelIndex];
                const renderIdx = liveEpgChannelsToRender.findIndex(c => c.title === activeChannel.title && c.url === activeChannel.url);
                if (renderIdx >= 0) {
                    const rowHeight = 45;
                    const scrollToY = renderIdx * rowHeight;
                    gridContainer.scrollTop = Math.max(0, scrollToY);
                }
            }
        }, 10);
    }

    window.liveEpgTimeIndicatorInterval = setInterval(() => {
        const indicator = document.getElementById('live-epg-time-indicator');
        if (indicator && liveEpgGridState) {
            const newNow = new Date();
            const newMinutesSinceStart = (newNow.getTime() - liveEpgGridState.gridStart.getTime()) / 60000;
            const newNowPx = newMinutesSinceStart * liveEpgGridState.pxPerMinute;
            indicator.style.left = `${newNowPx}px`;
        }
    }, 60000);
}

async function fetchEpgDataForChannels(channels) {
    const epgIdsToFetch = new Set();
    channels.forEach(ch => {
        if (!ch) return;
        const mappedId = channelMappings[ch.title];
        const epgId = mappedId || ch.tvg_id || ch.tvg_name;
        if (epgId && !epgCache[epgId] && !epgLoadingSet.has(epgId)) {
            epgIdsToFetch.add(epgId);
            epgLoadingSet.add(epgId);
        }
    });
    
    const epgIdsArr = Array.from(epgIdsToFetch);
    if (epgIdsArr.length === 0) return;
    
    const activeState = epgGridState || liveEpgGridState;
    if (!activeState) return;
    const { gridStart, gridEnd } = activeState;
    const startLimit = formatDateToEpgString(gridStart);
    const endLimit = formatDateToEpgString(gridEnd);
    
    console.log(`[API] Fetching EPG for ${epgIdsArr.length} channel IDs...`);
    const epgData = await window.iptvAPI.getEpg(epgIdsArr, startLimit, endLimit);
    
    Object.keys(epgData).forEach(id => {
        epgCache[id] = epgData[id] || [];
    });

    // Mark as loaded even if no data was returned to prevent re-fetching
    epgIdsArr.forEach(id => {
        if (!epgCache[id]) epgCache[id] = [];
    });
    
    renderVisibleEpgRows(true); // Force re-render with new data
    renderVisibleLiveEpgRows(true); // Force re-render Live EPG too!
}

function onEpgScroll() {
    if (!epgScrollTicking) {
        window.requestAnimationFrame(() => {
            const scrollContainer = document.getElementById('epg-scroll-container');
            const headerScroll = document.getElementById('epg-header-scroll');
            const channelsCol = document.getElementById('epg-channels-col');
            
            if (scrollContainer && headerScroll && channelsCol) {
                headerScroll.scrollLeft = scrollContainer.scrollLeft;
                channelsCol.scrollTop = scrollContainer.scrollTop;
            }
            
            renderVisibleEpgRows();
            epgScrollTicking = false;
        });
        epgScrollTicking = true;
    }
}

function renderVisibleEpgRows(force = false) {
    const scrollContainer = document.getElementById('epg-scroll-container');
    const rowsLayer = document.getElementById('epg-rows-layer');
    const channelsInner = document.getElementById('epg-channels-inner');
    if (!scrollContainer || !rowsLayer || !channelsInner || !epgGridState) return;
    
    const scrollTop = scrollContainer.scrollTop;
    const scrollLeft = scrollContainer.scrollLeft;
    const viewportHeight = scrollContainer.clientHeight;
    const viewportWidth = scrollContainer.clientWidth;
    const rowHeight = 45;
    
    const timeIndicator = document.getElementById('epg-time-indicator');
    if (timeIndicator) {
        timeIndicator.style.top = `${scrollTop}px`;
        timeIndicator.style.height = `${viewportHeight}px`;
    }

    const overscan = 5; 
    let startIndex = Math.floor(scrollTop / rowHeight) - overscan;
    let endIndex = Math.ceil((scrollTop + viewportHeight) / rowHeight) + overscan;
    
    startIndex = Math.max(0, startIndex);
    endIndex = Math.min(epgChannelsToRender.length - 1, endIndex);
    
    if (!force && startIndex === epgLastStartIndex && endIndex === epgLastEndIndex && Math.abs(scrollLeft - epgLastScrollLeft) < (viewportWidth / 2)) {
        return; 
    }
    
    epgLastStartIndex = startIndex;
    epgLastEndIndex = endIndex;
    epgLastScrollLeft = scrollLeft;
    
    const { gridStart, totalWidth, pxPerMinute, now } = epgGridState;
    let gridHtml = '';
    let channelsHtml = '';
    const channelsToFetch = [];
    
    const horizontalOverscanPx = viewportWidth; 
    const viewStartPx = scrollLeft - horizontalOverscanPx;
    const viewEndPx = scrollLeft + viewportWidth + horizontalOverscanPx;

    for (let i = startIndex; i <= endIndex; i++) {
        const channel = epgChannelsToRender[i];
        if (!channel) continue;

        const globalIdx = allChannels.findIndex(c => c.url === channel.url && c.title === channel.title);
        const topPos = i * rowHeight;
        const safeTitle = (channel.title || 'Unknown Channel').replace(/</g, "&lt;").replace(/>/g, "&gt;");
        const imgSrc = (channel.logo && channel.logo.trim() !== '') ? channel.logo : 'assets/logo.png';
        
        let programsHtml = '';
        const mappedId = channelMappings[channel.title];
        const epgId = mappedId || channel.tvg_id || channel.tvg_name;
        
        let programmes = null;
        if (epgId) {
            if (epgCache[epgId]) {
                programmes = epgCache[epgId];
            } else {
                channelsToFetch.push(channel);
            }
        }

        if (programmes) {
            if (programmes.length > 0) {
                for (const prog of programmes) {
                    const pStart = parseEpgTime(prog.start);
                    const pEnd = parseEpgTime(prog.stop);
                    
                    let startMin = (pStart.getTime() - gridStart.getTime()) / 60000;
                    let endMin = (pEnd.getTime() - gridStart.getTime()) / 60000;
                    
                    let left = Math.max(0, startMin * pxPerMinute);
                    let right = Math.min(totalWidth, endMin * pxPerMinute);
                    let width = right - left;

                    if (right < viewStartPx || left > viewEndPx) {
                        continue;
                    }

                    const isCurrent = (now >= pStart && now <= pEnd);
                    const isFuture = pStart > now;
                    const bg = isCurrent ? '#2c2c2c' : '#1e1e1e';
                    const borderCol = isCurrent ? '#bb86fc' : '#444';
                    const pTitle = (prog.title || 'Unknown').replace(/</g, "&lt;").replace(/>/g, "&gt;");
                    const timeStr = `${pStart.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - ${pEnd.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
                    const isReminderSet = savedReminders.some(r => r.progTitle === prog.title && r.startTime === prog.start && r.channelTitle === channel.title);
                    const reminderStyle = isReminderSet ? 'opacity: 1; filter: drop-shadow(0 0 4px #bb86fc);' : 'opacity: 0.3; filter: grayscale(100%);';
                    const reminderHtml = isFuture ? `<span class="reminder-btn-full" data-channel="${safeTitle.replace(/"/g, '&quot;')}" data-prog="${pTitle.replace(/"/g, '&quot;')}" data-start="${prog.start}" data-stop="${prog.stop}" style="cursor: pointer; margin-right: 4px; display: inline-block; transition: 0.2s; ${reminderStyle}" title="Set/Remove Reminder">🔔</span>` : '';
                    
                    const startTimeIso = pStart.toISOString();
                    const isScheduled = clientScheduledRecordings.some(s => s.channelName === channel.title && s.programName === prog.title && s.startTime === startTimeIso && s.status === 'pending');
                    const isRecording = clientActiveRecordings.some(r => r.channelName === channel.title && r.status === 'recording' && isCurrent);
                    const recordStyle = (isRecording || isScheduled) ? 'color: #ef4444; opacity: 1; filter: drop-shadow(0 0 4px #ef4444);' + (isRecording ? ' animation: pulse 1.5s infinite;' : '') : 'opacity: 0.4;';
                    const recordHtml = isFuture ? `<span class="epg-record-btn" data-channel="${safeTitle.replace(/"/g, '&quot;')}" data-url="${channel.url.replace(/"/g, '&quot;')}" data-prog="${pTitle.replace(/"/g, '&quot;')}" data-start="${prog.start}" data-stop="${prog.stop}" style="cursor: pointer; margin-right: 4px; display: inline-block; transition: 0.2s; ${recordStyle}" title="${isScheduled ? 'Cancel Scheduled Recording' : 'Schedule Recording'}">🔴</span>` : '';

                    programsHtml += `
                    <div class="epg-play-channel epg-program-cell" tabindex="0" data-index="${globalIdx}" style="position: absolute; left: ${left}px; top: 0; width: ${width}px; height: 45px; background: ${bg}; border-right: 1px solid rgba(255, 255, 255, 0.15); border-top: 2px solid ${borderCol}; border-bottom: 1px solid rgba(255, 255, 255, 0.15); box-sizing: border-box; padding: 2px 4px; overflow: hidden; cursor: pointer; transition: background 0.2s; outline: none;" title="${pTitle}\n${timeStr}\n${(prog.desc || '').replace(/</g, "&lt;").replace(/>/g, "&gt;")}">
                        <div style="font-size: 0.85em; font-weight: bold; color: ${isCurrent ? '#fff' : '#ccc'}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${reminderHtml}${recordHtml}${pTitle}</div>
                        <div style="font-size: 0.75em; color: #888; margin-top: 4px;">${timeStr}</div>
                    </div>`;
                }
            } else {
                programsHtml = `<div class="epg-play-channel" data-index="${globalIdx}" style="position: absolute; top: 0; left: 0; display: flex; align-items: center; padding-left: 20px; height: 45px; border-bottom: 1px solid rgba(255, 255, 255, 0.15); box-sizing: border-box; color: #555; font-size: 0.9em; width: 100%; cursor: pointer;">No EPG Data</div>`;
            }
        } else {
            programsHtml = `<div class="epg-play-channel" data-index="${globalIdx}" style="position: absolute; top: 0; left: 0; display: flex; align-items: center; padding-left: 20px; height: 45px; border-bottom: 1px solid rgba(255, 255, 255, 0.15); box-sizing: border-box; color: #888; font-size: 0.9em; width: 100%; cursor: pointer;">Loading...</div>`;
        }
        
        channelsHtml += `
        <div class="epg-play-channel" tabindex="0" data-index="${globalIdx}" style="position: absolute; top: ${topPos}px; left: 0; width: 250px; height: 45px; background: #1e1e1e; border-bottom: 1px solid rgba(255, 255, 255, 0.15); border-top: 1px solid rgba(255, 255, 255, 0.15); border-right: 1px solid rgba(255, 255, 255, 0.15); display: flex; align-items: center; padding: 4px 8px; box-sizing: border-box; cursor: pointer; outline: none;">
            <img src="${imgSrc}" data-eh="0" style="width: 32px; height: 32px; min-width: 32px; object-fit: contain; margin-right: 10px; background: #2A2A2A; border-radius: 4px;">
            <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 0.8em; font-weight: bold; font-family: 'Inter', sans-serif; color: #e0e0e0;" title="${safeTitle}">${safeTitle}</span>
        </div>`;
        
        gridHtml += `
        <div style="position: absolute; top: ${topPos}px; left: 0; width: ${totalWidth}px; height: 45px;">
            ${programsHtml}
        </div>`;
    }
    
    channelsInner.innerHTML = channelsHtml;
    rowsLayer.innerHTML = gridHtml;

    channelsInner.querySelectorAll('img[data-eh="0"]').forEach(img => {
        img.setAttribute('data-eh', '1');
        img.onerror = function() {
            this.onerror = null;
            this.src = 'assets/logo.ico';
        };
    });

    if (channelsToFetch.length > 0) {
        fetchEpgDataForChannels(channelsToFetch);
    }
}

async function renderFullEpg() {
    const epgView = document.getElementById('epg-view');
    console.log('[UI] Rendering full EPG view.');
    if (!epgView) return;

    try {
        clientScheduledRecordings = await window.iptvAPI.getScheduledRecordings();
    } catch (e) {}

    if (allChannels.length === 0) {
        epgView.innerHTML = '<div style="color: #888; text-align: center; margin-top: 50px;">No channels available.</div>';
        return;
    }
    
    let playlistOptionsHtml = `<option value="all">All Playlists</option><option value="favs" ${epgSelectedPlaylist === 'favs' ? 'selected' : ''}>Favourites</option>`;
    savedPlaylists.forEach(p => {
        playlistOptionsHtml += `<option value="${p.id}" ${epgSelectedPlaylist === String(p.id) ? 'selected' : ''}>${p.name}</option>`;
    });

    let epgGroupOptions = new Set();
    allChannels.forEach(c => {
        if (epgSelectedPlaylist === 'favs' && !c.favourite) return;
        if (epgSelectedPlaylist !== 'all' && epgSelectedPlaylist !== 'favs' && String(c.playlistId) !== String(epgSelectedPlaylist)) return;
        epgGroupOptions.add(c.group || 'Uncategorized');
    });
    const sortedEpgGroups = Array.from(epgGroupOptions).sort(sortAlphaNum);
    
    let groupOptionsHtml = `<option value="all">All Groups</option>`;
    sortedEpgGroups.forEach(g => {
        groupOptionsHtml += `<option value="${g.replace(/"/g, '&quot;')}" ${epgSelectedGroup === g ? 'selected' : ''}>${g.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</option>`;
    });

    const topBarHtml = `
        <div style="width: 100%; display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
            <div style="display: flex; gap: 10px;">
                <select id="epg-playlist-filter" style="background: #121212; color: white; border: 1px solid #555; padding: 6px; border-radius: 4px; outline: none;">
                    ${playlistOptionsHtml}
                </select>
                <select id="epg-group-filter" style="background: #121212; color: white; border: 1px solid #555; padding: 6px; border-radius: 4px; outline: none;">
                    ${groupOptionsHtml}
                </select>
            </div>
            <div style="display: flex; align-items: center; gap: 10px;">
                <button id="epg-now-btn" class="playlist-btn" style="background: #bb86fc; color: black; font-weight: bold; padding: 8px 16px; border-radius: 4px;">Now</button>
            </div>
        </div>
    `;
    
    epgView.innerHTML = topBarHtml + '<div id="epg-content-area" style="flex-grow: 1; display: flex; flex-direction: column; min-height: 0;"><div style="color: #888; text-align: center; margin-top: 50px;">Loading Guide Data...</div></div>';
    
    document.getElementById('epg-playlist-filter').addEventListener('change', (e) => {
        epgSelectedPlaylist = e.target.value;
        epgSelectedGroup = 'all';
        renderFullEpg();
    });
    
    document.getElementById('epg-group-filter').addEventListener('change', (e) => {
        epgSelectedGroup = e.target.value;
        renderFullEpg();
    });

    if (window.epgTimeIndicatorInterval) clearInterval(window.epgTimeIndicatorInterval);

    const pxPerMinute = 10;
    const hourWidth = 60 * pxPerMinute;
    const now = new Date();
    
    const gridStart = new Date(now.getTime());
    gridStart.setMinutes(0, 0, 0);
    gridStart.setHours(gridStart.getHours() - 1); // -1 hour
    
    const gridEnd = new Date(gridStart.getTime() + 9 * 60 * 60 * 1000); // +8 hours from now (9 hours total duration)
    const totalWidth = 9 * hourWidth;

    epgChannelsToRender = allChannels.filter(channel => {
        if (epgSelectedPlaylist === 'favs' && !channel.favourite) return false;
        if (epgSelectedPlaylist !== 'all' && epgSelectedPlaylist !== 'favs' && String(channel.playlistId) !== String(epgSelectedPlaylist)) return false;
        const channelGroup = channel.group || 'Uncategorized';
        if (epgSelectedGroup !== 'all' && channelGroup !== epgSelectedGroup) return false;
        return true;
    });

    epgChannelsToRender.sort((a, b) => sortAlphaNum(a.title, b.title));

    epgGridState = { gridStart, gridEnd, totalWidth, pxPerMinute, now };
    epgLastStartIndex = -1;
    epgLastEndIndex = -1;
    epgLastScrollLeft = -1;
    epgCache = {};
    epgLoadingSet.clear();

    let headerHtml = '';
    for (let i = 0; i < 9; i++) {
        const headerTime = new Date(gridStart.getTime() + i * 60 * 60 * 1000);
        const timeStr = headerTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        headerHtml += `<div style="position: absolute; left: ${i * hourWidth}px; width: ${hourWidth}px; height: 100%; border-right: 1px solid rgba(0,0,0,0.2); border-bottom: 2px solid #333; display: flex; align-items: center; padding-left: 10px; color: #000; font-weight: bold; box-sizing: border-box;">${timeStr}</div>`;
    }

    const minutesSinceStart = (now.getTime() - gridStart.getTime()) / 60000;
    const nowPx = minutesSinceStart * pxPerMinute;
    let redLineHtml = '';
    if (nowPx > 0 && nowPx < totalWidth) {
        redLineHtml = `<div id="epg-time-indicator" style="position: absolute; left: ${nowPx}px; top: 0; height: 100%; width: 2px; background: #cf6679; z-index: 15; pointer-events: none;"></div>`;
    }

    let html = `
    <div id="epg-layout-wrapper" style="display: flex; flex-direction: column; flex-grow: 1; width: 100%; height: 100%; overflow: hidden; background: #121212; border: 1px solid #333; border-radius: 8px;">
        <!-- Header Row -->
        <div style="display: flex; width: 100%; background: #bb86fc; z-index: 20;">
            <div style="width: 250px; min-width: 250px; background: #bb86fc; border-bottom: 2px solid #333; border-right: 1px solid rgba(255, 255, 255, 0.15); display: flex; align-items: center; justify-content: center; font-weight: bold; color: #000; box-sizing: border-box; height: 30px;">Channels</div>
            <div id="epg-header-scroll" style="flex-grow: 1; overflow: hidden; position: relative; height: 30px;">
                <div style="width: ${totalWidth}px; height: 100%; position: relative;">
                    ${headerHtml}
                </div>
            </div>
            <!-- Scrollbar Spacer -->
            <div id="epg-header-spacer" style="width: 14px; min-width: 14px; background: #bb86fc; border-bottom: 2px solid #333; flex-shrink: 0; box-sizing: border-box;"></div>
        </div>
        
        <!-- Content Area -->
        <div style="display: flex; flex-grow: 1; overflow: hidden; width: 100%;">
            <!-- Left Pinned Channels -->
            <div id="epg-channels-col" style="width: 250px; min-width: 250px; background: #1a1a1a; overflow: hidden; border-right: 1px solid rgba(255, 255, 255, 0.15); z-index: 10; position: relative;">
                <div id="epg-channels-inner" style="position: relative; width: 100%; height: ${epgChannelsToRender.length * 45}px;"></div>
            </div>
            
            <!-- Right Scrolling Grid -->
            <div id="epg-scroll-container" style="flex-grow: 1; overflow-y: scroll; overflow-x: auto; position: relative; background: #121212;">
                <div id="epg-grid-inner" style="width: ${totalWidth}px; height: ${epgChannelsToRender.length * 45}px; position: relative;">
                    <div id="epg-rows-layer" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"></div>
                    ${redLineHtml}
                </div>
            </div>
        </div>
    </div>`;

    const contentArea = document.getElementById('epg-content-area');
    if (contentArea) {
        contentArea.innerHTML = html;
    }

    const channelsContainer = document.getElementById('epg-channels-col');
    const gridContainer = document.getElementById('epg-scroll-container');
    
    const handleEpgClick = (e) => {
            const recordBtn = e.target.closest('.epg-record-btn');
            if (recordBtn) {
                e.stopPropagation();
                const channelTitle = recordBtn.getAttribute('data-channel');
                const channelUrl = recordBtn.getAttribute('data-url');
                const progTitle = recordBtn.getAttribute('data-prog');
                const startRaw = recordBtn.getAttribute('data-start');
                const stopRaw = recordBtn.getAttribute('data-stop');
                
                const startTimeIso = parseEpgTime(startRaw).toISOString();
                const endTimeIso = parseEpgTime(stopRaw).toISOString();
                
                const existingSchedule = clientScheduledRecordings.find(s => s.channelName === channelTitle && s.programName === progTitle && s.startTime === startTimeIso && s.status === 'pending');
                
                if (existingSchedule) {
                    window.iptvAPI.cancelScheduledRecording(existingSchedule.id).then(success => {
                        if (success) {
                            showToast('Scheduled recording cancelled: ' + progTitle);
                            renderFullEpg();
                            renderLiveEpg();
                        } else {
                            showToast('Failed to cancel schedule.', true);
                        }
                    });
                } else {
                    const targetChannel = allChannels.find(c => c.title === channelTitle);
                    const resolveUrlAndSchedule = async () => {
                        try {
                            const originalUrl = targetChannel ? (targetChannel.stream_url || targetChannel.url) : channelUrl;
                            let customHeaders = [];
                            if (targetChannel && targetChannel.stream_url && targetChannel.stream_url.startsWith('stalker-cmd:')) {
                                const playlist = savedPlaylists.find(p => p.id === targetChannel.playlist_id || p.id === targetChannel.playlistId);
                                if (playlist && playlist.epg && playlist.epg.startsWith('stalker:')) {
                                    const mac = playlist.epg.substring(8);
                                    let portalUrl = playlist.source;
                                    let referer = portalUrl.replace('/server/load.php', '/c/index.html').replace('/portal.php', '/c/index.html');
                                    customHeaders = [
                                        `X-User-Agent: Model: MAG250; Link: Ethernet`,
                                        `Referer: ${referer}`,
                                        `STALKER-METADATA:${JSON.stringify({ portalUrl, mac, sourceType: 'stalker' })}`
                                    ];
                                }
                            } else {
                                customHeaders = [
                                    `STALKER-METADATA:${JSON.stringify({ sourceType: 'm3u' })}`
                                ];
                            }
                            
                            window.iptvAPI.scheduleRecording(originalUrl, channelTitle, progTitle, startTimeIso, endTimeIso, customHeaders).then(res => {
                                if (res) {
                                    showToast(`Recording scheduled: ${progTitle}`);
                                    renderFullEpg();
                                    renderLiveEpg();
                                } else {
                                    showToast('Failed to schedule recording.', true);
                                }
                            });
                        } catch (err) {
                            console.error('Error scheduling recording:', err);
                            showToast('Failed to schedule: ' + err.message, true);
                        }
                    };
                    resolveUrlAndSchedule();
                }
                return;
            }

            const reminderBtn = e.target.closest('.reminder-btn-full');
            if (reminderBtn) {
                e.stopPropagation();
                const channelTitle = reminderBtn.getAttribute('data-channel');
                const progTitle = reminderBtn.getAttribute('data-prog');
                const start = reminderBtn.getAttribute('data-start');
                const stop = reminderBtn.getAttribute('data-stop');
                toggleReminder(channelTitle, progTitle, start, stop);
                const isSet = savedReminders.some(r => r.progTitle === progTitle && r.startTime === start && r.channelTitle === channelTitle);
                if (isSet) {
                    reminderBtn.style.opacity = '1';
                    reminderBtn.style.filter = 'drop-shadow(0 0 4px #bb86fc)';
                    showToast('Reminder Set: ' + progTitle);
                } else {
                    reminderBtn.style.opacity = '0.3';
                    reminderBtn.style.filter = 'grayscale(100%)';
                    showToast('Reminder Removed');
                }
                return;
            }

            const playChannel = e.target.closest('.epg-play-channel');
            if (playChannel) {
                const internalReminderBtn = playChannel.querySelector('.reminder-btn-full');
                if (internalReminderBtn && playChannel.classList.contains('epg-program-cell')) {
                    internalReminderBtn.click();
                    return;
                }

                const idx = playChannel.getAttribute('data-index');
                const targetChannel = allChannels[idx];
                if (targetChannel) {
                    switchTab('live-tv', document.getElementById('btn-live-tv'));
                    embedStream(targetChannel);
                }
            }
    };
    
    if (channelsContainer) channelsContainer.addEventListener('click', handleEpgClick);
    if (gridContainer) gridContainer.addEventListener('click', handleEpgClick);
    
    const handleEpgWheel = (e) => {
        if (gridContainer) {
            gridContainer.scrollTop += e.deltaY;
            gridContainer.scrollLeft += e.deltaX;
        }
        e.preventDefault();
    };

    if (channelsContainer) channelsContainer.addEventListener('wheel', handleEpgWheel, { passive: false });
    if (gridContainer) gridContainer.addEventListener('wheel', handleEpgWheel, { passive: false });

    const scrollContainer = document.getElementById('epg-scroll-container');
    if (scrollContainer) {
        scrollContainer.addEventListener('scroll', onEpgScroll);
    }

    renderVisibleEpgRows(true);

    if (!document.getElementById('epg-styles')) {
        const style = document.createElement('style');
        style.id = 'epg-styles';
        style.textContent = `
            .epg-program-cell:hover { background: #333 !important; }
            .epg-play-channel:hover { background-color: #2a2a2a !important; }
            #epg-scroll-container::-webkit-scrollbar { width: 12px !important; height: 12px !important; }
            #epg-scroll-container::-webkit-scrollbar-track { background: #121212 !important; border-left: 1px solid rgba(255, 255, 255, 0.05) !important; border-top: 1px solid rgba(255, 255, 255, 0.05) !important; }
            #epg-scroll-container::-webkit-scrollbar-thumb { background: #5c5c66 !important; border-radius: 6px !important; border: 3px solid #121212 !important; }
            #epg-scroll-container::-webkit-scrollbar-thumb:hover { background: #bb86fc !important; }
            #epg-scroll-container::-webkit-scrollbar-corner { background: #121212 !important; }
        `;
        document.head.appendChild(style);
    }

    const nowBtn = document.getElementById('epg-now-btn');
    if (scrollContainer) {
        const targetScroll = Math.max(0, nowPx - (30 * pxPerMinute)); // Pad back 30 mins from red line
        setTimeout(() => {
            scrollContainer.scrollLeft = targetScroll;
            const headerScroll = document.getElementById('epg-header-scroll');
            if (headerScroll) headerScroll.scrollLeft = targetScroll;
        }, 10);
        if (nowBtn) {
            nowBtn.onclick = () => {
                scrollContainer.scrollTo({ left: targetScroll, behavior: 'smooth' });
            };
        }
    }

    window.epgTimeIndicatorInterval = setInterval(() => {
        const indicator = document.getElementById('epg-time-indicator');
        if (indicator && epgGridState) {
            const newNow = new Date();
            const newMinutesSinceStart = (newNow.getTime() - epgGridState.gridStart.getTime()) / 60000;
            const newNowPx = newMinutesSinceStart * epgGridState.pxPerMinute;
            indicator.style.left = `${newNowPx}px`;
        }
    }, 60000);
}

async function embedStream(channel) {
    console.log('[STREAM] Embedding stream for channel:', channel.title);
    streamActive = true;
    window.currentPlaybackHeaders = null;
    
    if (window.activeEpgTrackingInterval) {
        clearInterval(window.activeEpgTrackingInterval);
        window.activeEpgTrackingInterval = null;
    }
    
    if (window.playbackTimeout) {
        clearTimeout(window.playbackTimeout);
        window.playbackTimeout = null;
    }
    window.hasStartedPlayback = false;
    
    currentPlayingChannelIndex = allChannels.findIndex(c => c.url === channel.url && c.title === channel.title);

    const groupName = channel.group || 'Uncategorized';
    if (!window.expandedGroups.has(groupName)) {
        window.expandedGroups.add(groupName);
        localStorage.setItem('iptv_expanded_groups', JSON.stringify(Array.from(window.expandedGroups)));
        renderChannels();
    }

    document.querySelectorAll('.channel-item').forEach(el => el.classList.remove('active'));
    const activeEl = document.querySelector(`.channel-item[data-index="${currentPlayingChannelIndex}"]`);
    if (activeEl) {
        activeEl.classList.add('active');
        setTimeout(() => {
            activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 100);
    }

    const fsBtn = document.getElementById('fullscreen-btn');
    if (fsBtn) fsBtn.style.display = 'block';
    
    localStorage.setItem('lastPlayedChannelUrl', channel.url);
    
    let finalStreamUrl = channel.url;
    const playlist = savedPlaylists.find(p => String(p.id) === String(channel.playlistId));

    if (playlist && playlist.epg && playlist.epg.startsWith('stalker:') && !finalStreamUrl.startsWith('stalker-cmd:') && !finalStreamUrl.startsWith('stalker-series:') && !finalStreamUrl.startsWith('stalker-series-ep:')) {
        finalStreamUrl = `stalker-cmd:${channel.type === 'live' ? 'itv' : 'vod'}|${finalStreamUrl}`;
    }

    if (finalStreamUrl.startsWith('stalker-series-ep:')) {
        const parts = finalStreamUrl.substring(18).split('|');
        const cmd = parts[0];
        const seriesNum = parts[1];
        
        if (playlist && playlist.epg && playlist.epg.startsWith('stalker:')) {
            const mac = playlist.epg.substring(8);
            const resolved = await window.iptvAPI.resolveStalkerLink({ url: playlist.source, mac, type: 'vod', cmd, series: seriesNum });
            if (resolved) finalStreamUrl = resolved;
            else {
                showToast("Failed to authenticate stream link.");
                const playerOverlay = document.getElementById('player-overlay');
                if (playerOverlay) {
                    playerOverlay.innerHTML = `
                        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; height: 100%;">
                            <img src="assets/logo.png" style="width: 128px; height: 128px; margin-bottom: 20px; border-radius: 15px; background: #2A2A2A;">
                            <span style="color: #cf6679; font-size: 1.2em; font-weight: bold;">Channel currently not available</span>
                        </div>
                    `;
                }
                streamActive = false;
                currentPlayingChannelIndex = -1;
                document.querySelectorAll('.channel-item').forEach(el => el.classList.remove('active'));
                const fsBtn = document.getElementById('fullscreen-btn');
                if (fsBtn) fsBtn.style.display = 'none';
                return;
            }
        }
    } else if (finalStreamUrl.startsWith('stalker-cmd:')) {
        const parts = finalStreamUrl.substring(12).split('|');
        const type = parts[0];
        const cmd = parts.slice(1).join('|');
        
        if (playlist && playlist.epg && playlist.epg.startsWith('stalker:')) {
            const mac = playlist.epg.substring(8);
            const resolved = await window.iptvAPI.resolveStalkerLink({ url: playlist.source, mac, type, cmd });
            if (resolved) finalStreamUrl = resolved;
            else {
                showToast("Failed to authenticate stream link.");
                const playerOverlay = document.getElementById('player-overlay');
                if (playerOverlay) {
                    playerOverlay.innerHTML = `
                        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; height: 100%;">
                            <img src="assets/logo.png" style="width: 128px; height: 128px; margin-bottom: 20px; border-radius: 15px; background: #2A2A2A;">
                            <span style="color: #cf6679; font-size: 1.2em; font-weight: bold;">Channel currently not available</span>
                        </div>
                    `;
                }
                streamActive = false;
                currentPlayingChannelIndex = -1;
                document.querySelectorAll('.channel-item').forEach(el => el.classList.remove('active'));
                const fsBtn = document.getElementById('fullscreen-btn');
                if (fsBtn) fsBtn.style.display = 'none';
                return;
            }
        }
    } else if (finalStreamUrl.startsWith('xtream-stream:')) {
        const parts = finalStreamUrl.substring(14).split('|');
        const type = parts[0];
        const streamId = parts[1];
        let extension = null;
        let directSourceUrl = null;
        
        if (type === 'live') {
            extension = null;
            if (parts[2]) {
                directSourceUrl = decodeURIComponent(parts[2]);
            }
        } else if (type === 'movie') {
            extension = parts[2] || null;
            if (parts[3]) {
                directSourceUrl = decodeURIComponent(parts[3]);
            }
        }
        
        if (playlist && playlist.source && playlist.source.startsWith('xtream-credentials:')) {
            const credParts = playlist.source.substring(19).split('|');
            const server = credParts[0];
            const username = credParts[1];
            const password = credParts[2];
            
            const resolvedSource = await window.iptvAPI.resolveXtreamLink({ 
                server, 
                username, 
                password, 
                streamId, 
                type, 
                extension,
                directSourceUrl
            });
            
            if (resolvedSource && resolvedSource.url) {
                finalStreamUrl = resolvedSource.url;
                window.currentPlaybackHeaders = resolvedSource.headers || null;
                console.log(`[XTREAM PLAYBACKSOURCE] Resolved playable URL: ${finalStreamUrl}, Format: ${resolvedSource.streamFormat}`);
            } else {
                showToast("Failed to resolve Xtream Codes stream URL.");
                const playerOverlay = document.getElementById('player-overlay');
                if (playerOverlay) {
                    playerOverlay.innerHTML = `
                        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; height: 100%;">
                            <img src="assets/logo.png" style="width: 128px; height: 128px; margin-bottom: 20px; border-radius: 15px; background: #2A2A2A;">
                            <span style="color: #cf6679; font-size: 1.2em; font-weight: bold;">Stream currently not available</span>
                        </div>
                    `;
                }
                streamActive = false;
                currentPlayingChannelIndex = -1;
                document.querySelectorAll('.channel-item').forEach(el => el.classList.remove('active'));
                const fsBtn = document.getElementById('fullscreen-btn');
                if (fsBtn) fsBtn.style.display = 'none';
                return;
            }
        }
    }

    const detailInfo = document.getElementById('detail-info');
    if (detailInfo) detailInfo.style.display = 'block';

    const detailName = document.getElementById('detail-name');
    if (detailName) {
        detailName.textContent = channel.title || 'Unknown Channel';
        // Ensure text wraps properly and remains visible
        detailName.style.display = 'block';
        detailName.style.wordBreak = 'break-word';
        detailName.style.whiteSpace = 'normal';
        detailName.style.fontSize = '0.8em';
        detailName.style.fontWeight = 'bold';
        detailName.style.fontFamily = "'Inter', sans-serif";
    }
    const detailLogo = document.getElementById('detail-logo');
    if (detailLogo) {
        // Enforce a strict size so the large default logo doesn't push the channel name out of view
        detailLogo.style.width = '100px';
        detailLogo.style.height = '100px';
        detailLogo.style.maxWidth = '100px';
        detailLogo.style.maxHeight = '100px';
        detailLogo.style.objectFit = 'contain';
        detailLogo.onerror = function() {
            this.onerror = null;
            this.src = 'assets/logo.ico';
        };
        detailLogo.src = (channel.logo && channel.logo.trim() !== '') ? channel.logo : 'assets/logo.ico';
    }
    const detailRes = document.getElementById('detail-res');
    if (detailRes) {
        detailRes.style.display = 'none'; // Hide the resolution display entirely
        // Safely hide the parent label container ("Resolution:") if it exists
        if (detailRes.parentElement && detailRes.parentElement.tagName === 'DIV') {
            detailRes.parentElement.style.display = 'none'; 
        }
    }
    
    const parsedSeries = parseM3uSeriesName(channel.title);
    const hasSeriesPattern = channel.title && (
        /s\d+\s*e\d+/i.test(channel.title) || 
        /season\s*\d+\s*episode\s*\d+/i.test(channel.title) ||
        /\d+x\d+/i.test(channel.title)
    );
    const isMovieOrEpisode = channel.type === 'movie' || 
                             channel.type === 'series' || 
                             channel.type === 'episode' || 
                             hasSeriesPattern ||
                             (channel.url && (channel.url.startsWith('stalker-series') || channel.url.startsWith('stalker-cmd:vod')));

    if (isMovieOrEpisode) {
        loadAndRenderTmdbSynopsis(channel);
        if (!window.activeDetailsStreamInfo) {
            if (channel.type === 'episode') {
                window.activeDetailsStreamInfo = {
                    title: channel.seriesTitle || channel.title.split(' - ')[0],
                    logo: channel.logo,
                    playlistId: channel.playlistId,
                    type: 'series',
                    tmdbId: channel.tmdbId
                };
            } else {
                window.activeDetailsStreamInfo = channel;
            }
        }
    } else {
        window.activeDetailsStreamInfo = null;
        const mappedId = channelMappings[channel.title];
        const epgIds = [mappedId, channel.tvg_id, channel.tvg_name].filter(Boolean);
        console.log('[API] Calling getEpg for current stream.');
        const epgData = await window.iptvAPI.getEpg(epgIds, null, null);
        
        let programmes = [];
        for (const id of epgIds) {
            if (epgData[id] && epgData[id].length > 0) { programmes = epgData[id]; break; }
        }
        
        const detailProgram = document.getElementById('detail-program');
        const detailTimeslot = document.getElementById('detail-timeslot');
        const detailDescription = document.getElementById('detail-description');
        const currentProg = getCurrentProgram(programmes);
        if (detailProgram) {
            if (currentProg) {
                detailProgram.textContent = currentProg.title || 'No Title';
                const pStart = parseEpgTime(currentProg.start);
                const pEnd = parseEpgTime(currentProg.stop);
                const timeStr = `${pStart.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - ${pEnd.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
                if (detailTimeslot) {
                    detailTimeslot.textContent = timeStr;
                    detailTimeslot.style.display = 'block';
                }
                if (detailDescription) {
                    detailDescription.textContent = currentProg.desc || 'No description available.';
                    detailDescription.style.display = 'block';
                }
            } else {
                detailProgram.textContent = 'No Information Available';
                if (detailTimeslot) {
                    detailTimeslot.textContent = '--';
                }
                if (detailDescription) {
                    detailDescription.textContent = 'No EPG data available for this channel.';
                }
            }
        }
        
        renderLiveEpgGrid();
        
        // Setup pending EPG payload to send to MPV Lua script
        let progTitle = '', progDesc = '', progTime = '';
        if (currentProg) {
            progTitle = currentProg.title || '';
            progDesc = currentProg.desc || '';
            const pStart = parseEpgTime(currentProg.start);
            const pEnd = parseEpgTime(currentProg.stop);
            progTime = `${pStart.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - ${pEnd.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
        }
        
        window.pendingEpgUpdate = {
            title: channel.title || '',
            progTitle: progTitle,
            progDesc: progDesc,
            progTime: progTime
        };
        
        // Periodically track EPG changes to dynamically update details card and OSC
        window.activeEpgTrackingInterval = setInterval(() => {
            updatePlayingChannelEpg(channel);
        }, 30000);
    }

    const safeTitle = (channel.title || 'Unknown Channel').replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const playerOverlay = document.getElementById('player-overlay');
    if (playerOverlay) playerOverlay.innerHTML = `<span style="color: #bb86fc;">Loading...</span><br><span style="font-size: 0.6em; color: #888;">${safeTitle}</span>`;

    // Track active fallback iterations
    window.currentPlaybackChannel = channel;
    window.currentPlaybackFinalUrl = finalStreamUrl;

    // Autoplay Next Episode initialization
    hideAutoplayOverlay();
    window.isAutoplayBlockedForCurrentEpisode = false;
    if (channel && channel.type === 'episode') {
        getEpisodesForSeries(channel).then(eps => {
            window.currentPlayingSeriesEpisodes = eps;
            console.log(`[AUTOPLAY] Cached ${eps.length} episodes for series:`, channel.seriesTitle);
        }).catch(err => {
            console.error('[AUTOPLAY] Error loading series episodes cache:', err);
            window.currentPlayingSeriesEpisodes = [];
        });
    } else {
        window.currentPlayingSeriesEpisodes = [];
    }

    if (window.lastPlaybackChannelUrl !== channel.url) {
        window.lastPlaybackChannelUrl = channel.url;
        window.playbackFallbackCount = 0;
    }

    const rect = playerContainer.getBoundingClientRect();
    
    // We keep window.pendingResumeSeekTime intact until file-loaded fires
    window.isFileLoaded = false;
    window.isSwitchingStream = true;
    
    console.log('[API] Calling playMpvEmbedded. Final URL:', finalStreamUrl);
    window.iptvAPI.playMpvEmbedded({
        url: finalStreamUrl,
        title: channel.title,
        headers: window.currentPlaybackHeaders || null,
        bounds: {
            x: Math.round(rect.x),
            y: Math.round(rect.y),
            width: Math.round(rect.width),
            height: Math.round(rect.height)
        }
    });

    // Start a 30-second loading timeout. If no playback-time is received, fail gracefully.
    window.playbackTimeout = setTimeout(() => {
        if (!window.hasStartedPlayback && streamActive) {
            console.warn('[STREAM] Playback timeout. Stream failed to load.');
            window.isSwitchingStream = false;
            streamActive = false;
            currentPlayingChannelIndex = -1;
            document.querySelectorAll('.channel-item').forEach(el => el.classList.remove('active'));
            
            // Stop MPV rendering
            window.iptvAPI.sendMpvCommand('stop');
            
            const playerOverlay = document.getElementById('player-overlay');
            if (playerOverlay) {
                playerOverlay.innerHTML = `
                    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; height: 100%;">
                        <img src="assets/logo.png" style="width: 128px; height: 128px; margin-bottom: 20px; border-radius: 15px; background: #2A2A2A;">
                        <span style="color: #cf6679; font-size: 1.2em; font-weight: bold;">Channel currently not available</span>
                    </div>
                `;
            }
            const fsBtn = document.getElementById('fullscreen-btn');
            if (fsBtn) fsBtn.style.display = 'none';
        }
    }, 30000);
}

// Hook Stalker query / header fallback retries when MPV triggers unrecognized format error
window.iptvAPI.onStreamFailedRetry(async () => {
    if (!streamActive || !window.currentPlaybackChannel) return;
    
    window.playbackFallbackCount = (window.playbackFallbackCount || 0) + 1;
    let url = window.currentPlaybackFinalUrl || '';
    
    if (window.playbackFallbackCount > 3) {
        console.log('[MPV FALLBACK SYSTEM] Exceeded maximum fallback attempts (3). Halting stream.');
        return;
    }
    
    console.log(`[MPV FALLBACK SYSTEM] Stream failed. Triggering recovery and fallback attempt #${window.playbackFallbackCount}`);
    
    // Rerun the resolver dynamically to get a fresh PlaybackSource if it's an Xtream Codes or Stalker stream
    let freshUrl = '';
    let freshHeaders = null;
    
    const channel = window.currentPlaybackChannel;
    const playlist = savedPlaylists.find(p => String(p.id) === String(channel.playlistId));
    
    if (channel.url.startsWith('xtream-stream:') && playlist && playlist.source.startsWith('xtream-credentials:')) {
        try {
            console.log('[MPV FALLBACK SYSTEM] Running dynamic Xtream Codes link re-resolver...');
            const parts = channel.url.substring(14).split('|');
            const type = parts[0];
            const streamId = parts[1];
            let extension = null;
            let directSourceUrl = null;
            
            if (type === 'live') {
                extension = null;
                if (parts[2]) directSourceUrl = decodeURIComponent(parts[2]);
            } else if (type === 'movie') {
                extension = parts[2] || null;
                if (parts[3]) directSourceUrl = decodeURIComponent(parts[3]);
            }
            
            const credParts = playlist.source.substring(19).split('|');
            const server = credParts[0];
            const username = credParts[1];
            const password = credParts[2];
            
            const resolvedSource = await window.iptvAPI.resolveXtreamLink({ 
                server, 
                username, 
                password, 
                streamId, 
                type, 
                extension,
                directSourceUrl
            });
            
            if (resolvedSource && resolvedSource.url) {
                freshUrl = resolvedSource.url;
                freshHeaders = resolvedSource.headers || null;
                console.log('[MPV FALLBACK SYSTEM] Xtream Codes stream re-resolved successfully:', freshUrl);
            }
        } catch (err) {
            console.error('[MPV FALLBACK SYSTEM] Xtream Codes re-resolution failed:', err.message);
        }
    } else if (channel.url.startsWith('stalker-') || (playlist && playlist.epg && playlist.epg.startsWith('stalker:'))) {
        try {
            console.log('[MPV FALLBACK SYSTEM] Running dynamic Stalker link re-resolver...');
            let stalkerUrl = channel.url;
            if (playlist && playlist.epg && playlist.epg.startsWith('stalker:') && !stalkerUrl.startsWith('stalker-cmd:')) {
                stalkerUrl = `stalker-cmd:${channel.type === 'live' ? 'itv' : 'vod'}|${stalkerUrl}`;
            }
            
            if (stalkerUrl.startsWith('stalker-series-ep:')) {
                const parts = stalkerUrl.substring(18).split('|');
                const cmd = parts[0];
                const seriesNum = parts[1];
                const mac = playlist.epg.substring(8);
                freshUrl = await window.iptvAPI.resolveStalkerLink({ url: playlist.source, mac, type: 'vod', cmd, series: seriesNum });
            } else if (stalkerUrl.startsWith('stalker-cmd:')) {
                const parts = stalkerUrl.substring(12).split('|');
                const type = parts[0];
                const cmd = parts.slice(1).join('|');
                const mac = playlist.epg.substring(8);
                freshUrl = await window.iptvAPI.resolveStalkerLink({ url: playlist.source, mac, type, cmd });
            }
            if (freshUrl) {
                console.log('[MPV FALLBACK SYSTEM] Stalker stream re-resolved successfully:', freshUrl);
            }
        } catch (err) {
            console.error('[MPV FALLBACK SYSTEM] Stalker re-resolution failed:', err.message);
        }
    }
    
    if (freshUrl) {
        url = freshUrl;
        window.currentPlaybackFinalUrl = freshUrl;
        if (freshHeaders) {
            window.currentPlaybackHeaders = freshHeaders;
        }
    }
    
    // Strategy 1: If there is a play_token parameter in URL, strip it out or alter query formats
    if (window.playbackFallbackCount === 1) {
        if (url.includes('play_token=')) {
            url = url.replace(/([?&])play_token=[^&]+/i, '$1').replace(/[?&]&/g, '?').replace(/\?$/g, '');
            console.log('[MPV FALLBACK SYSTEM] Strategy 1: Stripped play_token from Stalker URL:', url);
        } else if (url.includes('&')) {
            // Strip all extra URL query parameters
            url = url.split('&')[0];
            console.log('[MPV FALLBACK SYSTEM] Strategy 1: Stripped extra query parameters:', url);
        } else {
            // Alter extension / append dummy parameter
            url = url + (url.includes('?') ? '&' : '?') + 'forced_auth=true';
            console.log('[MPV FALLBACK SYSTEM] Strategy 1: Append force_auth flag:', url);
        }
    }
    
    // Strategy 2: Strip standard transport extension (e.g. remove .mkv, .mp4, .ts, etc if portal is strict)
    if (window.playbackFallbackCount === 2) {
        if (url.includes('.mkv')) {
            url = url.replace('.mkv', '');
            console.log('[MPV FALLBACK SYSTEM] Strategy 2: Stripping .mkv extension:', url);
        } else if (url.includes('.ts')) {
            url = url.replace('.ts', '');
            console.log('[MPV FALLBACK SYSTEM] Strategy 2: Stripping .ts extension:', url);
        } else if (url.includes('.mp4')) {
            url = url.replace('.mp4', '');
            console.log('[MPV FALLBACK SYSTEM] Strategy 2: Stripping .mp4 extension:', url);
        } else {
            // Strip all queries entirely
            url = url.split('?')[0];
            console.log('[MPV FALLBACK SYSTEM] Strategy 2: Stripping all URL queries:', url);
        }
    }
    
    // Strategy 3: Attempt playing raw feed without Bearer authorization or with stripped MAC parameters
    if (window.playbackFallbackCount === 3) {
        if (url.includes('mac=')) {
            url = url.replace(/([?&])mac=[^&]+/i, '$1').replace(/[?&]&/g, '?').replace(/\?$/g, '');
            console.log('[MPV FALLBACK SYSTEM] Strategy 3: Stripping mac parameter from URL string:', url);
        } else {
            // Add custom Stalker direct command headers fallback parameter
            url = url + (url.includes('?') ? '&' : '?') + 'mag=mag250';
            console.log('[MPV FALLBACK SYSTEM] Strategy 3: Appended dummy MAG device tag parameter:', url);
        }
    }

    if (window.playbackTimeout) {
        clearTimeout(window.playbackTimeout);
        window.playbackTimeout = null;
    }
    
    const rect = playerContainer.getBoundingClientRect();
    window.iptvAPI.playMpvEmbedded({
        url: url,
        title: window.currentPlaybackChannel.title,
        headers: window.currentPlaybackHeaders || null,
        bounds: {
            x: Math.round(rect.x),
            y: Math.round(rect.y),
            width: Math.round(rect.width),
            height: Math.round(rect.height)
        }
    });

    window.playbackTimeout = setTimeout(() => {
        if (!window.hasStartedPlayback && streamActive) {
            console.warn('[STREAM TIMEOUT] Fallback timeout.');
            window.isSwitchingStream = false;
        }
    }, 30000);
});

window.iptvAPI.onMpvExit((code) => {
    console.log('[API RECV] onMpvExit with code:', code);
    hideAutoplayOverlay();
    window.isSwitchingStream = false;
    
    if (window.playbackTimeout) {
        clearTimeout(window.playbackTimeout);
        window.playbackTimeout = null;
    }
    
    // Save current playback progress before cleanup
    saveCurrentPlaybackProgress();
    
    if (streamActive) {
        streamActive = false;
        currentPlayingChannelIndex = -1;
        document.querySelectorAll('.channel-item').forEach(el => el.classList.remove('active'));
 
        const playerOverlay = document.getElementById('player-overlay');
        if (playerOverlay) {
            playerOverlay.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; height: 100%;">
                    <img src="assets/logo.png" style="width: 128px; height: 128px; margin-bottom: 20px; border-radius: 15px; background: #2A2A2A;">
                    <span style="color: #cf6679; font-size: 1.2em; font-weight: bold;">Channel currently not available</span>
                </div>
            `;
        }
 
        const fsBtn = document.getElementById('fullscreen-btn');
        if (fsBtn) fsBtn.style.display = 'none';
    }
});
 
window.iptvAPI.onMpvStopped(() => {
    console.log('[API RECV] onMpvStopped');
    hideAutoplayOverlay();
    
    if (window.isSwitchingStream) {
        console.log('[API RECV] Ignoring onMpvStopped because we are switching streams.');
        return;
    }
    
    if (streamActive && !window.hasStartedPlayback) {
        console.log('[API RECV] Ignoring onMpvStopped because a new stream is currently loading.');
        return;
    }
    
    if (window.playbackTimeout) {
        clearTimeout(window.playbackTimeout);
        window.playbackTimeout = null;
    }
    
    // Save current playback progress before cleanup
    saveCurrentPlaybackProgress();
    
    if (streamActive) {
        streamActive = false;
        currentPlayingChannelIndex = -1;
        document.querySelectorAll('.channel-item').forEach(el => el.classList.remove('active'));
 
        const playerOverlay = document.getElementById('player-overlay');
        if (playerOverlay) {
            playerOverlay.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; height: 100%;">
                    <img src="assets/logo.png" style="width: 128px; height: 128px; margin-bottom: 20px; border-radius: 15px; background: #2A2A2A;">
                    <span style="color: #a1a1aa; font-size: 1.2em; font-weight: bold;">Playback Stopped</span>
                </div>
            `;
        }
 
        const fsBtn = document.getElementById('fullscreen-btn');
        if (fsBtn) fsBtn.style.display = 'none';
    }
    
    // Switch back to origin VOD details view if stopped from a movie or series
    if (window.activeDetailsStreamInfo) {
        const streamInfo = window.activeDetailsStreamInfo;
        const originTab = streamInfo.type === 'series' ? 'vod' : 'movies';
        const tabBtnId = originTab === 'series' || originTab === 'vod' ? 'btn-vod' : 'btn-movies';
        const tabBtn = document.getElementById(tabBtnId);
        
        if (tabBtn) {
            switchTab(originTab, tabBtn);
            // Re-open the movie details modal!
            setTimeout(() => {
                openMovieDetailsModal(streamInfo);
            }, 100);
        }
        window.activeDetailsStreamInfo = null;
    } else {
        // Switch to live TV view when stopped
        const btnLiveTv = document.getElementById('btn-live-tv');
        if (btnLiveTv) {
            switchTab('live-tv', btnLiveTv);
        }
    }
});

window.iptvAPI.onRemotePlayChannel(({ url, title }) => {
    console.log('[REMOTE] Received play request for:', { url, title });
    const targetChannel = allChannels.find(c => c.url === url && c.title === title);
    if (targetChannel) {
        switchTab('live-tv', document.getElementById('btn-live-tv'));
        embedStream(targetChannel);
        showToast(`Playing ${targetChannel.title}`);
        
        if (mainWindow && !mainWindow.isMinimized()) {
            mainWindow.focus();
        }
    }
});

window.iptvAPI.onRemoteSettingsUpdated(() => {
    if (document.getElementById('settings-view') && document.getElementById('settings-view').style.display === 'flex') {
        renderSettings();
    }
});

window.iptvAPI.onRemoteError((msg) => {
    showToast("Remote Server Error: " + msg + "\n\nPlease choose a different port in Settings and try again.");
});

function getVisibleChannels() {
    const filterSelect = document.getElementById('playlist-filter');
    const filterVal = filterSelect ? filterSelect.value : 'all';

    const channelSearch = document.getElementById('channel-search');
    const searchVal = channelSearch ? channelSearch.value.toLowerCase() : '';

    return allChannels.filter(channel => {
        if (filterVal === 'favs' && !channel.favourite) return false;
        if (filterVal !== 'all' && filterVal !== 'favs' && String(channel.playlistId) !== String(filterVal)) return false;
        
        const rawTitle = channel.title || 'Unknown Channel';
        if (searchVal && !rawTitle.toLowerCase().includes(searchVal)) return false;

        return true;
    });
}

window.iptvAPI.onPreviousChannel(() => {
    const currentUrl = localStorage.getItem('lastPlayedChannelUrl');
    const detailName = document.getElementById('detail-name');
    const currentTitle = detailName ? detailName.textContent : '';
    
    let visibleChannels = getVisibleChannels();
    if (visibleChannels.length === 0) visibleChannels = allChannels;

    const idx = visibleChannels.findIndex(c => c.url === currentUrl && (c.title || 'Unknown Channel') === currentTitle);
    if (idx > 0) {
        embedStream(visibleChannels[idx - 1]);
    } else if (idx === 0 && visibleChannels.length > 0) {
        embedStream(visibleChannels[visibleChannels.length - 1]); // Wrap around
    } else if (idx === -1 && visibleChannels.length > 0) {
        embedStream(visibleChannels[0]);
    }
});

window.iptvAPI.onNextChannel(() => {
    const currentUrl = localStorage.getItem('lastPlayedChannelUrl');
    const detailName = document.getElementById('detail-name');
    const currentTitle = detailName ? detailName.textContent : '';

    let visibleChannels = getVisibleChannels();
    if (visibleChannels.length === 0) visibleChannels = allChannels;

    const idx = visibleChannels.findIndex(c => c.url === currentUrl && (c.title || 'Unknown Channel') === currentTitle);
    if (idx >= 0 && idx < visibleChannels.length - 1) {
        embedStream(visibleChannels[idx + 1]);
    } else if (idx === visibleChannels.length - 1 && visibleChannels.length > 0) {
        embedStream(visibleChannels[0]); // Wrap around
    } else if (idx === -1 && visibleChannels.length > 0) {
        embedStream(visibleChannels[0]);
    }
});

function getFocusableElements() {
    const exitToast = document.getElementById('remote-exit-toast');
    const overrideToast = document.getElementById('remote-override-toast');
    const activeToast = exitToast || overrideToast;

    const focusableSelectors = [
        'button', 'a[href]', 'input', 'select', 'textarea', '[tabindex]:not([tabindex="-1"])'
    ];
    
    let rootNode = activeToast ? activeToast : document;

    return Array.from(rootNode.querySelectorAll(focusableSelectors.join(', ')))
        .filter(el => {
            if (!el) return false;
                if (!activeToast && el.closest('#nav-bar')) return false;
            if (!activeToast && (el.closest('#channel-details') || el.closest('#player-wrapper'))) return false;
            const rect = el.getBoundingClientRect();
            const style = window.getComputedStyle(el);
            return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.opacity !== '0' && !el.disabled;
        });
}

function getCenter(rect) {
    return {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
    };
}

function navigateDirection(direction) {
    const focusables = getFocusableElements();
    if (focusables.length === 0) return;

    let current = document.activeElement;

    if (current && current.tagName === 'SELECT' && current.classList.contains('remote-open')) {
        const options = Array.from(current.options);
        let selectedIndex = current.selectedIndex;
        if (direction === 'down' || direction === 'right') {
            selectedIndex = Math.min(options.length - 1, selectedIndex + 1);
        } else if (direction === 'up' || direction === 'left') {
            selectedIndex = Math.max(0, selectedIndex - 1);
        }
        if (selectedIndex !== current.selectedIndex) {
            current.selectedIndex = selectedIndex;
            current.dispatchEvent(new Event('change', { bubbles: true }));
        }
        return;
    }

    if (!current || !focusables.includes(current) || current === document.body) {
        const activeToast = document.getElementById('remote-exit-toast') || document.getElementById('remote-override-toast');
        
        const firstChannel = document.querySelector('.channel-item');
        if (!activeToast && firstChannel && firstChannel.getBoundingClientRect().width > 0) {
            firstChannel.focus();
            return;
        }

        focusables[0].focus();
        return;
    }

    const currentRect = current.getBoundingClientRect();
    const currentCenter = getCenter(currentRect);

    let bestMatch = null;
    let minDistance = Infinity;

    focusables.forEach(el => {
        if (el === current) return;
        const rect = el.getBoundingClientRect();
        const center = getCenter(rect);

        let dx = center.x - currentCenter.x;
        let dy = center.y - currentCenter.y;

        let isDirectionMatch = false;
        if (direction === 'up') isDirectionMatch = dy < 0 && Math.abs(dy) >= Math.abs(dx);
        if (direction === 'down') isDirectionMatch = dy > 0 && Math.abs(dy) >= Math.abs(dx);
        if (direction === 'left') isDirectionMatch = dx < 0 && Math.abs(dx) >= Math.abs(dy);
        if (direction === 'right') isDirectionMatch = dx > 0 && Math.abs(dx) >= Math.abs(dy);

        if (!isDirectionMatch) {
            if (direction === 'up' && dy < 0) isDirectionMatch = true;
            if (direction === 'down' && dy > 0) isDirectionMatch = true;
            if (direction === 'left' && dx < 0) isDirectionMatch = true;
            if (direction === 'right' && dx > 0) isDirectionMatch = true;
        }

        if (isDirectionMatch) {
            const distance = Math.sqrt(dx * dx + dy * dy);
            let score = distance;
            
            if (direction === 'up' || direction === 'down') {
                score += Math.abs(dx) * 2; 
            } else {
                score += Math.abs(dy) * 2; 
            }

            if (score < minDistance) {
                minDistance = score;
                bestMatch = el;
            }
        }
    });

    if (bestMatch) {
        bestMatch.focus();
        bestMatch.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }
}

function handleOkPress() {
    const current = document.activeElement;
    if (current && current.tagName === 'SELECT') {
        if (current.classList.contains('remote-open')) {
            current.classList.remove('remote-open');
        } else {
            current.classList.add('remote-open');
            current.addEventListener('blur', function onBlur() {
                current.classList.remove('remote-open');
                current.removeEventListener('blur', onBlur);
            });
        }
    } else if (current && current.tagName === 'INPUT' && ['text', 'password', 'number', 'search'].includes(current.type)) {
        if (window.iptvAPI.focusRemoteSearch) window.iptvAPI.focusRemoteSearch();
        current.click();
    } else if (current && ['BUTTON', 'A', 'INPUT'].includes(current.tagName)) {
        current.click();
    } else if (current && (current.classList.contains('channel-item') || current.classList.contains('group-item') || current.classList.contains('mapping-ch-item') || current.classList.contains('mapping-epg-item') || current.classList.contains('epg-play-channel') || current.classList.contains('live-epg-item'))) {
        const reminderBtn = current.querySelector('.reminder-btn-sidebar');
        if (current.classList.contains('live-epg-item')) {
            if (reminderBtn) reminderBtn.click();
        } else {
            current.click();
        }
    } else {
        if (streamActive) {
            window.iptvAPI.sendMpvCommand('cycle pause');
        }
    }
}

window.iptvAPI.onRemoteSearch((text) => {
    let activeSearch = null;
    
    if (document.activeElement && document.activeElement.tagName === 'INPUT' && ['text', 'password', 'number', 'search'].includes(document.activeElement.type)) {
        activeSearch = document.activeElement;
    } else {
        const manageModal = document.getElementById('manage-channels-modal');
        const settingsView = document.getElementById('settings-view');
        
        if (manageModal && manageModal.style.display !== 'none') {
            activeSearch = document.getElementById('modal-channel-search');
        } else if (settingsView && settingsView.style.display !== 'none') {
            activeSearch = document.getElementById('mapping-channel-search');
        } else {
            activeSearch = document.getElementById('channel-search');
        }
    }

    if (activeSearch) {
        if (document.activeElement !== activeSearch) activeSearch.focus();
        activeSearch.value = text;
        activeSearch.dispatchEvent(new Event('input', { bubbles: true }));
    }
});

document.addEventListener('input', (e) => {
    if (e.isTrusted && e.target.tagName === 'INPUT' && ['channel-search', 'modal-channel-search', 'mapping-channel-search', 'mapping-epg-search', 'mapping-mapped-search'].includes(e.target.id)) {
        if (window.iptvAPI.syncRemoteSearch) window.iptvAPI.syncRemoteSearch(e.target.value);
    }
});

window.iptvAPI.onRemoteAction((cmd) => {
    console.log('[REMOTE] Action received:', cmd);
    switch (cmd) {
        case 'up':
        case 'down':
        case 'left':
        case 'right':
            if (streamActive && (!document.activeElement || document.activeElement === document.body)) {
                if (cmd === 'up') window.iptvAPI.sendMpvCommand('add volume 5');
                if (cmd === 'down') window.iptvAPI.sendMpvCommand('add volume -5');
                if (cmd === 'right') window.iptvAPI.sendMpvCommand('seek 10');
                if (cmd === 'left') window.iptvAPI.sendMpvCommand('seek -10');
            } else {
                navigateDirection(cmd);
            }
            break;
        case 'ok':
            handleOkPress();
            break;
        case 'power':
            let exitToast = document.getElementById('remote-exit-toast');
            if (exitToast) exitToast.remove();
            
            exitToast = document.createElement('div');
            exitToast.id = 'remote-exit-toast';
            exitToast.style.cssText = 'position: ' + (window.isAppFullscreen ? 'absolute' : 'fixed') + '; bottom: 30px; left: 50%; transform: translateX(-50%); background: #1e1e1e; border: 1px solid #cf6679; color: #fff; padding: 20px; border-radius: 12px; z-index: 2147483647; box-shadow: 0 10px 30px rgba(0,0,0,0.8); text-align: center; font-family: "Inter", sans-serif; min-width: 300px; transition: opacity 0.3s; opacity: 1;';
            exitToast.innerHTML = `
                <div style="font-weight: bold; margin-bottom: 10px; color: #cf6679; font-size: 1.1em;">Exit Application</div>
                <div style="margin-bottom: 20px; font-size: 0.9em; color: #ccc;">Do you want to exit?</div>
                <div style="display: flex; gap: 10px; justify-content: center;">
                    <button id="btn-remote-exit-yes" class="playlist-btn" style="background: #cf6679; color: black; font-weight: bold; padding: 10px 16px; flex: 1;">Yes</button>
                    <button id="btn-remote-exit-no" class="playlist-btn" style="background: #333; color: white; font-weight: bold; padding: 10px 16px; flex: 1;">No</button>
                </div>
            `;
            
            if (window.isAppFullscreen) {
                document.getElementById('player-container').appendChild(exitToast);
            } else {
                document.body.appendChild(exitToast);
            }
            
            document.getElementById('btn-remote-exit-yes').addEventListener('click', () => {
                window.close(); // Gracefully closes the window and terminates MPV
            });
            document.getElementById('btn-remote-exit-no').addEventListener('click', () => {
                exitToast.style.pointerEvents = 'none';
                exitToast.style.opacity = '0';
                if (document.activeElement) document.activeElement.blur();
                setTimeout(() => exitToast.remove(), 300);
            });

            setTimeout(() => {
                const btnNo = document.getElementById('btn-remote-exit-no');
                if (btnNo) btnNo.focus();
            }, 50);
            break;
        case 'home':
            switchTab('live-tv', document.getElementById('btn-live-tv'));
            break;
        case 'back':
            switchTab(previousTabId, document.getElementById('btn-' + previousTabId));
            break;
        case 'guide':
            switchTab('epg', document.getElementById('btn-epg'));
            break;
        case 'livetv':
            switchTab('live-tv', document.getElementById('btn-live-tv'));
            break;
        case 'playlist':
            switchTab('playlist', document.getElementById('btn-playlist'));
            break;
        case 'vod':
            switchTab('vod', document.getElementById('btn-vod'));
            break;
        case 'settings':
            switchTab('settings', document.getElementById('btn-settings'));
            break;
        case 'fullscreen':
            window.iptvAPI.toggleFullscreen();
            break;
        case 'favorites':
            const filter = document.getElementById('playlist-filter');
            if (filter) {
                filter.value = filter.value === 'favs' ? 'all' : 'favs';
                filter.dispatchEvent(new Event('change'));
            }
            break;
        case 'search':
            const search = document.getElementById('channel-search');
            if (search) search.focus();
            break;
    }
});

window.iptvAPI.onShowRemoteOverrideToast((deviceId) => {
    let toast = document.getElementById('remote-override-toast');
    if (toast) toast.remove();
    
    toast = document.createElement('div');
    toast.id = 'remote-override-toast';
    toast.style.cssText = 'position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%) translateY(20px); background: rgba(18, 18, 24, 0.85); color: #ffffff; border: 1px solid rgba(187, 134, 252, 0.45); padding: 22px 28px; border-radius: 16px; z-index: 2147483647; font-family: "Inter", sans-serif; box-shadow: 0 10px 30px rgba(187, 134, 252, 0.15), 0 5px 15px rgba(0,0,0,0.5); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); transition: opacity 0.3s cubic-bezier(0.25, 0.8, 0.25, 1), transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1); opacity: 0; display: flex; flex-direction: column; gap: 14px; align-items: center; pointer-events: auto; min-width: 320px; text-align: center;';
    toast.innerHTML = `
        <div style="font-weight: 700; color: #bb86fc; font-size: 1.1em; letter-spacing: -0.01em;">New Remote Connection</div>
        <div style="font-size: 0.9em; color: #e4e4e7; line-height: 1.45; letter-spacing: -0.01em; margin-bottom: 6px;">A new device is trying to connect.<br>Allow the new device and disconnect the old one?</div>
        <div style="display: flex; gap: 12px; width: 100%; justify-content: center;">
            <button id="btn-remote-allow" style="background: linear-gradient(135deg, #03dac6, #018786); color: #000; border: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; cursor: pointer; transition: background 0.2s, transform 0.1s; font-family: 'Inter', sans-serif; font-size: 0.85em; flex: 1;">Allow</button>
            <button id="btn-remote-deny" style="background: #2a2a2a; color: #fff; border: 1px solid #444; padding: 10px 20px; border-radius: 8px; font-weight: bold; cursor: pointer; transition: background 0.2s, transform 0.1s; font-family: 'Inter', sans-serif; font-size: 0.85em; flex: 1;">Keep Old</button>
        </div>
    `;
    document.body.appendChild(toast);
    
    requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(-50%) translateY(0)';
    });
    
    const allowBtn = document.getElementById('btn-remote-allow');
    const denyBtn = document.getElementById('btn-remote-deny');
    
    allowBtn.addEventListener('mouseover', () => allowBtn.style.background = 'linear-gradient(135deg, #66fff9, #03dac6)');
    allowBtn.addEventListener('mouseout', () => allowBtn.style.background = 'linear-gradient(135deg, #03dac6, #018786)');
    allowBtn.addEventListener('mousedown', () => allowBtn.style.transform = 'scale(0.95)');
    allowBtn.addEventListener('mouseup', () => allowBtn.style.transform = 'scale(1)');
    
    denyBtn.addEventListener('mouseover', () => denyBtn.style.background = '#383838');
    denyBtn.addEventListener('mouseout', () => denyBtn.style.background = '#2a2a2a');
    denyBtn.addEventListener('mousedown', () => denyBtn.style.transform = 'scale(0.95)');
    denyBtn.addEventListener('mouseup', () => denyBtn.style.transform = 'scale(1)');
    
    allowBtn.addEventListener('click', () => {
        window.iptvAPI.sendRemoteOverrideResponse(true);
        toast.style.pointerEvents = 'none';
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(20px)';
        if (document.activeElement) document.activeElement.blur();
        setTimeout(() => toast.remove(), 300);
    });
    
    denyBtn.addEventListener('click', () => {
        window.iptvAPI.sendRemoteOverrideResponse(false);
        toast.style.pointerEvents = 'none';
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(20px)';
        if (document.activeElement) document.activeElement.blur();
        setTimeout(() => toast.remove(), 300);
    });

    setTimeout(() => {
        if (denyBtn) denyBtn.focus();
    }, 50);
});

function triggerBoundsUpdate() {
    const isLiveViewActive = document.getElementById('btn-live-tv') && document.getElementById('btn-live-tv').classList.contains('active');
    if (streamActive && isLiveViewActive && playerContainer) {
        const rect = playerContainer.getBoundingClientRect();
        window.iptvAPI.updateMpvBounds({
            x: Math.round(rect.x),
            y: Math.round(rect.y),
            width: Math.round(rect.width),
            height: Math.round(rect.height)
        });
    } else {
        window.iptvAPI.updateMpvBounds({ x: 0, y: 0, width: 0, height: 0 });
    }
}

// Use ResizeObserver to track exact pixel coordinates perfectly
const resizeObserver = new ResizeObserver(() => {
    console.log('[EVENT] ResizeObserver triggered, updating MPV bounds.');
    triggerBoundsUpdate();
});
resizeObserver.observe(playerContainer);

// Forward mouse events directly to the embedded MPV Lua script
let lastMouseMove = 0;
playerContainer.addEventListener('mousemove', (e) => {
    const now = Date.now();
    if (now - lastMouseMove > 30) {
        lastMouseMove = now;
        const rect = playerContainer.getBoundingClientRect();
        const x = Math.round(e.clientX - rect.left);
        const y = Math.round(e.clientY - rect.top);
        window.iptvAPI.sendMpvCommand(`script-message-to aivue electron-mouse-move ${x} ${y}`);
    }
});

playerContainer.addEventListener('mouseleave', () => {
    console.log('[EVENT] playerContainer mouseleave');
    window.iptvAPI.sendMpvCommand(`script-message-to aivue electron-mouse-leave`);
});

let lastClickTime = 0;
playerContainer.addEventListener('mousedown', (e) => {
    console.log('[EVENT] playerContainer mousedown, button:', e.button);
    const now = Date.now();
    if (now - lastClickTime < 400) {
        window.iptvAPI.toggleFullscreen();
        lastClickTime = 0; // Reset
        return; // Prevent passing the second click of the double-click to MPV
    } else {
        lastClickTime = now;
    }
    const btn = e.button === 0 ? 'mbtn_left' : (e.button === 2 ? 'mbtn_right' : 'mbtn_mid');
    window.iptvAPI.sendMpvCommand(`script-message-to aivue electron-mouse-click ${btn} down`);
});

playerContainer.addEventListener('mouseup', (e) => {
    console.log('[EVENT] playerContainer mouseup, button:', e.button);
    const btn = e.button === 0 ? 'mbtn_left' : (e.button === 2 ? 'mbtn_right' : 'mbtn_mid');
    window.iptvAPI.sendMpvCommand(`script-message-to aivue electron-mouse-click ${btn} up`);
});

playerContainer.addEventListener('wheel', (e) => {
    console.log('[EVENT] playerContainer wheel, deltaY:', e.deltaY);
    const btn = e.deltaY < 0 ? 'wheel_up' : 'wheel_down';
    window.iptvAPI.sendMpvCommand(`script-message-to aivue electron-mouse-click ${btn} press`);
});

// Wire up the Exit button to gracefully tear down the app
document.getElementById('btn-exit').addEventListener('click', () => {
    console.log('[EVENT] Exit button clicked.');
    window.close();
});

// Setup Tab Navigation Logic
const navButtons = document.querySelectorAll('.nav-btn');
const sidebar = document.getElementById('sidebar');
const mainView = document.getElementById('main-view');

let currentTabId = 'playlist';
let previousTabId = 'playlist';
let currentMovieCategory = null;
let currentVodCategory = null;

function switchTab(tabId, clickedBtn) {
    console.log('[UI] Switching tab to:', tabId);
    
    // Close any open overlay modals when navigating away
    const detailsModal = document.getElementById('premium-details-modal');
    if (detailsModal) detailsModal.style.display = 'none';
    const episodesModal = document.getElementById('episodes-modal');
    if (episodesModal) episodesModal.style.display = 'none';

    if (tabId === 'live-tv' && !streamActive) {
        window.activeDetailsStreamInfo = null;
    }

    // Reset Movies and VOD category selection on tab entry to open into the initial folder load views
    if (tabId === 'movies') {
        currentMovieCategory = null;
    }
    if (tabId === 'vod') {
        currentVodCategory = null;
    }

    if (currentTabId !== tabId) {
        previousTabId = currentTabId;
        currentTabId = tabId;
    }
    // Update active styling
    navButtons.forEach(btn => btn.classList.remove('active'));
    if (clickedBtn) clickedBtn.classList.add('active');
    
    // Toggle visibility for "Live TV" / "Playlist" views
    const isLive = tabId === 'live-tv';
    const isPlaylist = tabId === 'playlist';
    const isEpg = tabId === 'epg';
    const isSettings = tabId === 'settings';
    const isMovies = tabId === 'movies';
    const isVod = tabId === 'vod';
    const isRecordingTab = tabId === 'recording';

    if (sidebar) sidebar.style.setProperty('display', isLive ? 'flex' : 'none', 'important');
    if (mainView) mainView.style.setProperty('display', isLive ? 'flex' : 'none', 'important');
    
    if (isLive) {
        setTimeout(() => {
            renderLiveEpgGrid();
            renderChannels();
        }, 50);
    }
    
    const playlistView = document.getElementById('playlist-view');
    if (playlistView) playlistView.style.setProperty('display', isPlaylist ? 'flex' : 'none', 'important');
    
    const epgView = document.getElementById('epg-view');
    if (epgView) epgView.style.setProperty('display', isEpg ? 'flex' : 'none', 'important');
    
    if (isEpg) renderFullEpg();
    
    const settingsView = document.getElementById('settings-view');
    if (settingsView) settingsView.style.setProperty('display', isSettings ? 'flex' : 'none', 'important');

    if (isSettings) renderSettings();

    const moviesView = document.getElementById('movies-view');
    if (moviesView) moviesView.style.setProperty('display', isMovies ? 'flex' : 'none', 'important');
    if (isMovies) renderMovies();

    const vodView = document.getElementById('vod-view');
    if (vodView) vodView.style.setProperty('display', isVod ? 'flex' : 'none', 'important');
    if (isVod) renderVod();

    const recordingView = document.getElementById('recording-view');
    if (recordingView) recordingView.style.setProperty('display', isRecordingTab ? 'flex' : 'none', 'important');
    if (isRecordingTab) renderRecordings();

    // Explicitly hide or restore the video player bounds instantly when switching views
    if (isLive && streamActive && playerContainer) {
        const rect = playerContainer.getBoundingClientRect();
        window.iptvAPI.updateMpvBounds({
            x: Math.round(rect.x),
            y: Math.round(rect.y),
            width: Math.round(rect.width),
            height: Math.round(rect.height)
        });
    } else {
        window.iptvAPI.updateMpvBounds({ x: 0, y: 0, width: 0, height: 0 });
    }

    setTimeout(() => {
        const targetBtn = clickedBtn || document.getElementById('btn-' + tabId);
        if (targetBtn) {
            targetBtn.focus();
        } else {
            const focusables = getFocusableElements();
            if (focusables.length > 0) {
                focusables[0].focus();
            }
        }
    }, 100);
}

document.getElementById('btn-live-tv').addEventListener('click', function() { if (!this.disabled) switchTab('live-tv', this); });
document.getElementById('btn-playlist').addEventListener('click', function() { switchTab('playlist', this); });
document.getElementById('btn-epg').addEventListener('click', function() { if (!this.disabled) switchTab('epg', this); });
document.getElementById('btn-settings').addEventListener('click', function() { if (!this.disabled) switchTab('settings', this); });
document.getElementById('btn-movies').addEventListener('click', function() { if (!this.disabled) switchTab('movies', this); });
document.getElementById('btn-vod').addEventListener('click', function() { if (!this.disabled) switchTab('vod', this); });
document.getElementById('btn-recording').addEventListener('click', function() { switchTab('recording', this); });

let laneObserver = null;
let tmdbObserver = null;
let loadedMovieLanes = {};
let loadedVodLanes = {};

function injectPremiumStyles() {
    if (document.getElementById('premium-catalog-styles')) {
        document.getElementById('premium-catalog-styles').remove();
    }
    const style = document.createElement('style');
    style.id = 'premium-catalog-styles';
    style.innerHTML = `
        /* Premium Global Purple to Black Seamless Background Gradient */
        body {
            background: linear-gradient(180deg, #3c096c 0%, #240046 35%, #10002b 70%, #03001e 100%) !important;
            background-attachment: fixed !important;
        }
        
        #top-header {
            background: rgba(14, 7, 24, 0.45) !important;
            backdrop-filter: blur(30px) !important;
            -webkit-backdrop-filter: blur(30px) !important;
            border-bottom: 1px solid rgba(187, 134, 252, 0.15) !important;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6) !important;
        }

        #movies-view, #vod-view, #playlist-view, #recording-view, #epg-view, #settings-view, #main-view {
            background: transparent !important;
            border: none !important;
        }
        
        #movies-view, #vod-view {
            padding: 40px 32px 32px 56px !important;
            box-sizing: border-box !important;
        }

        #live-bottom-half {
            background: rgba(10, 10, 15, 0.4) !important;
            backdrop-filter: blur(10px) !important;
            border-color: rgba(255,255,255,0.06) !important;
        }

        #movies-view::-webkit-scrollbar, #vod-view::-webkit-scrollbar, #episodes-modal *::-webkit-scrollbar, #premium-details-modal::-webkit-scrollbar {
            width: 12px !important;
            height: 12px !important;
        }
        #movies-view::-webkit-scrollbar-track, #vod-view::-webkit-scrollbar-track, #episodes-modal *::-webkit-scrollbar-track, #premium-details-modal::-webkit-scrollbar-track {
            background: #121212 !important;
            border-left: 1px solid rgba(255, 255, 255, 0.05) !important;
            border-top: 1px solid rgba(255, 255, 255, 0.05) !important;
        }
        #movies-view::-webkit-scrollbar-thumb, #vod-view::-webkit-scrollbar-thumb, #episodes-modal *::-webkit-scrollbar-thumb, #premium-details-modal::-webkit-scrollbar-thumb {
            background: #5c5c66 !important;
            border-radius: 6px !important;
            border: 3px solid #121212 !important;
        }
        #movies-view::-webkit-scrollbar-thumb:hover, #vod-view::-webkit-scrollbar-thumb:hover, #episodes-modal *::-webkit-scrollbar-thumb:hover, #premium-details-modal::-webkit-scrollbar-thumb:hover {
            background: #bb86fc !important;
        }

        /* Movie and Series Grid Cards (Premium Glass) */
        .catalog-folder-card {
            background: rgba(20, 16, 28, 0.5) !important;
            border: 1px solid rgba(187, 134, 252, 0.15) !important;
            border-radius: 16px !important;
            padding: 24px !important;
            cursor: pointer !important;
            backdrop-filter: blur(24px) !important;
            -webkit-backdrop-filter: blur(24px) !important;
            box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3) !important;
            transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1) !important;
            display: flex;
            flex-direction: column !important;
            align-items: center !important;
            justify-content: center !important;
            text-align: center !important;
            gap: 15px !important;
            aspect-ratio: 1 !important;
            box-sizing: border-box !important;
            font-family: 'Inter', sans-serif !important;
        }
        .catalog-folder-card:hover {
            transform: translateY(-6px) scale(1.03) !important;
            border-color: rgba(187, 134, 252, 0.45) !important;
            background: rgba(30, 20, 45, 0.25) !important;
            box-shadow: 0 16px 36px rgba(187, 134, 252, 0.15), 0 8px 24px rgba(0,0,0,0.5) !important;
        }
        .catalog-folder-icon {
            font-size: 3.2em !important;
            color: #bb86fc !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            filter: drop-shadow(0 4px 10px rgba(187, 134, 252, 0.3)) !important;
        }
        .catalog-folder-title {
            font-weight: 600 !important;
            font-size: 0.92rem !important;
            color: #ffffff !important;
            display: -webkit-box !important;
            -webkit-line-clamp: 2 !important;
            -webkit-box-orient: vertical !important;
            overflow: hidden !important;
            margin: 0 !important;
            line-height: 1.35 !important;
            letter-spacing: -0.01em !important;
            font-family: 'Inter', sans-serif !important;
        }
        .catalog-folder-count {
            font-size: 0.72rem !important;
            color: #a1a1aa !important;
            font-weight: 500 !important;
            font-family: 'Inter', sans-serif !important;
        }
        
        .catalog-card {
            background: rgba(20, 16, 28, 0.5) !important;
            border: 1px solid rgba(187, 134, 252, 0.1) !important;
            border-radius: 16px !important;
            overflow: hidden !important;
            cursor: pointer !important;
            backdrop-filter: blur(24px) !important;
            -webkit-backdrop-filter: blur(24px) !important;
            box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3) !important;
            transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1) !important;
            position: relative !important;
            display: flex;
            flex-direction: column !important;
            box-sizing: border-box !important;
            font-family: 'Inter', sans-serif !important;
        }
        .catalog-card:hover {
            transform: translateY(-6px) scale(1.03) !important;
            border-color: rgba(187, 134, 252, 0.45) !important;
            box-shadow: 0 16px 36px rgba(187, 134, 252, 0.15), 0 8px 24px rgba(0,0,0,0.5) !important;
            z-index: 2 !important;
        }
        .catalog-poster-wrapper {
            position: relative !important;
            width: 100% !important;
            padding-top: 150% !important;
            background: #09090b !important;
            overflow: hidden !important;
        }
        .catalog-poster {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: 100% !important;
            object-fit: cover !important;
            transition: opacity 0.3s ease !important;
        }
        .catalog-rating-badge {
            position: absolute !important;
            top: 8px !important;
            right: 8px !important;
            background: rgba(10, 10, 12, 0.85) !important;
            backdrop-filter: blur(8px) !important;
            -webkit-backdrop-filter: blur(8px) !important;
            border: 1px solid rgba(255, 193, 7, 0.35) !important;
            color: #ffc107 !important;
            font-weight: 700 !important;
            font-size: 0.72em !important;
            padding: 3px 7px !important;
            border-radius: 6px !important;
            z-index: 3 !important;
            display: flex !important;
            align-items: center !important;
            gap: 3px !important;
            box-shadow: 0 4px 10px rgba(0,0,0,0.5) !important;
        }
        .catalog-info {
            padding: 12px !important;
            display: flex !important;
            flex-direction: column !important;
            gap: 4px !important;
            background: rgba(15, 15, 20, 0.8) !important;
            border-top: 1px solid rgba(255,255,255,0.03) !important;
            flex-grow: 1 !important;
        }
        .catalog-title {
            margin: 0 !important;
            font-size: 0.85em !important;
            font-weight: 600 !important;
            color: #ffffff !important;
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            letter-spacing: -0.01em !important;
            font-family: 'Inter', sans-serif !important;
        }
        .catalog-meta {
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
            font-size: 0.72em !important;
            color: #a1a1aa !important;
            font-family: 'Inter', sans-serif !important;
        }
        .catalog-badge {
            background: rgba(187, 134, 252, 0.12) !important;
            color: var(--primary-accent) !important;
            padding: 2px 6px !important;
            border-radius: 4px !important;
            font-size: 0.8em !important;
            font-weight: 600 !important;
            border: 1px solid rgba(187, 134, 252, 0.2) !important;
        }

        /* Episodes Modal Screen (Frosted Glass Overlay Window) */
        #episodes-modal {
            position: fixed !important;
            top: 82px !important;
            left: 12px !important;
            width: calc(100vw - 24px) !important;
            height: calc(100vh - 94px) !important;
            background: rgba(10, 10, 12, 0.5) !important;
            backdrop-filter: blur(36px) !important;
            -webkit-backdrop-filter: blur(36px) !important;
            border: 1px solid rgba(255, 255, 255, 0.06) !important;
            border-radius: 16px !important;
            box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6) !important;
            z-index: 1000 !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
            display: flex;
        }
        #episodes-modal > div {
            background: transparent !important;
        }
        #episodes-modal div[style*="padding: 20px 25px"] {
            background: rgba(15, 15, 20, 0.4) !important;
            border-bottom: 1px solid rgba(255, 255, 255, 0.06) !important;
        }
        #seasons-sidebar-frame, #episodes-main-frame {
            background: rgba(255, 255, 255, 0.02) !important;
            border: 1px solid rgba(255, 255, 255, 0.04) !important;
            border-radius: 12px !important;
            box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.2) !important;
        }
        #seasons-sidebar-frame div[style*="background: rgba(0,0,0,0.2)"],
        #episodes-main-frame div[style*="background: rgba(0,0,0,0.2)"] {
            background: rgba(0, 0, 0, 0.15) !important;
            border-bottom: 1px solid rgba(255, 255, 255, 0.04) !important;
        }
        .season-tab {
            background: rgba(255, 255, 255, 0.02) !important;
            border: 1px solid rgba(255, 255, 255, 0.04) !important;
            color: #a1a1aa !important;
            border-radius: 8px !important;
            padding: 10px 14px !important;
            font-family: 'Inter', sans-serif !important;
            font-size: 0.85em !important;
            font-weight: 500 !important;
            transition: all 0.2s ease !important;
            text-align: left !important;
            cursor: pointer !important;
            outline: none !important;
        }
        .season-tab:hover {
            background: rgba(255, 255, 255, 0.06) !important;
            color: #ffffff !important;
            transform: translateX(3px) !important;
        }
        .season-tab.active {
            background: rgba(187, 134, 252, 0.12) !important;
            border-color: rgba(187, 134, 252, 0.25) !important;
            color: var(--primary-accent) !important;
            box-shadow: 0 4px 12px rgba(187, 134, 252, 0.15) !important;
            font-weight: 600 !important;
        }
        .episode-card {
            background: rgba(255, 255, 255, 0.02) !important;
            border: 1px solid rgba(255, 255, 255, 0.04) !important;
            border-radius: 10px !important;
            padding: 12px 16px !important;
            display: flex !important;
            align-items: center !important;
            gap: 12px !important;
            cursor: pointer !important;
            transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important;
            box-sizing: border-box !important;
            outline: none !important;
        }
        .episode-card:hover {
            background: rgba(255, 255, 255, 0.06) !important;
            border-color: rgba(187, 134, 252, 0.25) !important;
            transform: translateY(-2px) !important;
            box-shadow: 0 6px 16px rgba(0, 0, 0, 0.3) !important;
        }
        .episode-num {
            font-size: 1.1em !important;
            font-weight: 700 !important;
            color: var(--primary-accent) !important;
            min-width: 24px !important;
        }
        .episode-name {
            font-size: 0.85em !important;
            font-weight: 500 !important;
            color: #e4e4e7 !important;
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
        }

        /* Netflix-style Details Modal Screen (Frosted Glass Overlay Window) */
        #premium-details-modal {
            position: fixed !important;
            top: 82px !important;
            left: 12px !important;
            width: calc(100vw - 24px) !important;
            height: calc(100vh - 94px) !important;
            background: rgba(10, 10, 12, 0.5) !important;
            backdrop-filter: blur(36px) !important;
            -webkit-backdrop-filter: blur(36px) !important;
            border: 1px solid rgba(255, 255, 255, 0.06) !important;
            border-radius: 16px !important;
            box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6) !important;
            z-index: 1001 !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
            display: flex;
        }
        #premium-details-modal > div {
            background: transparent !important;
            scrollbar-width: none !important;
        }
        #premium-details-modal > div::-webkit-scrollbar {
            display: none !important;
        }
        #premium-details-modal div[style*="background: #181818"] {
            background: rgba(15, 15, 20, 0.4) !important;
        }
        #details-backdrop-banner div[style*="background: linear-gradient(to top, #181818"] {
            background: linear-gradient(to top, #0c0c0e 0%, rgba(12, 12, 14, 0.8) 40%, rgba(12, 12, 14, 0) 100%) !important;
        }
        #details-title {
            font-size: 2.2rem !important;
            font-family: 'Outfit', 'Inter', sans-serif !important;
            font-weight: 800 !important;
            color: #ffffff !important;
            text-shadow: 0 2px 12px rgba(0,0,0,0.8) !important;
        }
        #details-overview {
            font-size: 0.92rem !important;
            color: #a1a1aa !important;
            line-height: 1.6 !important;
        }
        #premium-details-modal div[style*="background: rgba(255,255,255,0.02)"] {
            background: rgba(255, 255, 255, 0.02) !important;
            border: 1px solid rgba(255, 255, 255, 0.04) !important;
            border-radius: 12px !important;
            padding: 20px !important;
        }
        #details-season-select {
            background: rgba(255, 255, 255, 0.03) !important;
            color: #ffffff !important;
            border: 1px solid rgba(255, 255, 255, 0.06) !important;
            padding: 6px 14px !important;
            border-radius: 8px !important;
            outline: none !important;
            cursor: pointer !important;
            font-family: 'Inter', sans-serif !important;
            font-size: 0.85em !important;
            transition: all 0.25s ease !important;
        }
        #details-season-select:hover {
            background: rgba(255, 255, 255, 0.06) !important;
            border-color: rgba(255, 255, 255, 0.12) !important;
        }
        #details-season-select:focus {
            border-color: var(--primary-accent) !important;
            box-shadow: 0 0 10px rgba(187, 134, 252, 0.15) !important;
        }
        
        .details-episode-card {
            background: rgba(255, 255, 255, 0.02) !important;
            border: 1px solid rgba(255, 255, 255, 0.04) !important;
            border-radius: 12px !important;
            overflow: hidden !important;
            cursor: pointer !important;
            transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important;
            display: flex !important;
            flex-direction: column !important;
            box-sizing: border-box !important;
        }
        .details-episode-card:hover {
            transform: translateY(-4px) !important;
            border-color: rgba(187, 134, 252, 0.25) !important;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4) !important;
        }
        .details-episode-thumbnail-wrapper {
            position: relative !important;
            width: 100% !important;
            padding-top: 56.25% !important;
            background: rgba(0, 0, 0, 0.3) !important;
            overflow: hidden !important;
            border-bottom: 1px solid rgba(255, 255, 255, 0.04) !important;
        }
        .details-episode-thumbnail {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: 100% !important;
            object-fit: cover !important;
        }
        .details-episode-play-overlay {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: 100% !important;
            background: rgba(0, 0, 0, 0.4) !important;
            opacity: 0 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            transition: all 0.25s ease !important;
        }
        .details-episode-card:hover .details-episode-play-overlay {
            opacity: 1 !important;
        }
        .details-episode-play-icon {
            background: var(--primary-accent) !important;
            color: #000000 !important;
            border-radius: 50% !important;
            width: 42px !important;
            height: 42px !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            box-shadow: 0 4px 12px rgba(187, 134, 252, 0.4) !important;
            transform: scale(0.9) !important;
            transition: all 0.25s ease !important;
        }
        .details-episode-card:hover .details-episode-play-icon {
            transform: scale(1) !important;
        }
        .details-episode-info {
            padding: 12px !important;
            display: flex !important;
            flex-direction: column !important;
            gap: 6px !important;
        }
        .details-episode-title-row {
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
            gap: 10px !important;
        }
        .details-episode-title {
            margin: 0 !important;
            font-size: 0.85rem !important;
            font-weight: 600 !important;
            color: #ffffff !important;
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            flex-grow: 1 !important;
        }
        .details-episode-num-badge {
            background: rgba(187, 134, 252, 0.12) !important;
            color: var(--primary-accent) !important;
            padding: 1px 5px !important;
            border-radius: 4px !important;
            font-size: 0.72em !important;
            font-weight: 600 !important;
            border: 1px solid rgba(187, 134, 252, 0.2) !important;
        }
        .details-episode-overview {
            margin: 0 !important;
            font-size: 0.75rem !important;
            color: #a1a1aa !important;
            line-height: 1.45 !important;
            display: -webkit-box !important;
            -webkit-line-clamp: 3 !important;
            -webkit-box-orient: vertical !important;
            overflow: hidden !important;
        }

        /* High-contrast floating close & back buttons inside dynamic catalog elements */
        #premium-details-close, #episodes-modal-close, .category-back-btn {
            background: rgba(10, 10, 12, 0.85) !important;
            border: 1px solid var(--primary-accent) !important;
            color: #ffffff !important;
            box-shadow: 0 4px 14px rgba(187, 134, 252, 0.2) !important;
            font-family: 'Inter', sans-serif !important;
            font-weight: 600 !important;
            border-radius: 8px !important;
            transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important;
        }
        #premium-details-close:hover, #episodes-modal-close:hover, .category-back-btn:hover {
            background: linear-gradient(135deg, #bb86fc, #905cfc) !important;
            color: #000000 !important;
            border-color: #ffffff !important;
            box-shadow: 0 6px 20px rgba(187, 134, 252, 0.45) !important;
            transform: scale(1.04) !important;
        }

        .catalog-progress-bar-wrapper {
            position: absolute !important;
            bottom: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: 4px !important;
            background: rgba(255, 255, 255, 0.2) !important;
            z-index: 4 !important;
        }
        .catalog-progress-bar {
            height: 100% !important;
            background: #bb86fc !important;
            width: 0% !important;
        }
        .catalog-watched-badge {
            position: absolute !important;
            top: 8px !important;
            left: 8px !important;
            background: rgba(46, 125, 50, 0.95) !important;
            backdrop-filter: blur(8px) !important;
            -webkit-backdrop-filter: blur(8px) !important;
            border: 1px solid rgba(76, 175, 80, 0.5) !important;
            color: #fff !important;
            font-weight: bold !important;
            font-size: 0.72em !important;
            padding: 3px 6px !important;
            border-radius: 6px !important;
            z-index: 3 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            box-shadow: 0 4px 10px rgba(0,0,0,0.5) !important;
        }

        /* Playback Settings Premium Toggle Switch */
        .autoplay-toggle-container input:checked + .slider {
            background-color: #bb86fc !important;
        }
        .autoplay-toggle-container .slider:before {
            position: absolute;
            content: "";
            height: 16px;
            width: 16px;
            left: 4px;
            bottom: 4px;
            background-color: white;
            transition: .3s;
            border-radius: 50%;
        }
        .autoplay-toggle-container input:checked + .slider:before {
            transform: translateX(22px);
        }

        /* Playlist Tab Styles */
        .playlist-tab-btn {
            font-family: 'Inter', sans-serif !important;
            transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important;
        }
        .playlist-tab-btn:hover {
            color: #ffffff !important;
            background: rgba(255, 255, 255, 0.05) !important;
        }
        .playlist-tab-btn.active {
            color: #ffffff !important;
            background: rgba(187, 134, 252, 0.15) !important;
            border: 1px solid rgba(187, 134, 252, 0.3) !important;
            box-shadow: 0 4px 12px rgba(187, 134, 252, 0.15) !important;
        }
    `;
    document.head.appendChild(style);
}

function initTmdbObserver() {
    if (tmdbObserver) return;
    
    let requestQueue = [];
    let isProcessingQueue = false;
    
    async function processQueue() {
        if (requestQueue.length === 0) {
            isProcessingQueue = false;
            return;
        }
        isProcessingQueue = true;
        const task = requestQueue.shift();
        try {
            await task();
        } catch (e) {
            console.error('[TMDB QUEUE] Scraper task failed:', e);
        }
        setTimeout(processQueue, 150);
    }
    
    tmdbObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const card = entry.target;
                const title = card.dataset.title;
                const type = card.dataset.type;
                
                if (title && card.dataset.tmdbLoaded !== 'true') {
                    requestQueue.push(async () => {
                        if (card.dataset.tmdbLoaded === 'true') return;
                        
                        const tmdbType = type === 'series' ? 'tv' : 'movie';
                        const tmdbId = card.dataset.tmdbId;
                        let res;
                        
                        if (tmdbId) {
                            console.log(`[TMDB] Live viewport scraping by ID: "${tmdbId}" for "${title}" (${type})`);
                            res = await window.iptvAPI.fetchTmdbById({ tmdbId, type: tmdbType });
                        } else {
                            console.log(`[TMDB] Live viewport scraping by Title: "${title}" (${type})`);
                            res = await window.iptvAPI.fetchTmdbByTitle({ title, type: tmdbType });
                        }
                        
                        if (res && !res.error) {
                            card.dataset.tmdbLoaded = 'true';
                            card.dataset.tmdbData = JSON.stringify(res);
                            
                            if (res.poster_path) {
                                const img = card.querySelector('.catalog-poster');
                                if (img) {
                                    img.src = res.poster_path;
                                    img.style.opacity = '1';
                                }
                            }
                            
                            if (res.vote_average && res.vote_average > 0) {
                                const wrapper = card.querySelector('.catalog-poster-wrapper');
                                if (wrapper) {
                                    const badge = document.createElement('div');
                                    badge.className = 'catalog-rating-badge';
                                    badge.innerHTML = `★ ${parseFloat(res.vote_average).toFixed(1)}`;
                                    wrapper.appendChild(badge);
                                }
                            }
                        }
                    });
                    
                    if (!isProcessingQueue) {
                        processQueue();
                    }
                }
                tmdbObserver.unobserve(card);
            }
        });
    }, {
        rootMargin: '0px 200px 0px 200px'
    });
}

async function getEpisodesForSeries(streamInfo) {
    try {
        if (!streamInfo) return [];
        const playlistId = streamInfo.playlistId;
        if (!playlistId && savedPlaylists.length === 0) return [];
        const playlist = savedPlaylists.find(p => p.id.toString() === (playlistId ? playlistId.toString() : '')) || savedPlaylists[0];
        if (!playlist) return [];

        let episodes = [];
        
        if (playlist.epg && playlist.epg.startsWith('stalker:')) {
            const url = playlist.source;
            const mac = playlist.epg.substring(8);
            const seriesId = streamInfo.tvg_id || streamInfo.id;
            episodes = await window.iptvAPI.getStalkerEpisodes({ url, mac, seriesId });
        } else if (playlist.epg && playlist.epg.startsWith('xtream-epg:')) {
            if (playlist.source && playlist.source.startsWith('xtream-credentials:')) {
                const credParts = playlist.source.substring(19).split('|');
                const server = credParts[0];
                const username = credParts[1];
                const password = credParts[2];
                const seriesId = streamInfo.tvg_id || streamInfo.id;
                episodes = await window.iptvAPI.getXtreamEpisodes({ server, username, password, seriesId });
            }
        } else {
            const parsedClicked = parseM3uSeriesName(streamInfo.seriesTitle || streamInfo.title || streamInfo.name || '');
            if (playlist.channels) {
                playlist.channels.forEach(item => {
                    if (item.disabled) return;
                    if (item.type === 'series' || item.type === 'vod') {
                        const parsedItem = parseM3uSeriesName(item.name || item.title);
                        if (parsedItem.seriesTitle.toLowerCase() === parsedClicked.seriesTitle.toLowerCase()) {
                            episodes.push({
                                id: item.id || item.tvg_id || item.tvgId,
                                name: item.name || item.title,
                                season: parsedItem.season,
                                episodeNum: parsedItem.episode,
                                url: item.url,
                                logo: item.logo || streamInfo.logo
                            });
                        }
                    }
                });
            }
        }
        
        // Sort episodes by season then episode number
        episodes.sort((a, b) => {
            const aS = parseInt(a.season || 1);
            const bS = parseInt(b.season || 1);
            if (aS !== bS) return aS - bS;
            return parseInt(a.episodeNum || 1) - parseInt(b.episodeNum || 1);
        });
        
        return episodes;
    } catch (e) {
        console.error('[AUTOPLAY] Error fetching series episodes:', e);
        return [];
    }
}

let autoplayInterval = null;
let autoplayCountdown = 15;
let nextEpisodeToPlay = null;

function hideAutoplayOverlay() {
    if (autoplayInterval) {
        clearInterval(autoplayInterval);
        autoplayInterval = null;
    }
    const overlay = document.getElementById('autoplay-countdown-overlay');
    if (overlay) overlay.style.display = 'none';
}

function showAutoplayOverlay(nextEp) {
    if (!window.isAutoplayEnabled) return;
    
    hideAutoplayOverlay();
    nextEpisodeToPlay = nextEp;
    
    const overlay = document.getElementById('autoplay-countdown-overlay');
    const titleEl = document.getElementById('autoplay-next-title');
    const descEl = document.getElementById('autoplay-countdown-text');
    
    if (!overlay || !titleEl || !descEl) return;
    
    // Set next episode display title
    let displayTitle = `S${nextEp.season}E${nextEp.episodeNum}`;
    if (nextEp.name) {
        const playlist = savedPlaylists.find(p => p.id.toString() === (window.currentPlaybackChannel.playlistId ? window.currentPlaybackChannel.playlistId.toString() : ''));
        let cleanName = nextEp.name;
        if (playlist && !playlist.epg?.startsWith('stalker:')) {
            const cleanPrefix = new RegExp(`^.*?\\b(s\\d+e\\d+|\\d+x\\d+|episode\\s*\\d+|ep\\s*\\d+)\\b\\s*[-_.:]?\\s*`, 'i');
            cleanName = nextEp.name.replace(cleanPrefix, '').trim();
        }
        displayTitle += ` - ${cleanName || nextEp.name}`;
    }
    
    titleEl.textContent = displayTitle;
    titleEl.setAttribute('title', displayTitle);
    
    autoplayCountdown = 15; // 15 seconds countdown
    descEl.textContent = `Playing in ${autoplayCountdown} seconds...`;
    overlay.style.display = 'block';
    
    autoplayInterval = setInterval(() => {
        autoplayCountdown--;
        if (autoplayCountdown <= 0) {
            hideAutoplayOverlay();
            playNextEpisode();
        } else {
            descEl.textContent = `Playing in ${autoplayCountdown} seconds...`;
        }
    }, 1000);
}

async function playNextEpisode() {
    if (!nextEpisodeToPlay || !window.currentPlaybackChannel) return;
    
    const nextEp = nextEpisodeToPlay;
    nextEpisodeToPlay = null;
    hideAutoplayOverlay();
    
    console.log('[AUTOPLAY] Autoplaying next episode:', nextEp);
    
    let epDisplayName = nextEp.name || `Episode ${nextEp.episodeNum}`;
    const playlist = savedPlaylists.find(p => p.id.toString() === (window.currentPlaybackChannel.playlistId ? window.currentPlaybackChannel.playlistId.toString() : ''));
    if (nextEp.name && playlist && !playlist.epg?.startsWith('stalker:')) {
        const cleanPrefix = new RegExp(`^.*?\\b(s\\d+e\\d+|\\d+x\\d+|episode\\s*\\d+|ep\\s*\\d+)\\b\\s*[-_.:]?\\s*`, 'i');
        const cleaned = nextEp.name.replace(cleanPrefix, '').trim();
        if (cleaned) epDisplayName = cleaned;
    }
    
    const nextChannel = {
        title: `${window.currentPlaybackChannel.seriesTitle} - S${nextEp.season}E${nextEp.episodeNum} - ${epDisplayName}`,
        url: nextEp.url,
        logo: window.currentPlaybackChannel.logo,
        playlistId: window.currentPlaybackChannel.playlistId,
        type: 'episode',
        tmdbId: window.currentPlaybackChannel.tmdbId,
        seriesTitle: window.currentPlaybackChannel.seriesTitle,
        season: nextEp.season,
        episodeNum: nextEp.episodeNum,
        tmdbData: window.currentPlaybackChannel.tmdbData
    };
    
    embedStream(nextChannel);
    showToast(`Autoplaying: S${nextEp.season}E${nextEp.episodeNum}`);
}

function findNextEpisode() {
    if (!window.currentPlaybackChannel || window.currentPlaybackChannel.type !== 'episode' || !window.currentPlayingSeriesEpisodes || window.currentPlayingSeriesEpisodes.length === 0) {
        return null;
    }
    
    const currentSeason = parseInt(window.currentPlaybackChannel.season || 1);
    const currentEpNum = parseInt(window.currentPlaybackChannel.episodeNum || 1);
    
    // Find the next episode in the sorted list
    return window.currentPlayingSeriesEpisodes.find(ep => {
        const epS = parseInt(ep.season || 1);
        const epNum = parseInt(ep.episodeNum || 1);
        if (epS > currentSeason) return true;
        if (epS === currentSeason && epNum > currentEpNum) return true;
        return false;
    });
}


function parseM3uSeriesName(title) {
    let name = (title || '').trim();
    
    // Pattern 1: S01E02 or similar
    let match = name.match(/^(.*?)\s*[-_.]?\s*s(\d+)\s*[-_.]?\s*e(\d+)/i);
    if (match) {
        return {
            seriesTitle: match[1].replace(/[-_.\s]+$/, '').trim(),
            season: parseInt(match[2]),
            episode: parseInt(match[3])
        };
    }
    
    // Pattern 2: Season 1 Episode 2
    match = name.match(/^(.*?)\s+season\s+(\d+)\s+episode\s+(\d+)/i);
    if (match) {
        return {
            seriesTitle: match[1].trim(),
            season: parseInt(match[2]),
            episode: parseInt(match[3])
        };
    }

    // Pattern 3: Ep 1 or Episode 1
    match = name.match(/^(.*?)\s+(?:ep|episode)\s*(\d+)/i);
    if (match) {
        return {
            seriesTitle: match[1].trim(),
            season: 1, // Fallback to season 1
            episode: parseInt(match[2])
        };
    }
    
    // Pattern 4: 1x02 (season 1, episode 2)
    match = name.match(/^(.*?)\s+(\d+)x(\d+)/i);
    if (match) {
        return {
            seriesTitle: match[1].trim(),
            season: parseInt(match[2]),
            episode: parseInt(match[3])
        };
    }
    
    // Pattern 5: Ending with S01 or Season 1
    match = name.match(/^(.*?)\s*[-_.]?\s*s(\d+)$/i);
    if (match) {
        return {
            seriesTitle: match[1].replace(/[-_.\s]+$/, '').trim(),
            season: parseInt(match[2]),
            episode: 1
        };
    }
    
    return {
        seriesTitle: name,
        season: 1,
        episode: 1
    };
}

async function openMovieDetailsModal(streamInfo) {
    const modal = document.getElementById('premium-details-modal');
    if (!modal) return;
    
    window.activeDetailsStreamInfo = streamInfo;
    
    document.getElementById('details-title').textContent = streamInfo.title;
    document.getElementById('details-rating').textContent = '★ --';
    document.getElementById('details-year').textContent = '----';
    document.getElementById('details-duration').textContent = '--';
    document.getElementById('details-type-badge').textContent = streamInfo.type === 'series' ? 'Series' : 'Movie';
    document.getElementById('details-overview').textContent = 'Scraping details...';
    document.getElementById('details-genres').textContent = '-';
    document.getElementById('details-crew').textContent = '-';
    document.getElementById('details-cast').textContent = '-';
    
    const bannerUrl = streamInfo.logo || 'assets/logo.ico';
    document.getElementById('details-backdrop-banner').style.backgroundImage = `linear-gradient(to top, #181818, rgba(24, 24, 24, 0.7) 40%, rgba(24, 24, 24, 0) 80%), url(${bannerUrl})`;
    
    const playBtn = document.getElementById('details-play-btn');
    const resumeBtn = document.getElementById('details-resume-btn');
    const episodesSection = document.getElementById('details-episodes-section');
    
    episodesSection.style.display = 'none';
    playBtn.style.display = 'flex';
    if (resumeBtn) resumeBtn.style.display = 'none';
    
    playBtn.replaceWith(playBtn.cloneNode(true));
    if (resumeBtn) resumeBtn.replaceWith(resumeBtn.cloneNode(true));
    const newPlayBtn = document.getElementById('details-play-btn');
    const newResumeBtn = document.getElementById('details-resume-btn');
    
    let savedProgress = null;
    const progId = getPlaybackProgressId(streamInfo);
    
    newPlayBtn.addEventListener('click', async () => {
        modal.style.display = 'none';
        switchTab('live-tv', document.getElementById('btn-live-tv'));
        embedStream(streamInfo);
    });
    
    if (newResumeBtn) {
        newResumeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
            switchTab('live-tv', document.getElementById('btn-live-tv'));
            if (savedProgress) {
                window.pendingResumeSeekTime = savedProgress.position;
            }
            embedStream(streamInfo);
        });
    }

    if (progId && streamInfo.type !== 'series') {
        window.iptvAPI.getPlaybackProgress(progId).then(saved => {
            if (saved && saved.position > 0 && !saved.completed) {
                savedProgress = saved;
                if (newResumeBtn) newResumeBtn.style.display = 'flex';
            }
        });
    }
    
    modal.style.display = 'flex';
    
    let tmdbData = null;
    if (streamInfo.tmdbData) {
        tmdbData = streamInfo.tmdbData;
    } else {
        const type = streamInfo.type === 'series' ? 'tv' : 'movie';
        let res;
        if (streamInfo.tmdbId) {
            res = await window.iptvAPI.fetchTmdbById({ tmdbId: streamInfo.tmdbId, type });
        } else {
            res = await window.iptvAPI.fetchTmdbByTitle({ title: streamInfo.title, type });
        }
        if (res && !res.error) {
            tmdbData = res;
        }
    }
    
    if (tmdbData) {
        if (tmdbData.logo_path) {
            document.getElementById('details-title').innerHTML = `<img src="${tmdbData.logo_path}" alt="${(tmdbData.title || streamInfo.title).replace(/"/g, '&quot;')}" style="max-height: 120px; max-width: 100%; object-fit: contain; filter: drop-shadow(0 4px 15px rgba(0,0,0,0.8));">`;
        } else if (tmdbData.title) {
            document.getElementById('details-title').textContent = tmdbData.title;
        }

        if (tmdbData.backdrop_path) {
            document.getElementById('details-backdrop-banner').style.backgroundImage = `linear-gradient(to top, #181818, rgba(24, 24, 24, 0.7) 40%, rgba(24, 24, 24, 0) 80%), url(${tmdbData.backdrop_path})`;
        }
        
        if (tmdbData.vote_average) {
            document.getElementById('details-rating').textContent = `★ ${parseFloat(tmdbData.vote_average).toFixed(1)}`;
        }
        
        const releaseDate = tmdbData.release_date || tmdbData.first_air_date;
        if (releaseDate) {
            document.getElementById('details-year').textContent = new Date(releaseDate).getFullYear();
        }
        
        if (tmdbData.runtime) {
            document.getElementById('details-duration').textContent = `${tmdbData.runtime}m`;
        } else if (tmdbData.episode_run_time && tmdbData.episode_run_time.length > 0) {
            document.getElementById('details-duration').textContent = `${tmdbData.episode_run_time[0]}m`;
        }
        
        document.getElementById('details-overview').textContent = tmdbData.overview || 'No synopsis available.';
        
        if (tmdbData.genres && tmdbData.genres.length > 0) {
            document.getElementById('details-genres').textContent = tmdbData.genres.map(g => g.name).join(', ');
        }
        
        if (tmdbData.credits) {
            const crew = tmdbData.credits.crew || [];
            const directors = crew.filter(c => c.job === 'Director').map(c => c.name);
            if (directors.length > 0) {
                document.getElementById('details-crew').textContent = directors.join(', ');
            } else {
                const creators = tmdbData.created_by || [];
                if (creators.length > 0) {
                    document.getElementById('details-crew').textContent = creators.map(c => c.name).join(', ');
                }
            }
            
            const cast = tmdbData.credits.cast || [];
            if (cast.length > 0) {
                document.getElementById('details-cast').textContent = cast.slice(0, 5).map(c => c.name).join(', ');
            }
        }
    } else {
        document.getElementById('details-overview').textContent = 'No detailed information found on TMDB.';
    }
    
    if (streamInfo.type === 'series') {
        episodesSection.style.display = 'block';
        
        const epGrid = document.getElementById('details-episodes-grid');
        const seasonSelect = document.getElementById('details-season-select');
        
        epGrid.innerHTML = '<div style="color: #bb86fc; padding: 20px; font-weight: bold; font-family: \'Outfit\', sans-serif;">Loading episodes...</div>';
        seasonSelect.innerHTML = '';
        
        // Re-clone play button to support series-specific first episode playback
        const seriesPlayBtn = document.getElementById('details-play-btn');
        seriesPlayBtn.replaceWith(seriesPlayBtn.cloneNode(true));
        const finalPlayBtn = document.getElementById('details-play-btn');
        
        try {
            const playlist = savedPlaylists.find(p => p.id.toString() === streamInfo.playlistId.toString());
            let episodes = [];
            
            if (playlist && playlist.epg && playlist.epg.startsWith('stalker:')) {
                const url = playlist.source;
                const mac = playlist.epg.substring(8);
                const seriesId = streamInfo.tvg_id;
                
                episodes = await window.iptvAPI.getStalkerEpisodes({ url, mac, seriesId });
            } else {
                // Group related flat M3U series channels
                const parsedClicked = parseM3uSeriesName(streamInfo.title);
                if (playlist && playlist.channels) {
                    playlist.channels.forEach(item => {
                        if (item.disabled) return;
                        if (item.type === 'series' || item.type === 'vod') {
                            const parsedItem = parseM3uSeriesName(item.name || item.title);
                            if (parsedItem.seriesTitle.toLowerCase() === parsedClicked.seriesTitle.toLowerCase()) {
                                episodes.push({
                                    id: item.id || item.tvg_id || item.tvgId,
                                    name: item.name || item.title,
                                    season: parsedItem.season,
                                    episodeNum: parsedItem.episode,
                                    url: item.url,
                                    logo: item.logo || streamInfo.logo
                                });
                            }
                        }
                    });
                }
                
                // Fallback: clicked item itself is the only episode
                if (episodes.length === 0) {
                    episodes.push({
                        id: streamInfo.tvg_id || streamInfo.id,
                        name: streamInfo.title,
                        season: 1,
                        episodeNum: 1,
                        url: streamInfo.url,
                        logo: streamInfo.logo
                    });
                }
            }
            
            if (!episodes || episodes.length === 0) {
                epGrid.innerHTML = '<div style="color: #888; padding: 20px;">No episodes found.</div>';
                
                // Default click to play the whole series details entry
                finalPlayBtn.addEventListener('click', async () => {
                    modal.style.display = 'none';
                    switchTab('live-tv', document.getElementById('btn-live-tv'));
                    
                    const progId = getPlaybackProgressId(streamInfo);
                    if (progId) {
                        const saved = await window.iptvAPI.getPlaybackProgress(progId);
                        if (saved && saved.position > 0 && !saved.completed) {
                            showResumePromptModal(saved.position, (resume) => {
                                if (resume) {
                                    window.pendingResumeSeekTime = saved.position;
                                }
                                embedStream(streamInfo);
                            });
                            return;
                        }
                    }
                    embedStream(streamInfo);
                });
                return;
            }
            
            const seasons = {};
            episodes.forEach(ep => {
                const sNum = ep.season || 1;
                if (!seasons[sNum]) seasons[sNum] = [];
                seasons[sNum].push(ep);
            });
            
            Object.keys(seasons).forEach(sNum => {
                seasons[sNum].sort((a, b) => parseInt(a.episodeNum || 0) - parseInt(b.episodeNum || 0));
            });
            
            const sortedSeasons = Object.keys(seasons).sort((a, b) => parseInt(a) - parseInt(b));
            
            // Reconfigure Play Button to play the first episode of the first season
            const firstSeason = sortedSeasons[0];
            const firstEp = seasons[firstSeason] ? seasons[firstSeason][0] : null;
            if (firstEp) {
                let firstEpDisplayName = firstEp.name || `Episode ${firstEp.episodeNum}`;
                if (firstEp.name && playlist && !playlist.epg?.startsWith('stalker:')) {
                    const cleanPrefix = new RegExp(`^.*?\\b(s\\d+e\\d+|\\d+x\\d+|episode\\s*\\d+|ep\\s*\\d+)\\b\\s*[-_.:]?\\s*`, 'i');
                    const cleaned = firstEp.name.replace(cleanPrefix, '').trim();
                    if (cleaned) firstEpDisplayName = cleaned;
                }
                finalPlayBtn.addEventListener('click', async () => {
                    modal.style.display = 'none';
                    switchTab('live-tv', document.getElementById('btn-live-tv'));
                    
                    const episodeChannel = {
                        title: `${streamInfo.title} - S${firstSeason}E${firstEp.episodeNum} - ${firstEpDisplayName}`,
                        url: firstEp.url,
                        logo: streamInfo.logo,
                        playlistId: streamInfo.playlistId,
                        type: 'episode',
                        tmdbId: streamInfo.tmdbId,
                        seriesTitle: streamInfo.title,
                        season: firstSeason,
                        episodeNum: firstEp.episodeNum,
                        tmdbData: tmdbData
                    };
                    
                    const progId = getPlaybackProgressId(episodeChannel);
                    if (progId) {
                        const saved = await window.iptvAPI.getPlaybackProgress(progId);
                        if (saved && saved.position > 0 && !saved.completed) {
                            showResumePromptModal(saved.position, (resume) => {
                                if (resume) {
                                    window.pendingResumeSeekTime = saved.position;
                                }
                                embedStream(episodeChannel);
                            });
                            return;
                        }
                    }
                    embedStream(episodeChannel);
                });
            } else {
                finalPlayBtn.addEventListener('click', async () => {
                    modal.style.display = 'none';
                    switchTab('live-tv', document.getElementById('btn-live-tv'));
                    
                    const progId = getPlaybackProgressId(streamInfo);
                    if (progId) {
                        const saved = await window.iptvAPI.getPlaybackProgress(progId);
                        if (saved && saved.position > 0 && !saved.completed) {
                            showResumePromptModal(saved.position, (resume) => {
                                if (resume) {
                                    window.pendingResumeSeekTime = saved.position;
                                }
                                embedStream(streamInfo);
                            });
                            return;
                        }
                    }
                    embedStream(streamInfo);
                });
            }
            
            const renderSeason = async (seasonNum) => {
                epGrid.innerHTML = '';
                const eps = seasons[seasonNum] || [];
                const cardsMap = {};
                
                eps.forEach(ep => {
                    const card = document.createElement('div');
                    card.className = 'details-episode-card';
                    card.style.flex = '1 1 calc(33.33% - 10px)';
                    card.style.minWidth = '220px';
                    
                    let epDisplayName = ep.name || `Episode ${ep.episodeNum}`;
                    if (ep.name && playlist && !playlist.epg?.startsWith('stalker:')) {
                        const cleanPrefix = new RegExp(`^.*?\\b(s\\d+e\\d+|\\d+x\\d+|episode\\s*\\d+|ep\\s*\\d+)\\b\\s*[-_.:]?\\s*`, 'i');
                        const cleaned = ep.name.replace(cleanPrefix, '').trim();
                        if (cleaned) epDisplayName = cleaned;
                    }
                    
                    card.innerHTML = `
                        <div class="details-episode-thumbnail-wrapper">
                            <div style="position: absolute; top:0; left:0; width:100%; height:100%; display:flex; align-items:center; justify-content:center; background: rgba(255,255,255,0.03); color: #bb86fc; font-size: 1.8em; font-weight: bold; font-family: 'Outfit', sans-serif;">
                                E${ep.episodeNum}
                            </div>
                            <img class="details-episode-thumbnail" src="" style="display: none;" onerror="this.style.display='none';">
                            <div class="details-episode-play-overlay">
                                <div class="details-episode-play-icon">
                                    <svg viewBox="0 0 24 24" style="width: 24px; height: 24px; fill: currentColor;"><path d="M8 5v14l11-7z"/></svg>
                                </div>
                            </div>
                        </div>
                        <div class="details-episode-info">
                            <div class="details-episode-title-row">
                                <h4 class="details-episode-title" title="${epDisplayName}">${epDisplayName}</h4>
                                <span class="details-episode-num-badge">E${ep.episodeNum}</span>
                            </div>
                            <p class="details-episode-overview">Episode details loading...</p>
                        </div>
                    `;
                    
                    card.addEventListener('click', async () => {
                        modal.style.display = 'none';
                        switchTab('live-tv', document.getElementById('btn-live-tv'));
                        
                        const episodeChannel = {
                            title: `${streamInfo.title} - S${seasonNum}E${ep.episodeNum} - ${epDisplayName}`,
                            url: ep.url,
                            logo: streamInfo.logo,
                            playlistId: streamInfo.playlistId,
                            type: 'episode',
                            tmdbId: streamInfo.tmdbId,
                            seriesTitle: streamInfo.title,
                            season: seasonNum,
                            episodeNum: ep.episodeNum,
                            tmdbData: tmdbData
                        };
                        
                        const progId = getPlaybackProgressId(episodeChannel);
                        if (progId) {
                            const saved = await window.iptvAPI.getPlaybackProgress(progId);
                            if (saved && saved.position > 0 && !saved.completed) {
                                showResumePromptModal(saved.position, (resume) => {
                                    if (resume) {
                                        window.pendingResumeSeekTime = saved.position;
                                    }
                                    embedStream(episodeChannel);
                                });
                                return;
                            }
                        }
                        embedStream(episodeChannel);
                    });
                    
                    epGrid.appendChild(card);
                    cardsMap[ep.episodeNum] = card;
                });
                
                // Asynchronously request TMDB season details
                if (tmdbData && tmdbData.tmdbId) {
                    try {
                        console.log(`[UI] Requesting TMDB metadata for TV ID: ${tmdbData.tmdbId}, Season: ${seasonNum}`);
                        const tmdbSeason = await window.iptvAPI.fetchTmdbSeasonEpisodes({
                            tmdbId: tmdbData.tmdbId,
                            seasonNumber: seasonNum
                        });
                        
                        if (tmdbSeason && tmdbSeason.episodes && !tmdbSeason.error) {
                            tmdbSeason.episodes.forEach(tmdbEp => {
                                const card = cardsMap[tmdbEp.episode_number];
                                if (card) {
                                    if (tmdbEp.name) {
                                        card.querySelector('.details-episode-title').textContent = tmdbEp.name;
                                        card.querySelector('.details-episode-title').setAttribute('title', tmdbEp.name);
                                    }
                                    if (tmdbEp.overview) {
                                        card.querySelector('.details-episode-overview').textContent = tmdbEp.overview;
                                    } else {
                                        card.querySelector('.details-episode-overview').textContent = 'No description available.';
                                    }
                                    if (tmdbEp.still_path) {
                                        const img = card.querySelector('.details-episode-thumbnail');
                                        img.src = tmdbEp.still_path;
                                        img.style.display = 'block';
                                    }
                                }
                            });
                            
                            eps.forEach(ep => {
                                const card = cardsMap[ep.episodeNum];
                                if (card) {
                                    const overview = card.querySelector('.details-episode-overview');
                                    if (overview && overview.textContent === 'Episode details loading...') {
                                        overview.textContent = 'No description available.';
                                    }
                                }
                            });
                        } else {
                            eps.forEach(ep => {
                                const card = cardsMap[ep.episodeNum];
                                if (card) {
                                    const overview = card.querySelector('.details-episode-overview');
                                    if (overview) overview.textContent = 'No description available.';
                                }
                            });
                        }
                    } catch (tmdbErr) {
                        console.error('[UI TMDB EPISODES LOAD ERR]', tmdbErr);
                        eps.forEach(ep => {
                            const card = cardsMap[ep.episodeNum];
                            if (card) {
                                const overview = card.querySelector('.details-episode-overview');
                                if (overview) overview.textContent = 'No description available.';
                            }
                        });
                    }
                } else {
                    eps.forEach(ep => {
                        const card = cardsMap[ep.episodeNum];
                        if (card) {
                            const overview = card.querySelector('.details-episode-overview');
                            if (overview) overview.textContent = 'No description available.';
                        }
                    });
                }
            };
            
            seasonSelect.innerHTML = '';
            sortedSeasons.forEach(sNum => {
                const opt = document.createElement('option');
                opt.value = sNum;
                opt.textContent = `Season ${sNum}`;
                seasonSelect.appendChild(opt);
            });
            
            seasonSelect.replaceWith(seasonSelect.cloneNode(true));
            const newSeasonSelect = document.getElementById('details-season-select');
            newSeasonSelect.addEventListener('change', (e) => {
                renderSeason(e.target.value);
            });
            
            if (sortedSeasons.length > 0) {
                renderSeason(sortedSeasons[0]);
            }
        } catch (e) {
            console.error('[DETAILS EPISODES ERR]', e);
            epGrid.innerHTML = '<div style="color: #cf6679; padding: 20px;">Failed to load episodes list.</div>';
        }
    }
}

function initDetailsModalEvents() {
    if (window.detailsModalEventsInitialized) return;
    window.detailsModalEventsInitialized = true;

    const closeBtn = document.getElementById('premium-details-close');
    const modal = document.getElementById('premium-details-modal');
    if (closeBtn && modal) {
        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    }
}

async function renderMovies() {
    console.log('[CATALOG] Rendering Movies Catalog');
    injectPremiumStyles();
    initTmdbObserver();
    
    const grid = document.getElementById('movies-grid');
    const empty = document.getElementById('movies-empty');
    if (!grid) return;
    grid.innerHTML = '';
    
    const headerContainer = document.getElementById('movies-header-container');
    if (headerContainer) headerContainer.remove();
    
    let stalkerCategories = [];
    let m3uGroups = {};
    let hasMovies = false;
    
    savedPlaylists.forEach(p => {
        if (p.channels && !p.disabled) {
            p.channels.forEach(c => {
                if (c.disabled) return;
                if (c.type === 'movie_category') {
                    c.playlistId = p.id;
                    stalkerCategories.push(c);
                    hasMovies = true;
                } else if (c.type === 'movie') {
                    c.playlistId = p.id;
                    const groupName = c.group || 'Movies';
                    if (!m3uGroups[groupName]) m3uGroups[groupName] = [];
                    m3uGroups[groupName].push(c);
                    hasMovies = true;
                }
            });
        }
    });
    
    if (!hasMovies) {
        if (empty) empty.style.display = 'block';
        return;
    }
    if (empty) empty.style.display = 'none';
    
    if (!currentMovieCategory) {
        const backContainer = document.getElementById('movies-back-btn-container');
        if (backContainer) backContainer.style.display = 'none';
        const titleHeader = document.getElementById('movies-title-header');
        if (titleHeader) titleHeader.textContent = 'Movies';

        grid.style.display = 'grid';
        grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(180px, 1fr))';
        grid.style.gap = '20px';
        grid.style.padding = '20px';

        const renderFolder = (title, count, onClick) => {
            const card = document.createElement('div');
            card.className = 'catalog-folder-card';
            card.innerHTML = `
                <div class="catalog-folder-icon">
                    <svg viewBox="0 0 24 24" width="56" height="56" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
                </div>
                <div class="catalog-folder-title" title="${title.replace(/"/g, '&quot;')}">${title}</div>
                ${count !== null ? `<div class="catalog-folder-count">${count} Items</div>` : ''}
            `;
            card.addEventListener('click', onClick);
            grid.appendChild(card);
        };
        
        stalkerCategories.forEach(cat => {
            renderFolder(cat.title || cat.name, null, () => {
                currentMovieCategory = {
                    type: 'stalker',
                    playlistId: cat.playlistId,
                    categoryId: cat.tvg_id,
                    title: cat.title || cat.name
                };
                renderMovies();
            });
        });
        
        Object.keys(m3uGroups).sort(sortAlphaNum).forEach(groupName => {
            renderFolder(groupName, m3uGroups[groupName].length, () => {
                currentMovieCategory = {
                    type: 'm3u',
                    playlistId: m3uGroups[groupName][0].playlistId,
                    categoryId: groupName,
                    title: groupName,
                    items: m3uGroups[groupName]
                };
                renderMovies();
            });
        });

        const searchInput = document.getElementById('movies-search');
        if (searchInput) {
            searchInput.replaceWith(searchInput.cloneNode(true));
            const newSearchInput = document.getElementById('movies-search');
            newSearchInput.value = '';
            newSearchInput.addEventListener('keyup', (e) => {
                const query = e.target.value.toLowerCase().trim();
                const cards = grid.querySelectorAll('.catalog-folder-card');
                cards.forEach(card => {
                    const title = card.querySelector('.catalog-folder-title').textContent.toLowerCase();
                    if (title.includes(query)) {
                        card.style.display = 'flex';
                    } else {
                        card.style.display = 'none';
                    }
                });
            });
        }
    } else {
        const backContainer = document.getElementById('movies-back-btn-container');
        if (backContainer) {
            backContainer.style.display = 'block';
            backContainer.innerHTML = `
                <button class="playlist-btn category-back-btn" style="background: #2a2a2a; color: white; display: flex; align-items: center; gap: 8px; transition: all 0.2s ease;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                    Back
                </button>
            `;
            const backBtn = backContainer.querySelector('button');
            backBtn.addEventListener('click', () => {
                currentMovieCategory = null;
                renderMovies();
            });
        }
        const titleHeader = document.getElementById('movies-title-header');
        if (titleHeader) titleHeader.textContent = `Movies - ${currentMovieCategory.title}`;

        grid.style.display = 'grid';
        grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(160px, 1fr))';
        grid.style.gap = '20px';
        grid.style.padding = '20px';

        const renderItems = async (items) => {
            await loadAllPlaybackProgress();
            items.sort((a, b) => sortAlphaNum(a.name || a.title, b.name || b.title));
            items.forEach(item => {
                const card = document.createElement('div');
                card.className = 'catalog-card';
                
                const title = item.name || item.title;
                const logoUrl = item.logo || 'assets/logo.ico';
                const tmdbId = item.tmdb_id || item.tmdbId || '';
                
                card.dataset.title = title;
                card.dataset.type = 'movie';
                if (tmdbId) {
                    card.dataset.tmdbId = tmdbId;
                }
                
                let progressOverlayHtml = '';
                const progress = getItemProgress(item, 'movie');
                if (progress) {
                    if (progress.completed === 1) {
                        progressOverlayHtml = `
                            <div class="catalog-watched-badge" title="Fully Watched">
                                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 3px;"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                Watched
                            </div>
                        `;
                    } else if (progress.position > 0 && progress.duration > 0) {
                        const pct = Math.min(100, Math.max(0, (progress.position / progress.duration) * 100));
                        progressOverlayHtml = `
                            <div class="catalog-progress-bar-wrapper">
                                <div class="catalog-progress-bar" style="width: ${pct}%;"></div>
                            </div>
                        `;
                    }
                }
                
                card.innerHTML = `
                    <div class="catalog-poster-wrapper">
                        <img class="catalog-poster" src="${logoUrl}" alt="${title}" onerror="this.onerror=null; this.src='assets/logo.ico';">
                        ${progressOverlayHtml}
                    </div>
                    <div class="catalog-info">
                        <h4 class="catalog-title" title="${title.replace(/"/g, '&quot;')}">${title}</h4>
                        <div class="catalog-meta">
                            <span class="catalog-badge">Movie</span>
                        </div>
                    </div>
                `;
                
                card.addEventListener('click', () => {
                    const streamInfo = {
                        title: title,
                        url: item.url,
                        logo: logoUrl,
                        playlistId: currentMovieCategory.playlistId,
                        type: 'movie',
                        tvg_id: item.id || item.tvg_id,
                        tmdbId: tmdbId
                    };
                    
                    if (card.dataset.tmdbLoaded === 'true' && card.dataset.tmdbData) {
                        streamInfo.tmdbData = JSON.parse(card.dataset.tmdbData);
                    }
                    
                    openMovieDetailsModal(streamInfo);
                });
                
                grid.appendChild(card);
                if (tmdbObserver) tmdbObserver.observe(card);
            });

            const searchInput = document.getElementById('movies-search');
            if (searchInput) {
                searchInput.replaceWith(searchInput.cloneNode(true));
                const newSearchInput = document.getElementById('movies-search');
                newSearchInput.value = '';
                newSearchInput.addEventListener('keyup', (e) => {
                    const query = e.target.value.toLowerCase().trim();
                    const cards = grid.querySelectorAll('.catalog-card');
                    cards.forEach(card => {
                        const title = card.dataset.title.toLowerCase();
                        if (title.includes(query)) {
                            card.style.display = 'flex';
                        } else {
                            card.style.display = 'none';
                        }
                    });
                });
            }
        };

        if (currentMovieCategory.type === 'm3u') {
            renderItems(currentMovieCategory.items);
        } else if (currentMovieCategory.type === 'stalker') {
            const loadingDiv = document.createElement('div');
            loadingDiv.style.gridColumn = '1 / -1';
            loadingDiv.style.color = '#bb86fc';
            loadingDiv.style.textAlign = 'center';
            loadingDiv.style.padding = '40px';
            loadingDiv.style.fontFamily = "'Outfit', 'Inter', sans-serif";
            loadingDiv.innerHTML = '<h2>Loading movies...</h2>';
            grid.appendChild(loadingDiv);

            try {
                const playlist = savedPlaylists.find(p => p.id.toString() === currentMovieCategory.playlistId.toString());
                window.iptvAPI.loadStalkerCategory({
                    url: playlist.source,
                    mac: playlist.epg.substring(8),
                    categoryId: currentMovieCategory.categoryId,
                    isSeries: false,
                    categoryType: 'movie',
                    categoryName: currentMovieCategory.title
                }).then(items => {
                    loadingDiv.remove();
                    if (!items || items.length === 0) {
                        grid.innerHTML += '<div style="grid-column: 1 / -1; color: #888; text-align: center; padding: 40px;">No movies found in this folder.</div>';
                    } else {
                        renderItems(items);
                    }
                }).catch(e => {
                    loadingDiv.innerHTML = '<h2 style="color: #cf6679;">Failed to load movies.</h2>';
                });
            } catch (e) {
                loadingDiv.innerHTML = '<h2 style="color: #cf6679;">Failed to load movies.</h2>';
            }
        }
    }
}



async function renderVod() {
    console.log('[CATALOG] Rendering VOD/Series Catalog');
    injectPremiumStyles();
    initTmdbObserver();
    
    const grid = document.getElementById('vod-grid');
    const empty = document.getElementById('vod-empty');
    if (!grid) return;
    grid.innerHTML = '';
    
    const headerContainer = document.getElementById('vod-header-container');
    if (headerContainer) headerContainer.remove();
    
    let stalkerCategories = [];
    let m3uGroups = {};
    let hasSeries = false;
    
    savedPlaylists.forEach(p => {
        if (p.channels && !p.disabled) {
            p.channels.forEach(c => {
                if (c.disabled) return;
                if (c.type === 'vod_category' || c.type === 'series_category') {
                    c.playlistId = p.id;
                    stalkerCategories.push(c);
                    hasSeries = true;
                } else if (c.type === 'vod' || c.type === 'series') {
                    c.playlistId = p.id;
                    const groupName = c.group || 'Series';
                    if (!m3uGroups[groupName]) m3uGroups[groupName] = [];
                    m3uGroups[groupName].push(c);
                    hasSeries = true;
                }
            });
        }
    });
    
    if (!hasSeries) {
        if (empty) empty.style.display = 'block';
        return;
    }
    if (empty) empty.style.display = 'none';
    
    if (!currentVodCategory) {
        const backContainer = document.getElementById('vod-back-btn-container');
        if (backContainer) backContainer.style.display = 'none';
        const titleHeader = document.getElementById('vod-title-header');
        if (titleHeader) titleHeader.textContent = 'TV Series';

        grid.style.display = 'grid';
        grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(180px, 1fr))';
        grid.style.gap = '20px';
        grid.style.padding = '20px';

        const renderFolder = (title, count, onClick) => {
            const card = document.createElement('div');
            card.className = 'catalog-folder-card';
            card.innerHTML = `
                <div class="catalog-folder-icon">
                    <svg viewBox="0 0 24 24" width="56" height="56" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
                </div>
                <div class="catalog-folder-title" title="${title.replace(/"/g, '&quot;')}">${title}</div>
                ${count !== null ? `<div class="catalog-folder-count">${count} Items</div>` : ''}
            `;
            card.addEventListener('click', onClick);
            grid.appendChild(card);
        };
        
        stalkerCategories.forEach(cat => {
            renderFolder(cat.title || cat.name, null, () => {
                currentVodCategory = {
                    type: 'stalker',
                    playlistId: cat.playlistId,
                    categoryId: cat.tvg_id,
                    title: cat.title || cat.name
                };
                renderVod();
            });
        });
        
        Object.keys(m3uGroups).sort(sortAlphaNum).forEach(groupName => {
            renderFolder(groupName, m3uGroups[groupName].length, () => {
                currentVodCategory = {
                    type: 'm3u',
                    playlistId: m3uGroups[groupName][0].playlistId,
                    categoryId: groupName,
                    title: groupName,
                    items: m3uGroups[groupName]
                };
                renderVod();
            });
        });

        const searchInput = document.getElementById('vod-search');
        if (searchInput) {
            searchInput.replaceWith(searchInput.cloneNode(true));
            const newSearchInput = document.getElementById('vod-search');
            newSearchInput.value = '';
            newSearchInput.addEventListener('keyup', (e) => {
                const query = e.target.value.toLowerCase().trim();
                const cards = grid.querySelectorAll('.catalog-folder-card');
                cards.forEach(card => {
                    const title = card.querySelector('.catalog-folder-title').textContent.toLowerCase();
                    if (title.includes(query)) {
                        card.style.display = 'flex';
                    } else {
                        card.style.display = 'none';
                    }
                });
            });
        }
    } else {
        const backContainer = document.getElementById('vod-back-btn-container');
        if (backContainer) {
            backContainer.style.display = 'block';
            backContainer.innerHTML = `
                <button class="playlist-btn category-back-btn" style="background: #2a2a2a; color: white; display: flex; align-items: center; gap: 8px; transition: all 0.2s ease;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                    Back
                </button>
            `;
            const backBtn = backContainer.querySelector('button');
            backBtn.addEventListener('click', () => {
                currentVodCategory = null;
                renderVod();
            });
        }
        const titleHeader = document.getElementById('vod-title-header');
        if (titleHeader) titleHeader.textContent = `TV Series - ${currentVodCategory.title}`;

        grid.style.display = 'grid';
        grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(160px, 1fr))';
        grid.style.gap = '20px';
        grid.style.padding = '20px';

        const renderItems = async (items) => {
            await loadAllPlaybackProgress();
            items.sort((a, b) => sortAlphaNum(a.name || a.title, b.name || b.title));
            items.forEach(item => {
                const card = document.createElement('div');
                card.className = 'catalog-card';
                
                const title = item.name || item.title;
                const logoUrl = item.logo || 'assets/logo.ico';
                const tmdbId = item.tmdb_id || item.tmdbId || '';
                
                card.dataset.title = title;
                card.dataset.type = 'series';
                if (tmdbId) {
                    card.dataset.tmdbId = tmdbId;
                }
                
                let progressOverlayHtml = '';
                const progress = getItemProgress(item, 'vod');
                if (progress) {
                    if (progress.completed === 1) {
                        progressOverlayHtml = `
                            <div class="catalog-watched-badge" title="All Episodes Watched">
                                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 3px;"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                Watched
                            </div>
                        `;
                    } else if (progress.position > 0 && progress.duration > 0) {
                        const pct = Math.min(100, Math.max(0, (progress.position / progress.duration) * 100));
                        progressOverlayHtml = `
                            <div class="catalog-progress-bar-wrapper">
                                <div class="catalog-progress-bar" style="width: ${pct}%;"></div>
                            </div>
                        `;
                    }
                }
                
                card.innerHTML = `
                    <div class="catalog-poster-wrapper">
                        <img class="catalog-poster" src="${logoUrl}" alt="${title}" onerror="this.onerror=null; this.src='assets/logo.ico';">
                        ${progressOverlayHtml}
                    </div>
                    <div class="catalog-info">
                        <h4 class="catalog-title" title="${title.replace(/"/g, '&quot;')}">${title}</h4>
                        <div class="catalog-meta">
                            <span class="catalog-badge">Series</span>
                        </div>
                    </div>
                `;
                
                card.addEventListener('click', () => {
                    const streamInfo = {
                        title: title,
                        url: item.url,
                        logo: logoUrl,
                        playlistId: currentVodCategory.playlistId,
                        type: 'series',
                        tvg_id: item.id || item.tvg_id,
                        tmdbId: tmdbId
                    };
                    
                    if (card.dataset.tmdbLoaded === 'true' && card.dataset.tmdbData) {
                        streamInfo.tmdbData = JSON.parse(card.dataset.tmdbData);
                    }
                    
                    openMovieDetailsModal(streamInfo);
                });
                
                grid.appendChild(card);
                if (tmdbObserver) tmdbObserver.observe(card);
            });

            const searchInput = document.getElementById('vod-search');
            if (searchInput) {
                searchInput.replaceWith(searchInput.cloneNode(true));
                const newSearchInput = document.getElementById('vod-search');
                newSearchInput.value = '';
                newSearchInput.addEventListener('keyup', (e) => {
                    const query = e.target.value.toLowerCase().trim();
                    const cards = grid.querySelectorAll('.catalog-card');
                    cards.forEach(card => {
                        const title = card.dataset.title.toLowerCase();
                        if (title.includes(query)) {
                            card.style.display = 'flex';
                        } else {
                            card.style.display = 'none';
                        }
                    });
                });
            }
        };

        if (currentVodCategory.type === 'm3u') {
            renderItems(currentVodCategory.items);
        } else if (currentVodCategory.type === 'stalker') {
            const loadingDiv = document.createElement('div');
            loadingDiv.style.gridColumn = '1 / -1';
            loadingDiv.style.color = '#bb86fc';
            loadingDiv.style.textAlign = 'center';
            loadingDiv.style.padding = '40px';
            loadingDiv.style.fontFamily = "'Outfit', 'Inter', sans-serif";
            loadingDiv.innerHTML = '<h2>Loading series...</h2>';
            grid.appendChild(loadingDiv);

            try {
                const playlist = savedPlaylists.find(p => p.id.toString() === currentVodCategory.playlistId.toString());
                window.iptvAPI.loadStalkerCategory({
                    url: playlist.source,
                    mac: playlist.epg.substring(8),
                    categoryId: currentVodCategory.categoryId,
                    isSeries: true,
                    categoryType: 'series',
                    categoryName: currentVodCategory.title
                }).then(items => {
                    loadingDiv.remove();
                    if (!items || items.length === 0) {
                        grid.innerHTML += '<div style="grid-column: 1 / -1; color: #888; text-align: center; padding: 40px;">No series found in this folder.</div>';
                    } else {
                        renderItems(items);
                    }
                }).catch(e => {
                    loadingDiv.innerHTML = '<h2 style="color: #cf6679;">Failed to load series.</h2>';
                });
            } catch (e) {
                loadingDiv.innerHTML = '<h2 style="color: #cf6679;">Failed to load series.</h2>';
            }
        }
    }
}

async function openEpisodesModal(playlistId, seriesId, seriesTitle, seriesPosterUrl = null) {
    console.log('[UI] Opening episodes modal for:', seriesTitle, 'playlist:', playlistId, 'seriesId:', seriesId);
    
    const modal = document.getElementById('episodes-modal');
    const modalTitle = document.getElementById('episodes-modal-title');
    const seasonsSidebar = document.getElementById('seasons-sidebar');
    const episodesGrid = document.getElementById('episodes-grid');
    const loader = document.getElementById('episodes-loading');
    const countBadge = document.getElementById('episodes-count-badge');
    
    if (!modal) return;
    
    modalTitle.textContent = seriesTitle;
    if (seasonsSidebar) seasonsSidebar.innerHTML = '';
    if (episodesGrid) episodesGrid.innerHTML = '';
    if (loader) loader.style.display = 'block';
    if (countBadge) countBadge.textContent = '0 Episodes';
    
    modal.style.display = 'flex';
    
    try {
        const playlist = savedPlaylists.find(p => p.id.toString() === playlistId.toString());
        if (!playlist || !playlist.epg || !playlist.epg.startsWith('stalker:')) {
            throw new Error("Stalker playlist credentials not found.");
        }
        
        const url = playlist.source;
        const mac = playlist.epg.substring(8);
        
        console.log('[API] Fetching episodes for series:', seriesId);
        const episodes = await window.iptvAPI.getStalkerEpisodes({ url, mac, seriesId });
        
        if (loader) loader.style.display = 'none';
        
        if (!episodes || episodes.length === 0) {
            if (episodesGrid) episodesGrid.innerHTML = '<div style="color: #888; padding: 20px;">No episodes found for this series.</div>';
            if (countBadge) countBadge.textContent = '0 Episodes';
            return;
        }
        
        const seasons = {};
        episodes.forEach(ep => {
            const sNum = ep.season || 1;
            if (!seasons[sNum]) {
                seasons[sNum] = [];
            }
            seasons[sNum].push(ep);
        });
        
        Object.keys(seasons).forEach(sNum => {
            seasons[sNum].sort((a, b) => parseInt(a.episodeNum || 0) - parseInt(b.episodeNum || 0));
        });
        
        const sortedSeasons = Object.keys(seasons).sort((a, b) => parseInt(a) - parseInt(b));
        
        const renderSeasonEpisodes = (seasonNum) => {
            if (!episodesGrid) return;
            episodesGrid.innerHTML = '';
            
            const seasonEpisodes = seasons[seasonNum] || [];
            if (countBadge) {
                countBadge.textContent = `${seasonEpisodes.length} Episode${seasonEpisodes.length === 1 ? '' : 's'}`;
            }
            
            seasonEpisodes.forEach(ep => {
                const epCard = document.createElement('button');
                epCard.className = 'episode-card';
                epCard.style.width = '100%';
                epCard.style.textAlign = 'left';
                
                epCard.innerHTML = `
                    <div class="episode-num">${ep.episodeNum || ''}</div>
                    <div class="episode-name" title="${ep.name}">${ep.name || `Episode ${ep.episodeNum}`}</div>
                `;
                
                epCard.addEventListener('click', async () => {
                    console.log('[CATALOG] Playing Series Episode:', ep.name, ep.url);
                    modal.style.display = 'none';
                    switchTab('live-tv', document.getElementById('btn-live-tv'));
                    
                    const seriesPoster = seriesPosterUrl || playlist.channels.find(c => c.tvg_id === seriesId)?.logo || 'assets/logo.ico';
                    const episodeChannel = {
                        title: `${seriesTitle} - S${seasonNum}E${ep.episodeNum} - ${ep.name || 'Episode'}`,
                        url: ep.url,
                        logo: seriesPoster,
                        playlistId: playlist.id,
                        type: 'episode',
                        seriesTitle: seriesTitle,
                        season: seasonNum,
                        episodeNum: ep.episodeNum
                    };
                    
                    const progId = getPlaybackProgressId(episodeChannel);
                    if (progId) {
                        const saved = await window.iptvAPI.getPlaybackProgress(progId);
                        if (saved && saved.position > 0 && !saved.completed) {
                            showResumePromptModal(saved.position, (resume) => {
                                if (resume) {
                                    window.pendingResumeSeekTime = saved.position;
                                }
                                embedStream(episodeChannel);
                            });
                            return;
                        }
                    }
                    embedStream(episodeChannel);
                });
                
                episodesGrid.appendChild(epCard);
            });
        };
        
        if (seasonsSidebar) {
            sortedSeasons.forEach((seasonNum, index) => {
                const tab = document.createElement('button');
                tab.className = `season-tab ${index === 0 ? 'active' : ''}`;
                tab.textContent = `Season ${seasonNum}`;
                
                tab.addEventListener('click', () => {
                    document.querySelectorAll('.season-tab').forEach(t => t.classList.remove('active'));
                    tab.classList.add('active');
                    renderSeasonEpisodes(seasonNum);
                });
                
                seasonsSidebar.appendChild(tab);
            });
        }
        
        if (sortedSeasons.length > 0) {
            renderSeasonEpisodes(sortedSeasons[0]);
        }
        
    } catch (err) {
        console.error('[UI ERR] Failed to open episodes modal:', err);
        if (loader) loader.style.display = 'none';
        if (episodesGrid) episodesGrid.innerHTML = `<div style="color: #cf6679; padding: 20px;">Error: ${err.message}</div>`;
        if (countBadge) countBadge.textContent = 'Error';
    }
}

// Modal closing setup
document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('episodes-modal');
    const closeBtn = document.getElementById('episodes-modal-close');
    if (closeBtn && modal) {
        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    }
    
    // Autoplay Overlay buttons setup
    const playNowBtn = document.getElementById('autoplay-play-now-btn');
    const cancelBtn = document.getElementById('autoplay-cancel-btn');
    if (playNowBtn) {
        playNowBtn.addEventListener('click', () => {
            playNextEpisode();
        });
    }
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            hideAutoplayOverlay();
            window.isAutoplayBlockedForCurrentEpisode = true;
            showToast('Auto-play cancelled');
        });
    }
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (modal && modal.style.display === 'flex') {
                modal.style.display = 'none';
            }
        }
    });
});

function updateHeaderTime() {
    const el = document.getElementById('header-time-date');
    if (!el) return;
    const now = new Date();
    
    const weekday = now.toLocaleDateString('en-US', { weekday: 'short' });
    const month = now.toLocaleDateString('en-US', { month: 'short' });
    const day = now.getDate();
    
    let hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    
    el.textContent = `${weekday} • ${month} ${day} • ${hours}:${minutes} ${ampm}`;
}

// Hide the sidebar & title when the app goes fullscreen so the video takes up 100% of the monitor
window.iptvAPI.onFullscreenChange((isFullscreen) => {
    console.log('[API RECV] onFullscreenChange, isFullscreen:', isFullscreen);
    window.isAppFullscreen = isFullscreen;
    document.body.classList.toggle('fullscreen-active', isFullscreen);
    const navBar = document.getElementById('nav-bar');
    const sidebar = document.getElementById('sidebar');
    const channelDetails = document.getElementById('channel-details');
    const liveBottomHalf = document.getElementById('live-bottom-half');
    const liveTopHalf = document.getElementById('live-top-half');
    const playerWrapper = document.getElementById('player-wrapper');
    const topHeader = document.getElementById('top-header');
    
    const isLiveViewActive = document.getElementById('btn-live-tv').classList.contains('active');

    if (sidebar) sidebar.style.setProperty('display', (isFullscreen || !isLiveViewActive) ? 'none' : 'flex', 'important');
    if (navBar) navBar.style.setProperty('display', 'none', 'important');
    if (topHeader) topHeader.style.setProperty('display', isFullscreen ? 'none' : 'flex', 'important');
    
    if (channelDetails) channelDetails.style.setProperty('display', isFullscreen ? 'none' : 'flex', 'important');
    if (liveBottomHalf) liveBottomHalf.style.setProperty('display', isFullscreen ? 'none' : 'flex', 'important');
    
    if (liveTopHalf) liveTopHalf.style.setProperty('height', isFullscreen ? '100%' : '50%', 'important');
    
    if (playerWrapper) {
        if (isFullscreen) {
            playerWrapper.style.setProperty('padding', '0', 'important');
            playerWrapper.style.setProperty('background-color', 'transparent', 'important');
            playerWrapper.style.setProperty('border-radius', '0', 'important');
            playerWrapper.style.setProperty('flex', '1', 'important');
            playerWrapper.style.setProperty('aspect-ratio', 'auto', 'important');
            playerWrapper.style.setProperty('width', '100%', 'important');
            playerWrapper.style.setProperty('margin-left', '0', 'important');
            document.body.style.setProperty('padding', '0', 'important');
            document.body.style.setProperty('gap', '0', 'important');
            if (liveTopHalf) liveTopHalf.style.setProperty('gap', '0', 'important');
        } else {
            // Add transitioning state to mask layout jumps
            document.body.classList.add('fullscreen-transitioning');

            playerWrapper.style.setProperty('padding', '1px', 'important');
            playerWrapper.style.setProperty('background-color', '#050507', 'important');
            playerWrapper.style.setProperty('border-radius', '24px', 'important');
            playerWrapper.style.setProperty('flex', 'none', 'important');
            playerWrapper.style.setProperty('aspect-ratio', '16 / 9', 'important');
            playerWrapper.style.setProperty('width', 'auto', 'important');
            playerWrapper.style.setProperty('margin-left', '0', 'important');
            document.body.style.setProperty('padding', '82px 4px 4px 4px', 'important');
            document.body.style.setProperty('gap', '4px', 'important');
            if (liveTopHalf) liveTopHalf.style.setProperty('gap', '4px', 'important');

            // Force a DOM style reflow to ensure styles are updated before starting transition
            document.body.offsetHeight;

            // Fade the layout back in cleanly
            requestAnimationFrame(() => {
                setTimeout(() => {
                    document.body.classList.remove('fullscreen-transitioning');
                }, 40);
            });
        }
    }

    // Force multiple sequential bounds updates to guarantee perfect alignment and prevent layout race conditions when exiting fullscreen
    for (let delay of [10, 50, 100, 200, 400, 600, 1000]) {
        setTimeout(triggerBoundsUpdate, delay);
    }
});

async function backgroundAutoUpdate() {
    console.log('[BACKGROUND] Starting background auto-update process.');
    let hasUpdates = false;
    let epgSourcesToUpdate = new Set(savedEpgs);
    
    for (let i = 0; i < savedPlaylists.length; i++) {
        const p = savedPlaylists[i];
        console.log(`[BACKGROUND] Checking playlist for update: ${p.name}`);
        if (p.disabled || !p.source) continue;
        
        const isStalker = p.epg && p.epg.startsWith('stalker:');
        if (!isStalker && !p.source.startsWith('http') && !p.source.startsWith('https')) continue;

        let result;
        if (isStalker) {
            console.log(`[BACKGROUND] Calling parseStalker for background update: ${p.name}`);
            result = await window.iptvAPI.parseStalker({ url: p.source, mac: p.epg.substring(8) });
        } else {
            result = await window.iptvAPI.parseM3u(p.source);
        }

        if (result && !result.error && (Array.isArray(result) || result.channels)) {
            let channels = Array.isArray(result) ? result : result.channels;
            if (isStalker && p.channels) {
                const existingLive = p.channels.filter(c => 
                    c.type !== 'itv_category' && 
                    c.type !== 'vod_category' && 
                    c.type !== 'movie_category' && 
                    c.type !== 'series_category'
                );
                channels = [...channels, ...existingLive];
            }
            const oldMap = new Map();
            if (p.channels) p.channels.forEach(c => oldMap.set(c.title, c));

            channels.forEach(newCh => {
                const old = oldMap.get(newCh.title);
                if (old) {
                    newCh.disabled = old.disabled;
                    newCh.favourite = old.favourite;
                    if (old.isNew) newCh.isNew = true;
                } else {
                    const isVod = newCh.type === 'movie' || newCh.type === 'series' || newCh.type === 'movie_category' || newCh.type === 'vod_category' || newCh.type === 'series_category';
                    newCh.disabled = isVod ? false : true;
                    if (!isVod) {
                        newCh.isNew = true;
                    }
                }
            });

            savedPlaylists[i].channels = channels;
            if (!isStalker && result.epg_url && (!savedPlaylists[i].epg || savedPlaylists[i].epg === 'Not Configured')) {
                savedPlaylists[i].epg = result.epg_url;
            }
            if (result.exp_date) {
                savedPlaylists[i].exp_date = result.exp_date;
            }
            hasUpdates = true;
            
            if (!isStalker && p.epg && p.epg !== 'Not Configured') epgSourcesToUpdate.add(p.epg);
        }
    }
    
    console.log('[BACKGROUND] Playlist updates found:', hasUpdates);
    
    if (hasUpdates) {
        if (epgSourcesToUpdate.size > 0) {
            if (!window.activeEpgParsing) window.activeEpgParsing = new Set();
            epgSourcesToUpdate.forEach(epg => window.activeEpgParsing.add(epg));
            updateState(true); // Skip save if EPG will be updated next
            
            const combinedEpgs = Array.from(epgSourcesToUpdate).join(',');
            await window.iptvAPI.updateEpg(combinedEpgs, null, true);
            epgChannelsData = await window.iptvAPI.getEpgChannels(combinedEpgs);
            await autoMapChannels(false, true); // SKIP SAVE
            console.log('[BACKGROUND] EPG data updated.');
            
            epgSourcesToUpdate.forEach(epg => window.activeEpgParsing.delete(epg));
            // EPG preloading skipped to load only on view.
            updateState(); // FINAL SAVE
        } else {
            updateState(); // FINAL SAVE
        }
    }
}

// Load saved channels on startup
window.addEventListener('DOMContentLoaded', async () => {
    console.log('[LIFECYCLE] DOMContentLoaded event fired.');

    // Initialize premium details modal events
    initDetailsModalEvents();

    // Initialize premium top header clock
    updateHeaderTime();
    setInterval(updateHeaderTime, 1000);

    // Settings and Power button are now defined directly in index.html in the central header navigation row.
    // They maintain their capsule styles, alignment, and hover physics perfectly.

    // Hide all main view containers initially to prevent UI flash before data loads
    ['sidebar', 'main-view', 'playlist-view', 'epg-view', 'settings-view'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
        if (el) el.style.setProperty('display', 'none', 'important');
    });

    // Add custom fullscreen button to the player container
    const fsBtn = document.createElement('button');
    fsBtn.id = 'fullscreen-btn';
    fsBtn.innerHTML = '<svg viewBox="0 0 24 24" width="54" height="54" fill="currentColor"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>';
    fsBtn.title = 'Toggle Fullscreen';
    fsBtn.style.display = 'none'; // Initially hidden
    playerContainer.appendChild(fsBtn);
    fsBtn.addEventListener('click', () => {
        window.iptvAPI.toggleFullscreen();
    });

    // Rename the EPG button dynamically on load
    const epgBtn = document.getElementById('btn-epg');
    if (epgBtn) {
        epgBtn.title = 'Programme Guide';
        epgBtn.innerHTML = epgBtn.innerHTML.replace('EPG', 'Guide');
        // Safely update text node to avoid overwriting nested SVG icons
        Array.from(epgBtn.childNodes).forEach(node => {
            if (node.nodeType === Node.TEXT_NODE && /epg/i.test(node.nodeValue)) {
                node.nodeValue = node.nodeValue.replace(/epg/i, 'Guide');
            }
        });
        // Fallback 
        if (epgBtn.innerHTML.includes('EPG')) epgBtn.innerHTML = epgBtn.innerHTML.replace(/\bEPG\b/i, 'Guide');
    }

    console.log('[API] Calling getMappings on startup.');
    channelMappings = await window.iptvAPI.getMappings();
    console.log('[API] Calling getExternalEpgs on startup.');
    savedEpgs = await window.iptvAPI.getExternalEpgs();
    console.log('[API] Calling loadChannels on startup.');
    const data = await window.iptvAPI.loadChannels();
    if (data && data.length > 0) {
        // Migration for old raw channel list format
        if (data[0].url && !data[0].source && !data[0].channels) {
            savedPlaylists = [{
                id: 1,
                source: 'Legacy/Imported',
                name: 'Imported Playlist',
                channels: data,
                epg: 'Not Configured',
                disabled: false
            }];
        } else {
            savedPlaylists = data;
        }
        
        console.log('[STARTUP] EPG pre-loading skipped to load only on view.');
        updateState();
        
        if (allChannels.length > 0) {
            switchTab('live-tv', document.getElementById('btn-live-tv'));
            // Autoplay last played channel
            const lastUrl = localStorage.getItem('lastPlayedChannelUrl');
            let startedPlayback = false;
            if (lastUrl) {
                const lastChannel = allChannels.find(c => c.url === lastUrl);
                if (lastChannel) {
                    embedStream(lastChannel);
                    startedPlayback = true;
                }
            }
            if (!startedPlayback) {
                // Determine the first channel according to the sidebar sorting/groups
                const filterVal = localStorage.getItem('iptv_playlist_filter') || 'all';
                const groupedChannels = {};
                allChannels.forEach(channel => {
                    if (filterVal === 'favs' && !channel.favourite) return;
                    if (filterVal !== 'all' && filterVal !== 'favs' && String(channel.playlistId) !== String(filterVal)) return;
                    
                    const channelGroup = channel.group || 'Uncategorized';
                    if (!groupedChannels[channelGroup]) {
                        groupedChannels[channelGroup] = [];
                    }
                    groupedChannels[channelGroup].push(channel);
                });
                const sortedGroups = Object.keys(groupedChannels).sort(sortAlphaNum);
                if (sortedGroups.length > 0 && groupedChannels[sortedGroups[0]].length > 0) {
                    const firstChannel = groupedChannels[sortedGroups[0]][0];
                    embedStream(firstChannel);
                    startedPlayback = true;
                } else if (allChannels.length > 0) {
                    embedStream(allChannels[0]);
                    startedPlayback = true;
                }
            }
            if (!startedPlayback && window.iptvAPI.hideSplash) {
                window.iptvAPI.hideSplash();
            }
        } else {
            switchTab('playlist', document.getElementById('btn-playlist'));
            if (window.iptvAPI.hideSplash) window.iptvAPI.hideSplash();
        }
    } else {
        updateState(); // Initialize empty states
        switchTab('playlist', document.getElementById('btn-playlist'));
        if (window.iptvAPI.hideSplash) window.iptvAPI.hideSplash();
    }
    
    // Begin non-blocking background auto-update process (Delayed to allow the UI to finish rendering first)
    setTimeout(() => {
        const lastUpdate = localStorage.getItem('lastBackgroundUpdate');
        const now = Date.now();
        if (!lastUpdate || (now - parseInt(lastUpdate)) > 12 * 60 * 60 * 1000) {
            backgroundAutoUpdate();
            localStorage.setItem('lastBackgroundUpdate', now.toString());
        }
        
        setInterval(() => {
            backgroundAutoUpdate();
            localStorage.setItem('lastBackgroundUpdate', Date.now().toString());
        }, 4 * 60 * 60 * 1000); // Check every 4 hours, actual web fetch limited to 24h by python cache
    }, 5000);



    // Check for Reminders periodically
    setInterval(() => {
        // console.log('[REMINDER] Checking for upcoming reminders.'); // Too noisy
        const now = new Date();
        let changed = false;
        savedReminders.forEach(r => {
            if (r.notified) return;
            const startTime = parseEpgTime(r.startTime);
            const diffMs = startTime - now;
            // Notify if starting within 1 minute or already started (up to 1 hr past)
            if (diffMs <= 1 * 60 * 1000 && diffMs > -60 * 60 * 1000) {
                console.log('[REMINDER] Firing notification for program:', r.progTitle);
                const notif = new Notification("Programme Reminder", {
                    body: `${r.progTitle} is starting soon on ${r.channelTitle}. Click to watch.`,
                    icon: 'assets/logo.ico'
                });

                notif.onclick = () => {
                    const targetChannel = allChannels.find(c => c.title === r.channelTitle);
                    if (targetChannel) {
                        switchTab('live-tv', document.getElementById('btn-live-tv'));
                        embedStream(targetChannel);
                    }
                };

                r.notified = true;
                changed = true;
            }
        });
        if (changed) saveReminders();
    }, 10 * 1000); // Check every 10 seconds to ensure we hit the 1 minute window

    document.addEventListener('click', (e) => {
        const btn = e.target.closest('.reminder-btn-sidebar');
        if (btn) console.log('[EVENT] Sidebar reminder button clicked.');
        if (btn) {
            e.stopPropagation();
            const progTitle = btn.getAttribute('data-prog');
            const start = btn.getAttribute('data-start');
            const stop = btn.getAttribute('data-stop');
            const channelTitle = document.getElementById('detail-name').textContent;
            toggleReminder(channelTitle, progTitle, start, stop);
            const isSet = savedReminders.some(r => r.progTitle === progTitle && r.startTime === start && r.channelTitle === channelTitle);
            if (isSet) {
                btn.style.opacity = '1';
                btn.style.filter = 'drop-shadow(0 0 4px #bb86fc)';
                showToast('Reminder Set: ' + progTitle);
            } else {
                btn.style.opacity = '0.3';
                btn.style.filter = 'grayscale(100%)';
                showToast('Reminder Removed');
            }
        }
    });

    setTimeout(() => {
        const focusables = getFocusableElements();
        if (focusables.length > 0) {
            focusables[0].focus();
        }
        
        setInterval(() => {
            if (!document.hasFocus()) return;
            if (!document.activeElement || document.activeElement === document.body) {
                const focusables = getFocusableElements();
                if (focusables.length > 0) {
                    focusables[0].focus();
                }
            }
        }, 500);
    }, 1000);
});

function injectTmdbEpgStyles() {
    if (document.getElementById('tmdb-epg-styles')) return;
    const style = document.createElement('style');
    style.id = 'tmdb-epg-styles';
    style.innerHTML = `
        .tmdb-epg-container {
            display: flex;
            gap: 20px;
            background: rgba(30, 30, 30, 0.4);
            border: 1px solid rgba(255, 255, 255, 0.05);
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
            margin-bottom: 10px;
            animation: fadeIn 0.4s ease-out;
            font-family: 'Outfit', 'Inter', sans-serif;
        }
        .tmdb-epg-poster-wrapper {
            width: 130px;
            flex-shrink: 0;
            position: relative;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 6px 16px rgba(0,0,0,0.6);
            aspect-ratio: 2/3;
            background: #1a1a1a;
            border: 1px solid rgba(255,255,255,0.08);
        }
        .tmdb-epg-poster {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        .tmdb-epg-content {
            flex-grow: 1;
            display: flex;
            flex-direction: column;
            gap: 12px;
        }
        .tmdb-epg-header {
            display: flex;
            flex-direction: column;
            gap: 6px;
        }
        .tmdb-epg-title {
            margin: 0;
            font-size: 1.6em;
            font-weight: 800;
            color: #fff;
            line-height: 1.2;
            text-shadow: 0 2px 4px rgba(0,0,0,0.5);
        }
        .tmdb-epg-subtitle {
            margin: 0;
            font-size: 1.15em;
            font-weight: 600;
            color: #bb86fc;
            line-height: 1.2;
        }
        .tmdb-epg-meta {
            display: flex;
            align-items: center;
            gap: 10px;
            flex-wrap: wrap;
            font-size: 0.85em;
            color: #aaa;
            margin-top: 4px;
        }
        .tmdb-epg-rating {
            background: rgba(255, 193, 7, 0.15);
            color: #ffc107;
            font-weight: bold;
            padding: 2px 8px;
            border-radius: 4px;
            border: 1px solid rgba(255, 193, 7, 0.3);
            display: flex;
            align-items: center;
            gap: 4px;
        }
        .tmdb-epg-badge {
            background: rgba(187, 134, 252, 0.15);
            color: #bb86fc;
            font-weight: bold;
            padding: 2px 8px;
            border-radius: 4px;
            border: 1px solid rgba(187, 134, 252, 0.25);
            text-transform: uppercase;
            font-size: 0.8em;
        }
        .tmdb-epg-overview {
            margin: 0;
            color: #ccc;
            font-size: 0.95em;
            line-height: 1.6;
            text-shadow: 0 1px 2px rgba(0,0,0,0.3);
        }
        .tmdb-epg-footer {
            border-top: 1px solid rgba(255, 255, 255, 0.08);
            padding-top: 12px;
            margin-top: 6px;
            display: flex;
            flex-direction: column;
            gap: 6px;
            font-size: 0.85em;
            color: #999;
        }
        .tmdb-epg-footer-item {
            display: flex;
            gap: 8px;
        }
        .tmdb-epg-footer-label {
            color: #bb86fc;
            font-weight: bold;
            text-transform: uppercase;
            font-size: 0.8em;
            width: 100px;
            flex-shrink: 0;
            letter-spacing: 0.5px;
        }
        .tmdb-epg-footer-value {
            color: #e0e0e0;
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        @media (max-width: 600px) {
            .tmdb-epg-container {
                flex-direction: column;
                align-items: center;
            }
            .tmdb-epg-poster-wrapper {
                width: 120px;
            }
        }
    `;
    document.head.appendChild(style);
}

async function loadAndRenderTmdbSynopsis(channel) {
    console.log('[TMDB EPG] Loading TMDB synopsis for channel:', channel.title);
    const container = document.getElementById('epg-container');
    if (!container) return;
    
    // Inject the CSS styles
    injectTmdbEpgStyles();
    
    // Show premium loader
    container.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px; color: #bb86fc; font-family: 'Outfit', 'Inter', sans-serif;">
            <div class="loader-spinner" style="margin-bottom: 15px; width: 36px; height: 36px;"></div>
            <span style="font-weight: 500; font-size: 1.1em; letter-spacing: 0.5px;">Fetching Synopsis from TMDB...</span>
        </div>
    `;
    
    const parsed = parseM3uSeriesName(channel.title);
    const hasSeriesPattern = channel.title && (
        /s\d+\s*e\d+/i.test(channel.title) || 
        /season\s*\d+\s*episode\s*\d+/i.test(channel.title) ||
        /\d+x\d+/i.test(channel.title)
    );
    const isEpisode = channel.type === 'episode' || channel.type === 'series' || hasSeriesPattern;
    
    let tmdbData = channel.tmdbData || null;
    let episodeData = null;
    let seriesTitle = channel.seriesTitle || parsed.seriesTitle;
    let seasonNum = channel.season || parsed.season || 1;
    let episodeNum = channel.episodeNum || parsed.episode || 1;
    
    try {
        if (isEpisode) {
            // Load TV Series TMDB Details
            if (!tmdbData) {
                let res;
                if (channel.tmdbId) {
                    res = await window.iptvAPI.fetchTmdbById({ tmdbId: channel.tmdbId, type: 'tv' });
                } else {
                    res = await window.iptvAPI.fetchTmdbByTitle({ title: seriesTitle, type: 'tv' });
                }
                if (res && !res.error) {
                    tmdbData = res;
                }
            }
            
            // Load Episode Specific Details from Season Details
            const tvId = tmdbData ? (tmdbData.tmdbId || tmdbData.id) : null;
            if (tvId) {
                console.log(`[TMDB EPG] Fetching Season ${seasonNum} episodes for TV ID: ${tvId}`);
                const tmdbSeason = await window.iptvAPI.fetchTmdbSeasonEpisodes({
                    tmdbId: tvId,
                    seasonNumber: seasonNum
                });
                if (tmdbSeason && tmdbSeason.episodes && !tmdbSeason.error) {
                    episodeData = tmdbSeason.episodes.find(e => e.episode_number === parseInt(episodeNum));
                }
            }
            
            renderTmdbEpisodeCard(channel, tmdbData, episodeData, seriesTitle, seasonNum, episodeNum);
        } else {
            // Load Movie TMDB Details
            if (!tmdbData) {
                let res;
                if (channel.tmdbId) {
                    res = await window.iptvAPI.fetchTmdbById({ tmdbId: channel.tmdbId, type: 'movie' });
                } else {
                    res = await window.iptvAPI.fetchTmdbByTitle({ title: channel.title, type: 'movie' });
                }
                if (res && !res.error) {
                    tmdbData = res;
                }
            }
            
            renderTmdbMovieCard(channel, tmdbData);
        }
    } catch (e) {
        console.error('[TMDB EPG ERR] Failed to load TMDB details:', e);
        renderTmdbFallbackCard(channel);
    }
}

function renderTmdbMovieCard(channel, tmdbData) {
    const container = document.getElementById('epg-container');
    if (!container) return;
    
    if (!tmdbData || tmdbData.error) {
        renderTmdbFallbackCard(channel);
        return;
    }
    
    const title = tmdbData.title || channel.title;
    const poster = tmdbData.poster_path || channel.logo || 'assets/logo.ico';
    const rating = tmdbData.vote_average && tmdbData.vote_average !== 'N/A' ? `★ ${parseFloat(tmdbData.vote_average).toFixed(1)}` : '';
    const releaseDate = tmdbData.release_date || '';
    const year = releaseDate && releaseDate !== 'N/A' ? new Date(releaseDate).getFullYear() : '';
    const runtime = tmdbData.runtime && tmdbData.runtime !== 'N/A' ? `${tmdbData.runtime}m` : '';
    const genres = tmdbData.genres && tmdbData.genres.length > 0 ? tmdbData.genres.map(g => g.name).join(', ') : '';
    const overview = tmdbData.overview || 'No synopsis available.';
    
    let director = tmdbData.director || '';
    let cast = tmdbData.cast && tmdbData.cast.length > 0 ? tmdbData.cast.join(', ') : '';
    
    if (!director && tmdbData.credits && tmdbData.credits.crew) {
        const dirObj = tmdbData.credits.crew.find(c => c.job === 'Director');
        if (dirObj) director = dirObj.name;
    }
    if (!cast && tmdbData.credits && tmdbData.credits.cast) {
        cast = tmdbData.credits.cast.slice(0, 5).map(c => c.name).join(', ');
    }
    
    let metaHtml = '';
    if (rating) metaHtml += `<span class="tmdb-epg-rating">${rating}</span>`;
    if (year) metaHtml += `<span>${year}</span>`;
    if (runtime) metaHtml += `<span>${runtime}</span>`;
    metaHtml += `<span class="tmdb-epg-badge">Movie</span>`;
    
    let footerHtml = '';
    if (genres) footerHtml += `<div class="tmdb-epg-footer-item"><span class="tmdb-epg-footer-label">Genres</span><span class="tmdb-epg-footer-value">${genres}</span></div>`;
    if (director && director !== 'N/A') footerHtml += `<div class="tmdb-epg-footer-item"><span class="tmdb-epg-footer-label">Director</span><span class="tmdb-epg-footer-value">${director}</span></div>`;
    if (cast) footerHtml += `<div class="tmdb-epg-footer-item"><span class="tmdb-epg-footer-label">Cast</span><span class="tmdb-epg-footer-value">${cast}</span></div>`;
    
    container.innerHTML = `
        <div class="tmdb-epg-container">
            <div class="tmdb-epg-poster-wrapper">
                <img class="tmdb-epg-poster" src="${poster}" alt="${title.replace(/"/g, '&quot;')}" onerror="this.onerror=null; this.src='assets/logo.ico';">
            </div>
            <div class="tmdb-epg-content">
                <div class="tmdb-epg-header">
                    <h3 class="tmdb-epg-title">${title}</h3>
                    <div class="tmdb-epg-meta">${metaHtml}</div>
                </div>
                <p class="tmdb-epg-overview">${overview}</p>
                ${footerHtml ? `<div class="tmdb-epg-footer">${footerHtml}</div>` : ''}
            </div>
        </div>
    `;
    
    // Update Now Playing EPG program info in Left Details Panel
    const detailProgram = document.getElementById('detail-program');
    if (detailProgram) {
        detailProgram.textContent = title;
    }
    const detailTimeslot = document.getElementById('detail-timeslot');
    if (detailTimeslot) {
        detailTimeslot.textContent = '';
    }
    const detailDescription = document.getElementById('detail-description');
    if (detailDescription) {
        detailDescription.textContent = '';
    }
    
    // Update pending EPG payload
    updateMpvEpgPayload(title, overview, runtime);
}

function renderTmdbEpisodeCard(channel, tmdbData, episodeData, seriesTitle, seasonNum, episodeNum) {
    const container = document.getElementById('epg-container');
    if (!container) return;
    
    if (!tmdbData || tmdbData.error) {
        renderTmdbFallbackCard(channel);
        return;
    }
    
    const showTitle = tmdbData.title || tmdbData.name || seriesTitle;
    const epTitle = episodeData && episodeData.name ? episodeData.name : `Episode ${episodeNum}`;
    
    // Use episode thumbnail still_path if available, otherwise series poster
    const poster = (episodeData && episodeData.still_path) || tmdbData.poster_path || channel.logo || 'assets/logo.ico';
    const rating = episodeData && episodeData.vote_average ? `★ ${parseFloat(episodeData.vote_average).toFixed(1)}` : (tmdbData.vote_average && tmdbData.vote_average !== 'N/A' ? `★ ${parseFloat(tmdbData.vote_average).toFixed(1)}` : '');
    const releaseDate = episodeData && episodeData.air_date ? episodeData.air_date : (tmdbData.release_date || '');
    const year = releaseDate && releaseDate !== 'N/A' ? new Date(releaseDate).getFullYear() : '';
    const genres = tmdbData.genres && tmdbData.genres.length > 0 ? tmdbData.genres.map(g => g.name).join(', ') : '';
    const overview = (episodeData && episodeData.overview && episodeData.overview !== 'No description available.') ? episodeData.overview : (tmdbData.overview || 'No synopsis available.');
    
    let cast = tmdbData.cast && tmdbData.cast.length > 0 ? tmdbData.cast.join(', ') : '';
    if (!cast && tmdbData.credits && tmdbData.credits.cast) {
        cast = tmdbData.credits.cast.slice(0, 5).map(c => c.name).join(', ');
    }
    
    let metaHtml = '';
    if (rating) metaHtml += `<span class="tmdb-epg-rating">${rating}</span>`;
    if (year) metaHtml += `<span>${year}</span>`;
    metaHtml += `<span class="tmdb-epg-badge">S${seasonNum}E${episodeNum}</span>`;
    metaHtml += `<span class="tmdb-epg-badge" style="background: rgba(43, 203, 68, 0.15); color: #43CB44; border-color: rgba(43, 203, 68, 0.25);">TV Show</span>`;
    
    let footerHtml = '';
    if (genres) footerHtml += `<div class="tmdb-epg-footer-item"><span class="tmdb-epg-footer-label">Genres</span><span class="tmdb-epg-footer-value">${genres}</span></div>`;
    if (cast) footerHtml += `<div class="tmdb-epg-footer-item"><span class="tmdb-epg-footer-label">Cast</span><span class="tmdb-epg-footer-value">${cast}</span></div>`;
    
    container.innerHTML = `
        <div class="tmdb-epg-container">
            <div class="tmdb-epg-poster-wrapper" style="${episodeData && episodeData.still_path ? 'aspect-ratio: 16/10; width: 180px;' : 'aspect-ratio: 2/3; width: 130px;'}">
                <img class="tmdb-epg-poster" src="${poster}" alt="${epTitle.replace(/"/g, '&quot;')}" onerror="this.onerror=null; this.src='assets/logo.ico';">
            </div>
            <div class="tmdb-epg-content">
                <div class="tmdb-epg-header">
                    <h3 class="tmdb-epg-title" style="font-size: 1.3em; color: #aaa; font-weight: 500; margin-bottom: 2px;">${showTitle}</h3>
                    <h4 class="tmdb-epg-subtitle" style="font-size: 1.6em; color: #fff; font-weight: 800;">${epTitle}</h4>
                    <div class="tmdb-epg-meta">${metaHtml}</div>
                </div>
                <p class="tmdb-epg-overview">${overview}</p>
                ${footerHtml ? `<div class="tmdb-epg-footer">${footerHtml}</div>` : ''}
            </div>
        </div>
    `;
    
    // Update Now Playing EPG program info in Left Details Panel
    const detailProgram = document.getElementById('detail-program');
    if (detailProgram) {
        detailProgram.textContent = `${showTitle} - S${seasonNum}E${episodeNum}`;
    }
    const detailTimeslot = document.getElementById('detail-timeslot');
    if (detailTimeslot) {
        detailTimeslot.textContent = '';
    }
    const detailDescription = document.getElementById('detail-description');
    if (detailDescription) {
        detailDescription.textContent = '';
    }
    
    // Update pending EPG payload
    updateMpvEpgPayload(`${showTitle} - S${seasonNum}E${episodeNum} - ${epTitle}`, overview, `S${seasonNum}E${episodeNum}`);
}

function renderTmdbFallbackCard(channel) {
    const container = document.getElementById('epg-container');
    if (!container) return;
    
    const parsed = parseM3uSeriesName(channel.title);
    const hasSeriesPattern = channel.title && (
        /s\d+\s*e\d+/i.test(channel.title) || 
        /season\s*\d+\s*episode\s*\d+/i.test(channel.title) ||
        /\d+x\d+/i.test(channel.title)
    );
    const isEpisode = channel.type === 'episode' || channel.type === 'series' || hasSeriesPattern;
    
    const title = channel.title || 'Unknown Stream';
    const poster = channel.logo || 'assets/logo.ico';
    
    container.innerHTML = `
        <div class="tmdb-epg-container">
            <div class="tmdb-epg-poster-wrapper">
                <img class="tmdb-epg-poster" src="${poster}" alt="${title.replace(/"/g, '&quot;')}" onerror="this.onerror=null; this.src='assets/logo.ico';">
            </div>
            <div class="tmdb-epg-content">
                <div class="tmdb-epg-header">
                    <h3 class="tmdb-epg-title">${title}</h3>
                    <div class="tmdb-epg-meta">
                        <span class="tmdb-epg-badge" style="background: rgba(255,255,255,0.05); color: #fff; border-color: rgba(255,255,255,0.1);">${isEpisode ? 'Episode' : 'Movie'}</span>
                    </div>
                </div>
                <p class="tmdb-epg-overview" style="color: #888; font-style: italic;">No synopsis available on TMDB. Please check if your TMDB API configuration is valid in Settings.</p>
            </div>
        </div>
    `;
    
    // Update Now Playing EPG program info in Left Details Panel
    const detailProgram = document.getElementById('detail-program');
    if (detailProgram) {
        detailProgram.textContent = title;
    }
    const detailTimeslot = document.getElementById('detail-timeslot');
    if (detailTimeslot) {
        detailTimeslot.textContent = '';
    }
    const detailDescription = document.getElementById('detail-description');
    if (detailDescription) {
        detailDescription.textContent = '';
    }
}

function updateMpvEpgPayload(title, overview, time) {
    const epgUpdatePayload = {
        title: title || '',
        progTitle: title || '',
        progDesc: overview || '',
        progTime: time || ''
    };
    
    if (window.hasStartedPlayback) {
        const encoded = encodeURIComponent(JSON.stringify(epgUpdatePayload));
        window.iptvAPI.sendMpvCommand(`script-message update-epg ${encoded}`);
    } else {
        window.pendingEpgUpdate = epgUpdatePayload;
    }
}

async function updatePlayingChannelEpg(channel) {
    if (!channel || channel.type === 'movie' || channel.type === 'series' || channel.type === 'episode') return;
    
    const mappedId = channelMappings[channel.title];
    const epgIds = [mappedId, channel.tvg_id, channel.tvg_name].filter(Boolean);
    if (epgIds.length === 0) return;
    
    try {
        const epgData = await window.iptvAPI.getEpg(epgIds, null, null);
        
        let programmes = [];
        for (const id of epgIds) {
            if (epgData[id] && epgData[id].length > 0) { programmes = epgData[id]; break; }
        }
        
        const currentProg = getCurrentProgram(programmes);
        if (!currentProg) return;
        
        const pStart = parseEpgTime(currentProg.start);
        const pEnd = parseEpgTime(currentProg.stop);
        const timeStr = `${pStart.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - ${pEnd.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
        
        const detailProgram = document.getElementById('detail-program');
        if (detailProgram && detailProgram.textContent !== currentProg.title) {
            console.log('[EPG TRACKER] Program changed to:', currentProg.title);
            
            detailProgram.textContent = currentProg.title || 'No Title';
            
            const detailTimeslot = document.getElementById('detail-timeslot');
            if (detailTimeslot) {
                detailTimeslot.textContent = timeStr;
                detailTimeslot.style.display = 'block';
            }
            
            const detailDescription = document.getElementById('detail-description');
            if (detailDescription) {
                detailDescription.textContent = currentProg.desc || 'No description available.';
                detailDescription.style.display = 'block';
            }
            
            // Also update the OSC inside MPV
            updateMpvEpgPayload(currentProg.title, currentProg.desc || '', timeStr);
            
            // Also update pendingEpgUpdate payload
            window.pendingEpgUpdate = {
                title: channel.title || '',
                progTitle: currentProg.title || '',
                progDesc: currentProg.desc || '',
                progTime: timeStr
            };
        }
    } catch (e) {
        console.error('[EPG TRACKER ERR] Failed to update playing channel EPG:', e);
    }
}

// ==========================================
// --- DVR LIVE TV RECORDINGS FRONTEND ---
// ==========================================

function formatBytes(bytes) {
    if (bytes === 0) return '0 MB';
    const mb = bytes / (1024 * 1024);
    return mb.toFixed(2) + ' MB';
}

async function renderRecordings() {
    const activeSection = document.getElementById('active-recordings-section');
    const activeList = document.getElementById('active-recordings-list');
    const savedList = document.getElementById('saved-recordings-list');
    
    if (!savedList) return;
    
    let activeRecs = [];
    try {
        activeRecs = await window.iptvAPI.getActiveRecordings();
        // Safe merge instead of wholesale overwrite to prevent blocking starting toast notifications
        activeRecs.forEach(r => {
            if (!clientActiveRecordings.some(x => x.id === r.id)) {
                clientActiveRecordings.push({
                    ...r,
                    status: 'recording'
                });
            }
        });
        // Clean out stale items
        clientActiveRecordings = clientActiveRecordings.filter(r => r.status !== 'recording' || activeRecs.some(x => x.id === r.id));
    } catch (e) {
        console.error('Error fetching active recordings:', e);
    }
    
    if (activeRecs.length > 0) {
        if (activeSection) activeSection.style.display = 'flex';
        if (activeList) {
            activeList.innerHTML = activeRecs.map(rec => {
                const elapsedMin = Math.round((Date.now() - rec.startTime) / 60000);
                return `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 15px; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.05); border-radius: 8px;">
                    <div style="display: flex; flex-direction: column; overflow: hidden; min-width: 0; flex-grow: 1;">
                        <span style="color: #fff; font-weight: bold; font-size: 0.95em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${rec.channelName}</span>
                        <span style="color: #bbb; font-size: 0.85em; margin-top: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Recording: ${rec.programName}</span>
                        <span style="color: #888; font-size: 0.8em; margin-top: 4px;" id="active-progress-${rec.id}">Size: ${formatBytes(rec.bytesWritten)} &bull; ${elapsedMin} min elapsed</span>
                    </div>
                    <button class="playlist-btn stop-rec-btn" data-id="${rec.id}" style="background: #cf6679; color: black; font-weight: bold; padding: 8px 16px; border-radius: 6px;">Stop</button>
                </div>`;
            }).join('');
            
            activeList.querySelectorAll('.stop-rec-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const id = btn.getAttribute('data-id');
                    const stopped = await window.iptvAPI.stopRecording(id);
                    if (stopped) {
                        showToast('Recording stopped');
                        clientActiveRecordings = clientActiveRecordings.filter(r => r.id !== id);
                        renderRecordings();
                        renderFullEpg();
                    } else {
                        showToast('Failed to stop recording.', true);
                    }
                });
            });
        }
    } else {
        if (activeSection) activeSection.style.display = 'none';
        if (activeList) activeList.innerHTML = '';
    }
    
    let savedRecs = [];
    try {
        savedRecs = await window.iptvAPI.getRecordings();
    } catch (e) {
        console.error('Error fetching saved recordings:', e);
    }
    
    if (savedRecs.length > 0) {
        savedList.innerHTML = savedRecs.map(rec => {
            const dateStr = new Date(rec.createdTime).toLocaleString();
            return `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 14px 18px; background: rgba(30,30,30,0.6); border: 1px solid rgba(255,255,255,0.06); border-radius: 10px; backdrop-filter: blur(10px);">
                <div style="display: flex; flex-direction: column; overflow: hidden; min-width: 0; flex-grow: 1; margin-right: 15px;">
                    <span style="color: #fff; font-weight: bold; font-size: 0.95em; word-break: break-all;">${rec.filename.replace('.ts', '')}</span>
                    <span style="color: #888; font-size: 0.8em; margin-top: 5px;">Recorded on: ${dateStr} &bull; Size: ${formatBytes(rec.sizeBytes)}</span>
                </div>
                <div style="display: flex; gap: 8px;">
                    <button class="playlist-btn play-rec-btn" data-path="${rec.absolutePath.replace(/"/g, '&quot;')}" data-name="${rec.filename.replace(/"/g, '&quot;')}" style="background: #bb86fc; color: black; font-weight: bold; padding: 8px 16px; border-radius: 6px;">Play</button>
                    <button class="playlist-btn delete-rec-btn" data-filename="${rec.filename.replace(/"/g, '&quot;')}" style="background: transparent; color: #cf6679; border: 1px solid rgba(207,102,121,0.4); padding: 8px 16px; border-radius: 6px;">Delete</button>
                </div>
            </div>`;
        }).join('');
        
        savedList.querySelectorAll('.play-rec-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const filePath = btn.getAttribute('data-path');
                const fileName = btn.getAttribute('data-name');
                console.log('[DVR PLAY] Playing recorded stream:', filePath);
                const recordingChannelObject = {
                    title: fileName.replace('.ts', ''),
                    url: filePath,
                    type: 'live'
                };
                switchTab('live-tv', document.getElementById('btn-live-tv'));
                embedStream(recordingChannelObject);
            });
        });
        
        savedList.querySelectorAll('.delete-rec-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const filename = btn.getAttribute('data-filename');
                showConfirmToast(`Are you sure you want to delete recording: ${filename}?`, async () => {
                    const deleted = await window.iptvAPI.deleteRecording(filename);
                    if (deleted) {
                        showToast('Recording deleted.');
                        renderRecordings();
                    } else {
                        showToast('Failed to delete recording.', true);
                    }
                });
            });
        });
    } else {
        savedList.innerHTML = '<div style="color: #666; text-align: center; padding: 40px 0; font-style: italic;">No saved recordings found in your configured folder.</div>';
    }
}

try {
    window.iptvAPI.onRecordingStatusChange((data) => {
        console.log('[DVR STATUS UPDATE]', data);
        
        if (data.status === 'recording') {
            const existing = clientActiveRecordings.find(r => r.id === data.id);
            if (existing) {
                existing.bytesWritten = data.bytesWritten;
            } else {
                clientActiveRecordings.push({
                    id: data.id,
                    channelName: data.channelName,
                    programName: data.programName,
                    filename: data.filename,
                    status: 'recording',
                    bytesWritten: data.bytesWritten,
                    startTime: data.startTime || Date.now()
                });
                
                // Show notification when a new recording starts
                const startInfo = data.programName ? `"${data.programName}" on ` : '';
                showToast(`Recording Started: ${startInfo}${data.channelName || 'Stream'}`);
            }
            
            const progressEl = document.getElementById(`active-progress-${data.id}`);
            if (progressEl) {
                const elapsedMin = Math.round((Date.now() - (data.startTime || Date.now())) / 60000);
                progressEl.innerHTML = `Size: ${formatBytes(data.bytesWritten)} &bull; ${elapsedMin} min elapsed`;
            }
        } else if (data.status === 'completed' || data.status === 'error' || data.status === 'stopped') {
            const finished = clientActiveRecordings.find(r => r.id === data.id);
            clientActiveRecordings = clientActiveRecordings.filter(r => r.id !== data.id);
            if (data.status === 'completed') {
                const finishedInfo = finished && finished.programName ? `"${finished.programName}"` : data.filename;
                showToast(`Recording Completed: ${finishedInfo}`);
            } else if (data.status === 'error') {
                showToast(`Recording Failed: ${data.error || 'Connection Lost'}`, true);
            }
            
            const recView = document.getElementById('recording-view');
            if (recView && recView.style.display === 'flex') {
                renderRecordings();
            }
            renderFullEpg();
            const liveView = document.getElementById('live-tv-view');
            if (liveView && liveView.style.display === 'flex') {
                renderLiveEpg();
            }
        }
    });
} catch (e) {
    console.error('Failed to register onRecordingStatusChange listener:', e);
}

async function resolveChannelStreamUrl(channel) {
    let finalStreamUrl = channel.stream_url || channel.url || '';
    if (finalStreamUrl.startsWith('stalker-cmd:')) {
        const playlist = savedPlaylists.find(p => p.id === channel.playlist_id || p.id === channel.playlistId);
        if (playlist && playlist.epg && playlist.epg.startsWith('stalker:')) {
            const mac = playlist.epg.substring(8);
            const parts = finalStreamUrl.substring(12).split('|');
            const type = parts[0];
            const cmd = parts.slice(1).join('|');
            const resolved = await window.iptvAPI.resolveStalkerLink({ url: playlist.source, mac, type, cmd });
            if (resolved) finalStreamUrl = resolved;
        }
    }
    return finalStreamUrl;
}
