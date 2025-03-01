// Help functionality for the application

// Initialize help tab with expandable sections
function initializeHelpTab() {
    const helpContainer = document.createElement('div');
    helpContainer.className = 'help-container';
    
    // Create help content
    helpContainer.innerHTML = `
        <div class="help-section">
            <div class="help-item">
                <h4><i class="fas fa-play-circle"></i> Getting Started</h4>
                <div class="help-content">
                    <p>Welcome to Odyssey! Here's how to get started:</p>
                    <ul>
                        <li><strong>Sign Up:</strong> Create an account to save your preferences</li>
                        <li><strong>Explore Map:</strong> Browse events and activities in your area</li>
                        <li><strong>Add Activities:</strong> Share your own events and experiences</li>
                        <li><strong>Filter Events:</strong> Use filters to find relevant activities</li>
                    </ul>
                </div>
            </div>

            <div class="help-item">
                <h4><i class="fas fa-map-marked-alt"></i> Map Navigation</h4>
                <div class="help-content">
                    <p>Learn to navigate the interactive map:</p>
                    <ul>
                        <li><strong>Pan:</strong> Click and drag to move around</li>
                        <li><strong>Zoom:</strong> Use scroll wheel or pinch gestures</li>
                        <li><strong>Markers:</strong> Click on markers to see event details</li>
                        <li><strong>Radius Filter:</strong> Find events within walking distance</li>
                        <li><strong>Advanced Filters:</strong> Sort by date, cost, and more</li>
                    </ul>
                </div>
            </div>

            <div class="help-item">
                <h4><i class="fas fa-camera"></i> Adding Activities</h4>
                <div class="help-content">
                    <p>Share your experiences with others:</p>
                    <ul>
                        <li><strong>Capture:</strong> Record events and activities</li>
                        <li><strong>Media:</strong> Add photos and videos</li>
                        <li><strong>Location:</strong> Pin exact locations on the map</li>
                        <li><strong>Details:</strong> Add descriptions and categories</li>
                        <li><strong>Share:</strong> Make your activities visible to others</li>
                    </ul>
                </div>
            </div>

            <div class="help-item">
                <h4><i class="fas fa-sliders-h"></i> Customization</h4>
                <div class="help-content">
                    <p>Personalize your experience:</p>
                    <ul>
                        <li><strong>Map Style:</strong> Choose different map themes</li>
                        <li><strong>Notifications:</strong> Set up event alerts</li>
                        <li><strong>Filters:</strong> Save your preferred filters</li>
                        <li><strong>Display:</strong> Customize marker sizes and labels</li>
                        <li><strong>Quick Access:</strong> Use radius filters for nearby events</li>
                    </ul>
                </div>
            </div>

            <div class="help-item">
                <h4><i class="fas fa-question-circle"></i> FAQ</h4>
                <div class="help-content">
                    <p>Common questions and answers:</p>
                    <ul>
                        <li><strong>Account:</strong> How to manage your profile</li>
                        <li><strong>Privacy:</strong> Understanding your data settings</li>
                        <li><strong>Events:</strong> How to edit or remove activities</li>
                        <li><strong>Technical:</strong> Browser and device support</li>
                        <li><strong>Updates:</strong> Latest features and improvements</li>
                    </ul>
                </div>
            </div>
        </div>
    `;

    // Insert help container into the page
    const helpTab = document.querySelector('[data-tab="help"]').parentElement;
    if (helpTab) {
        helpTab.insertAdjacentElement('afterend', helpContainer);
    }

    // Set up expandable sections
    setupExpandableSections();
}

// Set up expandable sections in the help tab
function setupExpandableSections() {
    const helpItems = document.querySelectorAll('.help-container .help-item h4');
    
    helpItems.forEach(header => {
        // Get the content div that follows this header
        const content = header.nextElementSibling;
        
        // Show first section by default
        if (header.textContent.includes('Getting Started')) {
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

// Show help tab content
function showHelpTab() {
    // Hide other containers
    document.querySelectorAll('.settings-container, .auth-container').forEach(container => {
        if (container) {
            container.style.display = 'none';
        }
    });

    // Show help container
    const helpContainer = document.querySelector('.help-container');
    if (helpContainer) {
        helpContainer.style.display = 'block';
    } else {
        // Initialize help tab if container doesn't exist
        initializeHelpTab();
    }
}

// Export functions for use in other files
window.Help = {
    initialize: initializeHelpTab,
    show: showHelpTab,
    setupSections: setupExpandableSections
}; 