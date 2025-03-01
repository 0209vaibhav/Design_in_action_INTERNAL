// Settings functionality for map and UI preferences

// Default settings configuration
const defaultSettings = {
    mapStyle: 'mapbox://styles/0209vaibhav/cm3qznmj6001r01s0aj3680en',
    enable3DBuildings: false,
    showEventLabels: true,
    autoClosePopups: false,
    markerSize: 'medium',
    eventReminders: true,
    nearbyEvents: true,
    displayMode: 'light',
    fontSize: 'medium',
    notifications: true,
    notificationSound: true,
    locationSharing: true,
    activityVisibility: 'public',
    timestamp: true
};

// Show settings panel with all configuration options
function showSettingsPanel() {
    // Get or create settings container
    let settingsContainer = document.getElementById('settings-container');
    if (!settingsContainer) {
        settingsContainer = document.createElement('div');
        settingsContainer.id = 'settings-container';
        settingsContainer.className = 'settings-container';
        
        // Insert the settings container below subtabs
        const subtabs = document.querySelector('.explorer-subtabs');
        if (subtabs) {
            subtabs.insertAdjacentElement('afterend', settingsContainer);
        }
    }

    // Show settings container
    settingsContainer.style.display = 'block';

    // Create settings content
    settingsContainer.innerHTML = `
        <div class="settings-section">
            <h3>Map Preferences</h3>
            
            <div class="setting-item">
                <label class="setting-label">
                    Map Style
                    <select id="mapStyle" class="setting-select">
                        <option value="mapbox://styles/mapbox/streets-v11">Streets</option>
                        <option value="mapbox://styles/mapbox/dark-v10">Dark</option>
                        <option value="mapbox://styles/mapbox/light-v10">Light</option>
                        <option value="mapbox://styles/mapbox/satellite-v9">Satellite</option>
                    </select>
                </label>
            </div>

            <div class="setting-item">
                <label class="setting-switch">
                    <span>3D Buildings</span>
                    <input type="checkbox" id="enable3DBuildings">
                    <span class="switch-slider"></span>
                </label>
            </div>
        </div>

        <div class="settings-section">
            <h3>Event Display</h3>
            
            <div class="setting-item">
                <label class="setting-switch">
                    <span>Show Event Labels</span>
                    <input type="checkbox" id="showEventLabels" checked>
                    <span class="switch-slider"></span>
                </label>
            </div>

            <div class="setting-item">
                <label class="setting-switch">
                    <span>Auto-close Popups</span>
                    <input type="checkbox" id="autoClosePopups">
                    <span class="switch-slider"></span>
                </label>
            </div>

            <div class="setting-item">
                <label class="setting-label">
                    Marker Size
                    <select id="markerSize" class="setting-select">
                        <option value="small">Small</option>
                        <option value="medium" selected>Medium</option>
                        <option value="large">Large</option>
                    </select>
                </label>
            </div>
        </div>

        <div class="settings-section">
            <h3>Notifications</h3>
            
            <div class="setting-item">
                <label class="setting-switch">
                    <span>Event Reminders</span>
                    <input type="checkbox" id="eventReminders" checked>
                    <span class="switch-slider"></span>
                </label>
            </div>

            <div class="setting-item">
                <label class="setting-switch">
                    <span>Nearby Events</span>
                    <input type="checkbox" id="nearbyEvents" checked>
                    <span class="switch-slider"></span>
                </label>
            </div>
        </div>

        <div class="settings-section">
            <h3>Theme</h3>
            
            <div class="setting-item">
                <label class="setting-label">
                    Display Mode
                    <select id="display-mode" class="setting-select">
                        <option value="light">Light</option>
                        <option value="dark">Dark</option>
                    </select>
                </label>
            </div>

            <div class="setting-item">
                <label class="setting-label">
                    Font Size
                    <select id="font-size" class="setting-select">
                        <option value="small">Small</option>
                        <option value="medium" selected>Medium</option>
                        <option value="large">Large</option>
                    </select>
                </label>
            </div>
        </div>

        <div class="settings-section">
            <h3>Notification Settings</h3>
            
            <div class="setting-item">
                <label class="setting-switch">
                    <span>Show Notifications</span>
                    <input type="checkbox" id="show-notifications" checked>
                    <span class="switch-slider"></span>
                </label>
            </div>

            <div class="setting-item">
                <label class="setting-switch">
                    <span>Notification Sound</span>
                    <input type="checkbox" id="notification-sound" checked>
                    <span class="switch-slider"></span>
                </label>
            </div>
        </div>

        <div class="settings-section">
            <h3>Privacy</h3>
            
            <div class="setting-item">
                <label class="setting-switch">
                    <span>Location Sharing</span>
                    <input type="checkbox" id="location-sharing" checked>
                    <span class="switch-slider"></span>
                </label>
            </div>

            <div class="setting-item">
                <label class="setting-label">
                    Activity Visibility
                    <select id="activity-visibility" class="setting-select">
                        <option value="public">Public</option>
                        <option value="friends">Friends</option>
                        <option value="private">Private</option>
                    </select>
                </label>
            </div>
        </div>

        <div class="settings-section">
            <h3>Timestamp</h3>
            
            <div class="setting-item">
                <label class="setting-switch">
                    <span>Show Timestamp</span>
                    <input type="checkbox" id="timestamp" checked>
                    <span class="switch-slider"></span>
                </label>
            </div>
        </div>

        <div class="settings-footer">
            <button id="resetSettings" class="settings-button secondary">Reset to Default</button>
            <button id="saveSettings" class="settings-button primary">Save Changes</button>
        </div>
    `;

    // Add event listeners for settings controls
    setupSettingsListeners();
}

