# Release Notes - Version 1.0.3

Welcome to version **1.0.3** of AIVue Player! This release adds a highly requested live stream recording button to the player controls, fixes several key stability issues in our background scheduler and DVR engine, and optimizes overall performance.

---

## 🔴 New Feature: Instant OSC Live Stream Recording

We have added a direct **Live Stream Recording** controller inside the On-Screen Controls (OSC).
- **One-Click Recording**: Watch any live channel and click the new circle icon (`○`) in the bottom right corner to immediately start recording the live feed.
- **Red Recording Indicator**: Once active, the icon turns into a red dot (`●`), and a persistent `● Recording (Click to stop)` overlay appears in the top-right corner of the video.
- **Always Active Overlay**: The top-right overlay remains visible even when the OSC hides, so you always know a recording is in progress.
- **Click to Stop**: Clicking either the red dot in the OSC or the top-right overlay stops the recording immediately.
- **Easy Retrieval**: All manual recordings are automatically saved to your configured recordings folder and are instantly available in the **Recordings** page for playback.

---

## 🛠️ Enhancements & Bug Fixes

### 📱 Remote Control & Mobile Interface
- **Sticky EPG Program Cell Titles**: Long program cells no longer show up blank when scrolled horizontally (both on the desktop Live panel/Main EPG and the mobile Remote EPG view). Title text now floats dynamically to stay visible as you scroll.
- **Resolved `aivue-logo://` protocol loads**: Fixed image load failures on mobile remote web browsers caused by custom protocols.
- **Remote IPC Path & Authentication**: Resolved connection path failures and credential errors on mobile remote controls.

### 📼 DVR & Recording Engine
- **Conflict Detection**: Added automatic recording overlap/conflict checks.
- **Series Recording Rules Schema**: Enabled auto-scanning and automated recording rules for favorite shows.
- **Stalker Watchdog Heartbeat**: Added a persistent background watchdog loop to keep active Stalker DVR recording portals alive.
- **Ffmpeg Reconnection**: Added reconnect arguments to FFmpeg parameters to prevent early recording failures or timeouts when connections drop.

### ⚡ EPG & XMLTV Performance
- **Optimized EPG Load Engine**: Multi-threaded SAX streaming parser and database-less worker updates resulting in a significantly faster startup and smooth UI updates.
- **XMLTV Resiliency**: Added strict parser recovery and validation to bypass HTML errors or bad streams.
- **Logo Cache IPC**: Optimized logo loading and mapping memory footprints.

### 🎬 Video Player & UI Transitions
- **Pop-Up Overlay Ordering**: Overlay toasts and prompts now layer properly in front of fullscreen playback.
- **Auto-Hide Mouse Pointer**: Pointer automatically fades out during fullscreen playback.
- **Player Startup Fix**: Fixed stream initialization bugs to ensure audio and video start playing unmuted and unpaused properly.
