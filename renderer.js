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

    /* Global Typography & Rich Heavy Purple Gradient Background */
    body { 
        font-family: 'Inter', sans-serif; 
        font-weight: normal; 
        background: linear-gradient(180deg, #3c096c 0%, #240046 35%, #10002b 70%, #03001e 100%) !important;
        background-attachment: fixed !important;
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
        /* Promote sidebar to its own compositing layer to avoid repaint on scroll */
        will-change: transform;
        contain: layout style paint;
    }

    /* ── Performance: suppress expensive blur & transitions during fullscreen
       toggle to prevent GPU compositing thrash on the way in and out ─────── */
    body.fullscreen-transitioning * {
        backdrop-filter: none !important;
        -webkit-backdrop-filter: none !important;
        transition: none !important;
        animation: none !important;
    }

    /* Promote the main view panels to their own compositing layers so
       tab-switching display:flex/none does not repaint the entire document */
    #main-view, #playlist-view, #epg-view, #settings-view,
    #movies-view, #vod-view, #recording-view {
        contain: layout style paint;
        will-change: transform;
    }

    /* Channel items: GPU-accelerated hover translate (avoids layout reflow) */
    .channel-item {
        transform: translateZ(0);
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
        background: rgba(15, 15, 18, 0.45) !important;
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
        background: rgba(187, 134, 252, 0.1) !important;
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
        background: rgba(15, 15, 18, 0.45) !important;
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

    #card-add-playlist,
    #card-my-playlists {
        transition: border-color 0.25s ease !important;
    }
    #card-add-playlist:hover,
    #card-my-playlists:hover {
        border-color: rgba(187, 134, 252, 0.2) !important;
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

    #playlist-side-menu {
        background: rgba(18, 18, 24, 0.45) !important;
        backdrop-filter: blur(24px) !important;
        -webkit-backdrop-filter: blur(24px) !important;
        border: 1px solid rgba(255, 255, 255, 0.05) !important;
        border-radius: 16px !important;
        box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3) !important;
        padding: 20px !important;
        box-sizing: border-box;
    }

    .settings-menu-btn, .playlist-menu-btn {
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
    .settings-menu-btn:hover, .playlist-menu-btn:hover {
        color: #ffffff !important;
        background: rgba(255, 255, 255, 0.08) !important;
        border-color: rgba(255, 255, 255, 0.08) !important;
        transform: translateY(-1px) !important;
    }
    .settings-menu-btn.active, .playlist-menu-btn.active {
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
    #card-epg, #card-reminders, #card-mapping, #card-remote, #card-tmdb, #card-add-playlist, #card-my-playlists {
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
    #card-epg:hover, #card-reminders:hover, #card-mapping:hover, #card-remote:hover, #card-tmdb:hover, #card-add-playlist:hover, #card-my-playlists:hover {
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
    #settings-view h3, #playlist-view h3 {
        font-size: 1.05rem !important;
        font-weight: 700 !important;
        letter-spacing: -0.01em !important;
        color: #ffffff !important;
        margin-top: 0 !important;
    }
    #settings-view p {
    #settings-view p, #playlist-view p {
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

/**
 * Generates Windows-style spinning dots loading animation HTML.
 * @param {string} [label='Loading...'] - Text displayed below the spinner.
 * @param {object} [options] - Optional configuration.
 * @param {'normal'|'large'|'compact'} [options.size='normal'] - Size variant.
 * @param {boolean} [options.overlay=false] - Wrap in a full-area overlay.
 * @returns {string} HTML string.
 */
function getWinSpinnerHtml(label = 'Loading...', options = {}) {
    const size = options.size || 'normal';
    const overlay = options.overlay || false;
    const ringClass = size === 'large' ? 'win-loading-ring large' : 'win-loading-ring';
    const containerClass = size === 'compact' ? 'win-loading-container compact' : 'win-loading-container';
    const dots = '<div class="win-loading-dot"></div>'.repeat(5);
    const inner = `
        <div class="${containerClass}">
            <div class="${ringClass}">${dots}</div>
            <span class="win-loading-label">${label}</span>
        </div>`;
    if (overlay) {
        return `<div class="win-loading-overlay">${inner}</div>`;
    }
    return inner;
}

/**
 * Shows a global full-screen centered loading spinner overlay.
 * Used for background processes where the next view opens after completion.
 * @param {string} [label='Loading...'] - Text displayed below the spinner.
 */
function showGlobalSpinner(label = 'Loading...') {
    let overlay = document.getElementById('global-spinner-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'global-spinner-overlay';
        overlay.style.cssText = 'position: fixed; inset: 0; z-index: 9999; display: flex; align-items: center; justify-content: center; background: rgba(3, 0, 30, 0.65); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); transition: opacity 0.25s ease; opacity: 0;';
        document.body.appendChild(overlay);
    }
    overlay.innerHTML = getWinSpinnerHtml(label, { size: 'large' });
    overlay.style.display = 'flex';
    // Force reflow then animate in
    void overlay.offsetWidth;
    overlay.style.opacity = '1';
}

/**
 * Hides the global full-screen loading spinner overlay.
 */
function hideGlobalSpinner() {
    const overlay = document.getElementById('global-spinner-overlay');
    if (overlay) {
        overlay.style.opacity = '0';
        setTimeout(() => {
            overlay.style.display = 'none';
            overlay.innerHTML = '';
        }, 250);
    }
}

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

    if (window.isAppFullscreen && streamActive) {
        if (window.iptvAPI && typeof window.iptvAPI.showNativeToast === 'function') {
            window.iptvAPI.showNativeToast(message, 3000);
            return;
        }
        window.iptvAPI.sendMpvCommand(['show-text', message, '3000']);
    }
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

    if (window.isAppFullscreen) {
        if (window.iptvAPI && typeof window.iptvAPI.setConfirmToastActive === 'function') {
            window.iptvAPI.setConfirmToastActive(true);
        }
    }
    let toast = document.getElementById('toast-notification');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast-notification';
        document.body.appendChild(toast);
    }
    if (toast.hideTimeout) clearTimeout(toast.hideTimeout);

    // Style for modern premium interactive look matching the purple-obsidian-glass theme (Z-INDEX 2147483647 to sit on top)
    toast.style.cssText = 'position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%) translateY(20px); background: rgba(18, 18, 24, 0.85); color: #ffffff; border: 1px solid rgba(187, 134, 252, 0.45); padding: 18px 26px; border-radius: 16px; z-index: 2147483647; font-family: "Inter", sans-serif; box-shadow: 0 10px 30px rgba(187, 134, 252, 0.15), 0 5px 15px rgba(0,0,0,0.5); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); transition: opacity 0.3s cubic-bezier(0.25, 0.8, 0.25, 1), transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1); opacity: 0; display: flex; flex-direction: column; gap: 12px; align-items: center; pointer-events: auto; min-width: 320px; text-align: center;';

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
        if (window.isAppFullscreen) {
            if (window.iptvAPI && typeof window.iptvAPI.setConfirmToastActive === 'function') {
                window.iptvAPI.setConfirmToastActive(false);
            }
        }
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
    return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}`;
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

// ─── Multi-Stage EPG Matching Pipeline ─────────────────────────────────────

/** Levenshtein edit-distance ratio → 0–100 */
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

/** Token overlap (Jaccard-like): common_tokens / max_tokens → 0–100 */
function tokenOverlapScore(a, b) {
    if (!a || !b) return 0;
    const ta = new Set(a.split(' ').filter(Boolean));
    const tb = new Set(b.split(' ').filter(Boolean));
    if (!ta.size || !tb.size) return 0;
    let common = 0;
    ta.forEach(t => { if (tb.has(t)) common++; });
    return Math.round((common / Math.max(ta.size, tb.size)) * 100);
}

/** Token sort ratio: sort tokens alphabetically then Levenshtein → 0–100 */
function tokenSortRatio(a, b) {
    if (!a || !b) return 0;
    const sa = a.split(' ').filter(Boolean).sort().join(' ');
    const sb = b.split(' ').filter(Boolean).sort().join(' ');
    return levenshteinRatio(sa, sb);
}

/** Token set ratio (rapidfuzz-style): intersection vs each remainder → 0–100 */
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

/** Channel alias dictionary — common naming inconsistencies across IPTV providers */
const CHANNEL_ALIASES = {
    // Sony
    'sonymax':           ['sony max', 'max hd', 'max india'],
    'sonyliv':           ['sony liv'],
    'sonypix':           ['sony pix', 'pix hd'],
    'sonyentertainment': ['set india', 'sony entertainment television', 'sony et', 'sony entertainment', 'sony tv'],
    'sonysports1':       ['sony ten 1', 'ten sports 1', 'ten 1', 'sony ten1'],
    'sonysports2':       ['sony ten 2', 'ten sports 2', 'ten 2', 'sony ten2'],
    'sonysports3':       ['sony ten 3', 'ten sports 3', 'ten 3', 'sony ten3'],
    'sonysports5':       ['sony ten 5', 'ten sports 5', 'ten 5', 'sony ten5'],
    'sonysix':           ['sony six', 'six hd'],
    'sonymix':           ['sony mix', 'mix hd'],
    // Star
    'starplus':          ['star plus', 'starplus', 'star plus india'],
    'stargold':          ['star gold', 'gold india'],
    'starmovies':        ['star movies', 'fox star movies'],
    'startv':            ['star vijay', 'vijay tv', 'vijay'],
    'starutsav':         ['star utsav', 'utsav'],
    'starjalsha':        ['star jalsha', 'jalsha'],
    'starsports1':       ['star sports 1', 'starsports 1', 'star sports first', 'star sports hindi'],
    'starsports2':       ['star sports 2', 'starsports 2'],
    'starsports3':       ['star sports 3', 'starsports 3'],
    'starsports4':       ['star sports 4', 'starsports 4'],
    // Colors
    'colors':            ['colors tv', 'colors hd', 'colors india', 'colors viacom'],
    'colorsinfiniti':    ['colors infinity', 'infinity', 'colors infinity hd'],
    'colorsrishtey':     ['colors rishtey', 'rishtey'],
    'colorsbangla':      ['colors bangla'],
    'colorskannada':     ['colors kannada'],
    // Zee
    'zeetv':             ['zee entertainment', 'zee india', 'zee tv'],
    'zeecafe':           ['zee cafe'],
    'zeeclassic':        ['zee classic'],
    'zeebangla':         ['zee bangla'],
    'zeemarathi':        ['zee marathi'],
    'zeetelugu':         ['zee telugu'],
    'zeekannada':        ['zee kannada'],
    'zeecinema':         ['zee cinema', 'zee cinema hd'],
    // Discovery
    'discovery':         ['discovery channel', 'disc channel'],
    'discoveryscience':  ['discovery science', 'disc science'],
    'discoveryturbo':    ['discovery turbo', 'turbo'],
    'animalplanet':      ['animal planet', 'animal planet hd'],
    'tlc':               ['tlc india', 'tlc hd'],
    // Sports
    'espn':              ['espn us', 'espn america', 'espn sports'],
    'espn2':             ['espn 2', 'espnews'],
    'skysports1':        ['sky sports 1', 'sky sports main event', 'sky main event'],
    'skysports2':        ['sky sports 2', 'sky sports football'],
    'eurosport1':        ['eurosport 1', 'eurosport'],
    'eurosport2':        ['eurosport 2'],
    // UK
    'bbcone':            ['bbc 1', 'bbc one', 'bbc1'],
    'bbctwo':            ['bbc 2', 'bbc two', 'bbc2'],
    'bbcthree':          ['bbc 3', 'bbc three', 'bbc3'],
    'bbcfour':           ['bbc 4', 'bbc four', 'bbc4'],
    'bbcnews':           ['bbc world news', 'bbc news channel', 'bbc news 24'],
    'itv':               ['itv 1', 'itv1', 'itv hd'],
    'itv2':              ['itv 2'],
    'channel4':          ['ch4', 'c4', 'channel 4', 'ch 4'],
    'channel5':          ['ch5', 'c5', 'channel 5', 'ch 5', 'five'],
    'skyone':            ['sky 1', 'sky one'],
    'skyatlantic':       ['sky atlantic'],
    // News
    'cnn':               ['cnn international', 'cnn hd', 'cnn world'],
    'cnbcinternational': ['cnbc world', 'cnbc tv18', 'cnbc awaaz'],
    'bloomberg':         ['bloomberg tv', 'bloomberg hd'],
    'aljazeeraenglish':  ['al jazeera', 'aljazeera english', 'al jazeera english'],
    'ndtv24x7':          ['ndtv 24x7', 'ndtv', 'ndtv india'],
    'aajtak':            ['aaj tak', 'aajtak news'],
    'republicbharat':    ['republic bharat', 'republic tv india'],
    // Kids
    'cartoonnetwork':    ['cartoon network', 'cn'],
    'nickelodeon':       ['nick', 'nickelodeon hd', 'nick india'],
    'nickjr':            ['nick jr', 'nick junior'],
    'pogo':              ['pogo tv'],
    'disneyjunior':      ['disney junior', 'disney jr'],
    'disneyxd':          ['disney xd'],
    // Movies
    'hbo':               ['hbo asia', 'hbo hd'],
    'foxmovies':         ['fox movies', 'fox movies premium', 'star fox movies'],
    'romedy':            ['romedy now'],
    // Music
    'mtv':               ['mtv india', 'mtv hd'],
    'vh1':               ['vh1 india', 'vh1 hd'],
};

/** Build a flat normalized-alias → canonical key lookup (cached after first call) */
let _aliasLookupCache = null;
function buildAliasLookup() {
    if (_aliasLookupCache) return _aliasLookupCache;
    _aliasLookupCache = new Map();
    for (const [canonical, aliases] of Object.entries(CHANNEL_ALIASES)) {
        const normKey = normalizeChannelName(canonical).replace(/\s+/g, '');
        _aliasLookupCache.set(normKey, canonical);
        _aliasLookupCache.set(normalizeChannelName(canonical), canonical);
        for (const alias of aliases) {
            _aliasLookupCache.set(normalizeChannelName(alias).replace(/\s+/g, ''), canonical);
            _aliasLookupCache.set(normalizeChannelName(alias), canonical);
        }
    }
    return _aliasLookupCache;
}

/**
 * Score a playlist channel title against an EPG channel (name + id).
 * Returns { score: 0–100, stage: string, detail: string }
 *
 * Weighted formula: 0.40×tokenSet + 0.25×tokenSort + 0.20×levenshtein + 0.15×tokenOverlap
 */
function scoreChannelPair(chTitle, epgName, epgId) {
    const normCh  = normalizeChannelName(chTitle);
    const normEpg = normalizeChannelName(epgName || epgId || '');
    const normId  = normalizeChannelName(epgId || '');

    if (!normCh || !normEpg) return { score: 0, stage: 'none', detail: '' };

    // Strict number mismatch guard: "Star Sports 1" must NOT map to "Star Sports 2"
    const numsA   = (normCh.match(/\d+/g)  || []).sort().join(',');
    const numsB   = (normEpg.match(/\d+/g) || []).sort().join(',');
    const numsBId = (normId.match(/\d+/g)  || []).sort().join(',');
    if (numsA) {
        if ((numsB   && numsA !== numsB) ||
            (numsBId && numsA !== numsBId)) {
            return { score: 0, stage: 'number_mismatch', detail: '' };
        }
    }

    // Stage 1 – Exact normalized match (confidence 100)
    if (normCh === normEpg || normCh === normId) {
        return { score: 100, stage: 'exact', detail: 'Exact normalized match' };
    }

    // Stage 2 – Alias dictionary (confidence 97)
    const aliasMap = buildAliasLookup();
    const chSlug   = normCh.replace(/\s+/g, '');
    const epgSlug  = normEpg.replace(/\s+/g, '');
    const chCan    = aliasMap.get(chSlug)  || aliasMap.get(normCh);
    const epgCan   = aliasMap.get(epgSlug) || aliasMap.get(normEpg);
    if (chCan && epgCan && chCan === epgCan) {
        return { score: 97, stage: 'alias', detail: 'Alias dictionary match' };
    }

    // Stages 3–6 – Weighted fuzzy scoring
    const calcWeighted = (norm) => {
        const ts    = tokenSetRatio(normCh, norm);
        const tsort = tokenSortRatio(normCh, norm);
        const lev   = levenshteinRatio(normCh, norm);
        const to    = tokenOverlapScore(normCh, norm);
        return { score: 0.40 * ts + 0.25 * tsort + 0.20 * lev + 0.15 * to, ts, tsort, lev, to };
    };

    const byName = calcWeighted(normEpg);
    const byId   = (normId && normId !== normEpg) ? calcWeighted(normId) : { score: 0 };
    const best   = byName.score >= (byId.score || 0) ? byName : byId;
    const finalScore = Math.round(best.score);

    // Dominant algorithm label for the UI
    const dominant = Object.entries({
        'Token Set Ratio':  best.ts   || 0,
        'Token Sort Ratio': best.tsort || 0,
        'Levenshtein':      best.lev   || 0,
        'Token Overlap':    best.to    || 0,
    }).sort((a, b) => b[1] - a[1])[0];

    return {
        score:  finalScore,
        stage:  'fuzzy',
        detail: `${dominant[0]}: ${Math.round(dominant[1])}`,
    };
}

/** Legacy alias kept for any remaining call sites */
function getChannelSimilarity(str1, str2) {
    return scoreChannelPair(str1, str2, '').score / 100;
}

function showFuzzyMappingModal(suggestions, onConfirm, onCancel) {
    // Remove existing modal if any
    const existing = document.getElementById('fuzzy-mapping-modal');
    if (existing) existing.remove();

    // Create modal div
    const modalDiv = document.createElement('div');
    modalDiv.id = 'fuzzy-mapping-modal';

    modalDiv.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(10, 10, 15, 0.65);
        backdrop-filter: blur(24px);
        -webkit-backdrop-filter: blur(24px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        font-family: 'Inter', sans-serif;
        box-sizing: border-box;
    `;

    // Add dynamic keyframes to head if not present
    if (!document.getElementById('fuzzy-modal-keyframes')) {
        const style = document.createElement('style');
        style.id = 'fuzzy-modal-keyframes';
        style.textContent = `
            @keyframes fuzzyFadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            @keyframes fuzzyScaleUp {
                from { transform: scale(0.96); opacity: 0; }
                to { transform: scale(1); opacity: 1; }
            }
            .fuzzy-row {
                background: rgba(255, 255, 255, 0.02);
                border: 1px solid rgba(255, 255, 255, 0.04);
                border-radius: 8px;
                padding: 12px 16px;
                display: flex;
                align-items: center;
                gap: 15px;
                transition: all 0.2s ease;
            }
            .fuzzy-row:hover {
                background: rgba(255, 255, 255, 0.04);
                border-color: rgba(255, 255, 255, 0.08);
            }
            .fuzzy-checkbox {
                width: 18px;
                height: 18px;
                border-radius: 4px;
                accent-color: var(--primary-accent);
                cursor: pointer;
            }
        `;
        document.head.appendChild(style);
    }

    modalDiv.style.animation = 'fuzzyFadeIn 0.25s ease';

    // Build the inner HTML
    modalDiv.innerHTML = `
        <div class="settings-card" style="
            width: 700px;
            max-width: 90%;
            max-height: 85vh;
            background: rgba(20, 20, 25, 0.8) !important;
            border: 1px solid rgba(255, 255, 255, 0.08) !important;
            border-radius: 16px;
            box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
            display: flex;
            flex-direction: column;
            overflow: hidden;
            animation: fuzzyScaleUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
            box-sizing: border-box;
        ">
            <!-- Header -->
            <div style="
                padding: 20px 25px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.08);
                background: rgba(255, 255, 255, 0.02);
                display: flex;
                justify-content: space-between;
                align-items: center;
            ">
                <div>
                    <h3 style="margin: 0; color: #fff; font-family: 'Outfit', sans-serif; font-size: 1.3em;">Fuzzy Mapping Suggestions</h3>
                    <p style="margin: 5px 0 0 0; color: #888; font-size: 0.85em;">We detected these potential channel matches. Toggle selections below to confirm.</p>
                </div>
                <button id="fuzzy-modal-close-x" style="
                    background: transparent;
                    border: none;
                    color: #888;
                    font-size: 1.5em;
                    cursor: pointer;
                    transition: color 0.2s;
                    line-height: 1;
                " onmouseover="this.style.color='#fff'" onmouseout="this.style.color='#888'">&times;</button>
            </div>
            
            <!-- Selection Toolbar -->
            <div style="
                padding: 12px 25px;
                background: rgba(0, 0, 0, 0.2);
                border-bottom: 1px solid rgba(255, 255, 255, 0.04);
                display: flex;
                justify-content: space-between;
                align-items: center;
                font-size: 0.88rem;
            ">
                <span style="color: #aaa;" id="fuzzy-selected-count">0 of 0 selected</span>
                <div style="display: flex; gap: 15px;">
                    <button id="fuzzy-select-all" style="background: transparent; border: none; color: var(--primary-accent); cursor: pointer; font-weight: bold; outline: none; font-size: 0.95em;">Select All</button>
                    <button id="fuzzy-select-none" style="background: transparent; border: none; color: #888; cursor: pointer; font-weight: bold; outline: none; font-size: 0.95em;">Deselect All</button>
                </div>
            </div>

            <!-- Body / Suggestions List -->
            <div id="fuzzy-mapping-list" style="
                flex-grow: 1;
                overflow-y: auto;
                padding: 20px 25px;
                display: flex;
                flex-direction: column;
                gap: 12px;
            ">
                ${suggestions.map((item, idx) => {
        const pct  = Math.round(item.score);
        const tier = item.tier || 'review';
        let badgeStyle, tierPill;
        if (tier === 'high') {
            badgeStyle = `background: rgba(16, 185, 129, 0.15); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.3);`;
            tierPill   = `<span style="font-size:0.64rem;background:rgba(16,185,129,0.15);color:#10b981;border-radius:3px;padding:1px 5px;margin-left:5px;font-weight:700;letter-spacing:.4px;">HIGH</span>`;
        } else {
            badgeStyle = `background: rgba(245, 158, 11, 0.15); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.3);`;
            tierPill   = `<span style="font-size:0.64rem;background:rgba(245,158,11,0.15);color:#f59e0b;border-radius:3px;padding:1px 5px;margin-left:5px;font-weight:700;letter-spacing:.4px;">REVIEW</span>`;
        }
        const isChecked = tier === 'high' ? 'checked' : '';
        const detail    = item.detail || '';

        return `
                        <div class="fuzzy-row" style="box-sizing: border-box;">
                            <input type="checkbox" class="fuzzy-checkbox" data-idx="${idx}" ${isChecked} style="flex-shrink: 0;">
                            
                            <!-- Content Box -->
                            <div style="display: flex; flex-grow: 1; align-items: center; justify-content: space-between; gap: 15px; min-width: 0;">
                                <!-- Playlist Channel -->
                                <div style="flex: 1; min-width: 0; text-align: left;">
                                    <span style="color: #ffffff; font-weight: 600; display: block; font-size: 0.95rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${item.playlistTitle}">
                                        ${item.playlistTitle}
                                    </span>
                                </div>

                                <!-- Arrow & Score -->
                                <div style="display: flex; flex-direction: column; align-items: center; gap: 3px; flex-shrink: 0; min-width: 120px;">
                                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--primary-accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.8;">
                                        <line x1="5" y1="12" x2="19" y2="12"></line>
                                        <polyline points="12 5 19 12 12 19"></polyline>
                                    </svg>
                                    <span style="font-size: 0.72rem; font-weight: bold; border-radius: 4px; padding: 2px 8px; letter-spacing: 0.3px; display:flex; align-items:center; ${badgeStyle}">
                                        ${pct}%${tierPill}
                                    </span>
                                    ${detail ? `<span style="font-size:0.63rem;color:#64748b;text-align:center;margin-top:1px;">${detail}</span>` : ''}
                                </div>

                                <!-- Suggested EPG Channel -->
                                <div style="flex: 1; min-width: 0; text-align: left;">
                                    <span style="color: #e2e8f0; font-weight: 600; display: block; font-size: 0.95rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${item.epgName}">
                                        ${item.epgName}
                                    </span>
                                    <span style="color: #64748b; font-size: 0.78rem; display: block; margin-top: 2px;">
                                        ${item.epgSource}
                                    </span>
                                </div>
                            </div>
                        </div>
                    `;
    }).join('')}
            </div>

            <!-- Footer -->
            <div style="
                padding: 20px 25px;
                border-top: 1px solid rgba(255, 255, 255, 0.08);
                background: rgba(0, 0, 0, 0.2);
                display: flex;
                justify-content: flex-end;
                gap: 12px;
            ">
                <button id="fuzzy-modal-cancel" class="playlist-btn" style="
                    background: rgba(255, 255, 255, 0.08);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    color: #fff;
                    padding: 10px 20px;
                    border-radius: 8px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                    font-size: 0.92rem;
                ">Cancel</button>
                <button id="fuzzy-modal-apply" class="playlist-btn" style="
                    background: var(--primary-accent);
                    color: #121212;
                    border: none;
                    padding: 10px 24px;
                    border-radius: 8px;
                    font-weight: 700;
                    cursor: pointer;
                    transition: all 0.2s;
                    box-shadow: 0 4px 15px rgba(var(--primary-accent-rgb), 0.3);
                    font-size: 0.92rem;
                ">Apply Selected</button>
            </div>
        </div>
    `;

    document.body.appendChild(modalDiv);

    // Setup interactive functionality
    const checkboxes = modalDiv.querySelectorAll('.fuzzy-checkbox');
    const countEl = modalDiv.querySelector('#fuzzy-selected-count');

    function updateCount() {
        const checkedCount = Array.from(checkboxes).filter(cb => cb.checked).length;
        countEl.textContent = `${checkedCount} of ${checkboxes.length} selected`;
    }
    updateCount();

    checkboxes.forEach(cb => {
        cb.addEventListener('change', updateCount);
    });

    modalDiv.querySelector('#fuzzy-select-all').addEventListener('click', () => {
        checkboxes.forEach(cb => cb.checked = true);
        updateCount();
    });

    modalDiv.querySelector('#fuzzy-select-none').addEventListener('click', () => {
        checkboxes.forEach(cb => cb.checked = false);
        updateCount();
    });

    const closeModal = () => {
        modalDiv.style.animation = 'fuzzyFadeIn 0.2s ease reverse';
        setTimeout(() => modalDiv.remove(), 180);
    };

    modalDiv.querySelector('#fuzzy-modal-close-x').addEventListener('click', () => {
        closeModal();
        if (onCancel) onCancel();
    });

    modalDiv.querySelector('#fuzzy-modal-cancel').addEventListener('click', () => {
        closeModal();
        if (onCancel) onCancel();
    });

    modalDiv.querySelector('#fuzzy-modal-apply').addEventListener('click', () => {
        const selectedIndices = Array.from(checkboxes)
            .filter(cb => cb.checked)
            .map(cb => parseInt(cb.getAttribute('data-idx'), 10));

        const confirmedMappings = selectedIndices.map(idx => suggestions[idx]);
        closeModal();
        if (onConfirm) onConfirm(confirmedMappings);
    });
}

