// UI related functionality
function showEventsList() {
  const eventsContainer = document.getElementById('events-container');
  const events = window.currentEvents || [];
  
  if (events.length === 0) {
    eventsContainer.innerHTML = '<p class="no-events">No events found in this area</p>';
    return;
  }

  eventsContainer.innerHTML = events.map(event => `
    <div class="event-card" data-event-id="${event.id}">
      <div class="event-header">
        <i class="fas ${getCategoryIcon(event.category)}"></i>
        <h3>${event.name}</h3>
      </div>
      <p class="event-caption">${event.caption}</p>
      <p class="event-time"><i class="far fa-clock"></i> ${formatDateTime(event.startTime)}</p>
      <div class="event-actions">
        <button onclick="showEventDetails('${event.id}')" class="view-details-btn">View Details</button>
        <button onclick="toggleFavorite('${event.id}')" class="favorite-btn ${isFavorited(event.id) ? 'favorited' : ''}">
          <i class="fas fa-heart"></i>
        </button>
      </div>
    </div>
  `).join('');
}

function showSettingsPanel() {
  const settingsPanel = document.getElementById('settings-panel');
  settingsPanel.innerHTML = `
    <div class="settings-header">
      <h2>Settings</h2>
      <button class="close-settings-btn">&times;</button>
    </div>
    
    <div class="settings-content">
      <div class="settings-section">
        <h3>Display</h3>
        <div class="setting-item">
          <label for="display-mode">Theme</label>
          <select id="display-mode">
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="auto">Auto (System)</option>
          </select>
        </div>
        
        <div class="setting-item">
          <label for="font-size">Font Size</label>
          <select id="font-size">
            <option value="small">Small</option>
            <option value="medium">Medium</option>
            <option value="large">Large</option>
          </select>
        </div>
      </div>

      <div class="settings-section">
        <h3>Notifications</h3>
        <div class="setting-item">
          <label for="show-notifications">Enable Notifications</label>
          <input type="checkbox" id="show-notifications">
        </div>
        
        <div class="setting-item">
          <label for="notification-sound">Notification Sound</label>
          <input type="checkbox" id="notification-sound">
        </div>
      </div>

      <div class="settings-section">
        <h3>Privacy</h3>
        <div class="setting-item">
          <label for="location-sharing">Location Sharing</label>
          <input type="checkbox" id="location-sharing">
        </div>
        
        <div class="setting-item">
          <label for="activity-visibility">Activity Visibility</label>
          <select id="activity-visibility">
            <option value="public">Public</option>
            <option value="friends">Friends Only</option>
            <option value="private">Private</option>
          </select>
        </div>
      </div>
    </div>
  `;

  setupSettingsListeners();
}

function updateSettingsUI(settings) {
  // Update display mode
  document.getElementById('display-mode').value = settings.displayMode || 'light';
  document.getElementById('font-size').value = settings.fontSize || 'medium';
  
  // Update notification settings
  document.getElementById('show-notifications').checked = settings.notifications || false;
  document.getElementById('notification-sound').checked = settings.notificationSound || false;
  
  // Update privacy settings
  document.getElementById('location-sharing').checked = settings.locationSharing || false;
  document.getElementById('activity-visibility').value = settings.activityVisibility || 'public';
  
  // Apply settings
  applySettings(settings);
}

