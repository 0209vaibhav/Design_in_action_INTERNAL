// Main application entry point
// Test comment for deployment workflow
document.addEventListener('DOMContentLoaded', () => {
  // Initialize map
  window.map = Map.initialize();

  // Initialize journey capture
  Journey.initialize();

  // Load default settings
  const settings = Settings.loadDefaults();
  Settings.apply(settings);

  // Setup auto-close popups
  Utils.setupAutoClosePopups();

  // Initialize help tab
  UI.initializeHelpTab();

  // Add window resize listener
  window.addEventListener('resize', UI.checkAndUpdateRightPanel);

  // Initialize event listeners
  setupEventListeners();
});

function setupEventListeners() {
  // Tab switching
  document.querySelectorAll('.explorer-tab-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      // Remove active class from all buttons
      document.querySelectorAll('.explorer-tab-btn').forEach(btn => {
        btn.classList.remove('active');
      });
      
      // Add active class to clicked button
      this.classList.add('active');
      
      // Handle specific tab actions
      const tab = this.getAttribute('data-tab');
      const filterContainer = document.querySelector('.filter-settings-container');
      
      if (tab === 'filter') {
        filterContainer.classList.remove('hidden');
      } else {
        filterContainer.classList.add('hidden');
      }
    });
  });

  // Radius slider
  const radiusSlider = document.getElementById('radius-slider');
  const radiusValue = document.getElementById('radius-value');
  
  radiusSlider.addEventListener('input', (e) => {
    const value = e.target.value;
    radiusValue.textContent = `${value} miles`;
    Map.updateRadius();
  });

  // Settings button
  document.getElementById('settings-btn').addEventListener('click', () => {
    UI.showSettingsPanel();
  });

  // Help button
  document.getElementById('help-btn').addEventListener('click', () => {
    document.getElementById('help-panel').classList.add('show');
  });

  // Create activity button
  document.getElementById('create-activity-btn').addEventListener('click', () => {
    document.querySelector('.capture-panel').classList.add('show');
  });
}

// Export main functions
window.App = {
  initialize: () => {
    document.addEventListener('DOMContentLoaded', initialize);
  }
}; 