async function autoMapChannels(showSummaryAlert = false, skipSave = false) {
    console.log('[MAPPING] Starting 6-stage EPG mapping pipeline...');
    const playlistFilter = mappingSelectedPlaylist || 'all';
    const epgFilterEl = document.getElementById('mapping-epg-filter');
    const epgFilter = epgFilterEl ? epgFilterEl.value : 'all';

    const filteredEpgs = !epgChannelsData ? [] : (
        epgFilter === 'all'
            ? epgChannelsData
            : epgChannelsData.filter(epg => epg.source === epgFilter)
    );

    // Flat EPG key lookup for Stage 1 exact match
    const epgLookup = {};
    filteredEpgs.forEach(epg => {
        if (epg.id)   epgLookup[epg.id.toLowerCase()]   = epg.id;
        if (epg.name) epgLookup[epg.name.toLowerCase()] = epg.id;
    });

    const channelsToMap = playlistFilter === 'all'
        ? allChannels
        : allChannels.filter(ch => String(ch.playlistId) === String(playlistFilter));

    // Deduplicate by title; skip already-mapped channels
    const uniqueTitles = new Set();
    const toProcess = [];
    for (const ch of channelsToMap) {
        const title = ch.title || 'Unknown Channel';
        if (uniqueTitles.has(title) || channelMappings[title]) continue;
        uniqueTitles.add(title);
        toProcess.push(ch);
    }

    // Three result buckets
    const silentMaps  = []; // score ≥ 95 — auto-save silently (no UI)
    const highConf    = []; // score 90–94 — modal, pre-checked, green badge
    const suggestList = []; // score 80–89 — modal, unchecked, amber badge

    // ── Stage 1: Exact key match (tvg_id / tvg_name / normalized title) ─────
    const unmatched = [];
    for (const ch of toProcess) {
        const title    = ch.title || 'Unknown Channel';
        const tvgIdL   = ch.tvg_id   ? String(ch.tvg_id).toLowerCase()   : null;
        const tvgNameL = ch.tvg_name ? String(ch.tvg_name).toLowerCase() : null;
        const titleL   = title.toLowerCase();

        const exactId = (tvgIdL   && epgLookup[tvgIdL])   ? epgLookup[tvgIdL]
                      : (tvgNameL && epgLookup[tvgNameL]) ? epgLookup[tvgNameL]
                      : epgLookup[titleL]                 ? epgLookup[titleL]
                      : null;

        if (exactId) {
            silentMaps.push({ title, epgId: exactId });
        } else {
            unmatched.push(ch);
        }
    }

    // ── Stages 2–6: Scored pipeline on remaining unmatched channels ──────────
    if (unmatched.length > 0 && filteredEpgs.length > 0) {
        console.log(`[MAPPING] Weighted pipeline: ${unmatched.length} unmatched vs ${filteredEpgs.length} EPG entries...`);

        for (const ch of unmatched) {
            const title = ch.title || 'Unknown Channel';
            let bestScore = 0, bestEpg = null, bestResult = null;

            for (const epg of filteredEpgs) {
                const result = scoreChannelPair(title, epg.name, epg.id);
                if (result.score > bestScore) {
                    bestScore  = result.score;
                    bestEpg    = epg;
                    bestResult = result;
                }
            }

            if (!bestEpg || bestScore < 80) continue;

            const suggestion = {
                playlistTitle: title,
                epgId:         bestEpg.id,
                epgName:       bestEpg.name || bestEpg.id,
                epgSource:     bestEpg.source,
                score:         bestScore,
                detail:        bestResult.detail,
                stage:         bestResult.stage,
            };

            if (bestScore >= 95) {
                // Stage 2 alias hits (97) and very high fuzzy → silent
                silentMaps.push({ title, epgId: bestEpg.id });
            } else if (bestScore >= 90) {
                suggestion.tier = 'high';
                highConf.push(suggestion);
            } else {
                suggestion.tier = 'review';
                suggestList.push(suggestion);
            }
        }
    }

    // ── Apply silent mappings immediately (no UI) ────────────────────────────
    if (silentMaps.length > 0) {
        console.log(`[MAPPING] Silently saving ${silentMaps.length} high-confidence mappings (≥95)...`);
        for (const { title, epgId } of silentMaps) {
            channelMappings[title] = epgId;
        }
        await window.iptvAPI.saveMappingsBulk(silentMaps);
    }

    // Fast/silent mode — skip modal entirely
    if (skipSave) {
        if (silentMaps.length > 0) {
            updateState(true);
            renderMappingColumns();
        }
        return;
    }

    const modalSuggestions = [...highConf, ...suggestList];

    if (modalSuggestions.length === 0) {
        updateState(false);
        renderMappingColumns();
        if (showSummaryAlert) {
            showToast(silentMaps.length > 0
                ? `Auto-mapped ${silentMaps.length} channels silently (high confidence).`
                : 'No new channels could be auto-mapped.'
            );
        }
        return;
    }

    // ── Show modal for 90–94 (pre-checked) and 80–89 (unchecked) ────────────
    const hCount = highConf.length, sCount = suggestList.length;
    console.log(`[MAPPING] Modal: ${hCount} high confidence, ${sCount} to review.`);

    showFuzzyMappingModal(
        modalSuggestions,
        async (confirmedMappings) => {
            const toSave = [];
            confirmedMappings.forEach(m => {
                channelMappings[m.playlistTitle] = m.epgId;
                toSave.push({ title: m.playlistTitle, epgId: m.epgId });
            });
            if (toSave.length > 0) {
                await window.iptvAPI.saveMappingsBulk(toSave);
            }
            updateState(false);
            renderMappingColumns();
            const total = silentMaps.length + toSave.length;
            showToast(`Mapped ${total} channel${total !== 1 ? 's' : ''} (${silentMaps.length} silent + ${toSave.length} confirmed).`);
        },
        () => {
            // Cancel — silent mappings are already saved
            updateState(false);
            renderMappingColumns();
            if (silentMaps.length > 0) {
                showToast(`Auto-mapped ${silentMaps.length} channel${silentMaps.length !== 1 ? 's' : ''} silently.`);
            } else {
                showToast('No channels were mapped.');
            }
        }
    );

    // Patch modal header text after it's inserted into the DOM
    requestAnimationFrame(() => {
        const h3 = document.querySelector('#fuzzy-mapping-modal h3');
        const p  = document.querySelector('#fuzzy-mapping-modal p');
        if (h3) h3.textContent = 'EPG Mapping Suggestions';
        if (p) {
            const parts = [
                silentMaps.length ? `${silentMaps.length} auto-mapped silently` : '',
                hCount            ? `${hCount} high confidence (pre-checked)` : '',
                sCount            ? `${sCount} to review` : '',
            ].filter(Boolean);
            p.textContent = parts.join(' · ');
        }
    });
}

