document.addEventListener("DOMContentLoaded", function () {
  // Initialize journey capture functionality
  initializeJourneyCapture();

  // ---------------------------
  // 1) Global variables & state
  // ---------------------------
  // Variables to track current popups
  // (removed popup variables)

  // ---------------------------
  // 2) Grab all DOM references
  // ---------------------------
  const tabs = document.querySelectorAll(".activity-tab");
  const mainContent = document.querySelector(".main-content");
  const infoTab = document.querySelector(".info-tab");
  const rightPanel = document.querySelector(".right-panel");

  // ---------------------------
  // 3) Panel expansion function
  // ---------------------------
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

  // ---------------------------
  // 4) Firebase auth state listener to load settings
  // ---------------------------
  firebase.auth().onAuthStateChanged(async (user) => {
    if (user) {
      try {
        // Load and apply user settings
        const userSettings = await loadSettingsFromFirestore(user);
        if (userSettings) {
          applySettings(userSettings);
          updateSettingsUI(userSettings);
        } else {
          // If no settings found, apply and save defaults
          const defaultSettings = loadDefaultSettings();
          await saveSettingsToFirestore(user, defaultSettings);
          applySettings(defaultSettings);
          updateSettingsUI(defaultSettings);
        }
      } catch (error) {
        console.error('Error loading settings:', error);
        const defaultSettings = loadDefaultSettings();
        applySettings(defaultSettings);
        updateSettingsUI(defaultSettings);
      }
    }
  });

  // Set initial state - Discovery tab and subtabs visible
  const discoveryTabElement = document.querySelector('.activity-tab[data-activity="discovery"]');
  if (discoveryTabElement) {
    // Activate Discovery tab
    tabs.forEach(tab => tab.classList.remove('active'));
    discoveryTabElement.classList.add('active');
    
    // Show Discovery subtabs
    document.querySelectorAll('.explorer-subtabs').forEach(subtab => {
      subtab.classList.remove('show');
    });
    const discoverySubtabs = discoveryTabElement.nextElementSibling;
    if (discoverySubtabs) {
      discoverySubtabs.classList.remove('hidden');
      discoverySubtabs.classList.add('show');
    }
  }

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
  const radiusRangeToggle = document.getElementById('radius-range-toggle');
  const minValueSpan = document.querySelector('.radius-value-container .min-value');
  const maxValueSpan = document.querySelector('.radius-value-container .max-value');

  let map;
  let userLocation = null;
  let liveLocationMarker = null;
  let currentTab = 'explorer'; // Set default tab

  // Add this at the top with other global variables
  let currentOpenPopup = null;

  // Favorites functionality
  let favorites = JSON.parse(localStorage.getItem('favorites')) || [];

  // Initialize default settings
  let savedSettings = {
      mapStyle: 'mapbox://styles/mapbox/light-v11',
      markerSize: 'medium',
      markerType: 'circle',
      enable3DBuildings: false,
      autoClosePopups: false,
      displayMode: 'expanded',
      showTimestamps: true
  };

  // ---------------------------
  // 5) Utility functions for unit conversion
  // ---------------------------
  // Function to convert feet to miles
  function feetToMiles(feet) {
      return feet / 5280;
  }

  // Function to convert miles to feet
  function milesToFeet(miles) {
      return miles * 5280;
  }

  // Function to update slider range based on selected range type
  function updateSliderRange(rangeType) {
      if (rangeType === 'short') {
          // Short range: 10ft to 1mi
          radiusSlider.min = feetToMiles(10).toString();  // 10 feet in miles
          radiusSlider.max = "1";  // 1 mile
          radiusSlider.step = ((1 - feetToMiles(10)) / 100).toString();  // 100 steps
          radiusSlider.value = "0.5";  // Set default to middle of range
          minValueSpan.textContent = "10 ft";
          maxValueSpan.textContent = "1 mi";
          radiusValue.textContent = "0.5 mi";
      } else {
          // Long range: 1mi to 5mi
          radiusSlider.min = "1";
          radiusSlider.max = "5";
          radiusSlider.step = "0.1";  // 40 steps
          radiusSlider.value = "3";  // Set default to middle of range
          minValueSpan.textContent = "1 mi";
          maxValueSpan.textContent = "5 mi";
          radiusValue.textContent = "3 mi";
      }
      
      // Update the map with new radius
      if (userLocation) {
          updateRadiusCircle(userLocation, parseFloat(radiusSlider.value));
      }
      updateMap();
      updateMarkersRadius();
  }

  // Add event listener for range toggle
  if (radiusRangeToggle) {
      radiusRangeToggle.addEventListener('change', function() {
          updateSliderRange(this.value);
      });
  }

  // Update the radius slider event listener
  if (radiusSlider && radiusValue) {
      radiusSlider.addEventListener("input", function () {
          const formattedValue = Number(this.value).toFixed(2);
          radiusValue.innerText = formattedValue + ' mi';
          
          if (userLocation) {
              updateRadiusCircle(userLocation, parseFloat(formattedValue));
          } else if (map) {
              const center = map.getCenter().toArray();
              updateRadiusCircle(center, parseFloat(formattedValue));
          }
          updateMap();
      });
  }

  // ---------------------------
  // 6) LocateMeControl (custom)
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
  // 7) Create a GeoJSON circle (Polygon) for a given radius (miles)
  // ---------------------------
  function createGeoJSONCircle(center, radiusInMiles, points = 64) {
    if (!center || center.length !== 2) {
        console.error('Invalid center coordinates:', center);
        return null;
    }

    const coords = { lng: center[0], lat: center[1] };
    const km = radiusInMiles * 1.60934; // Convert miles to kilometers
    const ret = [];

    // Calculate distance using more precise conversion factors
    // These factors account for the Earth's ellipsoid shape
    const latRadian = coords.lat * Math.PI / 180;
    const metersPerDegreeLatitude = 111132.92 - 559.82 * Math.cos(2 * latRadian) + 1.175 * Math.cos(4 * latRadian);
    const metersPerDegreeLongitude = 111412.84 * Math.cos(latRadian) - 93.5 * Math.cos(3 * latRadian);

    const distanceX = (km * 1000) / metersPerDegreeLongitude;
    const distanceY = (km * 1000) / metersPerDegreeLatitude;

    // Use more points for smaller radii to make the circle smoother
    const adjustedPoints = radiusInMiles < 0.1 ? 128 : 
                         radiusInMiles < 0.5 ? 96 : 
                         points;

    for(let i = 0; i < adjustedPoints; i++) {
        const theta = (i / adjustedPoints) * (2 * Math.PI);
        const x = distanceX * Math.cos(theta);
        const y = distanceY * Math.sin(theta);

        // Ensure coordinates are within valid ranges
        const newLng = Math.max(-180, Math.min(180, coords.lng + x));
        const newLat = Math.max(-90, Math.min(90, coords.lat + y));
        
        ret.push([newLng, newLat]);
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
  // 8) Remove radius circle from the map
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
  // 9) Main map update function
  // ---------------------------
  function updateMap() {
    if (!map || !userLocation) {
        console.warn('Map or user location not available');
        return;
    }

    console.log('Updating map with user location:', userLocation);

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
            anchor: 'center',
            rotationAlignment: 'map'
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
        console.log('Updating radius circle:', radiusMiles, 'miles');
        
        // Create circle GeoJSON
        const circleGeoJSON = createGeoJSONCircle(userLocation, radiusMiles);
        
        if (!circleGeoJSON) {
            console.error('Failed to create circle GeoJSON');
            return;
        }

        // Update or create the circle source and layers
        if (map.getSource("radius-circle")) {
            map.getSource("radius-circle").setData(circleGeoJSON);
        } else {
            // Create new circle if it doesn't exist
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
                    "fill-color": "#FF0080",
                    "fill-opacity": 0.1
                }
            });

            // Add outline layer
            map.addLayer({
                id: "radius-circle-outline",
                type: "line",
                source: "radius-circle",
                paint: {
                    "line-color": "#FF0080",
                    "line-width": 2,
                    "line-opacity": 0.8
                }
            });
        }

        // Update markers within radius
        updateMarkersRadius();
    } else {
        removeRadiusCircle();
    }
  }

  // ---------------------------
  // 10) Geolocation: watchPosition
  // ---------------------------
  function getUserLocation() {
    if (navigator.geolocation) {
      // Clear any existing watch
      if (window.locationWatchId) {
        navigator.geolocation.clearWatch(window.locationWatchId);
      }

      // Get initial position with maximum accuracy
      navigator.geolocation.getCurrentPosition(
        position => {
          console.log('Initial position received:', position.coords);
          userLocation = [position.coords.longitude, position.coords.latitude];
          if (map) {
            map.flyTo({
              center: userLocation,
              zoom: 15, // Increased zoom for better accuracy visualization
              essential: true,
              duration: 1000
            });
            updateMap();
          }
        },
        error => {
          console.error("Initial Position Error:", error);
          showToast("Error getting location. Please enable location services and refresh the page.");
        },
        { 
          enableHighAccuracy: true,
          timeout: 5000, // Reduced timeout for faster response
          maximumAge: 0 // Always get fresh position
        }
      );

      // Watch for position updates with maximum accuracy
      const watchId = navigator.geolocation.watchPosition(
        position => {
          console.log('Position update received:', position.coords);
          const newLocation = [position.coords.longitude, position.coords.latitude];
          
          // Only update if position has changed significantly (more than 1 meter)
          if (!userLocation || 
              Math.abs(newLocation[0] - userLocation[0]) > 0.00001 || 
              Math.abs(newLocation[1] - userLocation[1]) > 0.00001) {
            
            userLocation = newLocation;
            if (map) {
              updateMap();
            }
          }
        },
        error => {
          console.error("Watch Position Error:", error);
          showToast("Error tracking location. Please check your location settings.");
        },
        { 
          enableHighAccuracy: true,
          timeout: 3000, // Reduced timeout for more frequent updates
          maximumAge: 1000 // Accept positions up to 1 second old
        }
      );

      window.locationWatchId = watchId;
    } else {
      console.error("Geolocation not supported");
      showToast("Geolocation is not supported by your browser");
    }
  }

  // ---------------------------
  // 11) Map Functions
  // ---------------------------
  function initializeMap(center = [-73.9629, 40.8075]) {
    if (map) {
        map.remove();
    }

    // Get current user and try to load their settings
    const user = firebase.auth().currentUser;
    let mapStyle = 'mapbox://styles/0209vaibhav/cm3qznmj6001r01s0aj3680en'; // Default style

    if (user) {
        // Try to get saved settings
        loadSettingsFromFirestore(user).then(savedSettings => {
            if (savedSettings && savedSettings.mapStyle) {
                mapStyle = savedSettings.mapStyle;
            }
            
            // Initialize map with saved or default style
            initializeMapWithStyle(mapStyle, center);
        }).catch(error => {
            console.error('Error loading settings:', error);
            // Initialize map with default style if there's an error
            initializeMapWithStyle(mapStyle, center);
        });
    } else {
        // Initialize map with default style if no user is logged in
        initializeMapWithStyle(mapStyle, center);
    }
  }

  // Update the initializeMapWithStyle function
  function initializeMapWithStyle(mapStyle, center) {
    // If map already exists and we're just changing the style
    if (map) {
        // Store the current center and zoom
        const currentCenter = map.getCenter();
        const currentZoom = map.getZoom();
        
        // Remove the old map instance
        map.remove();
        
        // Create new map with updated style
        map = new mapboxgl.Map({
            container: 'map',
            style: mapStyle,
            center: currentCenter || userLocation || center,
            zoom: currentZoom || 14,
            minZoom: 11,
            maxZoom: 18,
            maxBounds: [
                [-74.0659, 40.7012], // Southwest coordinates
                [-73.8534, 40.8847]  // Northeast coordinates
            ]
        });
    } else {
        // Initial map creation
        map = new mapboxgl.Map({
            container: 'map',
            style: mapStyle,
            center: userLocation || center,
            zoom: 14,
            minZoom: 11,
            maxZoom: 18,
            maxBounds: [
                [-74.0659, 40.7012], // Southwest coordinates
                [-73.8534, 40.8847]  // Northeast coordinates
            ]
        });
    }

    // Add controls
    map.addControl(new mapboxgl.NavigationControl(), 'top-right');
    
    // Add custom locate control
    map.addControl(new LocateMeControl(), 'top-right');

    // Load activities when map is ready
    map.on('load', () => {
      loadActivities();
    });
  }

  // ---------------------------
  // 12) Initialize Default State
  // ---------------------------
  // Set up initial map
  mainContent.innerHTML = `<div id="map" style="width: 100%; height: 100vh;"></div>`;
  mapboxgl.accessToken = 'pk.eyJ1IjoiMDIwOXZhaWJoYXYiLCJhIjoiY2x6cW4xY2w5MWswZDJxcHhreHZ2OG5mbSJ9.ozamGsW5CZrZdL5bG7n_0A';
  
  // Request location before initializing map
  if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
          position => {
              userLocation = [position.coords.longitude, position.coords.latitude];
              initializeMap(userLocation); // Initialize map with user location
              // Ensure proper initialization
              setTimeout(() => {
                  initializeAndUpdateMap();
              }, 1000);
          },
          error => {
              console.error("Initial Position Error:", error);
              initializeMap(); // Fall back to default coordinates
              // Still try to update map
              setTimeout(() => {
                  initializeAndUpdateMap();
              }, 1000);
          },
          { 
              enableHighAccuracy: true,
              timeout: 5000,
              maximumAge: 0
          }
      );
  } else {
      initializeMap(); // Fall back to default coordinates
      setTimeout(() => {
          initializeAndUpdateMap();
      }, 1000);
  }

  // Set Discovery as active tab
  document.querySelectorAll('.activity-tab').forEach(tab => tab.classList.remove('active'));
  const discoveryTab = document.querySelector('[data-activity="discovery"]');
  if (discoveryTab) {
    discoveryTab.classList.add('active');
    currentTab = 'discovery';
  }

  // Hide all subtabs
  document.querySelectorAll('.explorer-subtabs').forEach(subtab => {
    subtab.classList.remove('show');
  });

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
  // 13) Event Listeners
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
        essential: true,
        duration: 1000
      });
      updateMap();
    }
    // Ensure map is properly sized
    setTimeout(() => {
      if (map) {
        map.resize();
      }
    }, 300);
  }

  // Main activity tab click handler
  document.querySelectorAll('.activity-tab').forEach(tab => {
    tab.addEventListener('click', function(e) {
        e.preventDefault();
        
        // Hide filter settings container when switching main activities
        const filterSettings = document.querySelector('.filter-settings-container');
        if (filterSettings) {
            filterSettings.classList.add('hidden');
        }

        // Hide auth container when switching main activities
        const authContainer = document.getElementById('auth-container');
        if (authContainer) {
            authContainer.classList.add('hidden');
        }

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

        // Hide about content when switching to other tabs
        const aboutContent = document.querySelector('.about-content');
        if (aboutContent) {
          aboutContent.classList.add('hidden');
        }

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

        // Set default active subtabs based on activity
        const defaultSubtabs = {
          'explorer': 'profile',
          'journey': 'capture',
          'discovery': 'live-feed',
          'archive': 'favorites',
          'about': 'info'
        };

        // Get all subtab buttons for the current activity
        const currentSubtabs = subtabs.querySelectorAll('.explorer-tab-btn');
        currentSubtabs.forEach(btn => {
          btn.classList.remove('active');
          if (btn.getAttribute('data-tab') === defaultSubtabs[activity]) {
            btn.classList.add('active');
            handleSubTabAction(activity, defaultSubtabs[activity]);
          }
        });

        // Initialize and update map for the current tab
        initializeAndUpdateMap();
      });
  });

  // ---------------------------
  // 14) Radius Toggle Handling
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
  // 15) Radius Slider Handling
  // ---------------------------
  if (radiusSlider && radiusValue) {
    radiusSlider.addEventListener("input", function () {
      const formattedValue = Number(this.value).toFixed(2);
      radiusValue.innerText = formattedValue + ' mi';
      
      if (userLocation) {
        updateRadiusCircle(userLocation, parseFloat(formattedValue));
      } else if (map) {
          const center = map.getCenter().toArray();
          updateRadiusCircle(center, parseFloat(formattedValue));
      }
      updateMap();
    });
  }

  // ---------------------------
  // 16) Panel Collapse/Expand with map.resize()
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

  // Add mobile-specific panel handling
  function handleMobilePanel() {
    const isMobile = window.innerWidth <= 768;
    const infoTab = document.querySelector('.info-tab');
    const map = document.getElementById('map');
    
    if (isMobile) {
        // On mobile, start with the panel hidden
        infoTab.classList.add('hidden');
        expandLeftBtn.classList.remove('hidden');
        collapseLeftBtn.classList.add('hidden');
        
        // Add touch event listeners for swipe gestures
        let touchStartX = 0;
        let touchEndX = 0;
        
        document.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
        }, false);
        
        document.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            handleSwipe();
        }, false);
        
        function handleSwipe() {
            const swipeThreshold = 50;
            const swipeDistance = touchEndX - touchStartX;
            
            // Swipe right to show panel
            if (swipeDistance > swipeThreshold && infoTab.classList.contains('hidden')) {
                infoTab.classList.remove('hidden');
                expandLeftBtn.classList.add('hidden');
                collapseLeftBtn.classList.remove('hidden');
            }
            // Swipe left to hide panel
            else if (swipeDistance < -swipeThreshold && !infoTab.classList.contains('hidden')) {
                infoTab.classList.add('hidden');
                expandLeftBtn.classList.remove('hidden');
                collapseLeftBtn.classList.add('hidden');
            }
        }
    }
  }

  // Call handleMobilePanel on load and resize
  window.addEventListener('load', handleMobilePanel);
  window.addEventListener('resize', handleMobilePanel);

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
    // Hide all sub-tabs first
    document.querySelectorAll('.explorer-subtabs').forEach(subtab => {
        subtab.classList.remove('show');
    });
    
    // Hide filter settings container when switching activity tabs
    const filterSettings = document.querySelector('.filter-settings-container');
    if (filterSettings) {
        filterSettings.classList.add('hidden');
    }
    
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

    // Set default active subtabs based on activity
    const defaultSubtabs = {
      'explorer': 'profile',
      'journey': 'capture',
      'discovery': 'live-feed',
      'archive': 'favorites',
      'about': 'info'
    };

    // Get all subtab buttons for the current activity
    const currentSubtabs = subtabs.querySelectorAll('.explorer-tab-btn');
    currentSubtabs.forEach(btn => {
      btn.classList.remove('active');
      if (btn.getAttribute('data-tab') === defaultSubtabs[activity]) {
        btn.classList.add('active');
        handleSubTabAction(activity, defaultSubtabs[activity]);
      }
    });

    // Initialize and update map for the current tab
    initializeAndUpdateMap();
    
    // Hide capture form when switching tabs
    handleCaptureFormVisibility(activity, '');
  }

  // Modify the handleSubTabAction function
  function handleSubTabAction(activity, tabId) {
    // Hide all containers by default
    const journeyCaptureForm = document.getElementById('journey-capture-form');
    const draftsContainer = document.getElementById('journey-drafts-container');
    const archiveContainer = document.getElementById('archive-container');
    const curatedContainer = document.querySelector('.curated-container');
    const liveFeedContainer = document.querySelector('.live-feed-container');
    const filterSettingsContainer = document.querySelector('.filter-settings-container');
    const authContainer = document.getElementById('auth-container');
    const aboutContent = document.querySelector('.about-content');
    const aboutCredits = document.getElementById('about-credits');
    const aboutInfo = document.getElementById('about-info');

    if (journeyCaptureForm) journeyCaptureForm.classList.add('hidden');
    if (draftsContainer) draftsContainer.classList.add('hidden');
    if (archiveContainer) archiveContainer.style.display = 'none';
    if (curatedContainer) curatedContainer.classList.add('hidden');
    if (liveFeedContainer) liveFeedContainer.classList.add('hidden');
    if (filterSettingsContainer) filterSettingsContainer.classList.add('hidden');
    if (authContainer) authContainer.classList.add('hidden');
    if (aboutContent) aboutContent.classList.add('hidden');
    if (aboutCredits) aboutCredits.classList.add('hidden');
    if (aboutInfo) aboutInfo.classList.add('hidden');

    // Handle subtab actions
    if (activity === 'journey') {
        if (tabId === 'capture') {
            if (journeyCaptureForm) journeyCaptureForm.classList.remove('hidden');
        } else if (tabId === 'drafts') {
            if (draftsContainer) draftsContainer.classList.remove('hidden');
        }
    } else if (activity === 'explorer') {
        if (tabId === 'archive') {
            if (archiveContainer) archiveContainer.style.display = 'block';
        } else if (tabId === 'profile') {
            if (authContainer) authContainer.classList.remove('hidden');
        }
    } else if (activity === 'discovery') {
        if (tabId === 'filter') {
            if (filterSettingsContainer) filterSettingsContainer.classList.remove('hidden');
        } else if (tabId === 'curated') {
            if (curatedContainer) curatedContainer.classList.remove('hidden');
        } else if (tabId === 'live-feed') {
            if (liveFeedContainer) liveFeedContainer.classList.remove('hidden');
        }
    } else if (activity === 'about') {
        if (aboutContent) aboutContent.classList.remove('hidden');
        if (tabId === 'credits') {
            if (aboutCredits) aboutCredits.classList.remove('hidden');
        } else if (tabId === 'info') {
            if (aboutInfo) aboutInfo.classList.remove('hidden');
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
      // Get the parent tab's activity type
      const parentTab = button.closest('li').querySelector('.activity-tab');
      if (!parentTab) return;
      
      const activity = parentTab.getAttribute('data-activity');
      const tabId = this.getAttribute('data-tab');

      // Remove active class from all buttons in this container
      const subtabsContainer = this.closest('.explorer-subtabs');
      if (subtabsContainer) {
        subtabsContainer.querySelectorAll('.explorer-tab-btn').forEach(btn => {
          btn.classList.remove('active');
        });
      }
      
      // Add active class to clicked button
      this.classList.add('active');
      
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

  // ---------------------------
  // 17) Journey Capture Functionality
  // ---------------------------
  function initializeJourneyCapture() {
    const captureForm = document.getElementById('journey-capture-form');
    const mediaInput = document.getElementById('activity-media');
    const mediaPreview = document.getElementById('media-preview');
    
    // Preview container elements
    const mementoPreviewContainer = document.getElementById('memento-preview-container');
    const mediaPreviewText = document.getElementById('media-preview-text');
    const namePreview = document.getElementById('name-preview');
    const captionPreview = document.getElementById('caption-preview');
    const descriptionPreview = document.getElementById('description-preview');
    const tagsPreview = document.getElementById('tags-preview');
    const categoryPreview = document.getElementById('category-preview');
    const locationPreview = document.getElementById('location-preview');
    const timestampPreview = document.getElementById('timestamp-preview');
    const durationPreview = document.getElementById('duration-preview');
    
    // Edit screen elements
    const editScreens = document.querySelectorAll('.edit-screen');
    const backButtons = document.querySelectorAll('.back-btn');
    
    // Form state
    let selectedLocation = null;
    let uploadedFiles = [];
    let selectedTags = [];
    let selectedCategory = '';
    let selectedDuration = '';
    let mementoTimestamp = new Date();

    if (!captureForm || !mediaInput || !mediaPreview || !mementoPreviewContainer) {
        console.error('Some journey capture elements are missing');
        return;
    }
    
    // Set current timestamp in the preview
    timestampPreview.textContent = formatDateTime(new Date());

    // Initialize Google Places Autocomplete
    const locationInput = document.getElementById('memento-location');
    if (locationInput) {
    const autocomplete = new google.maps.places.Autocomplete(locationInput, {
        types: ['geocode', 'establishment'],
        fields: ['formatted_address', 'geometry', 'name']
    });

    // Handle place selection
    autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        if (!place.geometry) {
            showToast('Please select a location from the suggestions', 'error');
            return;
        }

        // Store the selected location's coordinates
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        selectedLocation = {
            address: place.formatted_address || place.name,
            coordinates: {
                lat: lat,
                lng: lng
            }
        };
        
        // Update the preview
        locationPreview.textContent = selectedLocation.address;

        showToast('Location selected', 'success');
    });
    }
    
    // Current location button
    const currentLocationBtn = document.getElementById('use-current-location-btn');
    if (currentLocationBtn) {
      currentLocationBtn.addEventListener('click', () => {
        if (navigator.geolocation) {
          // Show loading state
          currentLocationBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
          currentLocationBtn.disabled = true;
          
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const lat = position.coords.latitude;
              const lng = position.coords.longitude;
              
              // Use reverse geocoding to get address
              const geocoder = new google.maps.Geocoder();
              geocoder.geocode({ location: { lat, lng } }, (results, status) => {
                if (status === 'OK' && results[0]) {
                  const address = results[0].formatted_address;
                  const locationInput = document.getElementById('memento-location');
                  if (locationInput) {
                            locationInput.value = address;
                  }
                  
                  // Update selected location data
                            selectedLocation = {
                                address: address,
                    coordinates: { lat, lng }
                  };
                  
                  // Update location preview
                  locationPreview.textContent = address;
                  
                  showToast('Using your current location', 'success');
                            } else {
                  console.error('Geocoder failed:', status);
                  showToast('Could not find address for this location', 'error');
                  
                  // Still save the coordinates even if we couldn't get an address
                  const fallbackAddress = `Location at ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
                  
                  const locationInput = document.getElementById('memento-location');
                  if (locationInput) {
                    locationInput.value = fallbackAddress;
                  }
                  
                  selectedLocation = {
                    address: fallbackAddress,
                    coordinates: { lat, lng }
                  };
                  
                  // Update location preview
                  locationPreview.textContent = fallbackAddress;
                }
                
                // Reset button state
                currentLocationBtn.innerHTML = '<i class="fas fa-crosshairs"></i>';
                currentLocationBtn.disabled = false;
              });
            },
            (error) => {
              console.error('Geolocation error:', error);
              
              let errorMessage = 'Error getting location';
              switch(error.code) {
                case error.PERMISSION_DENIED:
                  errorMessage = 'Location permission denied';
                  break;
                case error.POSITION_UNAVAILABLE:
                  errorMessage = 'Location information unavailable';
                  break;
                case error.TIMEOUT:
                  errorMessage = 'Location request timed out';
                  break;
              }
              
              showToast(errorMessage, 'error');
              
              // Reset button state
              currentLocationBtn.innerHTML = '<i class="fas fa-crosshairs"></i>';
              currentLocationBtn.disabled = false;
            },
            {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 0
            }
          );
        } else {
          showToast('Geolocation is not supported by this browser', 'error');
        }
      });
    }
    
    // Current time button
    const currentTimeBtn = document.getElementById('use-current-time-btn');
    if (currentTimeBtn) {
      currentTimeBtn.addEventListener('click', () => {
        const now = new Date();
        mementoTimestamp = now;
        const mementoTimestampInput = document.getElementById('memento-timestamp');
        if (mementoTimestampInput) {
          mementoTimestampInput.value = formatDateTimeForInput(now);
        }
        timestampPreview.textContent = formatDateTime(now);
      });
    }
    
    // Handle media upload
    if (mediaInput) {
      mediaInput.addEventListener('change', (event) => {
        const files = event.target.files;
        if (files.length > 0) {
          handleFileUpload(files);
        }
      });
      
      // Drag and drop functionality
      const mediaUploadBox = document.getElementById('media-upload-box');
      if (mediaUploadBox) {
        mediaUploadBox.addEventListener('dragover', (event) => {
          event.preventDefault();
          mediaUploadBox.classList.add('drag-over');
        });
        
        mediaUploadBox.addEventListener('dragleave', () => {
          mediaUploadBox.classList.remove('drag-over');
        });
        
        mediaUploadBox.addEventListener('drop', (event) => {
          event.preventDefault();
          mediaUploadBox.classList.remove('drag-over');
          
          const files = event.dataTransfer.files;
          if (files.length > 0) {
            handleFileUpload(files);
          }
        });
      }
    }
    
    // Function to handle file uploads
    function handleFileUpload(files) {
      uploadedFiles = Array.from(files);
      
      if (mediaPreview) {
        mediaPreview.innerHTML = '';
        
        uploadedFiles.forEach((file, index) => {
            const reader = new FileReader();
          
            reader.onload = (e) => {
            const previewItem = document.createElement('div');
            previewItem.className = 'media-preview-item';
            
            if (file.type.startsWith('image/')) {
              const img = document.createElement('img');
              img.src = e.target.result;
              img.alt = file.name;
              previewItem.appendChild(img);
            } else if (file.type.startsWith('video/')) {
              const video = document.createElement('video');
              video.src = e.target.result;
              video.controls = true;
              previewItem.appendChild(video);
            }
            
                mediaPreview.appendChild(previewItem);
            };
          
            reader.readAsDataURL(file);
        });
        
        // Update the preview text
        mediaPreviewText.textContent = uploadedFiles.length === 1 
          ? '1 media item' 
          : `${uploadedFiles.length} media items`;
      }
    }
    
    // Handle detail row clicks to show edit screens
    const detailRows = document.querySelectorAll('.detail-row');
    detailRows.forEach(row => {
      const type = row.getAttribute('data-type');
      const editBtn = row.querySelector('.chevron-btn');
      
      if (editBtn) {
        editBtn.addEventListener('click', () => {
          showEditScreen(type);
        });
      }
    });
    
    // Function to show edit screen
    function showEditScreen(type) {
      const editScreen = document.getElementById(`${type}-edit-screen`);
      if (editScreen) {
        editScreen.classList.remove('hidden');
        
        // Populate form fields based on current values
        switch(type) {
          case 'name':
            const nameInput = document.getElementById('memento-name');
            if (nameInput && namePreview.textContent !== 'Add name') {
              nameInput.value = namePreview.textContent;
            }
            break;
          case 'caption':
            const captionInput = document.getElementById('memento-caption');
            if (captionInput && captionPreview.textContent !== 'Add caption') {
              captionInput.value = captionPreview.textContent;
            }
            break;
          case 'description':
            const descriptionInput = document.getElementById('memento-description');
            if (descriptionInput && descriptionPreview.textContent !== 'Add description') {
              descriptionInput.value = descriptionPreview.textContent;
            }
            break;
          case 'timestamp':
            const timestampInput = document.getElementById('memento-timestamp');
            if (timestampInput) {
              timestampInput.value = formatDateTimeForInput(mementoTimestamp);
            }
            break;
        }
      }
    }
    
    // Handle back buttons
    backButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const editScreen = btn.closest('.edit-screen');
        if (editScreen) {
          editScreen.classList.add('hidden');
        }
      });
    });
    
    // Handle save buttons on edit screens
    const saveButtons = document.querySelectorAll('.save-field-btn');
    saveButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const editScreen = btn.closest('.edit-screen');
        if (editScreen) {
          const type = editScreen.id.replace('-edit-screen', '');
          saveEditField(type, editScreen);
        }
      });
    });
    
    // Function to save edited fields
    function saveEditField(type, editScreen) {
      switch(type) {
        case 'name':
          const nameInput = document.getElementById('memento-name');
          if (nameInput && nameInput.value.trim()) {
            namePreview.textContent = nameInput.value.trim();
          }
          break;
        case 'caption':
          const captionInput = document.getElementById('memento-caption');
          if (captionInput && captionInput.value.trim()) {
            captionPreview.textContent = captionInput.value.trim();
          }
          break;
        case 'description':
          const descriptionInput = document.getElementById('memento-description');
          if (descriptionInput && descriptionInput.value.trim()) {
            descriptionPreview.textContent = descriptionInput.value.trim();
          }
          break;
        case 'tags':
          const tagCheckboxes = document.querySelectorAll('input[name="memento-tags"]:checked');
          selectedTags = Array.from(tagCheckboxes).map(cb => cb.value);
          
          if (selectedTags.length > 0) {
            tagsPreview.textContent = selectedTags.length === 1 
              ? '1 tag selected' 
              : `${selectedTags.length} tags selected`;
          } else {
            tagsPreview.textContent = 'Select tags';
          }
          break;
        case 'category':
          const categoryRadio = document.querySelector('input[name="memento-category"]:checked');
          if (categoryRadio) {
            selectedCategory = categoryRadio.value;
            const categoryLabel = document.querySelector(`label[for="${categoryRadio.id}"]`);
            categoryPreview.textContent = categoryLabel.textContent;
          }
          break;
        case 'timestamp':
          const timestampInput = document.getElementById('memento-timestamp');
          if (timestampInput && timestampInput.value) {
            mementoTimestamp = new Date(timestampInput.value);
            timestampPreview.textContent = formatDateTime(mementoTimestamp);
          }
          break;
        case 'duration':
          const durationRadio = document.querySelector('input[name="memento-duration"]:checked');
          if (durationRadio) {
            selectedDuration = durationRadio.value;
            const durationLabel = document.querySelector(`label[for="${durationRadio.id}"]`);
            durationPreview.textContent = durationLabel.textContent;
          }
          break;
      }
      
      // Hide the edit screen
      editScreen.classList.add('hidden');
    }
    
    // Format date and time for display
    function formatDateTime(date) {
      if (!date) return '';
      
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric'
      }).format(date);
    }
    
    // Format date and time for input fields
    function formatDateTimeForInput(date) {
      if (!date) return '';
      
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    }

    // Handle cancel button - in the initializeJourneyCapture function
    const cancelBtn = document.getElementById('cancel-memento-btn');
    if (cancelBtn) {
      // Remove any existing listeners to avoid duplicates
      const newCancelBtn = cancelBtn.cloneNode(true);
      cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
      
      // Add fresh event listener that won't hide the form
      newCancelBtn.addEventListener('click', () => {
        // Reset form only - don't hide the form
        resetMementoForm();
        
        // Show success toast
        showToast('Memento form has been cleared', 'success');
      });
    }
    
    // Handle draft button
    const draftBtn = document.getElementById('draft-memento-btn');
    if (draftBtn) {
      draftBtn.addEventListener('click', async () => {
        // Validate form
        if (!validateMementoForm(true)) {
          return;
        }
        
        try {
          const mementoData = collectMementoData();
          mementoData.isDraft = true;
          
          // Save as draft
          const user = firebase.auth().currentUser;
          if (!user) {
            showToast('You need to be logged in to save drafts', 'error');
            return;
          }
          
          // Upload media files first
          const mediaUrls = await uploadMediaFiles(uploadedFiles, user.uid);
          mementoData.media = mediaUrls;
          
          // Save draft to Firestore
          await saveMementoDraft(mementoData, user);
          
          showToast('Memento saved as draft!', 'success');
          
          // Reset form
          resetMementoForm();
        captureForm.classList.add('hidden');
          
        } catch (error) {
          console.error('Error saving draft:', error);
          showToast(`Error saving draft: ${error.message}`, 'error');
        }
      });
    }

    // Handle save button
    const saveBtn = document.getElementById('save-memento-btn');
    if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
        // Validate form
        if (!validateMementoForm()) {
          return;
        }
        
        try {
          const mementoData = collectMementoData();
          
          // Save as published memento
      const user = firebase.auth().currentUser;
      if (!user) {
            showToast('You need to be logged in to save mementos', 'error');
        return;
      }

          // Upload media files first
          const mediaUrls = await uploadMediaFiles(uploadedFiles, user.uid);
          mementoData.media = mediaUrls;
          
          // Save memento to Firestore
          await saveMemento(mementoData, user);
          
          showToast('Memento saved successfully!', 'success');
          
          // Reset form
          resetMementoForm();
          captureForm.classList.add('hidden');
          
        } catch (error) {
          console.error('Error saving memento:', error);
          showToast(`Error saving memento: ${error.message}`, 'error');
        }
      });
    }
    
    // Validate memento form
    function validateMementoForm(isDraft = false) {
      // For drafts, we don't need full validation
      if (isDraft) {
        return true;
      }
      
      // For published mementos, validate required fields
      if (namePreview.textContent === 'Add name') {
        showToast('Please add a name for your memento', 'error');
        return false;
      }
      
      if (captionPreview.textContent === 'Add caption') {
        showToast('Please add a caption for your memento', 'error');
        return false;
      }
      
      if (categoryPreview.textContent === 'Select category') {
        showToast('Please select a category for your memento', 'error');
        return false;
      }
      
      if (locationPreview.textContent === 'Add location') {
        showToast('Please add a location for your memento', 'error');
        return false;
      }
      
      if (durationPreview.textContent === 'Select duration') {
        showToast('Please select a duration for your memento', 'error');
        return false;
      }
      
      return true;
    }
    
    // Collect memento data from form
    function collectMementoData() {
        // Format location data properly
      const locationData = selectedLocation ? {
          address: selectedLocation.address,
          coordinates: {
          longitude: selectedLocation.coordinates.lng,
          latitude: selectedLocation.coordinates.lat
        }
      } : null;
      
      // Prepare memento data
      return {
        name: namePreview.textContent !== 'Add name' ? namePreview.textContent : '',
        caption: captionPreview.textContent !== 'Add caption' ? captionPreview.textContent : '',
        description: descriptionPreview.textContent !== 'Add description' ? descriptionPreview.textContent : '',
        category: selectedCategory,
          tags: selectedTags,
        location: locationData,
        timestamp: mementoTimestamp.toISOString(),
        duration: selectedDuration,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
    }
    
    // Upload media files and return URLs
    async function uploadMediaFiles(files, userId) {
      if (!files || files.length === 0) return [];
      
      const mediaUrls = await Promise.all(files.map(async file => {
        const fileType = file.type.split('/')[0]; // 'image' or 'video'
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
        
        // Update storage reference path to match storage rules
        const storageRef = firebase.storage().ref(`mementos/${userId}/${fileName}`);
        
        try {
          const snapshot = await storageRef.put(file);
          const downloadURL = await snapshot.ref.getDownloadURL();
          
          return {
            url: downloadURL,
            type: fileType,
            fileName: fileName
          };
        } catch (error) {
          console.error('Error uploading file:', error);
          throw new Error(`Failed to upload ${fileType} file: ${error.message}`);
        }
      }));
      
      return mediaUrls;
    }
    
    // Save draft to Firestore
    async function saveMementoDraft(mementoData, user) {
      return db.collection('memento_drafts').add({
        ...mementoData,
        userId: user.uid
      });
    }
    
    // Save memento to Firestore
    async function saveMemento(mementoData, user) {
      return db.collection('mementos').add({
        ...mementoData,
        userId: user.uid
      });
    }
    
    // Reset memento form
    function resetMementoForm() {
      // Reset media
      const mediaPreview = document.getElementById('media-preview');
      if (mediaPreview) {
        mediaPreview.innerHTML = '';
      }
      document.getElementById('media-preview-text').textContent = 'Add photo/video';
      
      // Reset name
      const nameInput = document.getElementById('memento-name');
      if (nameInput) {
        nameInput.value = '';
      }
      document.getElementById('name-preview').textContent = 'Add name';
      
      // Reset caption
      const captionInput = document.getElementById('memento-caption');
      if (captionInput) {
        captionInput.value = '';
      }
      document.getElementById('caption-preview').textContent = 'Add caption';
      
      // Reset description
      const descriptionInput = document.getElementById('memento-description');
      if (descriptionInput) {
        descriptionInput.value = '';
      }
      document.getElementById('description-preview').textContent = 'Add description';
      
      // Reset tags - uncheck all checkboxes
      const tagCheckboxes = document.querySelectorAll('input[name="memento-tags"]');
      tagCheckboxes.forEach(checkbox => {
        checkbox.checked = false;
      });
      document.getElementById('tags-preview').textContent = 'Select tags';
      
      // Reset category - uncheck all radio buttons
      const categoryRadios = document.querySelectorAll('input[name="memento-category"]');
      categoryRadios.forEach(radio => {
        radio.checked = false;
      });
      document.getElementById('category-preview').textContent = 'Select category';
      
      // Reset location
      const locationInput = document.getElementById('memento-location');
      if (locationInput) {
        locationInput.value = '';
      }
      document.getElementById('location-preview').textContent = 'Add location';
      
      // Reset timestamp to current time
      const timestampInput = document.getElementById('memento-timestamp');
      if (timestampInput) {
        const now = new Date();
        const formattedDate = now.toISOString().slice(0, 16);
        timestampInput.value = formattedDate;
      }
      document.getElementById('timestamp-preview').textContent = 'Current time';
      
      // Reset duration - uncheck all radio buttons
      const durationRadios = document.querySelectorAll('input[name="memento-duration"]');
      durationRadios.forEach(radio => {
        radio.checked = false;
      });
      document.getElementById('duration-preview').textContent = 'Select duration';
      
      // Reset selected location data
      selectedLocation = null;
      
      // Clear any temporary variables that might be storing form data
      selectedTags = [];
      selectedCategory = null;
      selectedDuration = null;
    }
  }

// ---------------------------
// 18) Geospatial utility functions
// ---------------------------
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
  let developerActivityMarkers = []; // For Columbia events
  let userActivityMarkers = []; // For user-created activities


  // ---------------------------
  // 19) Update markers based on radius
  // ---------------------------
  function updateMarkersRadius() {
    if (!map) return;

    const radiusToggle = document.getElementById('radius-toggle');
    const radiusSlider = document.getElementById('radius-slider');
    
    if (!radiusToggle || !radiusSlider) return;
    
    const isRadiusEnabled = radiusToggle.checked;
    const radiusMiles = parseFloat(radiusSlider.value);
    const center = userLocation || map.getCenter().toArray();

    // Update developer activity markers
    developerActivityMarkers.forEach(marker => {
        const coordinates = marker.getLngLat().toArray();
        const isInRadius = !isRadiusEnabled || isPointWithinRadius(coordinates, center, radiusMiles);
        marker.getElement().classList.toggle('out-of-radius', !isInRadius);
    });

    // Update user activity markers
    userActivityMarkers.forEach(marker => {
        const coordinates = marker.getLngLat().toArray();
        const isInRadius = !isRadiusEnabled || isPointWithinRadius(coordinates, center, radiusMiles);
        marker.getElement().classList.toggle('out-of-radius', !isInRadius);
    });
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

// ---------------------------
// 21) Event list display
// ---------------------------
  // Add this function near your other event-related functions
  function showEventsList() {
    // First expand the right panel
    const rightPanel = document.querySelector('.right-panel');
    if (rightPanel) {
        rightPanel.classList.remove('hidden');
    }

    // Fetch and display events
    fetch('synthetic_event_dataset_manhattan_updated.json')
        .then(response => response.json())
        .then(data => {
            let filteredEvents = data.events;
            const isRadiusEnabled = document.getElementById('radius-toggle').checked;
            const radiusMiles = parseFloat(document.getElementById('radius-slider').value);
            const center = userLocation || map.getCenter().toArray();

            // Filter events based on radius if enabled
            if (isRadiusEnabled) {
                filteredEvents = filteredEvents.filter(event => {
                    const coordinates = [event.location.longitude, event.location.latitude];
                    return isPointWithinRadius(coordinates, center, radiusMiles);
                });
            }

            const listContent = `
                <div class="event-list-container">
                    <div class="event-list">
                        ${filteredEvents.length > 0
                            ? filteredEvents.map(event => {
                                const isFav = isFavorited(event.id);
                                return `
                                    <div class="event-list-item" data-lat="${event.location.latitude}" data-lng="${event.location.longitude}">
                                        <div class="event-list-item-header">
                                            <div class="event-list-item-title">
                                                <h3>${event.name}</h3>
                                                <span class="event-category">${event.category}</span>
                                            </div>
                                            <button class="favorite-btn ${isFav ? 'favorited' : ''}" 
                                                    data-event-id="${event.id}" 
                                                    onclick='toggleFavorite(${JSON.stringify(event)})'>
                                                <i class="fas fa-star"></i>
                                            </button>
                                        </div>
                                        ${event.media ? `
                                            <div class="event-list-item-media">
                                                <img src="${event.media[0]}" 
                                                    alt="${event.name}"
                                                    ${event.media[0].includes('example.com') ? 'class="placeholder-img"' : ''}>
                                            </div>
                                        ` : ''}
                                        <p class="event-description">${event.description || ''}</p>
                                        <div class="event-time">
                                            <span><i class="fas fa-clock"></i> ${new Date(event.start_time).toLocaleString()}</span>
                                        </div>
                                    </div>
                                `;
                            }).join('')
                            : `
                                <div class="event-list-empty">
                                    <i class="fas fa-map-marker-alt"></i>
                                    <p>No events found${isRadiusEnabled ? ' within the selected radius' : ''}</p>
                                </div>
                            `
                        }
                    </div>
                </div>
            `;

            // Update right panel content
            rightPanel.innerHTML = listContent;

            // Add click handlers to list items
            document.querySelectorAll('.event-list-item').forEach(item => {
                item.addEventListener('click', (e) => {
                    // Don't trigger the click event if clicking the favorite button
                    if (e.target.closest('.favorite-btn')) {
                        return;
                    }

                    const lat = parseFloat(item.dataset.lat);
                    const lng = parseFloat(item.dataset.lng);
                    
                    // Fly to the event location
                    map.flyTo({
                        center: [lng, lat],
                        zoom: 16,
                        essential: true
                    });
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
                <div class="event-list-container">
                    <div class="event-list-error">
                        <i class="fas fa-exclamation-circle"></i>
                        <p>Error loading events. Please try again later.</p>
                    </div>
                </div>
            `;
        });
  }

  // Make sure the event listener is properly attached
  document.getElementById('list-events-btn').addEventListener('click', showEventsList);




  // ---------------------------
// 32) Settings UI management
// ---------------------------
  // Add this function to update settings UI
  function updateSettingsUI(settings) {
    // Update marker size select
    const markerSize = document.getElementById('markerSize');
    if (markerSize) {
        markerSize.value = settings.markerSize;
    }

    // Update marker type select
    const markerType = document.getElementById('markerType');
    if (markerType && settings.markerType) {
        markerType.value = settings.markerType;
    }
  }

  // Add this function to load default settings
  function loadDefaultSettings() {
        return {
        markerSize: 'medium',
        markerType: 'circle',
        // Removed enable3DBuildings setting
    };
  }

  // Function to update marker colors
  function updateMarkerColors(mapStyle) {
    const colors = getMarkerColorsForMapStyle(mapStyle);
    document.querySelectorAll('.developer-activity-marker, .user-activity-marker').forEach(marker => {
        const category = marker.getAttribute('data-category');
        const color = colors[category] || colors.default;
        marker.style.color = color; // Using color instead of backgroundColor
    });
  }

  // ---------------------------
// 33) Settings application
// ---------------------------
  // Add this function to apply settings
  function applySettings(settings) {
    if (!settings) return;

    // Apply map style if map exists and style is different
    if (map && settings.mapStyle && map.getStyle().sprite !== settings.mapStyle) {
      map.setStyle(settings.mapStyle);
    }

    // Apply auto-close popups setting
    if (settings.autoClosePopups !== undefined) {
      if (settings.autoClosePopups) {
        setupAutoClosePopups();
      } else {
        map && map.off('click'); // Remove existing click handlers
      }
    }

    // Update settings UI if it's open
    const settingsContainer = document.getElementById('settings-container');
    if (settingsContainer && !settingsContainer.classList.contains('hidden')) {
      updateSettingsUI(settings);
    }
  }

// ---------------------------
// 29) UI helper functions
// ---------------------------
  // Add this function to handle toast notifications
  function showToast(message, type = 'success') {
    // Remove any existing toasts
    document.querySelectorAll('.toast').forEach(toast => toast.remove());
    
    // Create new toast
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    // Add icon based on type
    const icon = document.createElement('i');
    switch(type) {
      case 'success':
        icon.className = 'fas fa-check-circle';
        break;
      case 'error':
        icon.className = 'fas fa-exclamation-circle';
        break;
      case 'info':
        icon.className = 'fas fa-info-circle';
        break;
      case 'warning':
        icon.className = 'fas fa-exclamation-triangle';
        break;
    }
    
    toast.insertBefore(icon, toast.firstChild);
    document.body.appendChild(toast);
    
    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 100);
    
    // Remove after delay
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

// ---------------------------
// 35) UI interaction utilities
// ---------------------------  
  // Add this new function to handle popup auto-closing
  function setupAutoClosePopups() {
    map.on('click', (e) => {
        // Check if we clicked on a radius circle
        if (map.getLayer('radius-circle-fill')) {
            const features = map.queryRenderedFeatures(e.point, { layers: ['radius-circle-fill'] });
            if (features.length > 0) {
                // Clicked inside radius circle, do nothing
                return;
            }
        }

        // If we have a currently open popup, close it
        if (currentOpenPopup) {
            currentOpenPopup.remove();
            currentOpenPopup = null;
        }
    });
  }

// ---------------------------
// 31) Favorites management
// ---------------------------
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
            <div class="favorite-card" data-event-id="${event.id}" onclick="viewFavoriteOnMap(${event.location.longitude}, ${event.location.latitude})">
                ${event.media ? `
                    <div class="favorite-media">
                        <img src="${event.media[0]}" alt="${event.name}" ${event.media[0].includes('example.com') ? 'class="placeholder-img"' : ''}>
                    </div>
                ` : ''}
                <div class="favorite-content">
                    <div class="favorite-header">
                        <h3>${event.name}</h3>
                        <button class="favorite-btn favorited" 
                                data-event-id="${event.id}" 
                                onclick="event.stopPropagation(); toggleFavorite(${JSON.stringify(event).replace(/"/g, '&quot;')})">
                            <i class="fas fa-star"></i>
                        </button>
                    </div>
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

// ---------------------------
// 31) Favorites management
// ---------------------------
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

  // ---------------------------
  // 36) Help tab initialization
  // ---------------------------
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

// ---------------------------
// 37) Explorer tab navigation
// ---------------------------  
  // Add this to your existing tab switching logic
  function switchExplorerTab(tabName) {
    // ... existing tab switching code ...
    
    if (tabName === 'help') {
        initializeHelpTab();
    }
  }

// ---------------------------
// 38) Radius circle management
// ---------------------------
  // Function to safely update radius UI elements
  function updateRadiusUI(isVisible) {
    if (radiusControl) {
        if (isVisible) {
            radiusControl.classList.remove('hidden');
        } else {
            radiusControl.classList.add('hidden');
        }
    }
  }

  // Update the updateRadiusCircle function to use the safe UI update
  function updateRadiusCircle(center, radiusMiles) {
    if (!map) return;
    
    // Remove existing radius circle
    removeRadiusCircle();
    
    if (radiusToggle && radiusToggle.checked) {
        updateRadiusUI(true);
        // Create and add the radius circle
        const circleData = createGeoJSONCircle(center, radiusMiles);
        
        map.addSource("radius-circle", {
            type: "geojson",
            data: circleData
        });
        
        map.addLayer({
            id: "radius-circle-fill",
            type: "fill",
            source: "radius-circle",
            paint: {
                "fill-color": "#FF0080",
                "fill-opacity": 0.1
            }
        });
        
        map.addLayer({
            id: "radius-circle-outline",
            type: "line",
            source: "radius-circle",
            paint: {
                "line-color": "#FF0080",
                "line-width": 2
            }
        });
    } else {
        updateRadiusUI(false);
        removeRadiusCircle();
    }
    
    // Update markers within radius
    updateMarkersRadius();
  }

  // Update radius toggle event listener
  if (radiusToggle) {
    radiusToggle.addEventListener("change", function() {
      if (userLocation) {
          const radiusMiles = radiusSlider ? parseFloat(radiusSlider.value) : 1.0;
          updateRadiusCircle(userLocation, radiusMiles);
      }
      updateMap();
    });
  }

  // Remove the map moveend event listener that was updating the circle
  // as it was causing the circle to move away from the user's location
  // map.on('moveend', function() { ... });


// ---------------------------
// 27) Filter management
// ---------------------------
  // Filter functionality
  function initializeFilters() {
    // Set up default filter values
    const radiusToggle = document.getElementById('radius-toggle');
    const radiusRangeToggle = document.getElementById('radius-range-toggle');
    const radiusSlider = document.getElementById('radius-slider');
    const categoryToggle = document.getElementById('category-toggle');
    const searchToggle = document.getElementById('search-toggle');
    const datetimeToggle = document.getElementById('datetime-toggle');
    
    // Add event listeners to the reset and save buttons
    document.getElementById('reset-filters').addEventListener('click', resetFilters);
    document.getElementById('save-filters').addEventListener('click', saveFilters);
    
    // Load saved filters if user is logged in
    firebase.auth().onAuthStateChanged(user => {
      if (user) {
        loadUserFilters(user);
      }
    });
    
    // Initialize event listeners for filter changes
    if (radiusSlider) {
      radiusSlider.addEventListener('input', () => {
        const radiusValue = document.getElementById('radius-value');
        if (radiusValue) {
          const miles = parseFloat(radiusSlider.value);
          radiusValue.textContent = `${miles.toFixed(2)} mi`;
          
          // Update the map radius circle
          if (map && userLocation) {
            updateRadiusCircle(userLocation, miles);
            updateMarkersRadius();
          }
        }
      });
    }
    
    if (radiusRangeToggle) {
      radiusRangeToggle.addEventListener('change', () => {
        updateSliderRange(radiusRangeToggle.value);
      });
    }
  }

// ---------------------------
// 39) Filter application
// ---------------------------
  function applyFilters() {
    const radiusToggle = document.getElementById('radius-toggle');
    const categoryToggle = document.getElementById('category-toggle');
    const searchToggle = document.getElementById('search-toggle');
    const datetimeToggle = document.getElementById('datetime-toggle');
    
    // Apply radius filter
    if (radiusToggle && radiusToggle.checked) {
      const radiusSlider = document.getElementById('radius-slider');
      const radiusMiles = parseFloat(radiusSlider.value);
      
      if (map && userLocation) {
        updateRadiusCircle(userLocation, radiusMiles);
        updateMarkersRadius();
      }
    } else if (radiusToggle && !radiusToggle.checked) {
      // Remove radius circle if filter is turned off
      removeRadiusCircle();
    }
    
    // Implementation for other filters would go here
    // This would depend on the exact UI elements and behavior for category, search, and datetime filters
    
    // Show confirmation
    showToast('Filters applied successfully');
  }

  async function saveFilters() {
    console.log('Attempting to save filters');
    
    const user = firebase.auth().currentUser;
    
    if (!user) {
      console.log('User not logged in, cannot save filters');
      showToast('You must be logged in to save filters', 'error');
      return;
    }
    
    try {
      // Get all filter values
      const filters = {
        radius: {
          enabled: document.getElementById('radius-toggle').checked,
          rangeType: document.getElementById('radius-range-toggle').value,
          value: parseFloat(document.getElementById('radius-slider').value)
        },
        category: {
          enabled: document.getElementById('category-toggle').checked,
          // Additional category filter settings would go here
        },
        search: {
          enabled: document.getElementById('search-toggle').checked,
          // Additional search filter settings would go here
        },
        datetime: {
          enabled: document.getElementById('datetime-toggle').checked,
          // Additional datetime filter settings would go here
        }
      };
      
      console.log('Saving filters to Firebase:', filters);
      
      // Save filters to user's settings
      await db.collection('users').doc(user.uid).update({
        filters: filters,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      console.log('Filters saved successfully');
      showToast('Filters saved');
    } catch (error) {
      console.error('Error saving filters:', error);
      showToast('Failed to save filters: ' + error.message, 'error');
    }
  }

  function resetFilters() {
    console.log('Resetting filters to default values');
    
    try {
      // Reset radius filter to defaults
      const radiusToggle = document.getElementById('radius-toggle');
      const radiusRangeToggle = document.getElementById('radius-range-toggle');
      const radiusSlider = document.getElementById('radius-slider');
      const radiusValue = document.getElementById('radius-value');
      
      if (radiusToggle) radiusToggle.checked = true;
      if (radiusRangeToggle) radiusRangeToggle.value = 'short';
      if (radiusSlider) {
        radiusSlider.min = 0.00189394; // 10ft in miles
        radiusSlider.max = 1; // 1 mile
        radiusSlider.value = 0.75;
        
        if (radiusValue) {
          radiusValue.textContent = '0.75 mi';
        }
      }
      
      // Reset category filter
      const categoryToggle = document.getElementById('category-toggle');
      if (categoryToggle) categoryToggle.checked = false;
      
      // Reset search filter
      const searchToggle = document.getElementById('search-toggle');
      if (searchToggle) searchToggle.checked = false;
      
      // Reset datetime filter
      const datetimeToggle = document.getElementById('datetime-toggle');
      if (datetimeToggle) datetimeToggle.checked = false;
      
      // Update the map
      if (map && userLocation) {
        updateRadiusCircle(userLocation, 0.75);
        updateMarkersRadius();
      }
      
      // Explicitly call to update slider range based on reset value
      updateSliderRange('short');
      
      // Show toast message
      showToast('Filters reset to default');
      console.log('Filters have been reset to default');
    } catch (error) {
      console.error('Error resetting filters:', error);
      showToast('Error resetting filters', 'error');
    }
  }

  async function loadUserFilters(user) {
    try {
      const doc = await db.collection('users').doc(user.uid).get();
      
      if (doc.exists && doc.data().filters) {
        const filters = doc.data().filters;
        
        // Apply radius filter settings
        if (filters.radius) {
          const radiusToggle = document.getElementById('radius-toggle');
          const radiusRangeToggle = document.getElementById('radius-range-toggle');
          const radiusSlider = document.getElementById('radius-slider');
          const radiusValue = document.getElementById('radius-value');
          
          if (radiusToggle) radiusToggle.checked = filters.radius.enabled;
          if (radiusRangeToggle && filters.radius.rangeType) radiusRangeToggle.value = filters.radius.rangeType;
          
          if (radiusSlider && filters.radius.value) {
            updateSliderRange(filters.radius.rangeType || 'short');
            radiusSlider.value = filters.radius.value;
            
            if (radiusValue) {
              radiusValue.textContent = `${filters.radius.value.toFixed(2)} mi`;
            }
            
            // Update the map
            if (map && userLocation && filters.radius.enabled) {
              updateRadiusCircle(userLocation, filters.radius.value);
              updateMarkersRadius();
            }
          }
        }
        
        // Apply category filter settings
        if (filters.category) {
          const categoryToggle = document.getElementById('category-toggle');
          if (categoryToggle) categoryToggle.checked = filters.category.enabled;
          // Additional category filter settings would be applied here
        }
        
        // Apply search filter settings
        if (filters.search) {
          const searchToggle = document.getElementById('search-toggle');
          if (searchToggle) searchToggle.checked = filters.search.enabled;
          // Additional search filter settings would be applied here
        }
        
        // Apply datetime filter settings
        if (filters.datetime) {
          const datetimeToggle = document.getElementById('datetime-toggle');
          if (datetimeToggle) datetimeToggle.checked = filters.datetime.enabled;
          // Additional datetime filter settings would be applied here
        }
      }
    } catch (error) {
      console.error('Error loading user filters:', error);
    }
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
    
    if (!rightPanel || !expandRightBtn || !collapseRightBtn) return;

    // Check if the right panel has any container elements
    const hasContainer = rightPanel.querySelector('.category-list-container') ||
                        rightPanel.querySelector('.event-list-container') ||
                        rightPanel.querySelector('.favorites-container');

    // Check if the container has meaningful content (not empty state)
    const hasContent = hasContainer && !(
        rightPanel.querySelector('.category-list-empty') ||
        rightPanel.querySelector('.event-list-empty') ||
        rightPanel.querySelector('.no-favorites')
    );
    
    if (!hasContainer || !hasContent) {
        // Collapse the panel if empty or no container
        rightPanel.classList.add('hidden');
        expandRightBtn.classList.remove('hidden');
        collapseRightBtn.classList.add('hidden');
        
        // Resize map after panel collapse
        if (map) {
            setTimeout(() => { map.resize(); }, 300);
        }
    }
  }

// ---------------------------
// 30) Activity management
// ---------------------------
  async function addActivityToMap(activity) {
    // Removed marker creation functionality
}

// ---------------------------
// 24) Firebase activity loading
// ---------------------------
  async function loadUserActivitiesFromFirebase() {
    try {
      const user = firebase.auth().currentUser;
      if (!user) {
        console.log('User not logged in, activities will be loaded when user logs in');
        return;
      }

      showToast('Loading your activities from Firebase...', 'info');
      
      // Get user activities from Firebase
      const activities = await window.Activities.getUserActivities(user.uid);
      
      if (activities.length === 0) {
        showToast('No activities found in your account', 'info');
        return;
      }
      
      showToast(`Loaded ${activities.length} activities from Firebase`, 'success');
      
      // Center map on the latest activity if any
      if (activities.length > 0 && activities[0].location && activities[0].location.coordinates) {
        const latestCoords = [
          activities[0].location.coordinates.longitude,
          activities[0].location.coordinates.latitude
        ];
        map.flyTo({
          center: latestCoords,
          zoom: 14,
          essential: true
        });
      }
    } catch (error) {
      console.error('Error loading activities from Firebase:', error);
      showToast('Error loading your activities', 'error');
    }
  }

  // Hook up the Firebase data loading with authentication events
  firebase.auth().onAuthStateChanged(user => {
    if (user) {
      // User is signed in
      loadUserActivitiesFromFirebase();
    } else {
      // User is signed out
      loadPublicActivitiesFromFirebase();
    }
  });

  // Initialize map and Firebase data
  initializeAndUpdateMap();
  initializeMapWithFirebaseData();

  // Pin on map button (now uses the main map for location selection)
  const pinOnMapBtn = document.getElementById('pin-on-map-btn');
  if (pinOnMapBtn) {
    pinOnMapBtn.addEventListener('click', function() {
      const isActive = this.classList.toggle('active');
      
      // If deactivating pin mode
      if (!isActive) {
        // Remove crosshair cursor
        document.body.classList.remove('pin-mode');
        
        // Remove instructions overlay
        const overlay = document.getElementById('map-instructions-overlay');
        if (overlay) {
          overlay.remove();
        }
        
        // Remove click handler from map
        if (map && window.mapClickHandler) {
          map.off('click', window.mapClickHandler);
          delete window.mapClickHandler;
        }
        
        // Remove temporary marker if it exists
        if (window.tempLocationMarker) {
          window.tempLocationMarker.remove();
          delete window.tempLocationMarker;
        }
        
        return;
        }
        
        // If activating pin mode
        if (isActive) {
          // Set cursor to crosshair
          document.body.classList.add('pin-mode');
          
          // Create and add instructions overlay
          const overlay = document.createElement('div');
          overlay.id = 'map-instructions-overlay';
          overlay.className = 'map-instructions-overlay';
          overlay.innerHTML = `
            <div class="instructions-content">
              <i class="fas fa-map-marker-alt"></i>
              <p>Click anywhere on the map to place a pin</p>
            </div>
          `;
          document.getElementById('discovery').appendChild(overlay);
          
          // Show toast notification
          showToast('Click anywhere on the map to select a location', 'info', 5000);
      }
    });
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

  // Ensure the panel is checked when the page loads
  document.addEventListener('DOMContentLoaded', function() {
    // Initial check of right panel
    checkAndUpdateRightPanel();
  });

  // Helper function for capture form visibility
  function handleCaptureFormVisibility(activity, tabId) {
    const captureForm = document.getElementById('journey-capture-form');
    if (!captureForm) return;

    if (tabId === 'capture' && activity === 'journey') {
        captureForm.classList.remove('hidden');
        setTimeout(() => {
            captureForm.style.visibility = 'visible';
        }, 300);
    } else {
        captureForm.classList.add('hidden');
    }
  }

  // Initialize map with user location
  mapboxgl.accessToken = 'pk.eyJ1IjoiMDIwOXZhaWJoYXYiLCJhIjoiY2x6cW4xY2w5MWswZDJxcHhreHZ2OG5mbSJ9.ozamGsW5CZrZdL5bG7n_0A';
  
  // Request location before initializing map
  if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
          position => {
              userLocation = [position.coords.longitude, position.coords.latitude];
              initializeMap(userLocation);
              setTimeout(() => {
                  initializeAndUpdateMap();
              }, 1000);
          },
          error => {
              console.error("Initial Position Error:", error);
              initializeMap();
              setTimeout(() => {
                  initializeAndUpdateMap();
              }, 1000);
          },
          { 
              enableHighAccuracy: true,
              timeout: 5000,
              maximumAge: 0
          }
      );
        } else {
      initializeMap();
      setTimeout(() => {
          initializeAndUpdateMap();
      }, 1000);
  }

  // Initialize UI state
  initializeUIState();

  function initializeUIState() {
    // Set Discovery as active tab
    document.querySelectorAll('.activity-tab').forEach(tab => tab.classList.remove('active'));
    const discoveryTab = document.querySelector('[data-activity="discovery"]');
    if (discoveryTab) {
      discoveryTab.classList.add('active');
      currentTab = 'discovery';
    }

    // Hide all subtabs
    document.querySelectorAll('.explorer-subtabs').forEach(subtab => {
      subtab.classList.remove('show');
    });

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
  }
}); // End of DOMContentLoaded event listener