// Set up event listeners for all settings controls
function setupSettingsListeners() {
    // Map style change
    const mapStyleSelect = document.getElementById('mapStyle');
    if (mapStyleSelect) {
        mapStyleSelect.addEventListener('change', (e) => {
            window.map.setStyle(e.target.value);
        });
    }

    // Single event listener for 3D Buildings
    const buildings3D = document.getElementById('enable3DBuildings');
    if (buildings3D) {
        buildings3D.addEventListener('change', (e) => {
            if (window.map) {
                window.map.setConfigProperty('3d-buildings', 'visible', e.target.checked);
            }
        });
    }

    // Single event listener for Event Labels
    const showLabels = document.getElementById('showEventLabels');
    if (showLabels) {
        showLabels.addEventListener('change', (e) => {
            document.querySelectorAll('.event-marker').forEach(marker => {
                marker.style.display = e.target.checked ? 'block' : 'none';
            });
        });
    }

    // Update auto-close popups listener
    const autoClose = document.getElementById('autoClosePopups');
    if (autoClose) {
        autoClose.addEventListener('change', (e) => {
            window.map.off('click'); // Remove existing click handlers
            if (e.target.checked) {
                setupAutoClosePopups();
            }
        });
    }

    // Marker size change
    const markerSize = document.getElementById('markerSize');
    if (markerSize) {
        markerSize.addEventListener('change', (e) => {
            const size = e.target.value;
            document.querySelectorAll('.event-marker').forEach(marker => {
                marker.classList.remove('small', 'medium', 'large');
                marker.classList.add(size);
            });
        });
    }

    // Theme settings
    document.getElementById('display-mode').addEventListener('change', updateDisplayMode);
    document.getElementById('font-size').addEventListener('change', updateFontSize);
    
    // Notification settings
    document.getElementById('show-notifications').addEventListener('change', (e) => {
        saveSettings({ notifications: e.target.checked });
    });
    
    document.getElementById('notification-sound').addEventListener('change', (e) => {
        saveSettings({ notificationSound: e.target.checked });
    });
    
    // Privacy settings
    document.getElementById('location-sharing').addEventListener('change', (e) => {
        saveSettings({ locationSharing: e.target.checked });
    });
    
    document.getElementById('activity-visibility').addEventListener('change', (e) => {
        saveSettings({ activityVisibility: e.target.value });
    });
    
    // Close button
    document.querySelector('.close-settings-btn').addEventListener('click', () => {
        document.getElementById('settings-panel').classList.remove('show');
    });

    // Save settings
    const saveButton = document.getElementById('saveSettings');
    if (saveButton) {
        saveButton.addEventListener('click', () => {
            const settings = {
                mapStyle: document.getElementById('mapStyle').value,
                enable3DBuildings: document.getElementById('enable3DBuildings').checked,
                showEventLabels: document.getElementById('showEventLabels').checked,
                autoClosePopups: document.getElementById('autoClosePopups').checked,
                markerSize: document.getElementById('markerSize').value,
                eventReminders: document.getElementById('eventReminders').checked,
                nearbyEvents: document.getElementById('nearbyEvents').checked,
                displayMode: document.getElementById('display-mode').value,
                fontSize: document.getElementById('font-size').value,
                notifications: document.getElementById('show-notifications').checked,
                notificationSound: document.getElementById('notification-sound').checked,
                locationSharing: document.getElementById('location-sharing').checked,
                activityVisibility: document.getElementById('activity-visibility').value,
                timestamp: document.getElementById('timestamp').checked
            };
            localStorage.setItem('settings', JSON.stringify(settings));
            showToast('Settings saved successfully!');
            
            // Apply the saved settings immediately
            applySettings(settings);
        });
    }

    // Reset settings
    const resetButton = document.getElementById('resetSettings');
    if (resetButton) {
        resetButton.addEventListener('click', () => {
            if (confirm('Are you sure you want to reset all settings to default?')) {
                localStorage.removeItem('settings');
                loadDefaultSettings();
                showToast('Settings reset to default');
            }
        });
    }

    // Load saved settings when panel opens
    const savedSettings = localStorage.getItem('settings');
    if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        updateSettingsUI(settings);
        applySettings(settings);
    }
}