async function unmapAllChannelsFiltered() {
    const playlistFilter = mappingSelectedPlaylist || 'all';
    const epgFilterEl = document.getElementById('mapping-epg-filter');
    const epgFilter = epgFilterEl ? epgFilterEl.value : 'all';

    console.log(`[MAPPING] Starting bulk unmap. Playlist: ${playlistFilter}, EPG: ${epgFilter}`);

    // Build lookup of EPG channels belonging to the selected EPG source
    const epgIdsInFilter = new Set();
    if (epgChannelsData) {
        epgChannelsData.forEach(epg => {
            if (epgFilter === 'all' || epg.source === epgFilter) {
                if (epg.id) epgIdsInFilter.add(String(epg.id).toLowerCase());
            }
        });
    }

    // Build lookup of channel titles belonging to the selected playlist
    const titlesInPlaylistFilter = new Set();
    allChannels.forEach(ch => {
        if (playlistFilter === 'all' || String(ch.playlistId) === String(playlistFilter)) {
            if (ch.title) titlesInPlaylistFilter.add(ch.title);
        }
    });

    const mappingsToDelete = [];
    const titlesToUnmap = [];

    // Find mappings that match the filters
    for (const [title, mappedEpgId] of Object.entries(channelMappings)) {
        // Filter by Playlist: the title must exist in the selected playlist(s)
        if (!titlesInPlaylistFilter.has(title)) continue;

        // Filter by EPG: the mapped EPG ID must belong to the selected EPG source(s)
        if (mappedEpgId) {
            const mappedEpgIdLow = String(mappedEpgId).toLowerCase();
            if (!epgIdsInFilter.has(mappedEpgIdLow)) continue;
        }

        titlesToUnmap.push(title);
        mappingsToDelete.push({ title, epgId: null });
    }

    if (mappingsToDelete.length === 0) {
        showToast("No mapped channels found matching the current playlist/EPG filters.");
        return;
    }

    showConfirmToast(`Are you sure you want to remove ${mappingsToDelete.length} mappings matching the current filters?`, async () => {
        // Remove locally
        titlesToUnmap.forEach(title => {
            delete channelMappings[title];
        });

        // Save to DB in bulk
        await window.iptvAPI.saveMappingsBulk(mappingsToDelete);

        // Update EPG mappings state and render columns
        updateState(false);
        renderMappingColumns();
        showToast(`Successfully removed ${mappingsToDelete.length} mappings!`);
    });
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

    const currentTheme = localStorage.getItem('iptv_app_theme') || 'default';

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
    const futureReminders = (savedReminders || []).filter(r => parseEpgTime(r.startTime) > now).sort((a, b) => parseEpgTime(a.startTime) - parseEpgTime(b.startTime));

    let remindersHtml = futureReminders.length ? futureReminders.map((r, i) => {
        const st = parseEpgTime(r.startTime).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
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
                <button class="settings-menu-btn" data-target="card-theme">App Theme</button>
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
                <div id="card-epg" class="settings-card">
                    <h3 style="color: #e0e0e0; margin-top: 0; margin-bottom: 5px; font-family: 'Outfit', 'Inter', sans-serif;">External EPG Sources</h3>
                    <p style="color: #888; font-size: 0.9em; margin-bottom: 20px;">Add multiple XMLTV EPG URLs to load automatically for your playlists. (Requires refreshing your playlist to take effect).</p>
                    <div style="display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap; align-items: center;">
                        <input type="text" id="settings-new-epg" placeholder="http://.../epg.xml or local file path" style="flex: 1; min-width: 250px; background: #121212; border: 1px solid #444; color: white; padding: 10px; border-radius: 4px; outline: none; box-sizing: border-box;">
                        <button id="settings-epg-browse-btn" class="playlist-btn" style="background: #3a3a3a; color: white; font-weight: bold; padding: 10px 15px; border-radius: 4px; border: none; cursor: pointer; white-space: nowrap; transition: background 0.2s ease;">Browse</button>
                        <button id="settings-add-epg-btn" class="playlist-btn" style="background: #bb86fc; color: black; font-weight: bold; padding: 10px 20px; white-space: nowrap;">Add EPG</button>
                    </div>
                    <div id="settings-epg-list">${epgListHtml || '<div style="color:#666; font-style: italic;">No external EPGs added.</div>'}</div>
                </div>

                <!-- Playback Settings -->
                <div id="card-playback" class="settings-card">
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

                <!-- App Theme Card -->
                <div id="card-theme" class="settings-card">
                    <h3 style="color: #e0e0e0; margin-top: 0; margin-bottom: 5px; font-family: 'Outfit', 'Inter', sans-serif;">App Theme Color</h3>
                    <p style="color: #888; font-size: 0.9em; margin-bottom: 20px;">Choose a curated, premium color palette for accent styling and background gradients.</p>
                    <div style="display: flex; gap: 15px; flex-wrap: wrap;">
                        <button class="theme-select-btn default ${currentTheme === 'default' ? 'active' : ''}" data-theme="default" style="flex: 1; min-width: 100px; background: #121212; border: 2px solid ${currentTheme === 'default' ? '#bb86fc' : '#222'}; border-radius: 8px; padding: 15px 10px; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 8px; transition: all 0.2s ease;">
                            <span style="width: 24px; height: 24px; border-radius: 50%; background: #bb86fc; box-shadow: 0 0 10px rgba(187,134,252,0.4);"></span>
                            <span style="color: #fff; font-size: 0.85em; font-weight: 600;">Purple</span>
                        </button>
                        <button class="theme-select-btn teal ${currentTheme === 'teal' ? 'active' : ''}" data-theme="teal" style="flex: 1; min-width: 100px; background: #121212; border: 2px solid ${currentTheme === 'teal' ? '#069494' : '#222'}; border-radius: 8px; padding: 15px 10px; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 8px; transition: all 0.2s ease;">
                            <span style="width: 24px; height: 24px; border-radius: 50%; background: #069494; box-shadow: 0 0 10px rgba(6,148,148,0.2);"></span>
                            <span style="color: #bbb; font-size: 0.85em; font-weight: 500;">Teal</span>
                        </button>
                        <button class="theme-select-btn green ${currentTheme === 'green' ? 'active' : ''}" data-theme="green" style="flex: 1; min-width: 100px; background: #121212; border: 2px solid ${currentTheme === 'green' ? '#07a872' : '#222'}; border-radius: 8px; padding: 15px 10px; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 8px; transition: all 0.2s ease;">
                            <span style="width: 24px; height: 24px; border-radius: 50%; background: #07a872; box-shadow: 0 0 10px rgba(7,168,114,0.2);"></span>
                            <span style="color: #bbb; font-size: 0.85em; font-weight: 500;">Green</span>
                        </button>
                        <button class="theme-select-btn black ${currentTheme === 'black' ? 'active' : ''}" data-theme="black" style="flex: 1; min-width: 100px; background: #121212; border: 2px solid ${currentTheme === 'black' ? '#e0e0e0' : '#222'}; border-radius: 8px; padding: 15px 10px; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 8px; transition: all 0.2s ease;">
                            <span style="width: 24px; height: 24px; border-radius: 50%; background: #e0e0e0; box-shadow: 0 0 10px rgba(224,224,224,0.2);"></span>
                            <span style="color: #bbb; font-size: 0.85em; font-weight: 500;">Black</span>
                        </button>
                    </div>
                </div>

                <!-- Reminders Card -->
                <div id="card-reminders" class="settings-card">
                    <h3 style="color: #e0e0e0; margin-top: 0; margin-bottom: 5px; font-family: 'Outfit', 'Inter', sans-serif;">Upcoming Reminders</h3>
                    <p style="color: #888; font-size: 0.9em; margin-bottom: 20px;">Manage your scheduled program notifications.</p>
                    <div id="settings-reminders-list" style="max-height: 300px; overflow-y: auto;">
                        ${remindersHtml}
                    </div>
                </div>

                <!-- 3-Column Channel Mapping UI -->
                <div id="card-mapping" class="settings-card" style="display: flex; flex-direction: column; height: 600px;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 10px;">
                        <div style="flex: 1; min-width: 250px;">
                            <h3 style="color: #e0e0e0; margin: 0; font-family: 'Outfit', 'Inter', sans-serif;">Channel Mapping</h3>
                            <p style="color: #888; font-size: 0.9em; margin: 5px 0 15px 0;">Select a channel on the left and an EPG on the right. Instant apply updates Live TV/Guide immediately.</p>
                        </div>
                        <div style="display: flex; gap: 8px;">
                            <button id="mapping-auto-map-btn" class="playlist-btn" style="background: #43CB44; color: black; font-weight: bold; padding: 6px 12px; border-radius: 4px; font-size: 0.9em; cursor: pointer; white-space: nowrap;">Auto Map</button>
                            <button id="mapping-unmap-all-btn" class="playlist-btn" style="background: #ff5252; color: white; font-weight: bold; padding: 6px 12px; border-radius: 4px; font-size: 0.9em; cursor: pointer; white-space: nowrap;">Unmap All</button>
                        </div>
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
                <div id="card-remote" class="settings-card">
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
                <div id="card-dvr" class="settings-card">
                    <h3 style="color: #e0e0e0; margin-top: 0; margin-bottom: 5px; font-family: 'Outfit', 'Inter', sans-serif;">Recording Storage Path</h3>
                    <p style="color: #888; font-size: 0.9em; margin-bottom: 20px;">Choose where recorded live streams (.ts files) will be saved on your computer.</p>
                    <div style="display: flex; gap: 10px; margin-bottom: 10px; flex-wrap: wrap;">
                        <input type="text" id="settings-recording-path" readonly style="flex: 1; min-width: 250px; background: #121212; border: 1px solid #444; color: white; padding: 10px; border-radius: 4px; outline: none; box-sizing: border-box;">
                        <button id="settings-browse-recording-btn" class="playlist-btn" style="background: #333; color: white; border: 1px solid #444; font-weight: bold; padding: 10px 20px; white-space: nowrap;">Browse</button>
                        <button id="settings-save-recording-btn" class="playlist-btn" style="background: #bb86fc; color: black; font-weight: bold; padding: 10px 20px; white-space: nowrap;">Save Path</button>
                    </div>
                </div>

                <!-- TMDB Integration -->
                <div id="card-tmdb" class="settings-card">
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

                <!-- Danger Zone -->
                <div id="card-danger" class="settings-card" style="background: linear-gradient(135deg, rgba(207, 102, 121, 0.08), rgba(207, 102, 121, 0.02)) !important; border: 1px solid rgba(207, 102, 121, 0.35) !important; box-shadow: 0 8px 32px rgba(207, 102, 121, 0.1), inset 0 0 20px rgba(207, 102, 121, 0.05) !important; display: flex; flex-direction: column; gap: 20px;">
                    <div>
                        <h3 style="color: #ff6b6b; margin-top: 0; margin-bottom: 8px; font-family: 'Outfit', 'Inter', sans-serif; font-weight: bold; text-shadow: 0 0 10px rgba(255,107,107,0.2);">Danger Zone</h3>
                        <p style="color: rgba(255, 179, 179, 0.85); font-size: 0.9em; margin-bottom: 12px; font-family: 'Inter', sans-serif;">Completely wipe the database and reset the application to its default state. This action cannot be undone.</p>
                        <button id="settings-factory-reset-btn" class="playlist-btn" style="background: #ff5252; color: white; font-weight: bold; padding: 10px 20px; border-radius: 6px; border: none; cursor: pointer; transition: all 0.2s ease; box-shadow: 0 4px 15px rgba(255, 82, 82, 0.3);">Factory Reset</button>
                    </div>
                    <div style="border-top: 1px solid rgba(207, 102, 121, 0.2); padding-top: 15px;">
                        <h4 style="color: #e0e0e0; margin-top: 0; margin-bottom: 8px; font-family: 'Outfit', 'Inter', sans-serif; font-weight: 500;">Clear Application Logs</h4>
                        <p style="color: #aaa; font-size: 0.9em; margin-bottom: 12px; font-family: 'Inter', sans-serif;">Empty or delete all diagnostic log files to free up space or reset troubleshooting history.</p>
                        <button id="settings-clear-logs-btn" class="playlist-btn" style="background: #e0aaff; color: black; font-weight: bold; padding: 10px 20px; border-radius: 6px; border: none; cursor: pointer; transition: all 0.2s ease; box-shadow: 0 4px 15px rgba(224, 170, 255, 0.2);">Clear Logs</button>
                    </div>
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
    const browseEpgBtn = document.getElementById('settings-epg-browse-btn');
    if (browseEpgBtn) {
        browseEpgBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            console.log('[SETTINGS] Browse EPG button clicked.');
            const filePaths = await window.iptvAPI.openFileDialog('epg');
            if (filePaths && filePaths.length > 0) {
                document.getElementById('settings-new-epg').value = filePaths[0];
            }
        });
    }

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

            // await loadEpgLogos(); removed

            btn.textContent = originalText;
            btn.disabled = false;
            renderSettings();
        }
    });

    document.querySelectorAll('.refresh-epg-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const idx = parseInt(btn.getAttribute('data-idx'));
            console.log('[SETTINGS] Refresh EPG button clicked for index:', idx);
            const epgSource = savedEpgs[idx];
            if (!epgSource) {
                console.error('[SETTINGS] No EPG source found for index:', idx);
                return;
            }

            const originalText = btn.textContent;
            btn.textContent = '⏳';
            btn.disabled = true;

            try {
                // 1. Clear cache only for this specific EPG source
                console.log('[API] Calling clearCache for', epgSource);
                await window.iptvAPI.clearCache(epgSource);
                console.log('[API] clearCache completed.');

                // 2. Only re-fetch THIS specific source, not all combined sources
                //    This prevents waiting for all other Stalker portals to complete
                console.log('[API] Calling updateEpg for specific source only:', epgSource);
                await window.iptvAPI.updateEpg(epgSource, null, true);
                console.log('[API] updateEpg completed.');

                // 3. Now reload all EPG channel data (from the already-updated DB)
                let allEpgSources = savedEpgs.slice();
                savedPlaylists.forEach(p => {
                    if (p.epg && p.epg !== 'Not Configured' && !allEpgSources.includes(p.epg)) {
                        allEpgSources.push(p.epg);
                    }
                });
                const combinedEpgs = allEpgSources.join(',');

                console.log('[API] Calling getEpgChannels.');
                epgChannelsData = await window.iptvAPI.getEpgChannels(combinedEpgs);
                console.log('[API] getEpgChannels completed.');

                // await loadEpgLogos(); removed

                // 4. Show success feedback
                btn.textContent = 'Refreshed ✔️';
                showToast('EPG refreshed successfully!');

                try {
                    renderMappingColumns();
                } catch (renderErr) {
                    console.error('[SETTINGS] Failed to render mapping columns:', renderErr);
                }
            } catch (err) {
                console.error('[SETTINGS] Failed to refresh EPG:', err);
                btn.textContent = 'Failed ❌';
                showToast('Failed to refresh EPG: ' + err.message);
            } finally {
                setTimeout(() => {
                    btn.textContent = originalText;
                    btn.disabled = false;
                }, 2000);
            }
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

                // await loadEpgLogos(); removed

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

    document.getElementById('mapping-unmap-all-btn').addEventListener('click', async (e) => {
        const btn = e.target;
        console.log('[SETTINGS] Unmap All button clicked.');
        const originalText = btn.textContent;
        btn.textContent = '⏳';
        btn.disabled = true;

        await unmapAllChannelsFiltered();

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

    document.getElementById('settings-clear-logs-btn').addEventListener('click', async () => {
        console.log('[SETTINGS] Clear logs button clicked.');
        if (confirm("Are you sure you want to clear all application log files?")) {
            const success = await window.iptvAPI.clearLogs();
            if (success) {
                showToast('Application logs cleared successfully!');
            } else {
                showToast('Failed to clear some log files.', true);
            }
        }
    });

    // App Theme selection listeners
    document.querySelectorAll('.theme-select-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const selectedTheme = btn.getAttribute('data-theme');
            applyAppTheme(selectedTheme);
            localStorage.setItem('iptv_app_theme', selectedTheme);

            // Update active UI state in settings
            document.querySelectorAll('.theme-select-btn').forEach(b => {
                b.classList.remove('active');
                b.style.borderColor = '#222';
            });
            btn.classList.add('active');
            if (selectedTheme === 'default') {
                btn.style.borderColor = '#bb86fc';
            } else if (selectedTheme === 'teal') {
                btn.style.borderColor = '#069494';
            } else if (selectedTheme === 'green') {
                btn.style.borderColor = '#07a872';
            } else if (selectedTheme === 'black') {
                btn.style.borderColor = '#e0e0e0';
            }

            showToast(`Theme updated to ${selectedTheme.charAt(0).toUpperCase() + selectedTheme.slice(1)}!`);
        });
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
        const cards = ['card-epg', 'card-playback', 'card-theme', 'card-reminders', 'card-mapping', 'card-remote', 'card-dvr', 'card-tmdb', 'card-danger'];
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

                <div style="margin-top: 15px; display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 15px; background: rgba(0, 0, 0, 0.25); border: 1px solid #444; border-radius: 8px;">
                     <span style="color: #bbb; font-size: 0.9em; font-weight: bold;">Scan to Connect on Mobile</span>
                     <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(remoteUrlWithAuth)}" alt="QR Code" style="border: 4px solid white; border-radius: 8px; width: 150px; height: 150px; background: white;">
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
                embedStream(currentChannel, 'nearest');
            }
        }
    }

    // Update Guide if we happen to switch over to it or if it is currently visible
    const epgView = document.getElementById('epg-view');
    if (epgView && epgView.style.display === 'flex') {
        renderFullEpg();
    }
}

