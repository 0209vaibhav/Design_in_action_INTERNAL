// Format timestamp to readable date
function formatTimestamp(timestamp) {
    if (!timestamp) return 'No date';
    
    try {
        // Convert Firebase timestamp to Date
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        
        // Format the date
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    } catch (error) {
        console.error('Error formatting timestamp:', error);
        return 'Invalid date';
    }
}

// Initialize drafts container
function initializeDraftsContainer() {
  const draftsContainer = document.getElementById('journey-drafts-container');
  const draftsContent = draftsContainer.querySelector('.drafts-content');

  // Listen for auth state changes
  firebase.auth().onAuthStateChanged(user => {
    if (user) {
      loadDrafts(user.uid);
    } else {
      draftsContent.innerHTML = `
        <div class="no-drafts-message">
          <p>Please sign in to view your drafts</p>
        </div>
      `;
    }
  });

  // Load drafts for a user
  async function loadDrafts(userId) {
    try {
      draftsContent.innerHTML = '<div class="loading">Loading drafts...</div>';
      
      // Get drafts without ordering first
      const draftsSnapshot = await firebase.firestore()
        .collection('memento_drafts')
        .where('userId', '==', userId)
        .get();

      if (draftsSnapshot.empty) {
        draftsContent.innerHTML = `
          <div class="no-drafts-message">
            <p>No drafts found. Start creating new mementos!</p>
          </div>
        `;
        return;
      }

      // Render drafts
      draftsContent.innerHTML = '';
      
      // Convert to array and sort manually
      const drafts = [];
      draftsSnapshot.forEach(doc => {
        drafts.push({
          id: doc.id,
          ...doc.data()
        });
      });

      // Sort by timestamp if exists, otherwise by id
      drafts.sort((a, b) => {
        if (a.timestamp && b.timestamp) {
          return b.timestamp - a.timestamp;
        }
        return a.id > b.id ? -1 : 1;
      });

      // Render sorted drafts
      drafts.forEach(draft => {
        const draftElement = createDraftElement(draft);
        draftsContent.appendChild(draftElement);
      });

    } catch (error) {
      console.error('Error loading drafts:', error);
      draftsContent.innerHTML = `
        <div class="error-message">
          <p>Error loading drafts: ${error.message}</p>
        </div>
      `;
    }
  }

  // Create HTML element for a draft
  function createDraftElement(draft) {
    const draftElement = document.createElement('div');
    draftElement.className = 'draft-item';
    
    const formattedDate = formatTimestamp(draft.timestamp);
    
    // Prepare media HTML
    let mediaHtml = `
        <div class="placeholder-media">
            <i class="fas fa-image"></i>
        </div>
    `;
    
    console.log('Draft data:', draft); // Debug full draft
    
    // Handle both array and single object media structures
    if (draft.media) {
        let mediaItem;
        
        if (Array.isArray(draft.media)) {
            console.log('Media is array:', draft.media);
            mediaItem = draft.media[0]; // Get first item if array
        } else {
            console.log('Media is object:', draft.media);
            mediaItem = draft.media; // Use as is if single object
        }
        
        if (mediaItem && mediaItem.url) {
            console.log('Using media item:', mediaItem);
            // Handle both full MIME types and simple types
            const type = mediaItem.type || '';
            if (type.includes('image') || type === 'image') {
                mediaHtml = `<img src="${mediaItem.url}" alt="Draft media">`;
            } else if (type.includes('video') || type === 'video') {
                mediaHtml = `<video src="${mediaItem.url}" controls></video>`;
            }
        }
    }

    draftElement.innerHTML = `
        <div class="draft-content">
            <div class="media-section">
                <div class="draft-media">
                    ${mediaHtml}
                </div>
            </div>
            <div class="details-actions-container">
                <div class="draft-details">
                    <h3 class="draft-name">
                        <i class="fas fa-tag"></i>
                        ${draft.name || 'Untitled Draft'}
                    </h3>
                    <p class="draft-caption">
                        <i class="fas fa-quote-right"></i>
                        ${draft.caption || 'No caption'}
                    </p>
                    ${draft.location ? `
                        <p class="draft-location">
                            <i class="fas fa-map-marker-alt"></i>
                            ${draft.location.address || 'Location added'}
                        </p>
                    ` : ''}
                    <p class="draft-timestamp">
                        <i class="fas fa-clock"></i>
                        ${formattedDate}
                    </p>
                </div>
                <div class="draft-actions">
                    ${draft.location && draft.location.coordinates ? `
                        <button class="view-on-map-btn" title="View on map">
                            <i class="fas fa-map-marker-alt"></i>
                        </button>
                    ` : ''}
                    <button class="edit-draft-btn" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="delete-draft-btn" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        </div>
    `;

    // Add event listeners
    const viewOnMapBtn = draftElement.querySelector('.view-on-map-btn');
    if (viewOnMapBtn) {
        viewOnMapBtn.addEventListener('click', () => {
            if (draft.location && draft.location.coordinates) {
                showLocationOnMap(draft.location.coordinates);
            }
        });
    }

    const editBtn = draftElement.querySelector('.edit-draft-btn');
    editBtn.addEventListener('click', () => {
        editDraft(draft);
    });

    const deleteBtn = draftElement.querySelector('.delete-draft-btn');
    deleteBtn.addEventListener('click', async () => {
      try {
        const confirmed = await showConfirmationDialog({
          title: 'Delete Draft',
          message: 'Are you sure you want to delete this draft?',
          confirmText: 'Delete',
          cancelText: 'Cancel'
        });

        if (confirmed) {
          await deleteDraft(draft.id);
          draftElement.remove();
          showToast('Draft deleted successfully', 'success');
        }
      } catch (error) {
        if (error !== false) { // Only log if it's not a cancellation
          console.error('Error deleting draft:', error);
          showToast('Failed to delete draft. Please try again.', 'error');
        }
      }
    });

    return draftElement;
  }

  // Edit draft
  async function editDraft(draft) {
    try {
      // Show the capture form
      const captureForm = document.getElementById('journey-capture-form');
      const journeyCaptureForm = document.getElementById('journey-capture-form');
      
      if (!journeyCaptureForm) {
        throw new Error('Capture form not found');
      }

      // Update preview elements
      const namePreview = journeyCaptureForm.querySelector('#name-preview');
      const captionPreview = journeyCaptureForm.querySelector('#caption-preview');
      const descriptionPreview = journeyCaptureForm.querySelector('#description-preview');
      const locationPreview = journeyCaptureForm.querySelector('#location-preview');
      const categoryPreview = journeyCaptureForm.querySelector('#category-preview');
      const durationPreview = journeyCaptureForm.querySelector('#duration-preview');
      const mediaPreview = journeyCaptureForm.querySelector('#media-preview');
      const tagsPreview = journeyCaptureForm.querySelector('#tags-preview');

      // Populate the form with draft data
      if (namePreview) namePreview.textContent = draft.name || 'Add name';
      if (captionPreview) captionPreview.textContent = draft.caption || 'Add caption';
      if (descriptionPreview) descriptionPreview.textContent = draft.description || 'Add description';
      if (locationPreview) locationPreview.textContent = draft.location || 'Add location';
      if (categoryPreview) categoryPreview.textContent = draft.category || 'Select category';
      if (durationPreview) durationPreview.textContent = draft.duration || 'Select duration';
      if (mediaPreview) {
        mediaPreview.textContent = draft.media && draft.media.length > 0 
          ? `${draft.media.length} media items selected` 
          : 'Add photo/video';
      }
      if (tagsPreview) {
        tagsPreview.textContent = draft.tags && draft.tags.length > 0 
          ? draft.tags.join(', ') 
          : 'Select tags';
      }

      // Store the draft ID for later use
      captureForm.dataset.draftId = draft.id;

      // Show capture form and hide drafts
      captureForm.classList.remove('hidden');
      draftsContainer.classList.add('hidden');

    } catch (error) {
      console.error('Error editing draft:', error);
      showToast(`Error editing draft: ${error.message}`, 'error');
    }
  }

  // Delete draft
  async function deleteDraft(draftId) {
    try {
      await firebase.firestore().collection('memento_drafts').doc(draftId).delete();
      
      // If no more drafts, show empty message
      if (draftsContent.children.length === 0) {
        draftsContent.innerHTML = `
          <div class="no-drafts-message">
            <p>No drafts found. Start creating new mementos!</p>
          </div>
        `;
      }
    } catch (error) {
      console.error('Error deleting draft:', error);
      showToast('Error deleting draft', 'error');
    }
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeDraftsContainer);
