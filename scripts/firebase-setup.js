// Firebase Collection Initialization
async function initializeFirebase() {
    const firestore = firebase.firestore();
    
    // Get the current user
    const user = firebase.auth().currentUser;
    if (!user) {
        showToast('Please sign in to initialize Firebase collections', 'error');
        return;
    }
    
    try {
        // Create composite indexes for better querying
        await firestore.collection('activities').doc('__indexes__').set({
            by_category_and_date: {
                fields: ['category', 'createdAt'],
                queryScope: 'COLLECTION'
            },
            by_user_and_date: {
                fields: ['userId', 'createdAt'],
                queryScope: 'COLLECTION'
            }
        });

        // Initialize user document with proper structure
        const userRef = firestore.collection('users').doc(user.uid);
        await userRef.set({
            displayName: user.displayName || '',
            email: user.email || '',
            photoURL: user.photoURL || 'default-avatar.png',
            phoneNumber: '',
            addresses: [],
            bio: '',
            interests: [],
            aspirations: '',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            profile: {
                completionScore: 0,
                isPublic: false,
                socialLinks: {},
                skills: []
            }
        }, { merge: true });

        // Initialize user settings
        const userSettingsRef = userRef.collection('settings').doc('preferences');
        await userSettingsRef.set({
            theme: 'light',
            notifications: {
                email: true,
                push: true,
                activityUpdates: true,
                newMessages: true
            },
            privacy: {
                showEmail: false,
                showPhone: false,
                showLocation: false
            },
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        // Initialize user filters
        const userFiltersRef = userRef.collection('filters').doc('default');
        await userFiltersRef.set({
            radius: 1,
            categories: [],
            dateRange: null,
            sortBy: 'date',
            filterTags: [],
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        // Create example activity with rich metadata
        const activitiesRef = firestore.collection('activities');
        const exampleActivity = {
            name: 'Example Activity',
            caption: 'This is an example activity',
            category: 'other',
            description: 'This is a placeholder activity to initialize the collection.',
            userId: user.uid,
            location: null,
            media: [],
            tags: [],
            participants: [],
            status: 'published',
            visibility: 'public',
            metadata: {
                views: 0,
                likes: 0,
                shares: 0
            },
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        await activitiesRef.add(exampleActivity);

        showToast('Firebase collections initialized successfully!', 'success');
    } catch (error) {
        console.error('Error initializing Firebase:', error);
        showToast(`Error initializing Firebase: ${error.message}`, 'error');
    }
}

// Add initialization button to the settings panel
function addInitButton() {
    const settingsPanel = document.querySelector('.settings-container');
    if (settingsPanel) {
        const setupSection = document.createElement('div');
        setupSection.className = 'settings-section';
        setupSection.innerHTML = `
            <h3>Firebase Setup</h3>
            <div class="setting-item">
                <button id="init-firebase" class="settings-button primary">
                    Initialize Firebase Collections
                </button>
            </div>
        `;
        settingsPanel.appendChild(setupSection);

        // Add click event listener
        document.getElementById('init-firebase').addEventListener('click', initializeFirebase);
    }
}

// Initialize setup when document is ready
document.addEventListener('DOMContentLoaded', addInitButton); 