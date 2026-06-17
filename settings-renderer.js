// UI Settings Renderer
// Handles settings panel renders and actions.

window.renderSettings = async function() {
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

            btn.textContent = originalText;
            btn.disabled = false;
            window.renderSettings();
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
                console.log('[API] Calling clearCache for', epgSource);
                await window.iptvAPI.clearCache(epgSource);
                console.log('[API] clearCache completed.');

                console.log('[API] Calling updateEpg for specific source only:', epgSource);
                await window.iptvAPI.updateEpg(epgSource, null, true);
                console.log('[API] updateEpg completed.');

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

                window.renderSettings();
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
                    window.renderSettings();
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
                    window.renderSettings();
                }, 1000);
            });

            const revokeBtn = document.getElementById('settings-revoke-device-btn');
            if (revokeBtn) {
                revokeBtn.addEventListener('click', async () => {
                    remoteSettings.activeDeviceId = null;
                    await window.iptvAPI.saveRemoteSettings(remoteSettings);
                    window.renderSettings();
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
};
