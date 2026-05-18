const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('iptvAPI', {
    parseM3u: (source) => ipcRenderer.invoke('parse-m3u', source),
    getEpgChannels: (epg) => ipcRenderer.invoke('get-epg-channels', epg),
    updateEpg: (epgSources, filterIds, forceRefresh) => ipcRenderer.invoke('update-epg', epgSources, filterIds, forceRefresh),
    getEpg: (channelIds) => ipcRenderer.invoke('get-epg', channelIds),
    getMappings: () => ipcRenderer.invoke('get-mappings'),
    saveMapping: (title, epgId) => ipcRenderer.invoke('save-mapping', title, epgId),
    getExternalEpgs: () => ipcRenderer.invoke('get-external-epgs'),
    addExternalEpg: (url) => ipcRenderer.invoke('add-external-epg', url),
    removeExternalEpg: (url) => ipcRenderer.invoke('remove-external-epg', url),
    playMpvEmbedded: (data) => ipcRenderer.send('play-mpv-embedded', data),
    updateMpvBounds: (bounds) => ipcRenderer.send('update-mpv-bounds', bounds),
    sendMpvCommand: (cmd) => ipcRenderer.send('mpv-command', cmd),
    toggleFullscreen: () => ipcRenderer.send('toggle-fullscreen'),
    onFullscreenChange: (callback) => ipcRenderer.on('fullscreen-state', (_event, isFull) => callback(isFull)),
    onMpvPropChange: (callback) => ipcRenderer.on('mpv-prop-change', (_event, name, val) => callback(name, val)),
    onMpvExit: (callback) => ipcRenderer.on('mpv-exit', (_event, code) => callback(code)),
    onPreviousChannel: (callback) => ipcRenderer.on('mpv-previous-channel', callback),
    onNextChannel: (callback) => ipcRenderer.on('mpv-next-channel', callback),
    saveChannels: (channels) => ipcRenderer.invoke('save-channels', channels),
    loadChannels: () => ipcRenderer.invoke('load-channels'),
    openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
    clearCache: (url) => ipcRenderer.invoke('clear-cache', url),
    factoryReset: () => ipcRenderer.invoke('factory-reset')
});