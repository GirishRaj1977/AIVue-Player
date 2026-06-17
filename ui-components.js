// Pure UI components extracted from renderer.js (Spinners, Toasts)

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

function showToast(message) {
    console.log(`[UI] showToast: "${message}"`);

    if (window.isAppFullscreen) {
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
        if (window.iptvAPI && typeof window.iptvAPI.showNativeConfirm === 'function') {
            window.iptvAPI.offNativeConfirmResponse();
            window.iptvAPI.onNativeConfirmResponse((response) => {
                window.iptvAPI.offNativeConfirmResponse();
                if (response) {
                    onConfirm();
                }
            });
            window.iptvAPI.showNativeConfirm(message);
            return;
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