function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  
  document.body.appendChild(toast);
  
  // Trigger reflow to enable animation
  toast.offsetHeight;
  
  // Show toast
  toast.classList.add('show');
  
  // Remove toast after animation
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function displayFavorites() {
  const favoritesContainer = document.getElementById('favorites-container');
  const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
  
  if (favorites.length === 0) {
    favoritesContainer.innerHTML = '<p class="no-favorites">No favorites yet</p>';
    return;
  }

  // Get favorite events from current events
  const favoriteEvents = window.currentEvents.filter(event => favorites.includes(event.id));
  
  favoritesContainer.innerHTML = favoriteEvents.map(event => `
    <div class="favorite-card">
      <div class="favorite-header">
        <i class="fas ${getCategoryIcon(event.category)}"></i>
        <h3>${event.name}</h3>
      </div>
      <p class="favorite-caption">${event.caption}</p>
      <p class="favorite-time"><i class="far fa-clock"></i> ${formatDateTime(event.startTime)}</p>
      <div class="favorite-actions">
        <button onclick="showEventDetails('${event.id}')" class="view-details-btn">View Details</button>
        <button onclick="toggleFavorite('${event.id}')" class="favorite-btn favorited">
          <i class="fas fa-heart"></i>
        </button>
      </div>
    </div>
  `).join('');
}

function isFavorited(eventId) {
  const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
  return favorites.includes(eventId);
}

function initializeHelpTab() {
  const helpContent = document.getElementById('help-content');
  helpContent.innerHTML = `
    <div class="help-section">
      <h3>Getting Started</h3>
      <ul>
        <li>Use the map to explore events in your area</li>
        <li>Adjust the radius slider to change the search area</li>
        <li>Click on markers to view event details</li>
        <li>Use the "Locate Me" button to center the map on your location</li>
      </ul>
    </div>
    
    <div class="help-section">
      <h3>Managing Events</h3>
      <ul>
        <li>Click "Create Event" to add a new event</li>
        <li>Add events to favorites by clicking the heart icon</li>
        <li>View your favorites in the Favorites tab</li>
        <li>Edit or delete events you've created from the My Events tab</li>
      </ul>
    </div>
    
    <div class="help-section">
      <h3>Settings</h3>
      <ul>
        <li>Customize your experience in the Settings panel</li>
        <li>Change theme and font size</li>
        <li>Manage notification preferences</li>
        <li>Control privacy settings</li>
      </ul>
    </div>
    
    <div class="help-section">
      <h3>Need More Help?</h3>
      <p>Contact us at support@example.com</p>
    </div>
  `;
}

function switchExplorerTab(tabName) {
  const tabs = document.querySelectorAll('.explorer-tab');
  tabs.forEach(tab => tab.classList.remove('active'));
  document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
}

function checkAndUpdateRightPanel() {
  const rightPanel = document.querySelector('.right-panel');
  const map = document.getElementById('map');
  
  if (window.innerWidth <= 768) {
    rightPanel.classList.add('mobile');
    map.style.width = '100%';
  } else {
    rightPanel.classList.remove('mobile');
    map.style.width = rightPanel.classList.contains('expanded') ? '70%' : '100%';
  }
}

function expandRightPanel() {
  const rightPanel = document.querySelector('.right-panel');
  const map = document.getElementById('map');
  
  rightPanel.classList.add('expanded');
  if (window.innerWidth > 768) {
    map.style.width = '70%';
  }
}

function showFeedback(message) {
  const feedbackContainer = document.createElement('div');
  feedbackContainer.className = 'feedback-container';
  feedbackContainer.innerHTML = `
    <div class="feedback-content">
      <p>${message}</p>
      <div class="feedback-actions">
        <button class="feedback-btn yes">Yes</button>
        <button class="feedback-btn no">No</button>
      </div>
    </div>
  `;

  document.body.appendChild(feedbackContainer);

  return new Promise((resolve) => {
    feedbackContainer.addEventListener('click', (e) => {
      if (e.target.classList.contains('feedback-btn')) {
        const response = e.target.classList.contains('yes');
        feedbackContainer.remove();
        resolve(response);
      }
    });
  });
}

// Export UI functions
window.UI = {
  showEventsList,
  showSettingsPanel,
  updateSettingsUI,
  showToast,
  displayFavorites,
  isFavorited,
  initializeHelpTab,
  switchExplorerTab,
  checkAndUpdateRightPanel,
  expandRightPanel,
  showFeedback
}; 