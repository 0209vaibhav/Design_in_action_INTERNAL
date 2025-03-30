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
        const draftElement = createDraftElement(draft.id, draft);
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
  function createDraftElement(draftId, draft) {
    const draftElement = document.createElement('div');
    draftElement.className = 'draft-item';
    
    // Get first media item if exists
    const firstMedia = draft.media && draft.media.length > 0 ? draft.media[0] : null;
    
    draftElement.innerHTML = `
      <div class="draft-content">
        <div class="draft-media">
          ${firstMedia 
            ? (firstMedia.type === 'image' 
                ? `<img src="${firstMedia.url}" alt="Draft preview">` 
                : `<video src="${firstMedia.url}" controls></video>`)
            : `<div class="placeholder-media">
                 <i class="fas fa-image"></i>
               </div>`
          }
        </div>
        <div class="draft-details">
          <div class="draft-header">
            <h3 class="draft-name">
              <i class="fas fa-tag"></i>
              ${draft.name || 'Untitled Memento'}
            </h3>
            <div class="draft-actions">
              <button class="edit-draft-btn" data-draft-id="${draftId}" title="Edit draft">
                <i class="fas fa-edit"></i>
              </button>
              <button class="delete-draft-btn" data-draft-id="${draftId}" title="Delete draft">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>
          <p class="draft-caption">
            <i class="fas fa-quote-right"></i>
            ${draft.caption || 'No caption'}
          </p>
          ${draft.location && draft.location.address ? 
            `<p class="draft-location">
               <i class="fas fa-map-marker-alt"></i>
               ${draft.location.address}
             </p>` 
            : ''}
        </div>
      </div>
    `;

    // Add event listeners
    const editBtn = draftElement.querySelector('.edit-draft-btn');
    const deleteBtn = draftElement.querySelector('.delete-draft-btn');

    editBtn.addEventListener('click', () => editDraft(draftId, draft));
    deleteBtn.addEventListener('click', () => deleteDraft(draftId, draftElement));

    return draftElement;
  }

  // Edit draft
  async function editDraft(draftId, draft) {
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
      captureForm.dataset.draftId = draftId;

      // Show capture form and hide drafts
      captureForm.classList.remove('hidden');
      draftsContainer.classList.add('hidden');

    } catch (error) {
      console.error('Error editing draft:', error);
      showToast(`Error editing draft: ${error.message}`, 'error');
    }
  }

  // Delete draft
  async function deleteDraft(draftId, draftElement) {
    if (!confirm('Are you sure you want to delete this draft?')) return;

    try {
      await firebase.firestore().collection('memento_drafts').doc(draftId).delete();
      draftElement.remove();
      
      // Show success message
      showToast('Draft deleted successfully', 'success');
      
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
