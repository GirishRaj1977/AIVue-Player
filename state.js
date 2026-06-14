// Global Application State
window.appState = {
    allChannels: [],
    savedPlaylists: [],
    streamActive: false,
    currentPlayingChannelIndex: -1,
    editingPlaylistIndex: -1,
    savedEpgs: [],
    channelMappings: {},
    savedReminders: JSON.parse(localStorage.getItem('iptv_reminders') || '[]'),
    clientActiveRecordings: [],
    clientScheduledRecordings: [],
    isAutoplayEnabled: localStorage.getItem('iptv_autoplay_next') !== 'false',
    currentPlayingSeriesEpisodes: []
};

// Legacy global variables (gradually migrating to window.appState)
var savedPlaylists = window.appState.savedPlaylists;
var allChannels = window.appState.allChannels;
var streamActive = window.appState.streamActive;
var currentPlayingChannelIndex = window.appState.currentPlayingChannelIndex;
var editingPlaylistIndex = window.appState.editingPlaylistIndex;
var savedEpgs = window.appState.savedEpgs;
var channelMappings = window.appState.channelMappings;
var savedReminders = window.appState.savedReminders;
var clientActiveRecordings = window.appState.clientActiveRecordings;
var clientScheduledRecordings = window.appState.clientScheduledRecordings;

window.isAutoplayEnabled = window.appState.isAutoplayEnabled;
window.currentPlayingSeriesEpisodes = window.appState.currentPlayingSeriesEpisodes;