// Update the settings UI with provided settings
function updateSettingsUI(settings) {
    // Update map style select
    const mapStyleSelect = document.getElementById('mapStyle');
    if (mapStyleSelect) {
        mapStyleSelect.value = settings.mapStyle;
    }

    // Update 3D buildings toggle
    const buildings3D = document.getElementById('enable3DBuildings');
    if (buildings3D) {
        buildings3D.checked = settings.enable3DBuildings;
    }

    // Update event labels toggle
    const showLabels = document.getElementById('showEventLabels');
    if (showLabels) {
        showLabels.checked = settings.showEventLabels;
    }

    // Update auto-close popups toggle
    const autoClose = document.getElementById('autoClosePopups');
    if (autoClose) {
        autoClose.checked = settings.autoClosePopups;
    }

    // Update marker size select
    const markerSize = document.getElementById('markerSize');
    if (markerSize) {
        markerSize.value = settings.markerSize;
    }

    // Update notification settings
    const eventReminders = document.getElementById('eventReminders');
    const nearbyEvents = document.getElementById('nearbyEvents');
    if (eventReminders) eventReminders.checked = settings.eventReminders;
    if (nearbyEvents) nearbyEvents.checked = settings.nearbyEvents;

    // Update theme settings
    const displayMode = document.getElementById('display-mode');
    if (displayMode) {
        displayMode.value = settings.displayMode;
    }

    // Update font size select
    const fontSize = document.getElementById('font-size');
    if (fontSize) {
        fontSize.value = settings.fontSize;
    }

    // Update notification settings
    const notifications = document.getElementById('show-notifications');
    if (notifications) {
        notifications.checked = settings.notifications;
    }

    // Update notification sound toggle
    const notificationSound = document.getElementById('notification-sound');
    if (notificationSound) {
        notificationSound.checked = settings.notificationSound;
    }

    // Update location sharing toggle
    const locationSharing = document.getElementById('location-sharing');
    if (locationSharing) {
        locationSharing.checked = settings.locationSharing;
    }

    // Update activity visibility select
    const activityVisibility = document.getElementById('activity-visibility');
    if (activityVisibility) {
        activityVisibility.value = settings.activityVisibility;
    }

    // Update timestamp toggle
    const timestamp = document.getElementById('timestamp');
    if (timestamp) {
        timestamp.checked = settings.timestamp;
    }
}

// Load default settings
function loadDefaultSettings() {
    // Apply default settings
    applySettings(defaultSettings);
    
    // Update UI to reflect default settings
    updateSettingsUI(defaultSettings);
}

// Apply settings to the map and UI
function applySettings(settings) {
    if (!window.map || !settings) return;

    // Apply map style if it's different from current style
    if (window.map.getStyle().sprite !== settings.mapStyle) {
        window.map.setStyle(settings.mapStyle);
    }

    // Apply 3D buildings setting
    try {
        window.map.setConfigProperty('3d-buildings', 'visible', settings.enable3DBuildings);
    } catch (error) {
        console.log('3D buildings setting not available for this style');
    }

    // Apply marker size
    document.querySelectorAll('.event-marker').forEach(marker => {
        marker.classList.remove('small', 'medium', 'large');
        marker.classList.add(settings.markerSize);
    });

    // Apply event labels visibility
    document.querySelectorAll('.event-marker').forEach(marker => {
        marker.style.display = settings.showEventLabels ? 'block' : 'none';
    });

    // Apply auto-close popups
    if (window.map.listeners && window.map.listeners('click')) {
        window.map.off('click'); // Remove any existing click handlers
    }
    
    if (settings.autoClosePopups) {
        setupAutoClosePopups();
    }

    // Apply theme
    document.body.className = settings.displayMode;
    
    // Apply font size
    document.documentElement.style.fontSize = {
        small: '14px',
        medium: '16px',
        large: '18px'
    }[settings.fontSize];
    
    // Apply timestamp setting
    if (settings.timestamp) {
        document.body.classList.add('show-timestamp');
    } else {
        document.body.classList.remove('show-timestamp');
    }
}

// Export functions for use in other files
window.Settings = {
    show: showSettingsPanel,
    setup: setupSettingsListeners,
    update: updateSettingsUI,
    loadDefaults: loadDefaultSettings,
    apply: applySettings,
    save: saveSettings,
    updateDisplayMode,
    toggleTimestamp,
    updateFontSize
}; 