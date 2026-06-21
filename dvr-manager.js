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
                        
                        const liveView = document.getElementById('live-tv-view');
                        if (liveView && liveView.style.display === 'flex') {
                            renderLiveEpg();
                        }
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
                    <button class="playlist-btn play-rec-btn" 
                        data-path="${rec.absolutePath.replace(/"/g, '&quot;')}" 
                        data-name="${rec.filename.replace(/"/g, '&quot;')}"
                        data-channel-name="${(rec.channelName || '').replace(/"/g, '&quot;')}"
                        data-program-name="${(rec.programName || '').replace(/"/g, '&quot;')}"
                        data-description="${(rec.description || '').replace(/"/g, '&quot;')}"
                        data-start-time="${rec.startTime || ''}"
                        data-end-time="${rec.endTime || ''}"
                        style="background: #bb86fc; color: black; font-weight: bold; padding: 8px 16px; border-radius: 6px;">Play</button>
                    <button class="playlist-btn delete-rec-btn" data-filename="${rec.filename.replace(/"/g, '&quot;')}" style="background: transparent; color: #cf6679; border: 1px solid rgba(207,102,121,0.4); padding: 8px 16px; border-radius: 6px;">Delete</button>
                </div>
            </div>`;
        }).join('');
        
        savedList.querySelectorAll('.play-rec-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const filePath = btn.getAttribute('data-path');
                const fileName = btn.getAttribute('data-name');
                const channelName = btn.getAttribute('data-channel-name');
                const programName = btn.getAttribute('data-program-name');
                const description = btn.getAttribute('data-description');
                const startTime = btn.getAttribute('data-start-time');
                const endTime = btn.getAttribute('data-end-time');
                
                console.log('[DVR PLAY] Playing recorded stream:', filePath);
                const recordingChannelObject = {
                    title: fileName.replace('.ts', ''),
                    url: filePath,
                    type: 'recording',
                    channelName: channelName,
                    programName: programName,
                    description: description,
                    startTime: startTime,
                    endTime: endTime
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

                if (window.currentPlaybackChannel && window.currentPlaybackChannel.title === data.channelName) {
                    window.iptvAPI.sendMpvCommand(['script-message', 'update-recording-state', 'true']);
                }
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
                showToast('Recording Failed. Please check logs for details.', true);
            }

            if (window.currentPlaybackChannel && window.currentPlaybackChannel.title === data.channelName) {
                window.iptvAPI.sendMpvCommand(['script-message', 'update-recording-state', 'false']);
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
