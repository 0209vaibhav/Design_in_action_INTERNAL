// ---------------------------
// Filter Module
// ---------------------------

// ---------------------------
// 1) Global State
// ---------------------------
let allEvents = [];

// ---------------------------
// 2) Filter Initialization
// ---------------------------
function initializeFilters() {
    // ---------------------------
    // 2.1) Button Setup
    // ---------------------------
    const applyFiltersBtn = document.getElementById('apply-filters');
    const resetFiltersBtn = document.getElementById('reset-filters');
    
    applyFiltersBtn.addEventListener('click', applyFilters);
    resetFiltersBtn.addEventListener('click', resetFilters);
    
    // ---------------------------
    // 2.2) Default Date Range Setup
    // ---------------------------
    const today = new Date();
    const oneMonthFromNow = new Date();
    oneMonthFromNow.setMonth(today.getMonth() + 1);
    
    document.getElementById('filter-start-date').valueAsDate = today;
    document.getElementById('filter-end-date').valueAsDate = oneMonthFromNow;
}

// ---------------------------
// 3) Filter Application
// ---------------------------
function applyFilters() {
    // ---------------------------
    // 3.1) Collect Filter Values
    // ---------------------------
    const eventTypes = Array.from(document.querySelectorAll('.checkbox-group input[type="checkbox"]'))
        .filter(cb => cb.checked)
        .map(cb => cb.value);
        
    const startDate = new Date(document.getElementById('filter-start-date').value);
    const endDate = new Date(document.getElementById('filter-end-date').value);
    
    const timeOfDay = Array.from(document.querySelectorAll('.checkbox-group input[type="checkbox"]'))
        .filter(cb => cb.checked && ['morning', 'afternoon', 'evening'].includes(cb.value))
        .map(cb => cb.value);
    
    // ---------------------------
    // 3.2) Apply Filters
    // ---------------------------
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
    
    // ---------------------------
    // 3.3) Update Display
    // ---------------------------
    displayEvents(filteredEvents);
}

// ---------------------------
// 4) Filter Reset
// ---------------------------
function resetFilters() {
    // ---------------------------
    // 4.1) Reset Checkboxes
    // ---------------------------
    document.querySelectorAll('.checkbox-group input[type="checkbox"]')
        .forEach(cb => cb.checked = false);
    
    // ---------------------------
    // 4.2) Reset Date Range
    // ---------------------------
    const today = new Date();
    const oneMonthFromNow = new Date();
    oneMonthFromNow.setMonth(today.getMonth() + 1);
    
    document.getElementById('filter-start-date').valueAsDate = today;
    document.getElementById('filter-end-date').valueAsDate = oneMonthFromNow;
    
    // ---------------------------
    // 4.3) Reset Display
    // ---------------------------
    displayEvents(allEvents);
    
    // Clear right panel content if it was being used
    const rightPanel = document.querySelector('.right-panel');
    rightPanel.innerHTML = '';
    
    // Check and update right panel state
    checkAndUpdateRightPanel();
}

// ---------------------------
// 5) Event Data Management
// ---------------------------
function setEvents(events) {
    allEvents = events;
}

// ---------------------------
// 6) Module Exports
// ---------------------------
window.Filters = {
    initialize: initializeFilters,
    apply: applyFilters,
    reset: resetFilters,
    setEvents: setEvents
}; 