// ── Playlist structure version counter ────────────────────────────────────────
// Increment whenever playlist channels are structurally changed (add/remove/sort).
// updateState() skips the expensive allChannels rebuild if the version is the same.
window._playlistsVersion = window._playlistsVersion || 0;
window._lastBuiltVersion  = window._lastBuiltVersion  || -1;

/** Call when playlist structure changes: channel add/remove/reorder/disable. */
function markPlaylistsDirty() {
    window._playlistsVersion++;
    renderChannels._lastKey = null; // invalidate render guard
}

function updateState(skipSave = false) {
    console.log('[STATE] Updating global state and re-rendering.');

    const needsRebuild = (window._playlistsVersion !== window._lastBuiltVersion);

    if (needsRebuild) {
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
        window._lastBuiltVersion = window._playlistsVersion;
        renderChannels._lastKey = null; // force a DOM refresh after rebuild

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
    }

    // Always recalculate the playing index (it may have changed via favourite/logo/mapping)
    if (streamActive) {
        const currentUrl = localStorage.getItem('lastPlayedChannelUrl');
        const detailName = document.getElementById('detail-name');
        const currentTitle = detailName ? detailName.textContent : '';
        currentPlayingChannelIndex = allChannels.findIndex(c => c.url === currentUrl && (c.title || 'Unknown Channel') === currentTitle);
    } else {
        currentPlayingChannelIndex = -1;
    }

    renderChannels._lastKey = null; // Invalidate render guard so active-item highlight always refreshes
    renderChannels();
    renderPlaylists();
    if (!skipSave) {
        window.iptvAPI.saveChannels(savedPlaylists);
    }
    updateNavLockState();
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
        modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(3, 0, 30, 0.72); backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); z-index: 1000; display: flex; align-items: center; justify-content: center;';
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
            groupsHtml += `<div style="padding: 10px 16px; background: rgba(187, 134, 252, 0.06); font-weight: 700; color: rgba(187, 134, 252, 0.8); font-size: 0.76em; text-transform: uppercase; letter-spacing: 0.1em; border-bottom: 1px solid rgba(187, 134, 252, 0.08); border-top: 1px solid rgba(187, 134, 252, 0.08); font-family: 'Inter', sans-serif;">${parent.replace(/</g, '&lt;')}</div>`;

            stalkerParents[parent].sort(sortAlphaNum).forEach(g => {
                const total = groupsMap[g].channels.length;
                const enabled = groupsMap[g].channels.filter(item => !tempDisabled.has(item.originalIndex)).length;
                const hasNew = groupsMap[g].channels.some(item => item.channel.isNew);
                const newLabel = hasNew ? ' <span style="color: #FFD700; font-size: 0.85em;">(New)</span>' : '';

                groupsHtml += `
                <div class="modal-group-item" data-group="${g.replace(/"/g, '&quot;')}" style="padding: 10px 18px; cursor: pointer; border-left: 3px solid transparent; color: #d1d5db; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); font-family: 'Inter', sans-serif; font-size: 0.85em; border-radius: 0 6px 6px 0; margin: 1px 6px 1px 0;">
                    ${g.replace(/</g, '&lt;')}${newLabel} <span class="group-count-span" style="color: rgba(255,255,255,0.3); font-size: 0.82em; float: right;">${enabled} (${total})</span>
                </div>`;
            });
        });

        const looseGroups = Object.keys(groupsMap).filter(g => !Object.values(stalkerParents).flat().includes(g));
        if (looseGroups.length > 0) {
            groupsHtml += `<div style="padding: 10px 16px; background: rgba(187, 134, 252, 0.06); font-weight: 700; color: rgba(187, 134, 252, 0.8); font-size: 0.76em; text-transform: uppercase; letter-spacing: 0.1em; border-bottom: 1px solid rgba(187, 134, 252, 0.08); border-top: 1px solid rgba(187, 134, 252, 0.08); font-family: 'Inter', sans-serif;">Other Channels</div>`;
            looseGroups.sort(sortAlphaNum).forEach(g => {
                const total = groupsMap[g].channels.length;
                const enabled = groupsMap[g].channels.filter(item => !tempDisabled.has(item.originalIndex)).length;
                const hasNew = groupsMap[g].channels.some(item => item.channel.isNew);
                const newLabel = hasNew ? ' <span style="color: #FFD700; font-size: 0.85em;">(New)</span>' : '';

                groupsHtml += `
                <div class="modal-group-item" data-group="${g.replace(/"/g, '&quot;')}" style="padding: 10px 18px; cursor: pointer; border-left: 3px solid transparent; color: #d1d5db; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); font-family: 'Inter', sans-serif; font-size: 0.85em; border-radius: 0 6px 6px 0; margin: 1px 6px 1px 0;">
                    ${g.replace(/</g, '&lt;')}${newLabel} <span class="group-count-span" style="color: rgba(255,255,255,0.3); font-size: 0.82em; float: right;">${enabled} (${total})</span>
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
            <div class="modal-group-item" data-group="${g.replace(/"/g, '&quot;')}" style="padding: 10px 18px; cursor: pointer; border-left: 3px solid transparent; color: #d1d5db; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); font-family: 'Inter', sans-serif; font-size: 0.85em; border-radius: 0 6px 6px 0; margin: 1px 6px 1px 0;">
                ${g.replace(/</g, '&lt;')}${newLabel} <span class="group-count-span" style="color: rgba(255,255,255,0.3); font-size: 0.82em; float: right;">${enabled} (${total})</span>
            </div>`;
        });
    }

    modal.innerHTML = `
        <div style="background: rgba(18, 18, 24, 0.88); backdrop-filter: blur(28px); -webkit-backdrop-filter: blur(28px); border: 1px solid rgba(187, 134, 252, 0.2); border-radius: 20px; width: 92%; max-width: 1050px; height: 88%; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 24px 80px rgba(0,0,0,0.7), 0 0 40px rgba(187, 134, 252, 0.08);">
            <div style="padding: 18px 24px; border-bottom: 1px solid rgba(187, 134, 252, 0.12); display: flex; justify-content: space-between; align-items: center; background: rgba(187, 134, 252, 0.04);">
                <h2 style="margin: 0; color: #bb86fc; font-size: 1.15em; font-family: 'Outfit', 'Inter', sans-serif; font-weight: 700; letter-spacing: -0.01em; text-shadow: 0 0 20px rgba(187, 134, 252, 0.3);">Manage Channels: ${playlist.name}${newTitleStr}</h2>
                <div style="display: flex; gap: 10px;">
                    <input type="text" id="modal-channel-search" placeholder="Search channels..." value="" style="background: rgba(255, 255, 255, 0.03); color: #fff; border: 1px solid rgba(255, 255, 255, 0.08); padding: 8px 16px; border-radius: 10px; outline: none; width: 260px; font-family: 'Inter', sans-serif; font-size: 0.85em; transition: all 0.25s ease; box-shadow: inset 0 2px 4px rgba(0,0,0,0.3);">
                </div>
            </div>
            
            <div style="display: flex; flex-grow: 1; overflow: hidden;">
                <!-- Left Column: Groups -->
                <div style="width: 260px; background: rgba(0, 0, 0, 0.15); border-right: 1px solid rgba(187, 134, 252, 0.08); display: flex; flex-direction: column;">
                    <div style="padding: 12px 18px; background: rgba(187, 134, 252, 0.06); border-bottom: 1px solid rgba(187, 134, 252, 0.08); font-weight: 700; color: rgba(187, 134, 252, 0.7); font-size: 0.78em; text-transform: uppercase; letter-spacing: 0.12em; font-family: 'Inter', sans-serif;">
                        Groups
                    </div>
                    <div id="modal-groups-list" style="flex-grow: 1; overflow-y: auto; padding: 8px 0;">
                        ${groupsHtml}
                    </div>
                </div>

                <!-- Right Column: Channels -->
                <div style="flex-grow: 1; display: flex; flex-direction: column; background: rgba(0, 0, 0, 0.08); min-width: 0;">
                    <div style="padding: 10px 20px; background: rgba(187, 134, 252, 0.04); border-bottom: 1px solid rgba(187, 134, 252, 0.08); display: flex; align-items: center; gap: 15px;">
                        <label style="display: flex; align-items: center; cursor: pointer; color: #bb86fc; font-weight: 600; margin-right: 10px; font-family: 'Inter', sans-serif; font-size: 0.88em; gap: 8px; user-select: none;">
                            <input type="checkbox" id="modal-select-all" style="margin: 0; width: 16px; height: 16px; accent-color: #bb86fc; cursor: pointer;">
                            Select All
                        </label>
                        <button id="modal-enable-btn" style="background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); font-weight: 700; padding: 5px 14px; border-radius: 8px; cursor: pointer; font-family: 'Inter', sans-serif; font-size: 0.82em; transition: all 0.2s ease;">Enable</button>
                        <button id="modal-disable-btn" style="background: rgba(207, 102, 121, 0.12); color: #f0859a; border: 1px solid rgba(207, 102, 121, 0.25); font-weight: 700; padding: 5px 14px; border-radius: 8px; cursor: pointer; font-family: 'Inter', sans-serif; font-size: 0.82em; transition: all 0.2s ease;">Disable</button>
                        <span id="modal-channels-count" style="color: rgba(255,255,255,0.4); font-size: 0.82em; flex-grow: 1; text-align: right; font-family: 'Inter', sans-serif;">Showing 0 channels</span>
                    </div>
                    <div id="modal-channels-list" style="flex-grow: 1; overflow-y: auto; padding: 8px 16px;">
                    </div>
                </div>
            </div>
            <div style="padding: 16px 24px; border-top: 1px solid rgba(187, 134, 252, 0.12); display: flex; justify-content: flex-end; gap: 12px; background: rgba(187, 134, 252, 0.04);">
                <button id="modal-cancel-btn" style="background: rgba(255, 255, 255, 0.04); color: #a1a1aa; border: 1px solid rgba(255, 255, 255, 0.08); padding: 8px 22px; border-radius: 10px; cursor: pointer; font-weight: 600; font-family: 'Inter', sans-serif; font-size: 0.88em; transition: all 0.25s ease;">Cancel</button>
                <button id="modal-save-btn" style="background: linear-gradient(135deg, #bb86fc, #9b59fc); color: #000; font-weight: 700; padding: 8px 26px; border-radius: 10px; border: none; cursor: pointer; font-family: 'Inter', sans-serif; font-size: 0.88em; box-shadow: 0 4px 18px rgba(187, 134, 252, 0.3); transition: all 0.25s ease;">${isNew ? 'Import Selected' : 'Save Changes'}</button>
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
            const titleColor = isDisabled ? (isNew ? '#FFD700' : '#f0859a') : '#34d399';

            return `
                <label style="display: flex; align-items: center; padding: 9px 12px; border-bottom: 1px solid rgba(255, 255, 255, 0.03); cursor: pointer; background: ${isSelected ? 'rgba(187, 134, 252, 0.06)' : 'transparent'}; transition: all 0.15s ease; border-radius: 6px; margin-bottom: 2px; gap: 12px;">
                    <input type="checkbox" class="channel-select-cb" data-idx="${originalIndex}" ${isSelected ? 'checked' : ''} style="width: 16px; height: 16px; accent-color: #bb86fc; cursor: pointer; flex-shrink: 0;">
                    <span style="flex-grow: 1; color: ${titleColor}; font-weight: 600; font-size: 0.84em; font-family: 'Inter', sans-serif;">${safeTitle}${newLabel}</span>
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
                    label.style.background = 'rgba(187, 134, 252, 0.06)';
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
                el.style.background = 'rgba(187, 134, 252, 0.1)';
                el.style.color = '#bb86fc';
                el.style.fontWeight = '600';
                el.style.boxShadow = 'inset 0 0 12px rgba(187, 134, 252, 0.05)';
            } else {
                el.style.borderLeftColor = 'transparent';
                el.style.background = 'transparent';
                el.style.color = '#d1d5db';
                el.style.fontWeight = 'normal';
                el.style.boxShadow = 'none';
            }
        });
    };

    document.querySelectorAll('.modal-group-item').forEach(el => {
        el.addEventListener('click', async (e) => {
            const g = el.getAttribute('data-group');
            currentGroupFilter = g;

            if (isStalker && groupsMap[g] && groupsMap[g].category && groupsMap[g].channels.length === 0) {
                const listDiv = document.getElementById('modal-channels-list');
                listDiv.innerHTML = getWinSpinnerHtml('Fetching channels...');

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

        showGlobalSpinner("Importing channels and VOD...");
        // Yield to allow UI spinner rendering
        await new Promise(resolve => setTimeout(resolve, 100));

        originalChannels.forEach((c, idx) => {
            c.disabled = tempDisabled.has(idx);
            delete c.isNew;
        });
        playlist.channels = originalChannels;

        const enabledChannels = originalChannels.filter(c => !c.disabled && c.type !== 'movie' && c.type !== 'series' && c.type !== 'movie_category' && c.type !== 'vod_category' && c.type !== 'series_category');
        const uniqueGroups = new Set(enabledChannels.map(c => c.group || 'Ungrouped'));
        const groupsCount = uniqueGroups.size;
        const channelsCount = enabledChannels.length;

        if (isNew) {
            if (playlist.editIndex >= 0) {
                savedPlaylists[playlist.editIndex] = playlist;
            } else {
                savedPlaylists.push(playlist);
            }
            markPlaylistsDirty();

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
                    // await loadEpgLogos(); removed
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

            hideGlobalSpinner();
            showToast(`Groups (${groupsCount}) and Channels (${channelsCount}) imported for playlist`);
            switchTab('playlist', document.getElementById('btn-playlist'));
        } else {
            updateState();
            hideGlobalSpinner();
            showToast("Playlist channels updated successfully.");
            switchTab('playlist', document.getElementById('btn-playlist'));
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
            const rawExp = String(playlist.exp_date).trim().toLowerCase();
            if (rawExp === 'never' || rawExp === 'unlimited' || rawExp === 'null' || rawExp === '0' || rawExp === '') {
                expInfo = `<span><strong>Expires:</strong> <span style="color: #43CB44; font-weight: bold;">Never</span></span>`;
            } else {
                let expStr = playlist.exp_date;
                if (/^\d{10}$/.test(expStr)) {
                    expStr = new Date(parseInt(expStr) * 1000).toLocaleDateString();
                } else if (/^\d{13}$/.test(expStr)) {
                    expStr = new Date(parseInt(expStr)).toLocaleDateString();
                } else {
                    const parsedDate = new Date(expStr);
                    if (!isNaN(parsedDate)) {
                        // Make sure we don't accidentally display 1970-01-01 or Unix epoch starting points as custom dates (often represents "Never")
                        if (parsedDate.getTime() <= 86400000) {
                            expStr = 'Never';
                        } else {
                            expStr = parsedDate.toLocaleDateString();
                        }
                    }
                }

                if (expStr.toLowerCase() === 'never') {
                    expInfo = `<span><strong>Expires:</strong> <span style="color: #43CB44; font-weight: bold;">Never</span></span>`;
                } else {
                    expInfo = `<span><strong>Expires:</strong> <span style="color: #FFD700; font-weight: bold;">${expStr}</span></span>`;
                }
            }
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
                <h3 style="margin: 0; color: ${playlist.disabled ? '#888' : '#e0e0e0'}; font-family: 'Outfit', 'Inter', sans-serif;">${playlist.name} ${playlist.disabled ? '<span style="color:#888; font-size: 0.8em;">(Disabled)</span>' : ''}</h3>
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
                        markPlaylistsDirty();
                        updateState();
                    }
                } else {
                    showToast('Failed to refresh playlist: ' + (result ? result.error : 'Unknown error'));
                }
            } catch (err) {
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
                markPlaylistsDirty();
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
            markPlaylistsDirty();
            updateState();
        });
    });

    document.querySelectorAll('.disable-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = e.target.getAttribute('data-index');
            console.log('[EVENT] Disable playlist button clicked for index:', idx);
            savedPlaylists[idx].disabled = true;
            markPlaylistsDirty();
            updateState();
        });
    });

    // Playlist side-menu click handlers (smooth scroll to card)
    const playlistView = document.getElementById('playlist-view');
    document.querySelectorAll('.playlist-menu-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-target');
            const targetEl = document.getElementById(targetId);
            if (targetEl && playlistView) {
                const containerRect = playlistView.getBoundingClientRect();
                const targetRect = targetEl.getBoundingClientRect();
                const relativeTop = targetRect.top - containerRect.top + playlistView.scrollTop;
                const targetScrollTop = Math.max(0, relativeTop - 30);
                playlistView.scrollTo({ top: targetScrollTop, behavior: 'smooth' });
            }
        });
    });

    // Scroll-spy: update active playlist menu button based on scroll position
    const updatePlaylistActiveMenuButton = () => {
        if (!playlistView || playlistView.style.display === 'none') return;
        const containerRect = playlistView.getBoundingClientRect();
        const cards = ['card-add-playlist', 'card-my-playlists'];
        let currentActive = 'card-add-playlist';
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
        if (playlistView.scrollHeight - playlistView.scrollTop - playlistView.clientHeight < 10) {
            currentActive = 'card-my-playlists';
        }
        document.querySelectorAll('.playlist-menu-btn').forEach(btn => {
            if (btn.getAttribute('data-target') === currentActive) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    };

    if (playlistView) {
        playlistView.removeEventListener('scroll', window.updatePlaylistActiveMenu);
        window.updatePlaylistActiveMenu = updatePlaylistActiveMenuButton;
        playlistView.addEventListener('scroll', window.updatePlaylistActiveMenu);
        updatePlaylistActiveMenuButton();
    }
}

try {
    window.expandedGroups = new Set(JSON.parse(localStorage.getItem('iptv_expanded_groups') || '[]'));
} catch (e) {
    window.expandedGroups = new Set();
}

function getMiniEqualizerHtml() {
    return `
        <div class="mini-equalizer" title="Playing">
            <span></span>
            <span></span>
            <span></span>
        </div>
    `;
}

function isSamePlaybackChannel(a, b) {
    if (!a || !b) return false;
    const aUrl = a.url || a.stream_url || '';
    const bUrl = b.url || b.stream_url || '';
    return aUrl === bUrl &&
        (a.title || 'Unknown Channel') === (b.title || 'Unknown Channel') &&
        String(a.playlistId || a.playlist_id || '') === String(b.playlistId || b.playlist_id || '');
}

function refreshCurrentPlayingChannelIndex() {
    if (!streamActive || !window.currentPlaybackChannel) return;
    const resolvedIndex = allChannels.findIndex(channel => isSamePlaybackChannel(channel, window.currentPlaybackChannel));
    if (resolvedIndex >= 0) currentPlayingChannelIndex = resolvedIndex;
}

function isPlayingChannel(channel, index) {
    if (!streamActive || currentPlayingChannelIndex < 0) return false;
    if (index === currentPlayingChannelIndex) return true;
    return isSamePlaybackChannel(channel, window.currentPlaybackChannel);
}

function clearPlayingChannelIndicator() {
    document.querySelectorAll('.channel-item.active').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.channel-item .mini-equalizer').forEach(el => el.remove());
}

function updatePlayingChannelIndicator(options = {}) {
    refreshCurrentPlayingChannelIndex();
    clearPlayingChannelIndicator();
    if (!streamActive || currentPlayingChannelIndex < 0) return;

    const activeEl = document.querySelector(`.channel-item[data-index="${currentPlayingChannelIndex}"]`);
    if (!activeEl) return;

    activeEl.classList.add('active');
    const favBtn = activeEl.querySelector('.fav-btn');
    if (favBtn) {
        favBtn.insertAdjacentHTML('beforebegin', getMiniEqualizerHtml());
    } else {
        activeEl.insertAdjacentHTML('beforeend', getMiniEqualizerHtml());
    }

    if (options.scroll) {
        setTimeout(() => {
            activeEl.scrollIntoView({ behavior: 'smooth', block: options.block || 'nearest' });
        }, 100);
    }
}

function renderChannels() {
    refreshCurrentPlayingChannelIndex();
    const filterSelect = document.getElementById('playlist-filter');
    const filterVal = filterSelect ? filterSelect.value : 'all';

    const channelSearch = document.getElementById('channel-search');
    const searchVal = channelSearch ? channelSearch.value.toLowerCase() : '';

    // ── Render guard: skip full DOM rebuild if nothing visible has changed ────
    const expandedKey = JSON.stringify([...window.expandedGroups]);
    const renderKey   = `${filterVal}|${searchVal}|${expandedKey}|${allChannels.length}|${currentPlayingChannelIndex}`;
    if (renderChannels._lastKey === renderKey) return;
    renderChannels._lastKey = renderKey;
    // ─────────────────────────────────────────────────────────────────────────

    console.log('[UI] Rendering channel list.');
    const previousScroll = channelList.scrollTop;

    let html = '';

    if (filterVal === 'favs') {
        const favsList = [];
        allChannels.forEach((channel, index) => {
            if (!channel.favourite) return;
            const rawTitle = channel.title || 'Unknown Channel';
            if (searchVal && !rawTitle.toLowerCase().includes(searchVal)) return;
            favsList.push({ channel, index });
        });

        favsList.sort((a, b) => sortAlphaNum(a.channel.title || '', b.channel.title || ''));

        if (favsList.length === 0) {
            html = `<div style="padding: 20px; color: #888; text-align: center;">No channels found.</div>`;
        } else {
            favsList.forEach(({ channel, index }) => {
                const rawTitle = channel.title || 'Unknown Channel';
                const safeTitle = rawTitle.replace(/</g, "&lt;").replace(/>/g, "&gt;");
                const imgSrc = (channel.logo && channel.logo.trim() !== '') ? channel.logo : 'assets/logo.ico';

                const favClass = channel.favourite ? 'fav-btn active' : 'fav-btn';
                const favBtnHtml = `<button class="${favClass}" data-fav-index="${index}" title="Toggle Favourite"><svg viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg></button>`;

                const activeClass = isPlayingChannel(channel, index) ? ' active' : '';
                const eqHtml = isPlayingChannel(channel, index) ? getMiniEqualizerHtml() : '';

                html += `<div class="channel-item${activeClass}" tabindex="0" data-index="${index}" title="${safeTitle.replace(/"/g, '&quot;')}">
                    <img src="${imgSrc}">
                    <span style="flex-grow: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding-right: 4px;">${safeTitle}</span>
                    ${eqHtml}
                    ${favBtnHtml}
                </div>`;
            });
        }
    } else {
        const groupedChannels = {};

        allChannels.forEach((channel, index) => {
            if (filterVal !== 'all' && String(channel.playlistId) !== String(filterVal)) return;

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
                html += `<div class="group-item" data-group="${attrGroupName}" tabindex="0" style="cursor: pointer; outline: none;">
                    <span>${safeGroupName} <span style="color:#888;font-size:0.8em;font-weight:normal;">(${channelsInGroup.length})</span></span>
                    <span class="group-expand-icon" style="color:#888;font-size:0.8em;">${expandIcon}</span>
                </div>`;

                if (isExpanded) {
                    html += `<div class="group-channels-container" style="background: transparent;">`;
                    channelsInGroup.forEach(({ channel, index }) => {
                        const rawTitle = channel.title || 'Unknown Channel';
                        const safeTitle = rawTitle.replace(/</g, "&lt;").replace(/>/g, "&gt;");
                        const imgSrc = (channel.logo && channel.logo.trim() !== '') ? channel.logo : 'assets/logo.ico';

                        const favClass = channel.favourite ? 'fav-btn active' : 'fav-btn';
                        const favBtnHtml = `<button class="${favClass}" data-fav-index="${index}" title="Toggle Favourite"><svg viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg></button>`;

                        const playlist = savedPlaylists.find(p => String(p.id) === String(channel.playlistId));
                        const playlistName = playlist ? playlist.name : '';
                        const playlistBadge = (filterVal === 'all' && playlistName) ? ` <span style="color: #666; font-size: 0.8em; font-weight: 500; margin-left: 4px;">[${playlistName}]</span>` : '';

                        const activeClass = isPlayingChannel(channel, index) ? ' active' : '';
                        const eqHtml = isPlayingChannel(channel, index) ? getMiniEqualizerHtml() : '';

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
    }

    channelList.innerHTML = html;

    // Attach error handlers after inserting into DOM to bypass CSP inline restrictions
    channelList.querySelectorAll('img').forEach(img => {
        img.onerror = function () {
            this.onerror = null;
            this.src = 'assets/logo.ico';
        };
    });

    if (!window.initialScrollLoaded) {
        window.initialScrollLoaded = true;
        // If a startup autoplay is pending, skip restoring the old scroll so the
        // playing channel can be scrolled to the top row by embedStream.
        if (!window.startupAutoplayPending) {
            const savedScroll = parseInt(localStorage.getItem('iptv_sidebar_scroll'), 10);
            if (!isNaN(savedScroll)) channelList.scrollTop = savedScroll;
        }
    } else {
        channelList.scrollTop = previousScroll;
    }

    updatePlayingChannelIndicator();
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
        if (channel) embedStream(channel, 'nearest');
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
            markPlaylistsDirty();
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
    if (window.isAppFullscreen) {
        window.iptvAPI.toggleFullscreen();
    }

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
    settlePlayerBoundsAfterLayout();

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

        const isFirstPlaybackFrame = !window.hasStartedPlayback;
        window.hasStartedPlayback = true;
        if (isFirstPlaybackFrame) {
            console.log('[BOUNDS] First playback frame received, settling bounds.');
            settlePlayerBoundsAfterLayout();
        }
        if (window.playbackTimeout) {
            clearTimeout(window.playbackTimeout);
            window.playbackTimeout = null;
        }

        if (value !== null) {
            window.currentPlaybackTime = value;

            if (window.pendingSeekPosition !== undefined && window.pendingSeekPosition !== null) {
                const targetSeek = window.pendingSeekPosition;
                window.pendingSeekPosition = null;
                console.log('[STREAM RESUME] Executing pending seek to:', targetSeek);
                window.iptvAPI.sendMpvCommand(['seek', targetSeek, 'absolute']);
            }

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

        if (name === 'track-list') {
            window.currentMpvTrackList = value;
        }
        if (name === 'aid') {
            window.currentMpvAid = value;
        }
        if (name === 'sid') {
            window.currentMpvSid = value;
        }
    }
});

async function embedStream(channel, scrollMode = 'start') {
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
    window.currentPlaybackChannel = channel;

    const groupName = channel.group || 'Uncategorized';
    if (!window.expandedGroups.has(groupName)) {
        window.expandedGroups.add(groupName);
        localStorage.setItem('iptv_expanded_groups', JSON.stringify(Array.from(window.expandedGroups)));
        renderChannels();
    }

    updatePlayingChannelIndicator({ scroll: true, block: scrollMode });

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
                clearPlayingChannelIndicator();
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
                clearPlayingChannelIndicator();
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
                clearPlayingChannelIndicator();
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
        detailLogo.onerror = function () {
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
            const lowId = id.toLowerCase();
            if (epgData[lowId] && epgData[lowId].length > 0) { programmes = epgData[lowId]; break; }
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
                const timeStr = `${pStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${pEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
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
            progTime = `${pStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${pEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
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
    if (playerOverlay) playerOverlay.innerHTML = getWinSpinnerHtml(safeTitle, { size: 'large' });

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
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
            scale: window.devicePixelRatio || 1
        }
    });

    settlePlayerBoundsAfterLayout();

    // Start a 30-second loading timeout. If no playback-time is received, fail gracefully.
    window.playbackTimeout = setTimeout(() => {
        if (!window.hasStartedPlayback && streamActive) {
            console.warn('[STREAM] Playback timeout. Stream failed to load.');
            window.isSwitchingStream = false;
            streamActive = false;
            currentPlayingChannelIndex = -1;
            clearPlayingChannelIndicator();

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
        // Show "not available" message for movie/episode/series types
        const ch = window.currentPlaybackChannel;
        const isVod = ch && (ch.type === 'movie' || ch.type === 'episode' || ch.type === 'series');
        if (isVod) {
            const playerOverlay = document.getElementById('player-overlay');
            if (playerOverlay) {
                playerOverlay.innerHTML = `
                    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; height: 100%;">
                        <img src="assets/logo.png" style="width: 128px; height: 128px; margin-bottom: 20px; border-radius: 15px; background: #2A2A2A;">
                        <span style="color: #cf6679; font-size: 1.2em; font-weight: bold;">Video not currently available</span>
                        <span style="color: #888; font-size: 0.9em; margin-top: 8px;">The portal could not deliver this stream.<br>Please try again later.</span>
                    </div>
                `;
            }
            streamActive = false;
            currentPlayingChannelIndex = -1;
            clearPlayingChannelIndicator();
            const fsBtn = document.getElementById('fullscreen-btn');
            if (fsBtn) fsBtn.style.display = 'none';
        }
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
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
            scale: window.devicePixelRatio || 1
        }
    });

    settlePlayerBoundsAfterLayout();

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
        clearPlayingChannelIndicator();

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

window.iptvAPI.onMpvRestorePlayback(async () => {
    console.log('[RESTORE] Main process requested playback restore.');
    if (window.currentPlaybackChannel) {
        console.log('[RESTORE] Resuming last channel/video:', window.currentPlaybackChannel.title);
        try {
            const progId = getPlaybackProgressId(window.currentPlaybackChannel);
            if (progId) {
                const saved = await window.iptvAPI.getPlaybackProgress(progId);
                if (saved && saved.position) {
                    window.pendingSeekPosition = saved.position;
                    console.log('[RESTORE] Restoring progress position:', saved.position);
                }
            }
        } catch (e) {
            console.error('[RESTORE ERROR] Failed to fetch playback progress:', e);
        }
        embedStream(window.currentPlaybackChannel);
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
        clearPlayingChannelIndicator();

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

window.iptvAPI.onRemotePlayChannel(({ url, title, position, type, tmdbId, season, episodeNum }) => {
    console.log('[REMOTE] Received play request for:', { url, title, position, type, tmdbId });
    let targetChannel = allChannels.find(c => c.url === url && c.title === title);
    if (!targetChannel) {
        targetChannel = {
            url,
            title,
            type: type || 'movie',
            playlistId: 'all',
            tmdbId: tmdbId || null,
            season: season || null,
            episodeNum: episodeNum || null
        };
    }

    switchTab('live-tv', document.getElementById('btn-live-tv'));
    window.currentPlaybackChannel = targetChannel;

    embedStream(targetChannel);
    showToast(`Playing ${targetChannel.title}`);

    if (position && parseFloat(position) > 0) {
        window.pendingSeekPosition = parseFloat(position);
    }

    if (mainWindow && !mainWindow.isMinimized()) {
        mainWindow.focus();
    }
});

function triggerBoundsUpdate() {
    const isLiveViewActive = document.getElementById('btn-live-tv') && document.getElementById('btn-live-tv').classList.contains('active');
    if (streamActive && isLiveViewActive && playerContainer) {
        const rect = playerContainer.getBoundingClientRect();
        // Guard against zero-size or tiny layouts during hidden transitions
        if (rect.width < 50 || rect.height < 50) {
            console.log('[BOUNDS] Stale or zero-sized layout skipped:', rect.width, 'x', rect.height);
            return;
        }
        window.iptvAPI.updateMpvBounds({
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
            scale: window.devicePixelRatio || 1
        });
    } else {
        window.iptvAPI.updateMpvBounds({ x: 0, y: 0, width: 0, height: 0, scale: window.devicePixelRatio || 1 });
    }
}

// ── Debounced MPV bounds settling ────────────────────────────────────────────
// Replaces the old scatter-fire pattern (5 setTimeout × 2 rAF = 15 IPC calls)
// with a 2-shot approach: one immediate pass + one debounced final settle.
// This eliminates ~13 redundant IPC bridge crossings on every transition.
let _boundsSettleImmediate = null;
let _boundsSettleFinal     = null;
function settlePlayerBoundsAfterLayout() {
    // Cancel any pending settle calls
    if (_boundsSettleFinal) { clearTimeout(_boundsSettleFinal); _boundsSettleFinal = null; }
    if (_boundsSettleImmediate) { cancelAnimationFrame(_boundsSettleImmediate); }

    // Shot 1 — immediate rAF (catches the first layout pass)
    _boundsSettleImmediate = requestAnimationFrame(() => {
        requestAnimationFrame(triggerBoundsUpdate);
    });

    // Shot 2 — debounced final settle (catches late CSS reflows, Electron animation end)
    _boundsSettleFinal = setTimeout(() => {
        requestAnimationFrame(() => requestAnimationFrame(triggerBoundsUpdate));
        _boundsSettleFinal = null;
    }, 260);
}

// Use ResizeObserver to track exact pixel coordinates perfectly.
// Debounce via rAF to coalesce rapid resize events into a single IPC call.
let _resizeRaf = null;
const resizeObserver = new ResizeObserver(() => {
    if (_resizeRaf) cancelAnimationFrame(_resizeRaf);
    _resizeRaf = requestAnimationFrame(() => {
        requestAnimationFrame(triggerBoundsUpdate);
        _resizeRaf = null;
    });
});
resizeObserver.observe(playerContainer);

// Forward mouse events directly to the embedded MPV Lua script (scaled by Device Pixel Ratio for High-DPI alignments)
let lastMouseMove = 0;
playerContainer.addEventListener('mousemove', (e) => {
    const now = Date.now();
    if (now - lastMouseMove > 30) {
        lastMouseMove = now;
        const rect = playerContainer.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        const x = Math.round((e.clientX - rect.left) * dpr);
        const y = Math.round((e.clientY - rect.top) * dpr);
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
let currentMoviePlaylistId = null;
let currentMovieCategory = null;
let movieGridScrollTop = 0; // saved scroll position for the movies category list
let currentVodPlaylistId = null;
let currentVodCategory = null;
let vodGridScrollTop = 0;   // saved scroll position for the vod category list

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
        currentMoviePlaylistId = null;
        currentMovieCategory = null;
    }
    if (tabId === 'vod') {
        currentVodPlaylistId = null;
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
            // renderChannels() has its own render guard — calling it here is always
            // safe; it will be a no-op if the list hasn't changed since last render.
            renderChannels();
            settlePlayerBoundsAfterLayout();
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
            x: Math.ceil(rect.x),
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

document.getElementById('btn-live-tv').addEventListener('click', function () { if (!this.disabled) switchTab('live-tv', this); });
document.getElementById('btn-playlist').addEventListener('click', function () { switchTab('playlist', this); });
document.getElementById('btn-epg').addEventListener('click', function () { if (!this.disabled) switchTab('epg', this); });
document.getElementById('btn-settings').addEventListener('click', function () { if (!this.disabled) switchTab('settings', this); });
document.getElementById('btn-movies').addEventListener('click', function () { if (!this.disabled) switchTab('movies', this); });
document.getElementById('btn-vod').addEventListener('click', function () { if (!this.disabled) switchTab('vod', this); });
document.getElementById('btn-recording').addEventListener('click', function () { switchTab('recording', this); });

let laneObserver = null;
let loadedMovieLanes = {};
let loadedVodLanes = {};

function applyAppTheme(themeName) {
    console.log('[Theme] Applying theme:', themeName);
    const themeClasses = ['theme-teal', 'theme-green', 'theme-black'];
    themeClasses.forEach(cls => document.body.classList.remove(cls));
    if (themeName !== 'default' && themeName !== 'purple') {
        document.body.classList.add(`theme-${themeName}`);
    }
    // Re-inject dynamic premium styles to ensure any var replacements resolve correctly
    injectPremiumStyles();
}

function injectPremiumStyles() {
    if (document.getElementById('premium-catalog-styles')) {
        document.getElementById('premium-catalog-styles').remove();
    }
    const style = document.createElement('style');
    style.id = 'premium-catalog-styles';
    let cssText = `
        /* Premium Global Purple to Black Seamless Background Gradient */
        body {
            background: linear-gradient(180deg, #3c096c 0%, #240046 35%, #10002b 70%, #03001e 100%) !important;
            background-attachment: fixed !important;
        }
        
        #top-header {
            background: rgba(12, 5, 20, 0.65) !important;
            backdrop-filter: blur(30px) !important;
            -webkit-backdrop-filter: blur(30px) !important;
            border-bottom: 1.5px solid rgba(187, 134, 252, 0.25) !important;
            border-bottom-left-radius: 20px !important;
            border-bottom-right-radius: 20px !important;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.65), 0 4px 20px rgba(187, 134, 252, 0.08) !important;
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

        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        @keyframes scaleUp {
            from { transform: scale(0.92); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
        }
    `;
    cssText = cssText.replace(/#bb86fc/g, 'var(--primary-accent)');
    cssText = cssText.replace(/187,\s*134,\s*252/g, 'var(--primary-accent-rgb)');
    cssText = cssText.replace(/linear-gradient\(180deg,\s*#3c096c[^)]*\)/gi, 'var(--bg-gradient)');
    style.innerHTML = cssText;
    document.head.appendChild(style);
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

        epGrid.innerHTML = getWinSpinnerHtml('Loading episodes...');
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

    let hasMovies = false;
    let playlistsWithMovies = [];
    savedPlaylists.forEach(p => {
        if (p.channels && !p.disabled) {
            let count = 0;
            p.channels.forEach(c => {
                if (c.disabled) return;
                if (c.type === 'movie_category' || c.type === 'movie') {
                    count++;
                }
            });
            if (count > 0) {
                playlistsWithMovies.push(p);
                hasMovies = true;
            }
        }
    });

    if (!hasMovies) {
        if (empty) empty.style.display = 'block';
        return;
    }
    if (empty) empty.style.display = 'none';

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

    if (!currentMoviePlaylistId) {
        const backContainer = document.getElementById('movies-back-btn-container');
        if (backContainer) backContainer.style.display = 'none';
        const titleHeader = document.getElementById('movies-title-header');
        if (titleHeader) titleHeader.textContent = 'Movies';

        grid.style.display = 'grid';
        grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(180px, 1fr))';
        grid.style.gap = '20px';
        grid.style.padding = '20px';

        playlistsWithMovies.forEach(p => {
            renderFolder(p.name, null, () => {
                movieGridScrollTop = document.getElementById('movies-view')?.scrollTop || 0;
                currentMoviePlaylistId = p.id;
                renderMovies();
                const moviesView = document.getElementById('movies-view');
                if (moviesView) moviesView.scrollTop = 0;
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
        return;
    }

    const selectedPlaylist = savedPlaylists.find(p => p.id === currentMoviePlaylistId);
    if (!selectedPlaylist) {
        currentMoviePlaylistId = null;
        renderMovies();
        return;
    }

    let stalkerCategories = [];
    let m3uGroups = {};

    selectedPlaylist.channels.forEach(c => {
        if (c.disabled) return;
        if (c.type === 'movie_category') {
            c.playlistId = selectedPlaylist.id;
            stalkerCategories.push(c);
        } else if (c.type === 'movie') {
            c.playlistId = selectedPlaylist.id;
            const groupName = c.group || 'Movies';
            if (!m3uGroups[groupName]) m3uGroups[groupName] = [];
            m3uGroups[groupName].push(c);
        }
    });

    if (!currentMovieCategory) {
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
                const savedScroll = movieGridScrollTop;
                currentMoviePlaylistId = null;
                renderMovies();
                requestAnimationFrame(() => {
                    const moviesView = document.getElementById('movies-view');
                    if (moviesView) moviesView.scrollTop = savedScroll;
                });
            });
        }
        const titleHeader = document.getElementById('movies-title-header');
        if (titleHeader) titleHeader.textContent = `Movies - ${selectedPlaylist.name}`;

        grid.style.display = 'grid';
        grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(180px, 1fr))';
        grid.style.gap = '20px';
        grid.style.padding = '20px';

        stalkerCategories.forEach(cat => {
            renderFolder(cat.title || cat.name, null, () => {
                movieGridScrollTop = document.getElementById('movies-view')?.scrollTop || 0;
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
                movieGridScrollTop = document.getElementById('movies-view')?.scrollTop || 0;
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
                const savedScroll = movieGridScrollTop;
                currentMovieCategory = null;
                renderMovies();
                // Restore scroll after render completes
                requestAnimationFrame(() => {
                    const moviesView = document.getElementById('movies-view');
                    if (moviesView) moviesView.scrollTop = savedScroll;
                });
            });
        }
        const titleHeader = document.getElementById('movies-title-header');
        if (titleHeader) titleHeader.textContent = `Movies - ${selectedPlaylist.name} - ${currentMovieCategory.title}`;

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
            loadingDiv.innerHTML = getWinSpinnerHtml('Loading movies...', { size: 'large' });
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

    let hasSeries = false;
    let playlistsWithSeries = [];
    savedPlaylists.forEach(p => {
        if (p.channels && !p.disabled) {
            let count = 0;
            p.channels.forEach(c => {
                if (c.disabled) return;
                if (c.type === 'vod_category' || c.type === 'series_category' || c.type === 'vod' || c.type === 'series') {
                    count++;
                }
            });
            if (count > 0) {
                playlistsWithSeries.push(p);
                hasSeries = true;
            }
        }
    });

    if (!hasSeries) {
        if (empty) empty.style.display = 'block';
        return;
    }
    if (empty) empty.style.display = 'none';

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

    if (!currentVodPlaylistId) {
        const backContainer = document.getElementById('vod-back-btn-container');
        if (backContainer) backContainer.style.display = 'none';
        const titleHeader = document.getElementById('vod-title-header');
        if (titleHeader) titleHeader.textContent = 'TV Series';

        grid.style.display = 'grid';
        grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(180px, 1fr))';
        grid.style.gap = '20px';
        grid.style.padding = '20px';

        playlistsWithSeries.forEach(p => {
            renderFolder(p.name, null, () => {
                vodGridScrollTop = document.getElementById('vod-view')?.scrollTop || 0;
                currentVodPlaylistId = p.id;
                renderVod();
                const vodView = document.getElementById('vod-view');
                if (vodView) vodView.scrollTop = 0;
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
        return;
    }

    const selectedPlaylist = savedPlaylists.find(p => p.id === currentVodPlaylistId);
    if (!selectedPlaylist) {
        currentVodPlaylistId = null;
        renderVod();
        return;
    }

    let stalkerCategories = [];
    let m3uGroups = {};

    selectedPlaylist.channels.forEach(c => {
        if (c.disabled) return;
        if (c.type === 'vod_category' || c.type === 'series_category') {
            c.playlistId = selectedPlaylist.id;
            stalkerCategories.push(c);
        } else if (c.type === 'vod' || c.type === 'series') {
            c.playlistId = selectedPlaylist.id;
            const groupName = c.group || 'Series';
            if (!m3uGroups[groupName]) m3uGroups[groupName] = [];
            m3uGroups[groupName].push(c);
        }
    });

    if (!currentVodCategory) {
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
                const savedScroll = vodGridScrollTop;
                currentVodPlaylistId = null;
                renderVod();
                requestAnimationFrame(() => {
                    const vodView = document.getElementById('vod-view');
                    if (vodView) vodView.scrollTop = savedScroll;
                });
            });
        }
        const titleHeader = document.getElementById('vod-title-header');
        if (titleHeader) titleHeader.textContent = `TV Series - ${selectedPlaylist.name}`;

        grid.style.display = 'grid';
        grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(180px, 1fr))';
        grid.style.gap = '20px';
        grid.style.padding = '20px';

        stalkerCategories.forEach(cat => {
            renderFolder(cat.title || cat.name, null, () => {
                vodGridScrollTop = document.getElementById('vod-view')?.scrollTop || 0;
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
                vodGridScrollTop = document.getElementById('vod-view')?.scrollTop || 0;
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
                const savedScroll = vodGridScrollTop;
                currentVodCategory = null;
                renderVod();
                // Restore scroll after render completes
                requestAnimationFrame(() => {
                    const vodView = document.getElementById('vod-view');
                    if (vodView) vodView.scrollTop = savedScroll;
                });
            });
        }
        const titleHeader = document.getElementById('vod-title-header');
        if (titleHeader) titleHeader.textContent = `TV Series - ${selectedPlaylist.name} - ${currentVodCategory.title}`;

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
            loadingDiv.innerHTML = getWinSpinnerHtml('Loading series...', { size: 'large' });
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

    // Custom Window Control actions
    const winMinimize = document.getElementById('win-btn-minimize');
    const winMaximize = document.getElementById('win-btn-maximize');
    const winClose = document.getElementById('win-btn-close');

    if (winMinimize) {
        winMinimize.addEventListener('click', () => {
            window.iptvAPI.minimizeWindow();
        });
    }
    if (winMaximize) {
        winMaximize.addEventListener('click', () => {
            window.iptvAPI.maximizeWindow();
        });
    }
    if (winClose) {
        winClose.addEventListener('click', () => {
            window.iptvAPI.closeWindow();
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
            try {
                window.iptvAPI.closeMpvTrackSelector();
            } catch (err) { }
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

    // Settle native MPV bounds around Electron's fullscreen animation without late visible jumps.
    settlePlayerBoundsAfterLayout();

    if (!isFullscreen && mainView) {
        const syncAfterMainViewSettles = (event) => {
            if (event.target !== mainView || event.propertyName !== 'margin-left') return;
            mainView.removeEventListener('transitionend', syncAfterMainViewSettles);
            settlePlayerBoundsAfterLayout();
        };
        mainView.addEventListener('transitionend', syncAfterMainViewSettles);
        setTimeout(() => {
            mainView.removeEventListener('transitionend', syncAfterMainViewSettles);
            settlePlayerBoundsAfterLayout();
        }, 260);
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
            markPlaylistsDirty();
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
            // await loadEpgLogos(); removed

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

    // Load and apply the saved application theme
    const savedTheme = localStorage.getItem('iptv_app_theme') || 'default';
    applyAppTheme(savedTheme);

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
            markPlaylistsDirty();
        } else {
            savedPlaylists = data;
            markPlaylistsDirty();
        }

        // Load EPG logo mapping on startup
        // await loadEpgLogos(); removed

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
                    // Signal renderChannels to skip saved-scroll restoration so we
                    // can position the playing channel at the top of the list.
                    window.startupAutoplayPending = true;
                    embedStream(lastChannel);
                    window.startupAutoplayPending = false;
                    // After the DOM settles, force the active channel to the top row.
                    setTimeout(() => updatePlayingChannelIndicator({ scroll: true, block: 'start' }), 300);
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



    // Handle dynamically cached logos from background
window.electron.ipcRenderer.on('logo-cached', (event, { originalUrl, cachedUrl }) => {
    // 1. Update savedPlaylists — the source of truth for renderChannels()
    // Without this, the next renderChannels() call re-injects the stale remote URL
    if (typeof savedPlaylists !== 'undefined') {
        savedPlaylists.forEach(p => {
            if (p.channels) {
                p.channels.forEach(ch => {
                    if (ch.logo === originalUrl) ch.logo = cachedUrl;
                });
            }
        });
    }

    // 2. Update allChannels in-memory array (populated from savedPlaylists at render time)
    if (typeof allChannels !== 'undefined') {
        allChannels.forEach(ch => {
            if (ch.logo === originalUrl) ch.logo = cachedUrl;
        });
    }

    // 3. Dynamically replace any currently visible image elements in the DOM
    // CSS escapes are needed for URLs in querySelector attributes
    try {
        const safeUrl = originalUrl.replace(/"/g, '\\"');
        const images = document.querySelectorAll(`img[src="${safeUrl}"]`);
        images.forEach(img => {
            img.src = cachedUrl;
        });
    } catch (e) {
        console.warn('Failed to dynamically replace cached logo in DOM', e);
    }
});

// Update stream info overlay periodically
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
                showToast(`Programme Reminder: ${r.progTitle}\n${r.channelTitle}`);
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
            const lowId = id.toLowerCase();
            if (epgData[lowId] && epgData[lowId].length > 0) { programmes = epgData[lowId]; break; }
        }

        const currentProg = getCurrentProgram(programmes);
        if (!currentProg) return;

        const pStart = parseEpgTime(currentProg.start);
        const pEnd = parseEpgTime(currentProg.stop);
        const timeStr = `${pStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${pEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

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

// ----------------------------------------------------
// Custom Premium Glassmorphic Track Selection Overlay
// ----------------------------------------------------
try {
    window.iptvAPI.onMpvSelectAid(() => {
        console.log('[TRACK SELECTOR] Triggered premium selector for audio tracks.');
        showPremiumTrackSelector('audio');
    });
    window.iptvAPI.onMpvSelectSid(() => {
        console.log('[TRACK SELECTOR] Triggered premium selector for subtitles.');
        showPremiumTrackSelector('sub');
    });
} catch (e) {
    console.error('[TRACK SELECTOR ERR] Failed to register electron track selection listeners:', e);
}

function showPremiumTrackSelector(type) {
    const playerContainer = document.getElementById('player-container');
    if (!playerContainer) return;

    // Remove any existing track selector overlay
    const oldOverlay = document.getElementById('premium-track-selector-overlay');
    if (oldOverlay) oldOverlay.remove();

    const tracks = window.currentMpvTrackList || [];
    const filteredTracks = tracks.filter(t => t.type === (type === 'audio' ? 'audio' : 'sub'));
    const currentId = type === 'audio' ? window.currentMpvAid : window.currentMpvSid;

    const overlay = document.createElement('div');
    overlay.id = 'premium-track-selector-overlay';
    overlay.style.cssText = `
        position: absolute;
        inset: 0;
        background: rgba(12, 5, 20, 0.78);
        backdrop-filter: blur(25px);
        -webkit-backdrop-filter: blur(25px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        animation: fadeIn 0.3s ease forwards;
        font-family: 'Outfit', 'Inter', sans-serif;
        pointer-events: auto !important;
    `;

    // Click outside container to close
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.remove();
        }
    });

    const container = document.createElement('div');
    container.style.cssText = `
        width: 380px;
        background: rgba(25, 15, 38, 0.65);
        border: 1px solid rgba(187, 134, 252, 0.25);
        border-radius: 20px;
        padding: 24px;
        box-shadow: 0 20px 50px rgba(0, 0, 0, 0.8), 0 0 30px rgba(187, 134, 252, 0.05);
        display: flex;
        flex-direction: column;
        gap: 18px;
        animation: scaleUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        pointer-events: auto !important;
    `;

    const titleRow = document.createElement('div');
    titleRow.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
    `;

    const title = document.createElement('span');
    title.textContent = type === 'audio' ? 'Audio Track' : 'Subtitles';
    title.style.cssText = `
        color: #ffffff;
        font-size: 1.25rem;
        font-weight: 700;
        letter-spacing: -0.02em;
    `;

    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
    closeBtn.style.cssText = `
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        color: rgba(255, 255, 255, 0.6);
        width: 32px;
        height: 32px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.2s ease;
    `;
    closeBtn.addEventListener('mouseenter', () => {
        closeBtn.style.background = 'rgba(255, 255, 255, 0.1)';
        closeBtn.style.color = '#ffffff';
    });
    closeBtn.addEventListener('mouseleave', () => {
        closeBtn.style.background = 'rgba(255, 255, 255, 0.05)';
        closeBtn.style.color = 'rgba(255, 255, 255, 0.6)';
    });
    closeBtn.addEventListener('click', () => overlay.remove());

    titleRow.appendChild(title);
    titleRow.appendChild(closeBtn);
    container.appendChild(titleRow);

    const list = document.createElement('div');
    list.style.cssText = `
        display: flex;
        flex-direction: column;
        gap: 8px;
        max-height: 280px;
        overflow-y: auto;
        padding-right: 4px;
    `;

    // For subtitles, add a "Disable/Off" option
    const finalTracks = [...filteredTracks];
    if (type === 'sub') {
        const offOption = {
            id: 'no',
            lang: '',
            title: 'Subtitles Off',
            selected: currentId === 'no' || !currentId
        };
        finalTracks.unshift(offOption);
    }

    if (finalTracks.length === 0) {
        const emptyMsg = document.createElement('div');
        emptyMsg.textContent = 'No tracks available';
        emptyMsg.style.cssText = `
            color: rgba(255, 255, 255, 0.4);
            font-size: 0.95rem;
            text-align: center;
            padding: 20px;
        `;
        list.appendChild(emptyMsg);
    } else {
        finalTracks.forEach(t => {
            const isSelected = t.selected || (type === 'sub' && t.id === 'no' && (currentId === 'no' || !currentId));
            const item = document.createElement('div');
            item.style.cssText = `
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 12px 16px;
                background: ${isSelected ? 'rgba(187, 134, 252, 0.12)' : 'rgba(255, 255, 255, 0.03)'};
                border: 1.5px solid ${isSelected ? 'rgba(187, 134, 252, 0.35)' : 'rgba(255, 255, 255, 0.06)'};
                border-radius: 12px;
                cursor: pointer;
                transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
            `;

            const label = document.createElement('span');
            let trackName = t.title || t.lang || (t.id === 'no' ? 'Subtitles Off' : `Track ${t.id}`);
            if (t.lang) trackName += ` [${t.lang.toUpperCase()}]`;
            label.textContent = trackName;
            label.style.cssText = `
                color: ${isSelected ? '#bb86fc' : 'rgba(255, 255, 255, 0.85)'};
                font-weight: ${isSelected ? '700' : '500'};
                font-size: 0.95rem;
            `;

            item.appendChild(label);

            if (isSelected) {
                const check = document.createElement('span');
                check.innerHTML = `✔️`;
                check.style.cssText = `
                    color: #bb86fc;
                    font-size: 0.9rem;
                    text-shadow: 0 0 10px rgba(187, 134, 252, 0.5);
                `;
                item.appendChild(check);
            }

            item.addEventListener('mouseenter', () => {
                if (!isSelected) {
                    item.style.background = 'rgba(255, 255, 255, 0.08)';
                    item.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                }
            });
            item.addEventListener('mouseleave', () => {
                if (!isSelected) {
                    item.style.background = 'rgba(255, 255, 255, 0.03)';
                    item.style.borderColor = 'rgba(255, 255, 255, 0.06)';
                }
            });

            item.addEventListener('click', () => {
                if (type === 'audio') {
                    window.iptvAPI.sendMpvCommand(['set', 'aid', t.id]);
                } else {
                    window.iptvAPI.sendMpvCommand(['set', 'sid', t.id]);
                }
                overlay.remove();
            });

            list.appendChild(item);
        });
    }

    container.appendChild(list);
    overlay.appendChild(container);
    playerContainer.appendChild(overlay);
}

// System Tray navigation listener to open the DVR/Recording page
try {
    if (window.iptvAPI && typeof window.iptvAPI.onOpenDvrPage === 'function') {
        window.iptvAPI.onOpenDvrPage(() => {
            console.log('[TRAY IPC] Navigating to DVR page...');
            const recordingBtn = document.getElementById('btn-recording');
            if (recordingBtn) {
                switchTab('recording', recordingBtn);
            } else {
                console.error('[TRAY IPC] btn-recording not found in DOM');
            }
        });
    }
} catch (e) {
    console.error('Failed to register onOpenDvrPage listener:', e);
}

// Monitor DPI and display changes to re-sync native bounds
try {
    if (window.iptvAPI && typeof window.iptvAPI.onTriggerRendererBoundsSync === 'function') {
        window.iptvAPI.onTriggerRendererBoundsSync(() => {
            console.log('[BOUNDS] Display metrics changed or screen drag occurred. Resyncing layout.');
            settlePlayerBoundsAfterLayout();
        });
    }
} catch (e) {
    console.error('Failed to register display metrics change listener:', e);
}
