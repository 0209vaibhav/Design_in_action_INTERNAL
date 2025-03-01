// Journey/Activity capture functionality
function initializeJourneyCapture() {
  const captureForm = document.getElementById('journey-capture-form');
  const activityForm = document.getElementById('activity-capture-form');
  const mediaInput = document.getElementById('activity-media');
  const mediaPreview = document.getElementById('media-preview');
  const pickLocationBtn = document.getElementById('pick-location-btn');
  const locationInput = document.getElementById('activity-location');
  const saveBtn = document.querySelector('.save-event-btn');
  const cancelBtn = document.querySelector('.cancel-btn');

  let isPickingLocation = false;
  let selectedLocation = null;
  let uploadedFiles = [];

  // Handle media upload and preview
  mediaInput.addEventListener('change', (e) => {
    const files = Array.from(e.target.files);
    uploadedFiles = uploadedFiles.concat(files);
    
    // Update preview
    files.forEach((file, index) => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          mediaPreview.appendChild(
            createMediaPreviewItem(e.target.result, uploadedFiles.length - files.length + index)
          );
        };
        reader.readAsDataURL(file);
      }
    });
  });

  // Handle location picking
  pickLocationBtn.addEventListener('click', () => {
    isPickingLocation = !isPickingLocation;
    pickLocationBtn.classList.toggle('active');
    
    if (isPickingLocation) {
      window.map.getCanvas().style.cursor = 'crosshair';
      showToast('Click on the map to select location', 'info');
    } else {
      window.map.getCanvas().style.cursor = '';
    }
  });

  // Map click handler for location picking
  window.map.on('click', (e) => {
    if (!isPickingLocation) return;
    
    selectedLocation = {
      coordinates: [e.lngLat.lng, e.lngLat.lat],
      address: 'Loading address...'
    };
    
    // Reverse geocode the location
    fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${e.lngLat.lng},${e.lngLat.lat}.json?access_token=${mapboxgl.accessToken}`)
      .then(response => response.json())
      .then(data => {
        if (data.features && data.features.length > 0) {
          selectedLocation.address = data.features[0].place_name;
          locationInput.value = selectedLocation.address;
        }
      })
      .catch(error => {
        console.error('Error getting address:', error);
        locationInput.value = `${e.lngLat.lng.toFixed(6)}, ${e.lngLat.lat.toFixed(6)}`;
      });
    
    // Reset picking mode
    isPickingLocation = false;
    pickLocationBtn.classList.remove('active');
    window.map.getCanvas().style.cursor = '';
  });

  // Form submission
  activityForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!selectedLocation) {
      showToast('Please select a location', 'error');
      return;
    }
    
    try {
      // Show loading state
      saveBtn.disabled = true;
      saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
      
      // Upload media files
      const mediaUrls = await Promise.all(
        uploadedFiles.map(file => Activities.uploadMedia([file], auth.currentUser.uid))
      );
      
      // Prepare activity data
      const activityData = {
        name: document.getElementById('activity-name').value,
        caption: document.getElementById('activity-caption').value,
        category: document.getElementById('activity-category').value,
        startTime: document.getElementById('activity-start-time').value,
        endTime: document.getElementById('activity-end-time').value,
        location: selectedLocation,
        media: mediaUrls.flat(),
        createdAt: new Date().toISOString()
      };
      
      // Save activity
      await Activities.save(activityData, auth.currentUser);
      
      // Show success message
      showToast('Activity saved successfully!');
      
      // Reset form
      activityForm.reset();
      mediaPreview.innerHTML = '';
      uploadedFiles = [];
      selectedLocation = null;
      
      // Update map
      updateMap();
      
    } catch (error) {
      console.error('Error saving activity:', error);
      showToast('Failed to save activity', 'error');
    } finally {
      // Reset button state
      saveBtn.disabled = false;
      saveBtn.innerHTML = 'Save Activity';
    }
  });

  // Cancel button
  cancelBtn.addEventListener('click', () => {
    activityForm.reset();
    mediaPreview.innerHTML = '';
    uploadedFiles = [];
    selectedLocation = null;
    document.querySelector('.capture-panel').classList.remove('show');
  });
}

function createMediaPreviewItem(src, index) {
  const div = document.createElement('div');
  div.className = 'media-preview-item';
  div.innerHTML = `
    <img src="${src}" alt="Media preview">
    <button type="button" class="remove-media-btn" data-index="${index}">
      <i class="fas fa-times"></i>
    </button>
  `;
  
  div.querySelector('.remove-media-btn').addEventListener('click', () => {
    uploadedFiles.splice(index, 1);
    div.remove();
  });
  
  return div;
}

async function editActivity(activityId) {
  try {
    // Get activity data
    const activity = window.currentEvents.find(event => event.id === activityId);
    if (!activity) {
      throw new Error('Activity not found');
    }
    
    // Show edit form
    const editForm = document.getElementById('activity-capture-form');
    editForm.classList.add('edit-mode');
    document.querySelector('.capture-panel').classList.add('show');
    
    // Populate form fields
    document.getElementById('activity-name').value = activity.name;
    document.getElementById('activity-caption').value = activity.caption;
    document.getElementById('activity-category').value = activity.category;
    document.getElementById('activity-start-time').value = activity.startTime;
    document.getElementById('activity-end-time').value = activity.endTime;
    document.getElementById('activity-location').value = activity.location.address;
    
    // Set selected location
    selectedLocation = activity.location;
    
    // Show existing media
    const mediaPreview = document.getElementById('media-preview');
    mediaPreview.innerHTML = '';
    if (activity.media) {
      activity.media.forEach((media, index) => {
        mediaPreview.appendChild(createMediaPreviewItem(media.url, index));
      });
      uploadedFiles = activity.media;
    }
    
    // Update form submission handler
    editForm.onsubmit = async (e) => {
      e.preventDefault();
      
      try {
        const updatedData = {
          name: document.getElementById('activity-name').value,
          caption: document.getElementById('activity-caption').value,
          category: document.getElementById('activity-category').value,
          startTime: document.getElementById('activity-start-time').value,
          endTime: document.getElementById('activity-end-time').value,
          location: selectedLocation,
          media: uploadedFiles,
          updatedAt: new Date().toISOString()
        };
        
        await Activities.update(activityId, updatedData, auth.currentUser);
        
        showToast('Activity updated successfully!');
        editForm.reset();
        editForm.classList.remove('edit-mode');
        document.querySelector('.capture-panel').classList.remove('show');
        updateMap();
        
      } catch (error) {
        console.error('Error updating activity:', error);
        showToast('Failed to update activity', 'error');
      }
    };
    
  } catch (error) {
    console.error('Error editing activity:', error);
    showToast('Failed to load activity', 'error');
  }
}

async function deleteActivity(activityId) {
  try {
    if (await showFeedback('Are you sure you want to delete this activity?')) {
      await Activities.delete(activityId, auth.currentUser);
      showToast('Activity deleted successfully!');
      updateMap();
    }
  } catch (error) {
    console.error('Error deleting activity:', error);
    showToast('Failed to delete activity', 'error');
  }
}

// Export journey functions
window.Journey = {
  initialize: initializeJourneyCapture,
  editActivity,
  deleteActivity,
  createMediaPreviewItem
}; 