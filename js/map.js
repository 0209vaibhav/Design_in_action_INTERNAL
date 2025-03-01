// Map related functionality
class LocateMeControl {
  onAdd(map) {
    this._map = map;
    this._container = document.createElement('div');
    this._container.className = 'mapboxgl-ctrl mapboxgl-ctrl-group';
    this._container.innerHTML = `
      <button class="locate-me-btn" title="Locate me">
        <i class="fas fa-location-arrow"></i>
      </button>
    `;

    this._container.addEventListener('click', () => {
      getUserLocation();
    });

    return this._container;
  }

  onRemove() {
    this._container.parentNode.removeChild(this._container);
    this._map = undefined;
  }
}

function createGeoJSONCircle(center, radiusInMiles, points = 64) {
  const km = radiusInMiles * 1.609344;
  const coords = {
    latitude: center[1],
    longitude: center[0]
  };
  const ret = [];
  const distanceX = km / (111.320 * Math.cos((coords.latitude * Math.PI) / 180));
  const distanceY = km / 110.574;

  let theta;
  let x;
  let y;

  for (let i = 0; i < points; i++) {
    theta = (i / points) * (2 * Math.PI);
    x = distanceX * Math.cos(theta);
    y = distanceY * Math.sin(theta);

    ret.push([coords.longitude + x, coords.latitude + y]);
  }
  ret.push(ret[0]);

  return {
    type: "Feature",
    geometry: {
      type: "Polygon",
      coordinates: [ret]
    }
  };
}

function removeRadiusCircle() {
  const map = window.map;
  if (map.getSource('radius-circle')) {
    map.removeLayer('radius-circle-fill');
    map.removeLayer('radius-circle-outline');
    map.removeSource('radius-circle');
  }
}

function updateMap() {
  const map = window.map;
  if (!map) return;

  // Clear existing markers
  if (window.markers) {
    window.markers.forEach(marker => marker.remove());
  }
  window.markers = [];

  // Get current center and radius
  const center = map.getCenter();
  const radiusMiles = parseFloat(document.getElementById('radius-slider').value);

  // Update radius circle
  updateRadiusCircle([center.lng, center.lat], radiusMiles);

  // Filter and display markers based on radius
  displayMarkersWithinRadius([center.lng, center.lat], radiusMiles);
}

function getUserLocation() {
  if (!navigator.geolocation) {
    showToast('Geolocation is not supported by your browser', 'error');
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const { latitude, longitude } = position.coords;
      
      // Update map center
      window.map.flyTo({
        center: [longitude, latitude],
        zoom: 14
      });

      // Update radius circle
      const radiusMiles = parseFloat(document.getElementById('radius-slider').value);
      updateRadiusCircle([longitude, latitude], radiusMiles);

      // Show success message
      showToast('Location updated successfully');
    },
    (error) => {
      console.error('Error getting location:', error);
      showToast('Unable to retrieve your location', 'error');
    }
  );
}

function initializeMap(center = [-73.9629, 40.8075]) {
  mapboxgl.accessToken = 'YOUR_MAPBOX_TOKEN';

  const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/streets-v11',
    center: center,
    zoom: 14
  });

  // Add navigation control
  map.addControl(new mapboxgl.NavigationControl(), 'top-right');

  // Add locate me control
  map.addControl(new LocateMeControl(), 'top-right');

  // Add event listeners
  map.on('load', () => {
    // Initialize radius circle
    const radiusMiles = parseFloat(document.getElementById('radius-slider').value);
    updateRadiusCircle(center, radiusMiles);

    // Load and display markers
    loadColumbiaEvents();
  });

  map.on('moveend', () => {
    updateMap();
  });

  return map;
}

function isPointWithinRadius(point, center, radiusMiles) {
  const R = 3959; // Earth's radius in miles
  const lat1 = center[1] * Math.PI / 180;
  const lat2 = point[1] * Math.PI / 180;
  const deltaLat = (point[1] - center[1]) * Math.PI / 180;
  const deltaLon = (point[0] - center[0]) * Math.PI / 180;

  const a = Math.sin(deltaLat/2) * Math.sin(deltaLat/2) +
          Math.cos(lat1) * Math.cos(lat2) *
          Math.sin(deltaLon/2) * Math.sin(deltaLon/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;

  return distance <= radiusMiles;
}

function updateMarkersRadius() {
  const map = window.map;
  const center = map.getCenter();
  const radiusMiles = parseFloat(document.getElementById('radius-slider').value);
  
  updateRadiusCircle([center.lng, center.lat], radiusMiles);
  displayMarkersWithinRadius([center.lng, center.lat], radiusMiles);
}

function updateRadiusCircle(center, radiusMiles) {
  const map = window.map;
  const circleGeoJSON = createGeoJSONCircle(center, radiusMiles);

  // Remove existing circle if it exists
  removeRadiusCircle();

  // Add new circle
  map.addSource('radius-circle', {
    type: 'geojson',
    data: circleGeoJSON
  });

  // Add fill layer
  map.addLayer({
    id: 'radius-circle-fill',
    type: 'fill',
    source: 'radius-circle',
    paint: {
      'fill-color': '#4264fb',
      'fill-opacity': 0.1
    }
  });

  // Add outline layer
  map.addLayer({
    id: 'radius-circle-outline',
    type: 'line',
    source: 'radius-circle',
    paint: {
      'line-color': '#4264fb',
      'line-width': 2
    }
  });
}

function createMarker(event, map) {
  const el = document.createElement('div');
  el.className = 'custom-marker';
  el.innerHTML = `<i class="fas ${getCategoryIcon(event.category)}"></i>`;

  const marker = new mapboxgl.Marker(el)
    .setLngLat(event.location.coordinates)
    .setPopup(
      new mapboxgl.Popup({ offset: 25 })
        .setHTML(`
          <h3>${event.name}</h3>
          <p>${event.caption}</p>
          <p><i class="far fa-clock"></i> ${formatDateTime(event.startTime)}</p>
          <button onclick="showEventDetails('${event.id}')" class="view-details-btn">View Details</button>
        `)
    )
    .addTo(map);

  return marker;
}

// Export map functions
window.Map = {
  initialize: initializeMap,
  update: updateMap,
  getUserLocation,
  updateRadius: updateMarkersRadius,
  createMarker,
  isPointWithinRadius,
  removeRadiusCircle,
  updateRadiusCircle
}; 