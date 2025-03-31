// Initialize my mementos container
function initializeMyMementos() {
  console.log('Initializing My Mementos container...');
  const myMementosContainer = document.querySelector('.my-mementos-container');
  const myMementosContent = myMementosContainer.querySelector('.my-mementos-content');

  if (!myMementosContainer || !myMementosContent) {
    console.error('Could not find My Mementos container or content elements');
    return;
  }

  console.log('Found My Mementos container elements');

  // Listen for auth state changes
  firebase.auth().onAuthStateChanged(user => {
    console.log('Auth state changed:', user ? 'User logged in' : 'No user');
    if (user) {
      loadUserMementos(user.uid);
    } else {
      myMementosContent.innerHTML = `
        <div class="no-mementos-message">
          <p>Please sign in to view your mementos</p>
        </div>
      `;
    }
  });

  // Load mementos for a user
  async function loadUserMementos(userId) {
    console.log('Loading mementos for user:', userId);
    try {
      myMementosContent.innerHTML = '<div class="loading">Loading mementos...</div>';
      
      // First check if the user has access to the mementos collection
      try {
        console.log('Checking Firestore access...');
        await firebase.firestore().collection('mementos').limit(1).get();
        console.log('Firestore access confirmed');
      } catch (error) {
        console.error('Firestore access error:', error);
        if (error.code === 'permission-denied') {
          myMementosContent.innerHTML = `
            <div class="error-message">
              <p>Unable to access mementos. Please make sure you have the correct permissions.</p>
              <button onclick="initializeFirebase()" class="retry-button">
                <i class="fas fa-sync"></i> Initialize Firebase
              </button>
            </div>
          `;
          return;
        }
      }
      
      let hasOrdering = true;
      // Get mementos from Firestore
      let query = firebase.firestore()
        .collection('mementos')
        .where('userId', '==', userId);

      try {
        // Try to add ordering
        query = query.orderBy('timestamp', 'desc');
      } catch (error) {
        console.warn('Timestamp ordering not available yet - index might be building');
        hasOrdering = false;
      }

      console.log('Fetching mementos...');
      const mementosSnapshot = await query.get();
      console.log('Fetched mementos:', mementosSnapshot.size);

      if (mementosSnapshot.empty) {
        myMementosContent.innerHTML = `
          <div class="no-mementos-message">
            <p>No mementos found. Start creating new mementos!</p>
          </div>
        `;
        return;
      }

      // Clear the container
      myMementosContent.innerHTML = '';
      
      // Get all mementos and sort them manually if needed
      let mementos = mementosSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Sort manually if we couldn't add ordering to the query
      if (!hasOrdering) {
        mementos.sort((a, b) => {
          const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
          const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
          return timeB - timeA;
        });
      }

      console.log('Rendering mementos...');
      // Render each memento
      mementos.forEach(memento => {
        const mementoElement = createMementoElement(memento);
        myMementosContent.appendChild(mementoElement);
      });
      console.log('Finished rendering mementos');

    } catch (error) {
      console.error('Error loading mementos:', error);
      
      // Check if the error is about missing index
      if (error.message.includes('requires an index')) {
        const indexUrl = error.message.split('create it here: ')[1];
        myMementosContent.innerHTML = `
          <div class="error-message">
            <p>Setting up the database for first use...</p>
            <p>This may take a few minutes. Please try again shortly.</p>
            <button onclick="window.location.reload()" class="retry-button">
              <i class="fas fa-sync"></i> Retry
            </button>
            ${indexUrl ? `
              <p class="admin-note">
                <small>Admin note: Index is being created. 
                <a href="${indexUrl}" target="_blank">Check status here</a></small>
              </p>
            ` : ''}
          </div>
        `;
      } else {
        myMementosContent.innerHTML = `
          <div class="error-message">
            <p>Error loading mementos: ${error.message}</p>
            <button onclick="window.location.reload()" class="retry-button">
              <i class="fas fa-sync"></i> Retry
            </button>
          </div>
        `;
      }
    }
  }

  // Create HTML element for a memento
  function createMementoElement(memento) {
    const mementoElement = document.createElement('div');
    mementoElement.className = 'memento-item';
    
    // Format timestamp safely
    let formattedDate = 'No date';
    if (memento.timestamp) {
      try {
        // Handle Firestore Timestamp
        if (memento.timestamp.toDate) {
          formattedDate = memento.timestamp.toDate().toLocaleDateString();
        }
        // Handle string timestamp
        else if (typeof memento.timestamp === 'string') {
          formattedDate = new Date(memento.timestamp).toLocaleDateString();
        }
        // Handle number timestamp
        else if (typeof memento.timestamp === 'number') {
          formattedDate = new Date(memento.timestamp).toLocaleDateString();
        }
      } catch (error) {
        console.warn('Error formatting timestamp:', error);
      }
    }

    // Handle media safely
    let mediaHtml = '<div class="placeholder-media"><i class="fas fa-image"></i></div>';
    if (memento.media && Array.isArray(memento.media) && memento.media.length > 0) {
      const firstMedia = memento.media[0];
      if (typeof firstMedia === 'string') {
        // If media is a direct URL string
        mediaHtml = `<img src="${firstMedia}" alt="${memento.name || 'Memento'}" loading="lazy" onerror="this.parentElement.innerHTML='<div class=\\'placeholder-media\\'><i class=\\'fas fa-image\\'></i></div>';">`;
      } else if (firstMedia && typeof firstMedia === 'object') {
        // If media is an object with url property
        const mediaUrl = firstMedia.url || firstMedia.path || firstMedia.src;
        if (mediaUrl) {
          if (firstMedia.type && firstMedia.type.startsWith('video/')) {
            mediaHtml = `<video src="${mediaUrl}" controls></video>`;
          } else {
            mediaHtml = `<img src="${mediaUrl}" alt="${memento.name || 'Memento'}" loading="lazy" onerror="this.parentElement.innerHTML='<div class=\\'placeholder-media\\'><i class=\\'fas fa-image\\'></i></div>';">`;
          }
        }
      }
    }
    
    mementoElement.innerHTML = `
      <div class="memento-content">
        <div class="media-section">
          <div class="memento-media">
            ${mediaHtml}
          </div>
        </div>
        <div class="details-actions-container">
          <div class="memento-details">
            <h3 class="memento-name">
              <i class="fas fa-tag"></i>
              ${memento.name || 'Untitled Memento'}
            </h3>
            <p class="memento-caption">
              <i class="fas fa-quote-right"></i>
              ${memento.caption || 'No caption'}
            </p>
            ${memento.location ? `
              <p class="memento-location">
                <i class="fas fa-map-marker-alt"></i>
                ${memento.location.address || 'Location added'}
              </p>
            ` : ''}
            <p class="memento-timestamp">
              <i class="fas fa-clock"></i>
              ${formattedDate}
            </p>
          </div>
          <div class="memento-actions">
            ${memento.location && memento.location.coordinates ? `
              <button class="view-on-map-btn" title="View on map">
                <i class="fas fa-map-marker-alt"></i>
              </button>
            ` : ''}
            <button class="edit-memento-btn" title="Edit">
              <i class="fas fa-edit"></i>
            </button>
            <button class="delete-memento-btn" title="Delete">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
      </div>
    `;

    // Add event listeners for the buttons
    if (memento.location && memento.location.coordinates) {
      const viewOnMapBtn = mementoElement.querySelector('.view-on-map-btn');
      if (viewOnMapBtn) {
        viewOnMapBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (memento.location && memento.location.coordinates) {
            try {
              // Get the map element
              const mapElement = document.getElementById('map');
              if (!mapElement) {
                console.warn('Map element not found');
                showToast('Map not found. Please try again.', 'warning');
                return;
              }

              // Get the map instance from the element's data
              const mapInstance = mapElement._mapboxgl_map;
              if (!mapInstance || typeof mapInstance.flyTo !== 'function') {
                console.warn('Map instance not properly initialized');
                showToast('Map is not properly initialized. Please try again.', 'warning');
                return;
              }

              // Switch to the map view
              const mapViewBtn = document.querySelector('[data-tab="map-view"]');
              if (mapViewBtn) {
                mapViewBtn.click();
              }

              // Fly to the memento's location
              mapInstance.flyTo({
                center: [memento.location.coordinates.longitude, memento.location.coordinates.latitude],
                zoom: 15,
                essential: true
              });

              // Find and highlight the corresponding marker
              const markers = window.markers || [];
              const marker = markers.find(m => m.mementoId === memento.id);
              if (marker) {
                // Remove highlight from all markers
                markers.forEach(m => {
                  if (m.element) {
                    m.element.classList.remove('highlighted-marker');
                  }
                });
                // Add highlight to the selected marker
                if (marker.element) {
                  marker.element.classList.add('highlighted-marker');
                }
              }

              // Display memento details in live feed
              if (typeof window.displayMementoInLiveFeed === 'function') {
                window.displayMementoInLiveFeed(memento);
              }
            } catch (error) {
              console.error('Error handling map interaction:', error);
              showToast('Error displaying location on map. Please try again.', 'error');
            }
          }
        });
      }
    }

    const editMementoBtn = mementoElement.querySelector('.edit-memento-btn');
    if (editMementoBtn) {
      editMementoBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        window.editMemento(memento);
      });
    }

    const deleteMementoBtn = mementoElement.querySelector('.delete-memento-btn');
    if (deleteMementoBtn) {
      deleteMementoBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (confirm('Are you sure you want to delete this memento?')) {
          try {
            await firebase.firestore().collection('mementos').doc(memento.id).delete();
            mementoElement.remove();
            showToast('Memento deleted successfully', 'success');
            
            // If no more mementos, show empty message
            const mementosContent = document.querySelector('.my-mementos-content');
            if (!mementosContent.querySelector('.memento-item')) {
              mementosContent.innerHTML = `
                <div class="no-mementos-message">
                  <p>No mementos found. Start creating new mementos!</p>
                </div>
              `;
            }
          } catch (error) {
            console.error('Error deleting memento:', error);
            showToast('Error deleting memento', 'error');
          }
        }
      });
    }

    return mementoElement;
  }
}

// Initialize when the document is ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM Content Loaded - initializing My Mementos...');
  initializeMyMementos();
}); 