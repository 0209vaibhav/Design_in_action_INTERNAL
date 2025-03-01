// Categories functionality for the application

// Get icon for a given category
function getCategoryIcon(category) {
    const icons = {
        food: 'fas fa-utensils',
        shopping: 'fas fa-shopping-bag',
        entertainment: 'fas fa-film',
        sports: 'fas fa-running',
        education: 'fas fa-graduation-cap',
        work: 'fas fa-briefcase',
        travel: 'fas fa-plane',
        cultural: 'fas fa-theater-masks',
        social: 'fas fa-users',
        other: 'fas fa-star'
    };
    return icons[category.toLowerCase()] || icons.other;
}

// Display category list in the right panel
function displayCategoryList() {
    const rightPanel = document.querySelector('.right-panel');
    if (!rightPanel) return;

    fetch('columbia_event_data.json')
        .then(response => response.json())
        .then(data => {
            // Filter events based on radius if enabled
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
                <div class="category-list-container">
                    <div class="category-list-header">
                        <h2>Event Categories</h2>
                        <p>
                            <i class="fas fa-calendar-alt"></i>
                            Total Events: ${filteredEvents.length}${radiusToggle && radiusToggle.checked ? ` (Within ${radiusSlider.value} miles)` : ''}
                        </p>
                    </div>
                    ${sortedCategories.length > 0 ? `
                        <ul class="category-list">
                            ${sortedCategories.map(([category, count]) => `
                                <li class="category-item" data-category="${category.toLowerCase()}">
                                    <div class="category-info">
                                        <span class="category-name">${category}</span>
                                        <span class="category-count">${count} events</span>
                                    </div>
                                    <div class="category-bar">
                                        <div class="category-bar-fill" style="width: ${(count / filteredEvents.length * 100)}%"></div>
                                    </div>
                                </li>
                            `).join('')}
                        </ul>
                    ` : `
                        <div class="category-list-empty">
                            <i class="fas fa-filter"></i>
                            <p>No events found${radiusToggle && radiusToggle.checked ? ' within the selected radius' : ''}</p>
                        </div>
                    `}
                </div>
            `;

            // Check if we should collapse the panel
            window.checkAndUpdateRightPanel();
        })
        .catch(error => {
            console.error('Error loading categories:', error);
            rightPanel.innerHTML = `
                <div class="category-list-container">
                    <div class="category-list-empty">
                        <i class="fas fa-exclamation-circle"></i>
                        <p>Error loading categories. Please try again later.</p>
                    </div>
                </div>
            `;
            window.checkAndUpdateRightPanel();
        });
}

// Set up category-related event listeners
function setupCategoryListeners() {
    const radiusToggle = document.getElementById('radius-toggle');
    const radiusSlider = document.getElementById('radius-slider');

    if (radiusToggle) {
        radiusToggle.addEventListener("change", function() {
            const categoryBtn = document.querySelector('[data-tab="live-map"]');
            const listViewBtn = document.querySelector('[data-tab="list-view"]');
            
            if (categoryBtn && categoryBtn.classList.contains('active')) {
                displayCategoryList();
            } else if (listViewBtn && listViewBtn.classList.contains('active')) {
                window.showEventsList();
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
                window.showEventsList();
            }
        });
    }
}

// Export functions for use in other files
window.Categories = {
    initialize: setupCategoryListeners,
    show: displayCategoryList,
    getIcon: getCategoryIcon
}; 