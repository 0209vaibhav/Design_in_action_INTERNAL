// Events functionality for the application

// ---------------------------
// 1) Event List Display
// ---------------------------
function displayEventsList() {
    fetch('columbia_event_data.json')
        .then(response => response.json())
        .then(data => {
            // ---------------------------
            // 1.1) Event Filtering
            // ---------------------------
            const radiusToggle = document.getElementById('radius-toggle');
            const radiusSlider = document.getElementById('radius-slider');
            let filteredEvents = data.events;

            if (radiusToggle && radiusToggle.checked && radiusSlider && window.userLocation) {
                const radiusMiles = parseFloat(radiusSlider.value);
                filteredEvents = data.events.filter(event => 
                    window.isPointWithinRadius(
                        [event.location.longitude, event.location.latitude],
                        window.userLocation,
                        radiusMiles
                    )
                );
            }

            // Set events data for filters
            window.Filters.setEvents(filteredEvents);
            
            // ---------------------------
            // 1.2) UI Update
            // ---------------------------
            const rightPanel = document.querySelector('.right-panel');
            if (!rightPanel) return;

            rightPanel.innerHTML = `
                <div class="event-list-container">
                    <div class="event-list-header">
                        <h2>Events List</h2>
                        <p class="event-count">${filteredEvents.length} events found${radiusToggle && radiusToggle.checked ? ` (Within ${radiusSlider.value} miles)` : ''}</p>
                    </div>
                    <div class="event-list">
                        ${filteredEvents.length > 0 ?
                            filteredEvents.map(event => `
                                <div class="event-list-item" data-event-id="${event.id}">
                                    <div class="event-list-item-header">
                                        <h3>${event.name}</h3>
                                        <span class="event-category">${event.category}</span>
                                    </div>
                                    ${event.media ? `
                                        <div class="event-list-item-media">
                                            <img src="${event.media[0]}" alt="${event.name}">
                                        </div>
                                    ` : ''}
                                    <div class="event-description">
                                        <p>${event.description || event.caption || ''}</p>
                                    </div>
                                    <div class="event-time">
                                        <i class="fas fa-clock"></i>
                                        <span>${new Date(event.start_time).toLocaleString()}</span>
                                    </div>
                                </div>
                            `).join('') :
                            `<div class="event-list-empty">
                                <i class="fas fa-calendar-times"></i>
                                <p>No events found${radiusToggle && radiusToggle.checked ? ' within the selected radius' : ''}</p>
                            </div>`
                        }
                    </div>
                </div>
            `;

            // ---------------------------
            // 1.3) Event Listeners Setup
            // ---------------------------
            document.querySelectorAll('.event-list-item').forEach(item => {
                item.addEventListener('click', () => {
                    const eventId = parseInt(item.dataset.eventId);
                    const event = filteredEvents.find(e => e.id === eventId);
                    if (event) {
                        // Center map on event location
                        window.map.flyTo({
                            center: [event.location.longitude, event.location.latitude],
                            zoom: 16,
                            essential: true
                        });

                        // Find and click the corresponding marker
                        const marker = window.eventMarkers.find(m => {
                            const pos = m.getLngLat();
                            return pos.lng === event.location.longitude && pos.lat === event.location.latitude;
                        });

                        if (marker) {
                            marker.getElement().click();
                        }
                    }
                });
            });

            // Update panel state
            window.checkAndUpdateRightPanel();
        })
        .catch(error => {
            // ---------------------------
            // 1.4) Error Handling
            // ---------------------------
            console.error('Error loading events:', error);
            const rightPanel = document.querySelector('.right-panel');
            if (rightPanel) {
                rightPanel.innerHTML = `
                    <div class="event-list-container">
                        <div class="event-list-empty">
                            <i class="fas fa-exclamation-circle"></i>
                            <p>Error loading events. Please try again later.</p>
                        </div>
                    </div>
                `;
                window.checkAndUpdateRightPanel();
            }
        });
}

// ---------------------------
// 2) Event Listeners Setup
// ---------------------------
function setupEventListeners() {
    // ---------------------------
    // 2.1) Radius Toggle Handler
    // ---------------------------
    const radiusToggle = document.getElementById('radius-toggle');
    if (radiusToggle) {
        radiusToggle.addEventListener("change", function() {
            const listViewBtn = document.querySelector('[data-tab="list-view"]');
            if (listViewBtn && listViewBtn.classList.contains('active')) {
                displayEventsList();
            }
        });
    }

    // ---------------------------
    // 2.2) Radius Slider Handler
    // ---------------------------
    const radiusSlider = document.getElementById('radius-slider');
    if (radiusSlider) {
        radiusSlider.addEventListener("input", function() {
            const listViewBtn = document.querySelector('[data-tab="list-view"]');
            if (listViewBtn && listViewBtn.classList.contains('active')) {
                displayEventsList();
            }
        });
    }
}

// ---------------------------
// 3) Module Exports
// ---------------------------
window.Events = {
    initialize: setupEventListeners,
    show: displayEventsList
}; 