document.addEventListener("DOMContentLoaded", function () {
  // ---------------------------
  // 1) Grab all DOM references
  // ---------------------------
  const tabs = document.querySelectorAll(".activity-tab");
  const mainContent = document.querySelector(".main-content");
  const infoTab = document.querySelector(".info-tab");
  const rightPanel = document.querySelector(".right-panel");

  // Panel collapse/expand buttons
  const collapseLeftBtn = document.getElementById("collapse-left");
  const expandLeftBtn = document.getElementById("expand-left");
  const collapseRightBtn = document.getElementById("collapse-right");
  const expandRightBtn = document.getElementById("expand-right");

  // Radius controls
  const radiusControl = document.getElementById("radius-control");
  const radiusToggle = document.getElementById("radius-toggle");
  const radiusSlider = document.getElementById("radius-slider");
  const radiusValue = document.getElementById("radius-value");

  let map;
  let userLocation = null;
  let liveLocationMarker = null;
  let currentTab = 'explorer'; // Set default tab

  // Add this at the top with other global variables
  let currentOpenPopup = null;

  // Favorites functionality
  let favorites = JSON.parse(localStorage.getItem('favorites')) || [];

  // ---------------------------
  // 2) LocateMeControl (custom)
  // ---------------------------
  class LocateMeControl {
    onAdd(map) {
      this.map = map;
      this.container = document.createElement('div');
      this.container.className = 'mapboxgl-ctrl locate-me-control';

      // Create the button
      this.button = document.createElement('button');
      this.button.type = 'button';
      this.button.className = 'locate-me-button';
      // Icon + tooltip
      this.button.innerHTML = '<i class="fas fa-crosshairs"></i>';
      this.button.title = 'Your Location\nLearn more';

      // When clicked, fly to user location
      this.button.addEventListener('click', () => {
        if (userLocation) {
          this.map.flyTo({ center: userLocation, zoom: 14 });
        }
      });

      this.container.appendChild(this.button);
      return this.container;
    }
    onRemove() {
      this.container.parentNode.removeChild(this.container);
      this.map = undefined;
    }
  }

  // ---------------------------
  // 3) Create a GeoJSON circle (Polygon) for a given radius (miles)
  // ---------------------------
  function createGeoJSONCircle(center, radiusInMiles, points = 64) {
    const coords = { lng: center[0], lat: center[1] };
    const km = radiusInMiles * 1.60934; // Convert miles to kilometers
    const ret = [];
    const distanceX = km/(111.320*Math.cos(coords.lat*Math.PI/180));
    const distanceY = km/110.574;

    // Use more points for smaller radii
    const numPoints = radiusInMiles < 0.1 ? 128 : points;

    for(let i=0; i<numPoints; i++) {
        const theta = (i/numPoints)*(2*Math.PI);
        const x = distanceX*Math.cos(theta);
        const y = distanceY*Math.sin(theta);
        ret.push([coords.lng+x, coords.lat+y]);
    }
    ret.push(ret[0]); // Close the circle

    return {
        type: "Feature",
        geometry: {
            type: "Polygon",
            coordinates: [ret]
        }
    };
  }

  // ---------------------------
  // 4) Remove radius circle from the map
  // ---------------------------
  function removeRadiusCircle() {
    if (!map) return;
    if (map.getLayer("radius-circle-fill")) {
      map.removeLayer("radius-circle-fill");
    }
    if (map.getLayer("radius-circle-outline")) {
      map.removeLayer("radius-circle-outline");
    }
    if (map.getSource("radius-circle")) {
      map.removeSource("radius-circle");
    }
  }

  // ---------------------------
  // 5) Main map update function
  // ---------------------------
  function updateMap() {
    if (!map || !userLocation) return;

    // Update live location marker
    if (!liveLocationMarker) {
        const el = document.createElement('div');
        el.className = 'live-location-marker';
        el.innerHTML = `
            <div class="location-dot"></div>
            <div class="location-pulse"></div>
            <div class="location-heading"></div>
        `;

        liveLocationMarker = new mapboxgl.Marker({
            element: el,
            anchor: 'center'
        })
            .setLngLat(userLocation)
            .addTo(map);
    } else {
        liveLocationMarker.setLngLat(userLocation);
    }

    // Update radius circle if enabled
    const radiusToggle = document.getElementById('radius-toggle');
    const radiusSlider = document.getElementById('radius-slider');

    if (radiusToggle && radiusToggle.checked && radiusSlider) {
        const radiusMiles = parseFloat(radiusSlider.value);
        
        // Always center the circle on the user's location
        if (map.getSource("radius-circle")) {
            const circleGeoJSON = createGeoJSONCircle(userLocation, radiusMiles);
            map.getSource("radius-circle").setData(circleGeoJSON);
        } else {
            // Create new circle if it doesn't exist
            const circleGeoJSON = createGeoJSONCircle(userLocation, radiusMiles);
            
            map.addSource("radius-circle", {
                type: "geojson",
                data: circleGeoJSON
            });

            // Add fill layer
            map.addLayer({
                id: "radius-circle-fill",
                type: "fill",
                source: "radius-circle",
                paint: {
                    "fill-color": "#0080FF",
                    "fill-opacity": 0.1
                }
            });

            // Add outline layer
            map.addLayer({
                id: "radius-circle-outline",
                type: "line",
                source: "radius-circle",
                paint: {
                    "line-color": "#0080FF",
                    "line-width": 2,
                    "line-opacity": 0.8
                }
            });
        }
    } else {
        removeRadiusCircle();
    }
  }

  // ---------------------------
  // 6) Geolocation: watchPosition
  // ---------------------------
  function getUserLocation() {
    if (navigator.geolocation) {
      // Get initial position with high accuracy
      navigator.geolocation.getCurrentPosition(
        position => {
          userLocation = [position.coords.longitude, position.coords.latitude];
          if (map) {
            map.flyTo({
              center: userLocation,
              zoom: 14,
              essential: true
            });
            updateMap();
          }
        },
        error => {
          console.error("Initial Position Error:", error);
          // Show error to user
          showToast("Error getting location. Please enable location services.");
        },
        { 
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );

      // Watch for position updates with high accuracy
      const watchId = navigator.geolocation.watchPosition(
        position => {
          userLocation = [position.coords.longitude, position.coords.latitude];
          if (map) {
            updateMap();
          }
        },
        error => {
          console.error("Watch Position Error:", error);
          showToast("Error tracking location. Please check your location settings.");
        },
        { 
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 5000
        }
      );

      // Store watchId if you need to clear it later
      window.locationWatchId = watchId;
    } else {
      console.error("Geolocation not supported");
      showToast("Geolocation is not supported by your browser");
    }
  }

  // ---------------------------
  // 7) Map Functions
  // ---------------------------
  function initializeMap(center = [-73.9626, 40.8075], zoom = 15) {
    if (map) {
      map.remove();
    }

    // Get saved settings or use defaults
    const savedSettings = JSON.parse(localStorage.getItem('mapSettings')) || {
        mapStyle: 'mapbox://styles/0209vaibhav/cm3qznmj6001r01s0aj3680en',
        defaultZoom: 14,
        enable3DBuildings: false,
        showEventLabels: true,
        autoClosePopups: false,
        markerSize: 'medium',
        eventReminders: true,
        nearbyEvents: true
    };

    // Initialize map with saved style and zoom
    map = new mapboxgl.Map({
      container: 'map',
      style: savedSettings.mapStyle,
      center: center,
      zoom: savedSettings.defaultZoom
    });

    // Add controls
    map.addControl(new mapboxgl.NavigationControl(), 'top-right');
    map.addControl(new LocateMeControl(), 'top-right');

    // Add map load handler
    map.on('load', function() {
      // Apply other saved settings
      applySettings(savedSettings);
      
      // Set up auto-close popups if enabled
      if (savedSettings.autoClosePopups) {
        setupAutoClosePopups();
      }
      
      // Load events after settings are applied
      loadColumbiaEvents();
      
      // Initialize radius circle if toggle is checked
      if (radiusToggle && radiusToggle.checked) {
        const radiusMiles = parseFloat(radiusSlider.value);
        if (userLocation) {
          updateRadiusCircle(userLocation, radiusMiles);
        } else {
          const center = map.getCenter().toArray();
          updateRadiusCircle(center, radiusMiles);
        }
        radiusControl.classList.remove('hidden');
      }
      
      if (userLocation) {
        updateMap();
      }
    });

    return map;
  }

  // ---------------------------
  // 8) Initialize Default State
  // ---------------------------
  // Set up initial map
  mainContent.innerHTML = `<div id="map" style="width: 100%; height: 100vh;"></div>`;
  mapboxgl.accessToken = 'pk.eyJ1IjoiMDIwOXZhaWJoYXYiLCJhIjoiY2x6cW4xY2w5MWswZDJxcHhreHZ2OG5mbSJ9.ozamGsW5CZrZdL5bG7n_0A';
  initializeMap();
  getUserLocation();

  // Set Explorer as active tab
  const explorerTab = document.querySelector('[data-activity="explorer"]');
  if (explorerTab) {
    explorerTab.classList.add('active');
  }

  // Set right panel state
  rightPanel.classList.add('hidden');
  collapseRightBtn.classList.add('hidden');
  expandRightBtn.classList.remove('hidden');

  // Resize map after panel state changes
  setTimeout(() => {
    if (map) {
      map.resize();
    }
  }, 300);

  // ---------------------------
  // 9) Event Listeners
  // ---------------------------
  // Function to initialize and update the map
  function initializeAndUpdateMap() {
    if (!map) {
      initializeMap();
    }
    if (userLocation) {
      map.flyTo({
        center: userLocation,
        zoom: 14,
        essential: true
      });
      updateMap();
    }
  }

  // Main tab click handler
  if (tabs.length > 0) {
    tabs.forEach(tab => {
      tab.addEventListener('click', function(e) {
        e.preventDefault();
        
        const activity = this.getAttribute('data-activity');
        if (currentTab === activity) return;
        currentTab = activity;

        // Hide settings container when switching main tabs
        const settingsContainer = document.getElementById('settings-container');
        if (settingsContainer) {
            settingsContainer.style.display = 'none';
        }

        // Hide all sub-tabs first
        document.querySelectorAll('.explorer-subtabs').forEach(subtab => {
          subtab.classList.remove('show');
        });
        
        // Show the sub-tabs for the clicked tab
        const subtabs = this.nextElementSibling;
        if (subtabs && subtabs.classList.contains('explorer-subtabs')) {
          subtabs.classList.add('show');
        }
        
        // Update tab states
        document.querySelectorAll('.activity-tab').forEach(t => 
          t.classList.remove('active'));
        this.classList.add('active');

        // Hide all tab content first
        document.querySelectorAll('.tab-content').forEach(content => {
          content.classList.add('hidden');
        });

        // Show the selected tab's content
        const tabContent = document.getElementById(activity);
        if (tabContent) {
          tabContent.classList.remove('hidden');
        }

        // If this is the journey tab, show the capture form by default
        if (activity === 'journey') {
          const captureForm = document.getElementById('journey-capture-form');
          if (captureForm) {
            captureForm.classList.remove('hidden');
          }
        }

        // Initialize and update map for the current tab
        initializeAndUpdateMap();
      });
    });
  }

  // ---------------------------
  // 10) Radius Toggle Handling
  // ---------------------------
  if (radiusToggle) {
    radiusToggle.addEventListener("change", function() {
      const categoryBtn = document.querySelector('[data-tab="live-map"]');
      const listViewBtn = document.querySelector('[data-tab="list-view"]');
      
      if (categoryBtn && categoryBtn.classList.contains('active')) {
        displayCategoryList();
      } else if (listViewBtn && listViewBtn.classList.contains('active')) {
        showEventsList();
      }
    });
  }

  // ---------------------------
  // 11) Radius Slider Handling
  // ---------------------------
  if (radiusSlider && radiusValue) {
    radiusSlider.addEventListener("input", function () {
      const formattedValue = Number(this.value).toFixed(2);
      radiusValue.innerText = formattedValue + ' mi';
      
      if (userLocation) {
        updateRadiusCircle(userLocation, parseFloat(formattedValue));
      }
      updateMap();
      updateMarkersRadius();
    });
  }

  // ---------------------------
  // 12) Panel Collapse/Expand with map.resize()
  // ---------------------------
  if (collapseLeftBtn) {
    collapseLeftBtn.addEventListener("click", function() {
      console.log("Collapse Left Button Clicked");
      infoTab.classList.add("hidden");
      expandLeftBtn.classList.remove("hidden");
      collapseLeftBtn.classList.add("hidden");
      if (map) {
        setTimeout(() => { map.resize(); }, 300);
      }
    });
  }

  if (expandLeftBtn) {
    expandLeftBtn.addEventListener("click", function() {
      console.log("Expand Left Button Clicked");
      infoTab.classList.remove("hidden");
      expandLeftBtn.classList.add("hidden");
      collapseLeftBtn.classList.remove("hidden");
      if (map) {
        setTimeout(() => { map.resize(); }, 300);
      }
    });
  }

  if (collapseRightBtn) {
    collapseRightBtn.addEventListener("click", function() {
      console.log("Collapse Right Button Clicked");
      rightPanel.classList.add("hidden");
      expandRightBtn.classList.remove("hidden");
      collapseRightBtn.classList.add("hidden");
      if (map) {
        setTimeout(() => { map.resize(); }, 300);
      }
    });
  }

  if (expandRightBtn) {
    expandRightBtn.addEventListener("click", function() {
      console.log("Expand Right Button Clicked");
      rightPanel.classList.remove("hidden");
      expandRightBtn.classList.add("hidden");
      collapseRightBtn.classList.remove("hidden");
      if (map) {
        setTimeout(() => { map.resize(); }, 300);
      }
    });
  }

  // Move handleTabClick inside DOMContentLoaded
  function handleTabClick(activity) {
    if (!mainContent) return;
    
    // Hide all tab content first
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.add('hidden');
    });
    
    // Show the selected tab's content
    const tabContent = document.getElementById(activity);
    if (tabContent) {
      tabContent.classList.remove('hidden');
    }
    
    // Always show map for all tabs
    if (!document.getElementById('map')) {
      mainContent.insertAdjacentHTML('afterbegin', '<div id="map" style="width: 100%; height: 100vh;"></div>');
    }
    
    // Initialize map with user location or default coordinates
    const mapCenter = userLocation || [-73.9626, 40.8075];
    const mapZoom = userLocation ? 15 : 2;
    
    initializeMap(mapCenter, mapZoom);
    
    // Always try to get and show user location
    getUserLocation();
    
    // Update map based on activity
    if (map) {
      map.flyTo({
        center: mapCenter,
        zoom: mapZoom,
        essential: true
      });
    }

    // If this is the journey tab, show the capture form by default
    if (activity === 'journey') {
      const captureForm = document.getElementById('journey-capture-form');
      if (captureForm) {
        captureForm.classList.remove('hidden');
      }
    }
  }

  // Add this new function after the existing functions
  function displayCategoryList() {
    fetch('columbia_event_data.json')
      .then(response => response.json())
      .then(data => {
        // Expand right panel first
        expandRightPanel();

        // Filter events based on radius if enabled
        const radiusToggle = document.getElementById('radius-toggle');
        const radiusSlider = document.getElementById('radius-slider');
        let filteredEvents = data.events;

        if (radiusToggle && radiusToggle.checked && radiusSlider && userLocation) {
          const radiusMiles = parseFloat(radiusSlider.value);
          filteredEvents = data.events.filter(event => 
            isPointWithinRadius(
              [event.location.longitude, event.location.latitude],
              userLocation,
              radiusMiles
            )
          );
        }

        // Count categories for filtered events
        const categoryCount = filteredEvents.reduce((acc, event) => {
          acc[event.category] = (acc[event.category] || 0) + 1;
          return acc;
        }, {});

        // Convert to array and sort by count
        const sortedCategories = Object.entries(categoryCount)
          .sort(([,a], [,b]) => b - a);

        // Update right panel content
        rightPanel.innerHTML = `
          <div class="category-list-header">
            <h2>Event Categories</h2>
            <p>Total Events: ${filteredEvents.length}${radiusToggle && radiusToggle.checked ? ` (Within ${radiusSlider.value} miles)` : ''}</p>
          </div>
          ${sortedCategories.length > 0 ? `
            <ul class="category-list">
              ${sortedCategories.map(([category, count]) => `
                <li class="category-item">
                  <div class="category-info">
                    <span class="category-name">${category}</span>
                    <span class="category-count">${count}</span>
                  </div>
                  <div class="category-bar">
                    <div class="category-bar-fill" style="width: ${(count / filteredEvents.length * 100)}%"></div>
                  </div>
                </li>
              `).join('')}
            </ul>
          ` : `
            <div class="category-list-empty">
              <i class="fas fa-map-marker-alt"></i>
              <p>No events found within the selected radius</p>
            </div>
          `}
        `;

        // Add styles for the new elements
        const style = document.createElement('style');
        style.textContent = `
          .category-list-header {
            padding: 20px;
            border-bottom: 1px solid #f0f0f0;
          }
          .category-list-header h2 {
            margin: 0;
            font-size: 1.5rem;
            color: #333;
          }
          .category-list-header p {
            margin: 5px 0 0;
            color: #666;
            font-size: 0.9rem;
          }
          .category-list {
            list-style: none;
            padding: 0;
            margin: 0;
          }
          .category-item {
            padding: 15px 20px;
            border-bottom: 1px solid #f0f0f0;
          }
          .category-info {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
          }
          .category-name {
            font-weight: 500;
            color: #333;
          }
          .category-count {
            color: #FF0080;
            font-weight: 500;
          }
          .category-bar {
            height: 4px;
            background: #f0f0f0;
            border-radius: 2px;
            overflow: hidden;
          }
          .category-bar-fill {
            height: 100%;
            background: linear-gradient(90deg, #FF0080, #ff66b2);
            border-radius: 2px;
            transition: width 0.3s ease;
          }
          .category-list-empty {
            padding: 40px 20px;
            text-align: center;
            color: #666;
          }
          .category-list-empty i {
            font-size: 3rem;
            color: #ddd;
            margin-bottom: 15px;
            display: block;
          }
          .category-list-empty p {
            margin: 0;
            font-size: 1.1rem;
          }
        `;
        document.head.appendChild(style);
      })
      .catch(error => {
        console.error('Error loading categories:', error);
        rightPanel.innerHTML = `
          <div class="error-message">
            <i class="fas fa-exclamation-circle"></i>
            <p>Error loading categories. Please try again later.</p>
          </div>
        `;
      });
  }

  // Add event listeners for radius changes to update category list
  if (radiusToggle) {
    radiusToggle.addEventListener("change", function() {
      const categoryBtn = document.querySelector('[data-tab="live-map"]');
      const listViewBtn = document.querySelector('[data-tab="list-view"]');
      
      if (categoryBtn && categoryBtn.classList.contains('active')) {
        displayCategoryList();
      } else if (listViewBtn && listViewBtn.classList.contains('active')) {
        showEventsList();
      }
    });
  }

  if (radiusSlider) {
    radiusSlider.addEventListener("input", function() {
      const categoryBtn = document.querySelector('[data-tab="live-map"]');
      const listViewBtn = document.querySelector('[data-tab="list-view"]');
      
      if (categoryBtn && categoryBtn.classList.contains('active')) {
        displayCategoryList();
      } else if (listViewBtn && listViewBtn.classList.contains('active')) {
        showEventsList();
      }
    });
  }

  // Modify the handleSubTabAction function
  function handleSubTabAction(activity, tabId) {
    // Hide settings container when switching to any tab
    const settingsContainer = document.getElementById('settings-container');
    if (settingsContainer) {
        settingsContainer.style.display = 'none';
    }

    // Hide auth container when switching to any tab other than profile
    const authContainer = document.getElementById('auth-container');
    if (authContainer && !(activity === 'explorer' && tabId === 'profile')) {
        authContainer.style.display = 'none';
    }

    // Handle favorites tab
    if (activity === 'explorer' && tabId === 'favorites') {
        // First expand the right panel
        expandRightPanel();
        
        // Show favorites in the right panel
        const rightPanel = document.querySelector('.right-panel');
        if (rightPanel) {
            rightPanel.innerHTML = `
                <div class="favorites-container">
                    <div class="favorites-header">
                        <h2>Your Favorites</h2>
                        <p class="favorites-count">Loading...</p>
                    </div>
                    <div id="favorites-list" class="favorites-grid">
                        <!-- Favorites will be loaded here -->
                    </div>
                </div>
            `;
            displayFavorites();
        }
        return;
    } else {
        // Hide favorites container for other tabs
        const favoritesContainer = document.querySelector('.favorites-container');
        if (favoritesContainer) {
            favoritesContainer.remove();
        }
    }

    // Handle profile tab specifically
    if (activity === 'explorer' && tabId === 'profile') {
        // Get or create auth container
        let authContainer = document.getElementById('auth-container');
        if (!authContainer) {
            authContainer = document.createElement('div');
            authContainer.id = 'auth-container';
            authContainer.className = 'auth-container';
            
            // Insert the auth container below subtabs
            const subtabs = document.querySelector('.explorer-subtabs');
            if (subtabs) {
                subtabs.insertAdjacentElement('afterend', authContainer);
            }
        }

        // Show auth container
        authContainer.style.display = 'block';

        // Show auth forms or profile based on auth state
        const user = firebase.auth().currentUser;
        if (user) {
            showUserProfile(user);
        } else {
            // Create auth forms HTML
            authContainer.innerHTML = `
                <div class="auth-tabs">
                    <button class="auth-tab active" data-auth="login">Login</button>
                    <button class="auth-tab" data-auth="signup">Sign Up</button>
                </div>
                
                <form id="loginForm" class="auth-form">
                    <div class="form-group">
                        <label for="loginEmail">Email</label>
                        <input type="email" id="loginEmail" required>
                    </div>
                    <div class="form-group">
                        <label for="loginPassword">Password</label>
                        <input type="password" id="loginPassword" required>
                    </div>
                    <button type="submit" class="auth-button">Login</button>
                </form>

                <form id="signupForm" class="auth-form hidden">
                    <div class="form-group">
                        <label for="signupName">Full Name</label>
                        <input type="text" id="signupName" required>
                    </div>
                    <div class="form-group">
                        <label for="signupEmail">Email</label>
                        <input type="email" id="signupEmail" required>
                    </div>
                    <div class="form-group">
                        <label for="signupPassword">Password</label>
                        <input type="password" id="signupPassword" required>
                    </div>
                    <button type="submit" class="auth-button">Sign Up</button>
                </form>
            `;

            // Set up auth form listeners
            setupAuthFormListeners();
        }
    } else if (activity === 'explorer' && tabId === 'settings') {
        showSettingsPanel();
    } else {
        // Hide auth container for all other tabs
        const authContainer = document.getElementById('auth-container');
        if (authContainer) {
            authContainer.style.display = 'none';
        }
    }

    // Handle other tabs
    if (activity === 'discovery') {
        if (tabId === 'live-map') {
            displayCategoryList();
        } else if (tabId === 'list-view') {
            showEventsList();
        } else {
            // For other tabs, check and collapse right panel if empty
            checkAndUpdateRightPanel();
        }
    }

    // Handle journey capture tab
    if (activity === 'journey') {
        const journeyContent = document.getElementById('journey');
        if (journeyContent) {
            journeyContent.classList.remove('hidden');
        }

        const captureForm = document.getElementById('journey-capture-form');
        if (captureForm) {
            if (tabId === 'capture') {
                captureForm.classList.remove('hidden');
                setTimeout(() => {
                    captureForm.style.visibility = 'visible';
                }, 300);
            } else {
                captureForm.classList.add('hidden');
            }
        }
    }

    // Handle radius control visibility
    const radiusControl = document.getElementById('radius-control');
    if (radiusControl) {
        if (activity === 'explorer' && tabId === 'radius') {
            radiusControl.classList.remove('hidden');
        } else {
            radiusControl.classList.add('hidden');
        }
    }

    // Add this to your handleSubTabAction function, in the "Handle other tabs" section
    if (activity === 'explorer') {
        if (tabId === 'settings') {
            showSettingsPanel();
        }
    }

    // Favorites functionality
    if (activity === 'explorer') {
      switch(tabId) {
        case 'favorites':
          displayFavorites();
          break;
        // ... existing code ...
      }
    }

    // Handle help tab
    if (activity === 'explorer' && tabId === 'help') {
        // Get or create help container
        let helpContainer = document.getElementById('help-container');
        if (!helpContainer) {
            helpContainer = document.createElement('div');
            helpContainer.id = 'help-container';
            helpContainer.className = 'help-container';
            
            // Insert the help container below subtabs
            const subtabs = document.querySelector('.explorer-subtabs');
            if (subtabs) {
                subtabs.insertAdjacentElement('afterend', helpContainer);
            }
        }

        // Show help container and add content
        helpContainer.style.display = 'block';
        helpContainer.innerHTML = `
            <div class="help-section">
                <div class="help-item" data-category="getting-started">
                    <h4>Getting Started</h4>
                    <div class="help-content">
                        <p>Welcome to Odyssey! This platform helps you discover and track activities around Columbia University and NYC.</p>
                        <p>Here's what you can do:</p>
                        <ul>
                            <li><strong>Explore:</strong> Find events and activities on an interactive map</li>
                            <li><strong>Track:</strong> Document your daily commute and activities</li>
                            <li><strong>Discover:</strong> Find new places and events around you</li>
                            <li><strong>Save:</strong> Bookmark and manage your favorite locations</li>
                            <li><strong>Create:</strong> Add and share your own activities</li>
                        </ul>
                    </div>
                </div>
                
                <div class="help-item" data-category="explorer">
                    <h4>Explorer Tab</h4>
                    <div class="help-content">
                        <p>Your personal hub for managing all aspects of your Odyssey experience:</p>
                        <ul>
                            <li><strong>Profile:</strong> Customize your account and personal preferences</li>
                            <li><strong>Favorites:</strong> Quick access to your saved events and locations</li>
                            <li><strong>Settings:</strong> Adjust map appearance and notifications</li>
                            <li><strong>Display:</strong> Customize the visual experience</li>
                        </ul>
                    </div>
                </div>

                <div class="help-item" data-category="journey">
                    <h4>Journey Tab</h4>
                    <div class="help-content">
                        <p>Document and track your daily adventures:</p>
                        <ul>
                            <li><strong>Capture:</strong> Record activities with photos and details in real-time</li>
                            <li><strong>Activities:</strong> Browse your recorded journeys and routes</li>
                            <li><strong>Drafts:</strong> Complete unfinished activity records</li>
                            <li><strong>History:</strong> Explore your past adventures</li>
                        </ul>
                    </div>
                </div>

                <div class="help-item" data-category="discovery">
                    <h4>Discovery Tab</h4>
                    <div class="help-content">
                        <p>Explore events and activities in your area:</p>
                        <ul>
                            <li><strong>Category View:</strong> Browse events by type with visual indicators</li>
                            <li><strong>List View:</strong> See all events in an organized list</li>
                            <li><strong>Radius Filter:</strong> Find events within walking distance</li>
                            <li><strong>Advanced Filters:</strong> Sort by date, cost, and more</li>
                        </ul>
                    </div>
                </div>

                <div class="help-item" data-category="archive">
                    <h4>Archive Tab</h4>
                    <div class="help-content">
                        <p>Your personal activity repository:</p>
                        <ul>
                            <li><strong>All Activities:</strong> Complete archive of your experiences</li>
                            <li><strong>Recent Items:</strong> Quick access to latest archives</li>
                            <li><strong>Favorites:</strong> Your starred archived content</li>
                            <li><strong>Search Tools:</strong> Find past activities easily</li>
                        </ul>
                    </div>
                </div>

                <div class="help-item" data-category="features">
                    <h4>Map Features</h4>
                    <div class="help-content">
                        <p>Make the most of our interactive map:</p>
                        <ul>
                            <li><strong>Live Tracking:</strong> See your position update in real-time</li>
                            <li><strong>Event Discovery:</strong> Interactive markers show nearby activities</li>
                            <li><strong>Distance Filters:</strong> Set custom search radiuses</li>
                            <li><strong>Route Creation:</strong> Map and save your favorite paths</li>
                        </ul>
                    </div>
                </div>

                <div class="help-item" data-category="tips">
                    <h4>Tips & Tricks</h4>
                    <div class="help-content">
                        <p>Expert tips to enhance your experience:</p>
                        <ul>
                            <li><strong>Quick Access:</strong> Use radius filters for nearby events</li>
                            <li><strong>Stay Organized:</strong> Bookmark important locations</li>
                            <li><strong>Rich Content:</strong> Add photos to your activity records</li>
                            <li><strong>Stay Updated:</strong> Enable smart notifications</li>
                            <li><strong>Night Mode:</strong> Switch to dark theme for evening use</li>
                        </ul>
                    </div>
                </div>

                <div class="help-item" data-category="privacy">
                    <h4>Privacy & Data</h4>
                    <div class="help-content">
                        <p>We take your privacy seriously:</p>
                        <ul>
                            <li><strong>Location Data:</strong> Only tracked when app is active</li>
                            <li><strong>Secure Storage:</strong> All data is encrypted and protected</li>
                            <li><strong>Data Control:</strong> Manage or delete your history anytime</li>
                            <li><strong>Privacy Settings:</strong> Customize your sharing preferences</li>
                        </ul>
                    </div>
                </div>
            </div>
        `;

        initializeHelpTab();
    } else {
        // Hide help container for other tabs
        const helpContainer = document.getElementById('help-container');
        if (helpContainer) {
            helpContainer.style.display = 'none';
        }
    }

    // Handle filter tab in discovery section
    if (activity === 'discovery' && tabId === 'filter') {
        const filterContainer = document.querySelector('.filter-settings-container');
        const radiusControl = document.getElementById('radius-control');
        
        // Hide radius control if it's visible
        if (radiusControl) {
            radiusControl.classList.add('hidden');
        }
        
        // Toggle filter settings container
        if (filterContainer) {
            filterContainer.classList.remove('hidden');
        }
        return;
    } else if (activity === 'discovery') {
        // Hide filter settings when switching to other discovery tabs
        const filterContainer = document.querySelector('.filter-settings-container');
        if (filterContainer) {
            filterContainer.classList.add('hidden');
        }
    }

    // Add this to your handleSubTabAction function
    if (activity === 'about') {
        const aboutContent = document.querySelector('.about-content');
        const aboutSections = document.querySelectorAll('.about-section');
        
        // Show about content
        aboutContent.classList.remove('hidden');
        
        // Hide all sections first
        aboutSections.forEach(section => section.classList.add('hidden'));
        
        // Show the selected section
        const selectedSection = document.getElementById(`about-${tabId}`);
        if (selectedSection) {
          selectedSection.classList.remove('hidden');
          selectedSection.classList.add('active');
        }
    } else {
        // Hide about content when switching to other activities
        const aboutContent = document.querySelector('.about-content');
        if (aboutContent) {
          aboutContent.classList.add('hidden');
        }
    }
  }

  // Add event listeners for sub-tab buttons
  document.querySelectorAll('.explorer-tab-btn').forEach(button => {
    button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      // Find the closest .explorer-subtabs container
      const subtabsContainer = button.closest('.explorer-subtabs');
      if (!subtabsContainer) return;
      
      // Remove active class from all buttons in this container
      subtabsContainer.querySelectorAll('.explorer-tab-btn').forEach(btn => 
        btn.classList.remove('active'));
      
      // Add active class to clicked button
      button.classList.add('active');
      
      // Get the parent tab's activity type
      const parentTab = button.closest('li').querySelector('.activity-tab');
      if (!parentTab) return;
      
      const activity = parentTab.getAttribute('data-activity');
      const tabId = button.getAttribute('data-tab');
      
      // For category view only, expand right panel immediately
      if (activity === 'discovery' && tabId === 'live-map') {
        rightPanel.classList.remove('hidden');
        expandRightBtn.classList.add('hidden');
        collapseRightBtn.classList.remove('hidden');
        // Resize map after panel expansion
        if (map) {
          setTimeout(() => { map.resize(); }, 300);
        }
      }
      
      // Handle sub-tab specific actions
      handleSubTabAction(activity, tabId);
    });
  });

  // Add event listeners for explorer tab buttons
  document.querySelectorAll('.explorer-tab-btn').forEach(button => {
    button.addEventListener('click', function() {
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

  // Journey Capture Functionality
  function initializeJourneyCapture() {
    const captureForm = document.getElementById('journey-capture-form');
    const activityForm = document.getElementById('activity-capture-form');
    const mediaInput = document.getElementById('activity-media');
    const mediaPreview = document.getElementById('media-preview');
    const pickLocationBtn = document.getElementById('pick-location-btn');
    const locationInput = document.getElementById('activity-location');
    const cancelBtn = document.querySelector('.cancel-btn');

    let isPickingLocation = false;
    let selectedLocation = null;
    let uploadedFiles = [];

    // Handle media upload and preview
    mediaInput.addEventListener('change', handleMediaUpload);

    // Handle location picking
    pickLocationBtn.addEventListener('click', () => {
      isPickingLocation = !isPickingLocation;
      pickLocationBtn.classList.toggle('active', isPickingLocation);
      
      if (isPickingLocation) {
        map.getCanvas().style.cursor = 'crosshair';
        map.once('click', (e) => {
          selectedLocation = e.lngLat;
          locationInput.value = `${e.lngLat.lat.toFixed(6)}, ${e.lngLat.lng.toFixed(6)}`;
          isPickingLocation = false;
          pickLocationBtn.classList.remove('active');
          map.getCanvas().style.cursor = '';
        });
      } else {
        map.getCanvas().style.cursor = '';
      }
    });

    // Handle form submission
    activityForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      if (!firebase.auth().currentUser) {
        alert('Please sign in to save activities');
        return;
      }

      try {
        const activity = await saveActivity();
        await addActivityToMap(activity);
        captureForm.classList.add('hidden');
        activityForm.reset();
        mediaPreview.innerHTML = '';
        uploadedFiles = [];
      } catch (error) {
        console.error('Error saving activity:', error);
        alert('Failed to save activity. Please try again.');
      }
    });

    // Handle cancel button
    cancelBtn.addEventListener('click', () => {
      captureForm.classList.add('hidden');
      activityForm.reset();
      mediaPreview.innerHTML = '';
      uploadedFiles = [];
    });

    async function handleMediaUpload(e) {
      const files = Array.from(e.target.files);
      uploadedFiles = files;
      mediaPreview.innerHTML = '';

      for (const file of files) {
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = (e) => {
            const previewItem = createMediaPreviewItem(e.target.result, files.indexOf(file));
            mediaPreview.appendChild(previewItem);
          };
          reader.readAsDataURL(file);
        }
      }
    }

    function createMediaPreviewItem(src, index) {
      const div = document.createElement('div');
      div.className = 'media-preview-item';
      
      const img = document.createElement('img');
      img.src = src;
      
      const removeBtn = document.createElement('button');
      removeBtn.className = 'remove-media';
      removeBtn.innerHTML = '×';
      removeBtn.onclick = () => {
        uploadedFiles.splice(index, 1);
        div.remove();
      };
      
      div.appendChild(img);
      div.appendChild(removeBtn);
      return div;
    }

    async function saveActivity() {
      const user = firebase.auth().currentUser;
      const mediaUrls = await uploadMedia(uploadedFiles);
      
      const activityData = {
        userId: user.uid,
        name: document.getElementById('activity-name').value,
        category: document.getElementById('activity-category').value,
        caption: document.getElementById('activity-caption').value,
        description: document.getElementById('activity-description').value,
        location: {
          lat: selectedLocation.lat,
          lng: selectedLocation.lng,
          address: document.getElementById('activity-location').value
        },
        startTime: document.getElementById('activity-start').value,
        endTime: document.getElementById('activity-end').value,
        media: mediaUrls,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      };

      const docRef = await db.collection('activities').add(activityData);
      return { id: docRef.id, ...activityData };
    }

    async function uploadMedia(files) {
      const mediaUrls = [];
      
      for (const file of files) {
        const storageRef = firebase.storage().ref();
        const fileRef = storageRef.child(`activities/${Date.now()}_${file.name}`);
        await fileRef.put(file);
        const url = await fileRef.getDownloadURL();
        mediaUrls.push(url);
      }
      
      return mediaUrls;
    }

    async function addActivityToMap(activity) {
      // Create marker element
      const el = document.createElement('div');
      el.className = 'activity-node';
      el.setAttribute('data-category', activity.category);

      // Create preview element if media exists
      if (activity.media && activity.media.length > 0) {
        const preview = document.createElement('div');
        preview.className = 'activity-preview';
        const img = document.createElement('img');
        img.src = activity.media[0];
        preview.appendChild(img);
        el.appendChild(preview);
      }

      // Add marker to map
      const marker = new mapboxgl.Marker(el)
        .setLngLat([activity.location.lng, activity.location.lat]);

      // Create popup
      const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
        <div class="activity-popup">
          <div class="activity-popup-header">
            <h3 class="activity-popup-title">${activity.name}</h3>
            <div class="activity-popup-category">${activity.category}</div>
          </div>
          ${activity.media.length > 0 ? `
            <div class="activity-popup-media">
              <img src="${activity.media[0]}" alt="${activity.name}">
            </div>
          ` : ''}
          ${activity.caption ? `
            <div class="activity-popup-caption">${activity.caption}</div>
          ` : ''}
          ${activity.description ? `
            <div class="activity-popup-description">${activity.description}</div>
          ` : ''}
          <div class="activity-popup-meta">
            <div class="activity-popup-time">
              <span><i class="fas fa-clock"></i> Start: ${new Date(activity.startTime).toLocaleString()}</span>
              <span><i class="fas fa-flag-checkered"></i> End: ${new Date(activity.endTime).toLocaleString()}</span>
            </div>
          </div>
        </div>
      `);

      marker.setPopup(popup);
      marker.addTo(map);
    }
  }

  // Initialize journey capture when document is ready
  document.addEventListener('DOMContentLoaded', () => {
    initializeJourneyCapture();
  });

  // Function to calculate if a point is within radius
  function isPointWithinRadius(point, center, radiusMiles) {
    if (!center) return true; // If no center point, consider all points within radius
    
    // Convert coordinates to radians
    const lat1 = center[1] * Math.PI / 180;
    const lon1 = center[0] * Math.PI / 180;
    const lat2 = point[1] * Math.PI / 180;
    const lon2 = point[0] * Math.PI / 180;

    // Haversine formula
    const R = 3959; // Earth's radius in miles
    const dLat = lat2 - lat1;
    const dLon = lon2 - lon1;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1) * Math.cos(lat2) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;

    return distance <= radiusMiles;
  }

  // Store markers globally for easy access
  let eventMarkers = [];

  // Update markers based on radius
  function updateMarkersRadius() {
    const radiusToggle = document.getElementById('radius-toggle');
    const radiusSlider = document.getElementById('radius-slider');
    
    if (!radiusToggle || !radiusSlider || !userLocation) return;

    const isRadiusEnabled = radiusToggle.checked;
    const radiusMiles = parseFloat(radiusSlider.value);

    eventMarkers.forEach(marker => {
      const markerElement = marker.getElement();
      const markerLngLat = marker.getLngLat();
      
      if (isRadiusEnabled) {
        const isWithin = isPointWithinRadius(
          [markerLngLat.lng, markerLngLat.lat],
          userLocation,
          radiusMiles
        );
        
        if (isWithin) {
          markerElement.classList.remove('out-of-radius');
        } else {
          markerElement.classList.add('out-of-radius');
        }
      } else {
        markerElement.classList.remove('out-of-radius');
      }
    });
  }

  // Update the loadColumbiaEvents function
  function loadColumbiaEvents() {
    fetch('columbia_event_data.json')
      .then(response => response.json())
      .then(data => {
        // Clear existing markers
        eventMarkers.forEach(marker => marker.remove());
        eventMarkers = [];

        // Get saved settings
        const savedSettings = JSON.parse(localStorage.getItem('mapSettings')) || {
            showEventLabels: true,
            markerSize: 'medium'
        };

        data.events.forEach(event => {
          // Create marker element
          const el = document.createElement('div');
          el.className = `event-marker ${savedSettings.markerSize}`;
          el.setAttribute('data-category', event.category);
          
          // Apply visibility based on saved settings
          if (!savedSettings.showEventLabels) {
              el.style.display = 'none';
          }

          // Create hover popup
          const hoverPopup = new mapboxgl.Popup({
            closeButton: false,
            closeOnClick: false,
            offset: 15,
            className: 'hover-popup'
          }).setHTML(`
            <div class="hover-popup">
              <h3>${event.name}</h3>
              ${event.media ? `
                <div class="media-container">
                  <img src="${event.media[0]}" alt="${event.name}">
                </div>
              ` : ''}
              <p>${event.caption || ''}</p>
            </div>
          `);

          // Create and add marker
          const marker = new mapboxgl.Marker(el)
            .setLngLat([event.location.longitude, event.location.latitude])
            .addTo(map);

          // Add hover events
          el.addEventListener('mouseenter', () => {
            marker.setPopup(hoverPopup);
            hoverPopup.addTo(map);
          });

          el.addEventListener('mouseleave', () => {
            hoverPopup.remove();
          });

          // Add click event directly to the marker
          marker.getElement().addEventListener('click', (e) => {
            e.preventDefault(); // Prevent any default behavior
            e.stopPropagation(); // Stop event from bubbling

            // Remove hover popup
            hoverPopup.remove();

            // Create detailed popup content
            const detailPopup = new mapboxgl.Popup({
                closeButton: true,
                closeOnClick: false,
                maxWidth: '400px',
                className: 'detail-popup'
            })
            .setLngLat([event.location.longitude, event.location.latitude])
            .setHTML(`
                <div class="event-popup">
                    <div class="event-popup-header">
                        <h3 class="event-popup-title">${event.name}</h3>
                        <div class="event-popup-actions">
                            <div class="event-popup-category">${event.category}</div>
                            <button class="favorite-btn ${isFavorited(event.id) ? 'favorited' : ''}" 
                                    data-event-id="${event.id}"
                                    onclick="toggleFavorite(${JSON.stringify(event).replace(/"/g, '&quot;')})">
                                <i class="fas fa-star"></i>
                            </button>
                        </div>
                    </div>
                    ${event.media ? `
                        <div class="event-popup-media">
                            <img src="${event.media[0]}" alt="${event.name}">
                        </div>
                    ` : ''}
                    <div class="event-popup-caption">${event.caption || ''}</div>
                    <div class="event-popup-description">${event.description || ''}</div>
                    <div class="event-popup-meta">
                        <div class="event-popup-time">
                            <span><i class="fas fa-clock"></i> ${new Date(event.start_time).toLocaleString()}</span>
                            <span><i class="fas fa-flag-checkered"></i> ${new Date(event.end_time).toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            `);

            // Close any existing popup
            if (currentOpenPopup) {
                currentOpenPopup.remove();
            }

            // Show the new popup
            detailPopup.addTo(map);
            currentOpenPopup = detailPopup;
          });

          // Store marker for later use
          eventMarkers.push(marker);
        });

        // Update markers radius state
        updateMarkersRadius();

        // Fit map to Columbia University bounds
        map.fitBounds([
          [-73.9700, 40.8050], // Southwest coordinates
          [-73.9550, 40.8120]  // Northeast coordinates
        ], {
          padding: 50
        });

        // Add this after the existing styles in loadColumbiaEvents
        const popupStyle = document.createElement('style');
        popupStyle.textContent = `
            .event-popup-actions {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            .favorite-btn {
                background: none;
                border: none;
                color: #ccc;
                cursor: pointer;
                padding: 5px;
                font-size: 1.2rem;
                transition: color 0.2s;
            }
            .favorite-btn:hover {
                color: #FFD700;
            }
            .favorite-btn.favorited {
                color: #FFD700;
            }
            .event-popup-header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
            }
        `;
        document.head.appendChild(popupStyle);
      })
      .catch(error => console.error('Error loading events:', error));
  }

  // Add event listener for radius changes to update list view
  if (radiusToggle) {
    radiusToggle.addEventListener("change", function() {
      const listViewBtn = document.querySelector('[data-tab="list-view"]');
      if (listViewBtn && listViewBtn.classList.contains('active')) {
        handleSubTabAction('discovery', 'list-view');
      }
    });
  }

  if (radiusSlider) {
    radiusSlider.addEventListener("input", function() {
      const listViewBtn = document.querySelector('[data-tab="list-view"]');
      if (listViewBtn && listViewBtn.classList.contains('active')) {
        handleSubTabAction('discovery', 'list-view');
      }
    });
  }

  // Add this function near your other event-related functions
  function showEventsList() {
    // First expand the right panel
    const rightPanel = document.querySelector('.right-panel');
    const expandRightBtn = document.getElementById('expand-right');
    const collapseRightBtn = document.getElementById('collapse-right');
    
    rightPanel.classList.remove('hidden');
    expandRightBtn.classList.add('hidden');
    collapseRightBtn.classList.remove('hidden');

    // Get radius filter settings
    const radiusToggle = document.getElementById('radius-toggle');
    const radiusSlider = document.getElementById('radius-slider');
    const isRadiusEnabled = radiusToggle && radiusToggle.checked;
    const radiusMiles = isRadiusEnabled ? parseFloat(radiusSlider.value) : null;

    // Fetch events data
    fetch('columbia_event_data.json')
        .then(response => response.json())
        .then(data => {
            let filteredEvents = data.events;

            // Filter events based on radius if enabled
            if (isRadiusEnabled && userLocation) {
                filteredEvents = data.events.filter(event => 
                    isPointWithinRadius(
                        [event.location.longitude, event.location.latitude],
                        userLocation,
                        radiusMiles
                    )
                );
            }

            // Create list container
            const listContent = `
                <div class="event-list-header">
                    <h2>Events ${isRadiusEnabled ? `within ${radiusMiles} miles` : ''}</h2>
                    <p class="event-count">${filteredEvents.length} events found</p>
                </div>
                <div class="event-list">
                    ${filteredEvents.length > 0 ? 
                        filteredEvents.map(event => `
                            <div class="event-list-item" data-lat="${event.location.latitude}" data-lng="${event.location.longitude}">
                                <div class="event-list-item-header">
                                    <h3>${event.name}</h3>
                                    <span class="event-category">${event.category}</span>
                                </div>
                                ${event.media ? `
                                    <div class="event-list-item-media">
                                        <img src="${event.media[0]}" alt="${event.name}">
                                    </div>
                                ` : ''}
                                <p class="event-description">${event.description || ''}</p>
                                <div class="event-time">
                                    <span><i class="fas fa-clock"></i> ${new Date(event.start_time).toLocaleString()}</span>
                                </div>
                            </div>
                        `).join('')
                        : `
                            <div class="event-list-empty">
                                <i class="fas fa-map-marker-alt"></i>
                                <p>No events found${isRadiusEnabled ? ' within the selected radius' : ''}</p>
                            </div>
                        `
                    }
                </div>
            `;

            // Update right panel content
            rightPanel.innerHTML = listContent;

            // Add click handlers to list items
            document.querySelectorAll('.event-list-item').forEach(item => {
                item.addEventListener('click', () => {
                    const lat = parseFloat(item.dataset.lat);
                    const lng = parseFloat(item.dataset.lng);
                    
                    // Fly to the event location
                    map.flyTo({
                        center: [lng, lat],
                        zoom: 16,
                        essential: true
                    });

                    // Find and click the corresponding marker
                    const marker = eventMarkers.find(m => {
                        const pos = m.getLngLat();
                        return pos.lat === lat && pos.lng === lng;
                    });

                    if (marker) {
                        // Trigger the click event on the marker
                        marker.getElement().click();
                    }
                });
            });

            // Resize map to account for the panel
            if (map) {
                setTimeout(() => { map.resize(); }, 300);
            }
        })
        .catch(error => {
            console.error('Error loading events:', error);
            rightPanel.innerHTML = `
                <div class="event-list-error">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>Error loading events. Please try again later.</p>
                </div>
            `;
        });
  }

  // Make sure the event listener is properly attached
  document.getElementById('list-events-btn').addEventListener('click', showEventsList);

  // Add this new function to handle settings
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
                <label class="setting-label">
                    <span>Default Zoom Level</span>
                    <input type="range" id="defaultZoom" min="10" max="18" value="14" class="setting-range">
                    <span class="range-value" id="zoomValue">14</span>
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

        <div class="settings-footer">
            <button id="resetSettings" class="settings-button secondary">Reset to Default</button>
            <button id="saveSettings" class="settings-button primary">Save Changes</button>
        </div>
    `;

    // Add event listeners for settings controls
    setupSettingsListeners();
  }

  // Add this function to handle settings interactions
  function setupSettingsListeners() {
    // Map style change
    const mapStyleSelect = document.getElementById('mapStyle');
    if (mapStyleSelect) {
        mapStyleSelect.addEventListener('change', (e) => {
            map.setStyle(e.target.value);
        });
    }

    // Default zoom change
    const zoomSlider = document.getElementById('defaultZoom');
    const zoomValue = document.getElementById('zoomValue');
    if (zoomSlider) {
        zoomSlider.addEventListener('input', (e) => {
            const newZoom = parseInt(e.target.value);
            zoomValue.textContent = newZoom;
            // Apply zoom immediately
            if (map) {
                map.setZoom(newZoom);
            }
        });

        // Add change event to handle when sliding stops
        zoomSlider.addEventListener('change', (e) => {
            const newZoom = parseInt(e.target.value);
            // Store the zoom level in a temporary variable or data attribute
            zoomSlider.dataset.lastZoom = newZoom;
        });
    }

    // Single event listener for 3D Buildings
    const buildings3D = document.getElementById('enable3DBuildings');
    if (buildings3D) {
        buildings3D.addEventListener('change', (e) => {
            if (map) {
                map.setConfigProperty('3d-buildings', 'visible', e.target.checked);
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
            map.off('click'); // Remove existing click handlers
            if (e.target.checked) {
                setupAutoClosePopups();
            }
            // If unchecked, we don't need to do anything as we've already removed the click handler
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

    // Save settings
    const saveButton = document.getElementById('saveSettings');
    if (saveButton) {
        saveButton.addEventListener('click', () => {
            const settings = {
                mapStyle: document.getElementById('mapStyle').value,
                defaultZoom: parseInt(document.getElementById('defaultZoom').value),
                enable3DBuildings: document.getElementById('enable3DBuildings').checked,
                showEventLabels: document.getElementById('showEventLabels').checked,
                autoClosePopups: document.getElementById('autoClosePopups').checked,
                markerSize: document.getElementById('markerSize').value,
                eventReminders: document.getElementById('eventReminders').checked,
                nearbyEvents: document.getElementById('nearbyEvents').checked
            };
            localStorage.setItem('mapSettings', JSON.stringify(settings));
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
                localStorage.removeItem('mapSettings');
                loadDefaultSettings();
                showToast('Settings reset to default');
            }
        });
    }

    // Load saved settings when panel opens
    const savedSettings = localStorage.getItem('mapSettings');
    if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        updateSettingsUI(settings);
        applySettings(settings);
    }
  }

  // Add this function to update settings UI
  function updateSettingsUI(settings) {
    // Update map style select
    const mapStyleSelect = document.getElementById('mapStyle');
    if (mapStyleSelect) {
        mapStyleSelect.value = settings.mapStyle;
    }

    // Update zoom slider
    const zoomSlider = document.getElementById('defaultZoom');
    const zoomValue = document.getElementById('zoomValue');
    if (zoomSlider && zoomValue) {
        zoomSlider.value = settings.defaultZoom;
        zoomValue.textContent = settings.defaultZoom;
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
  }

  // Add this function to load default settings
  function loadDefaultSettings() {
    const defaultSettings = {
        mapStyle: 'mapbox://styles/0209vaibhav/cm3qznmj6001r01s0aj3680en',
        defaultZoom: 14,
        enable3DBuildings: false,
        showEventLabels: true,
        autoClosePopups: false,
        markerSize: 'medium',
        eventReminders: true,
        nearbyEvents: true
    };

    // Apply default settings
    applySettings(defaultSettings);
    
    // Update UI to reflect default settings
    updateSettingsUI(defaultSettings);
  }

  // Add this function to apply settings
  function applySettings(settings) {
    if (!map || !settings) return;

    // Apply map style if it's different from current style
    if (map.getStyle().sprite !== settings.mapStyle) {
        map.setStyle(settings.mapStyle);
    }

    // Apply zoom level
    const currentZoom = map.getZoom();
    const targetZoom = parseInt(settings.defaultZoom);
    
    if (currentZoom !== targetZoom) {
        // If we have user location, center there with new zoom
        if (userLocation) {
            map.flyTo({
                center: userLocation,
                zoom: targetZoom,
                essential: true
            });
        } else {
            // Otherwise just set the zoom
            map.setZoom(targetZoom);
        }
    }

    // Apply 3D buildings setting
    try {
        map.setConfigProperty('3d-buildings', 'visible', settings.enable3DBuildings);
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
    if (map.listeners && map.listeners('click')) {
        map.off('click'); // Remove any existing click handlers
    }
    
    if (settings.autoClosePopups) {
        setupAutoClosePopups();
    }
  }

  // Add this function to handle toast notifications
  function showToast(message) {
    // Remove any existing toast
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
        existingToast.remove();
    }

    // Create and show new toast
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    // Remove toast after animation
    setTimeout(() => toast.remove(), 3000);
  }

  // Add this new function to handle popup auto-closing
  function setupAutoClosePopups() {
    map.on('click', (e) => {
        // Get the clicked point
        const point = e.point;
        
        // Query features at the clicked point
        const features = map.queryRenderedFeatures(point, {
            layers: ['radius-circle-fill', 'radius-circle-outline'] // Add any other layers you want to exclude
        });
        
        // Check if we clicked a marker element
        const clickedMarker = e.originalEvent.target.closest('.event-marker, .activity-node');
        
        // Only close popup if we didn't click a marker or special layer
        if (!clickedMarker && features.length === 0 && currentOpenPopup) {
            currentOpenPopup.remove();
            currentOpenPopup = null;
        }
    });
  }

  // Favorites functionality
  function displayFavorites() {
    // Get current favorites from localStorage
    const favorites = JSON.parse(localStorage.getItem('favorites')) || [];
    
    // Get the favorites list container
    const favoritesList = document.getElementById('favorites-list');
    const favoritesCount = document.querySelector('.favorites-count');
    
    if (!favoritesList || !favoritesCount) return;
    
    // Update favorites count
    favoritesCount.textContent = `${favorites.length} items`;

    // Display favorites content
    if (favorites.length === 0) {
        favoritesList.innerHTML = `
            <div class="no-favorites">
                <i class="fas fa-star"></i>
                <p>No favorites yet</p>
                <p class="favorites-hint">Click the star icon on any event to add it to your favorites</p>
            </div>
        `;
    } else {
        favoritesList.innerHTML = favorites.map(event => `
            <div class="favorite-card" data-event-id="${event.id}">
                <div class="favorite-content">
                    <h3>${event.name}</h3>
                    ${event.category ? `<p class="category">${event.category}</p>` : ''}
                    ${event.description ? `<p class="description">${event.description}</p>` : ''}
                    <p class="location">
                        <i class="fas fa-map-marker-alt"></i>
                        Columbia University
                    </p>
                    <p class="date">
                        <i class="fas fa-calendar"></i>
                        ${new Date(event.start_time).toLocaleDateString()}
                    </p>
                </div>
                <div class="favorite-actions">
                    <button class="view-btn" onclick="viewFavoriteOnMap(${event.location.longitude}, ${event.location.latitude})">
                        <i class="fas fa-eye"></i> View on Map
                    </button>
                    <button class="remove-btn" onclick="toggleFavorite(${JSON.stringify(event).replace(/"/g, '&quot;')})">
                        <i class="fas fa-trash"></i> Remove
                    </button>
                </div>
            </div>
        `).join('');
    }
  }

  // Make toggleFavorite globally available
  window.toggleFavorite = function(event) {
    let favorites = JSON.parse(localStorage.getItem('favorites')) || [];
    const eventIndex = favorites.findIndex(f => f.id === event.id);
    
    if (eventIndex === -1) {
        // Add to favorites
        favorites.push(event);
        showToast('Added to favorites');
    } else {
        // Remove from favorites
        favorites.splice(eventIndex, 1);
        showToast('Removed from favorites');
    }
    
    localStorage.setItem('favorites', JSON.stringify(favorites));
    
    // Update the button state
    const favoriteBtn = document.querySelector(`.favorite-btn[data-event-id="${event.id}"]`);
    if (favoriteBtn) {
        favoriteBtn.classList.toggle('favorited');
    }
    
    // If we're on the favorites tab, refresh the display
    const favoritesContainer = document.getElementById('favorites-container');
    if (favoritesContainer && favoritesContainer.style.display === 'block') {
        displayFavorites();
    }
    
    return eventIndex === -1; // Return true if added, false if removed
  };

  // Function to check if an event is favorited
  function isFavorited(eventId) {
    const favorites = JSON.parse(localStorage.getItem('favorites')) || [];
    return favorites.some(f => f.id === eventId);
  }

  // Function to view favorite on map
  window.viewFavoriteOnMap = function(lng, lat) {
    if (map) {
        // Fly to the event location
        map.flyTo({
            center: [lng, lat],
            zoom: 16,
            essential: true
        });

        // Find and click the corresponding marker
        const marker = eventMarkers.find(m => {
            const pos = m.getLngLat();
            return pos.lng === lng && pos.lat === lat;
        });

        if (marker) {
            marker.getElement().click();
        }
    }
  };

  function initializeHelpTab() {
    const helpItems = document.querySelectorAll('.help-container .help-item h4');
    
    helpItems.forEach(header => {
        // Get the content div that follows this header
        const content = header.nextElementSibling;
        
        // Show first section by default
        if (header.textContent === 'Getting Started') {
            content.classList.add('visible');
            header.classList.add('expanded');
        } else {
            content.classList.remove('visible');
            header.classList.remove('expanded');
        }
        
        // Add click handler
        header.addEventListener('click', () => {
            // Toggle this section
            const isExpanded = content.classList.contains('visible');
            
            // Close all other sections
            helpItems.forEach(h => {
                const c = h.nextElementSibling;
                c.classList.remove('visible');
                h.classList.remove('expanded');
            });
            
            // Toggle current section
            if (!isExpanded) {
                content.classList.add('visible');
                header.classList.add('expanded');
            }
        });
    });
  }

  // Add this to your existing tab switching logic
  function switchExplorerTab(tabName) {
    // ... existing tab switching code ...
    
    if (tabName === 'help') {
        initializeHelpTab();
    }
  }

  // Add this function if it doesn't exist, or modify it if it does
  function updateRadiusCircle(center, radiusMiles) {
    if (!map || !center) return;

    // Remove existing radius circle if any
    removeRadiusCircle();

    // Create a circle feature
    const circleGeoJSON = createGeoJSONCircle(center, radiusMiles);

    // Add the circle source
    map.addSource('radius-circle', {
        type: 'geojson',
        data: circleGeoJSON
    });

    // Add a fill layer for the circle
    map.addLayer({
        id: 'radius-circle-fill',
        type: 'fill',
        source: 'radius-circle',
        paint: {
            'fill-color': '#0080FF',
            'fill-opacity': 0.1
        }
    });

    // Add an outline layer for the circle
    map.addLayer({
        id: 'radius-circle-outline',
        type: 'line',
        source: 'radius-circle',
        paint: {
            'line-color': '#0080FF',
            'line-width': 2,
            'line-opacity': 0.8
        }
    });
  }

  // Update radius slider event listener
  if (radiusSlider && radiusValue) {
    radiusSlider.addEventListener("input", function () {
      const formattedValue = Number(this.value).toFixed(2);
      radiusValue.innerText = formattedValue + ' mi';
      updateMap(); // This will update the circle with the new radius while keeping it centered
    });
  }

  // Update radius toggle event listener
  if (radiusToggle) {
    radiusToggle.addEventListener("change", function() {
      updateMap(); // This will handle adding/removing the circle while keeping it centered
    });
  }

  // Remove the map moveend event listener that was updating the circle
  // as it was causing the circle to move away from the user's location
  // map.on('moveend', function() { ... });

  // Update the radius toggle initialization
  document.getElementById('radius-toggle').addEventListener('change', function(e) {
    updateMap(); // This will handle all circle updates consistently
  });

  // Add this to your map initialization code
  document.getElementById('radius-toggle').addEventListener('change', function(e) {
    if (e.target.checked) {
        const radiusMiles = parseFloat(document.getElementById('radius-slider').value);
        const center = map.getCenter().toArray();
        updateRadiusCircle(center, radiusMiles);
    } else {
        if (map.getSource('radius-circle')) {
            map.removeLayer('radius-circle-fill');
            map.removeLayer('radius-circle-outline');
            map.removeSource('radius-circle');
        }
    }
  });

  // Add this to your existing tab click handlers
  document.querySelector('[data-tab="radius"]').addEventListener('click', function() {
    const radiusControl = document.getElementById('radius-control');
    if (radiusControl) {
        radiusControl.classList.remove('hidden');
    }
  });

  // Find the radius input element
  const radiusInput = document.getElementById('radius-input');

  // Add event listener for radius changes
  radiusInput.addEventListener('input', async function() {
      // Get the new radius value
      const newRadius = parseFloat(this.value);
      
      // Update the radius display if you have one
      const radiusDisplay = document.getElementById('radius-display');
      if (radiusDisplay) {
          radiusDisplay.textContent = newRadius;
      }
      
      // Check which view is currently active
      const categoryBtn = document.querySelector('[data-tab="live-map"]');
      const listViewBtn = document.querySelector('[data-tab="list-view"]');
      
      // Refresh the appropriate view based on which is active
      if (categoryBtn && categoryBtn.classList.contains('active')) {
          displayCategoryList();
      } else if (listViewBtn && listViewBtn.classList.contains('active')) {
          showEventsList();
      }
  });

  // Filter functionality
  function initializeFilters() {
    const applyFiltersBtn = document.getElementById('apply-filters');
    const resetFiltersBtn = document.getElementById('reset-filters');
    
    applyFiltersBtn.addEventListener('click', applyFilters);
    resetFiltersBtn.addEventListener('click', resetFilters);
    
    // Set default date range
    const today = new Date();
    const oneMonthFromNow = new Date();
    oneMonthFromNow.setMonth(today.getMonth() + 1);
    
    document.getElementById('filter-start-date').valueAsDate = today;
    document.getElementById('filter-end-date').valueAsDate = oneMonthFromNow;
  }

  function applyFilters() {
    const eventTypes = Array.from(document.querySelectorAll('.checkbox-group input[type="checkbox"]'))
        .filter(cb => cb.checked)
        .map(cb => cb.value);
        
    const startDate = new Date(document.getElementById('filter-start-date').value);
    const endDate = new Date(document.getElementById('filter-end-date').value);
    
    const timeOfDay = Array.from(document.querySelectorAll('.checkbox-group input[type="checkbox"]'))
        .filter(cb => cb.checked && ['morning', 'afternoon', 'evening'].includes(cb.value))
        .map(cb => cb.value);
    
    // Filter the events based on selected criteria
    const filteredEvents = allEvents.filter(event => {
        const eventDate = new Date(event.date);
        const eventHour = eventDate.getHours();
        
        // Check date range
        const isInDateRange = eventDate >= startDate && eventDate <= endDate;
        
        // Check event type
        const matchesType = eventTypes.length === 0 || eventTypes.includes(event.type.toLowerCase());
        
        // Check time of day
        let eventTimeOfDay;
        if (eventHour < 12) eventTimeOfDay = 'morning';
        else if (eventHour < 17) eventTimeOfDay = 'afternoon';
        else eventTimeOfDay = 'evening';
        
        const matchesTime = timeOfDay.length === 0 || timeOfDay.includes(eventTimeOfDay);
        
        return isInDateRange && matchesType && matchesTime;
    });
    
    // Update the events display
    displayEvents(filteredEvents);
  }

  function resetFilters() {
    // Uncheck all checkboxes
    document.querySelectorAll('.checkbox-group input[type="checkbox"]')
        .forEach(cb => cb.checked = false);
    
    // Reset date range to default
    const today = new Date();
    const oneMonthFromNow = new Date();
    oneMonthFromNow.setMonth(today.getMonth() + 1);
    
    document.getElementById('filter-start-date').valueAsDate = today;
    document.getElementById('filter-end-date').valueAsDate = oneMonthFromNow;
    
    // Display all events
    displayEvents(allEvents);
    
    // Clear right panel content if it was being used
    const rightPanel = document.querySelector('.right-panel');
    rightPanel.innerHTML = '';
    
    // Check and update right panel state
    checkAndUpdateRightPanel();
  }

  // Add this to your initialization code
  document.addEventListener('DOMContentLoaded', () => {
    // ... existing initialization code ...
    initializeFilters();
  });

  // Add this utility function to check if right panel has content
  function checkAndUpdateRightPanel() {
    const rightPanel = document.querySelector('.right-panel');
    const expandRightBtn = document.getElementById('expand-right');
    const collapseRightBtn = document.getElementById('collapse-right');
    
    // Check if the right panel has any content
    const hasContent = rightPanel.children.length > 0 && 
                      !rightPanel.innerHTML.trim() === '';
    
    if (!hasContent) {
        // Collapse the panel if empty
        rightPanel.classList.add('hidden');
        expandRightBtn.classList.remove('hidden');
        collapseRightBtn.classList.add('hidden');
        
        // Resize map after panel collapse
        if (map) {
            setTimeout(() => { map.resize(); }, 300);
        }
    }
  }
});

// Keep these utility functions outside if they don't need access to the variables
function updateContent(activity) {
  const radiusControl = document.getElementById('radius-control');
  if (activity !== 'discovery' && radiusControl) {
    radiusControl.classList.add('hidden');
  }
}

// ... other utility functions ...

// Add this function after the existing utility functions
function expandRightPanel() {
  const rightPanel = document.querySelector('.right-panel');
  const expandRightBtn = document.getElementById('expand-right');
  const collapseRightBtn = document.getElementById('collapse-right');
  
  if (rightPanel && expandRightBtn && collapseRightBtn) {
    rightPanel.classList.remove('hidden');
    expandRightBtn.classList.add('hidden');
    collapseRightBtn.classList.remove('hidden');
    
    // Resize map after panel expansion
    if (map) {
      setTimeout(() => { map.resize(); }, 300);
    }
  }
}

function createMarker(event, map) {
    const marker = new google.maps.Marker({
        position: { lat: event.latitude, lng: event.longitude },
        map: map,
        title: event.name
    });

    // Create hover popup (InfoWindow)
    const hoverContent = `
        <div class="hover-popup">
            <h3>${event.name}</h3>
            ${event.media ? `
                <div class="media-container">
                    ${event.media.type === 'image' 
                        ? `<img src="${event.media.url}" alt="${event.name}">`
                        : `<video src="${event.media.url}" controls></video>`
                    }
                </div>
            ` : ''}
            <p>${event.caption || ''}</p>
        </div>
    `;
}

function openSubTab(tabName) {
  // Hide all sub-tab content
  const tabContents = document.getElementsByClassName('sub-tab-content');
  for (let content of tabContents) {
      content.classList.remove('active');
  }
  
  // Remove active class from all buttons
  const tabButtons = document.getElementsByClassName('sub-tab-button');
  for (let button of tabButtons) {
      button.classList.remove('active');
  }
  
  // Show the selected tab content and activate the button
  document.getElementById(tabName).classList.add('active');
  event.currentTarget.classList.add('active');
}

// Update the existing tab handling code to show/hide display controls
document.querySelectorAll('.explorer-tab-btn').forEach(button => {
  button.addEventListener('click', function() {
      // Existing tab handling code...
      
      // Show/hide display controls
      if (this.dataset.tab === 'display') {
          document.getElementById('display-controls').style.display = 'block';
      } else {
          document.getElementById('display-controls').style.display = 'none';
      }
  });
});

// Keep the display control functions
function updateDisplayMode() {
  const mode = document.getElementById('displayMode').value;
  const chatContainer = document.querySelector('.chat-container');
  chatContainer.className = 'chat-container ' + mode;
}

function toggleTimestamp() {
  const showTimestamp = document.getElementById('showTimestamp').checked;
  const timestamps = document.querySelectorAll('.message-timestamp');
  timestamps.forEach(timestamp => {
      timestamp.style.display = showTimestamp ? 'inline' : 'none';
  });
}

function updateFontSize() {
  const size = document.getElementById('fontSize').value;
  document.getElementById('fontSizeValue').textContent = size + 'px';
  const chatMessages = document.querySelector('.chat-messages');
  chatMessages.style.fontSize = size + 'px';
}

  // Enhanced display control functions
  function updateDisplayMode() {
    const mode = document.getElementById('displayMode').value;
    const container = document.querySelector('.main-content');
    
    // Remove existing modes
    container.classList.remove('normal', 'compact', 'expanded');
    
    // Add selected mode
    container.classList.add(mode);
    
    // Save preference
    localStorage.setItem('displayMode', mode);
    
    // Show feedback
    showFeedback('Display mode updated to ' + mode);
}

function toggleTimestamp() {
    const showTimestamp = document.getElementById('showTimestamp').checked;
    const timestamps = document.querySelectorAll('.timestamp');
    
    timestamps.forEach(timestamp => {
        timestamp.style.display = showTimestamp ? 'inline-block' : 'none';
    });
    
    // Save preference
    localStorage.setItem('showTimestamp', showTimestamp);
    
    // Show feedback
    showFeedback(showTimestamp ? 'Timestamps shown' : 'Timestamps hidden');
}

function updateFontSize() {
    const size = document.getElementById('fontSize').value;
    const content = document.querySelector('.main-content');
    const valueDisplay = document.getElementById('fontSizeValue');
    
    content.style.fontSize = size + 'px';
    valueDisplay.textContent = size + 'px';
    
    // Save preference
    localStorage.setItem('fontSize', size);
    
    // Show feedback
    showFeedback('Font size updated to ' + size + 'px');
}

// Feedback toast function
function showFeedback(message) {
    const toast = document.createElement('div');
    toast.className = 'feedback-toast';
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    // Remove toast after animation
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Add this to your existing click handler for the display tab
document.querySelector('.explorer-tab-btn[data-tab="display"]').addEventListener('click', function() {
    const displayControls = document.getElementById('display-controls');
    if (displayControls) {
        displayControls.style.display = 'block';
    }
});

// Load saved preferences
document.addEventListener('DOMContentLoaded', function() {
    // Load display mode
    const savedMode = localStorage.getItem('displayMode');
    if (savedMode) {
        document.getElementById('displayMode').value = savedMode;
        updateDisplayMode();
    }
    
    // Load timestamp preference
    const savedTimestamp = localStorage.getItem('showTimestamp');
    if (savedTimestamp !== null) {
        document.getElementById('showTimestamp').checked = savedTimestamp === 'true';
        toggleTimestamp();
    }
    
    // Load font size
    const savedFontSize = localStorage.getItem('fontSize');
    if (savedFontSize) {
        document.getElementById('fontSize').value = savedFontSize;
        updateFontSize();
    }
});