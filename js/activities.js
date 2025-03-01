// Firebase references
const db = firebase.firestore();
const storage = firebase.storage();

// Activity collection name
const ACTIVITIES_COLLECTION = 'activities';

// Activity schema
const ActivityStatus = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  ARCHIVED: 'archived'
};

// Activity validation
function validateActivity(activityData) {
  const errors = [];
  
  if (!activityData.name?.trim()) errors.push('Event name is required');
  if (!activityData.caption?.trim()) errors.push('Caption is required');
  if (!activityData.category) errors.push('Category is required');
  if (!activityData.location?.address) errors.push('Location is required');
  if (!activityData.startTime) errors.push('Start time is required');
  if (!activityData.endTime) errors.push('End time is required');

  const startDate = new Date(activityData.startTime);
  const endDate = new Date(activityData.endTime);
  if (endDate <= startDate) errors.push('End time must be after start time');

  return errors;
}

// Save activity to Firestore
async function saveActivity(activityData, user) {
  try {
    // Validate activity data
    const errors = validateActivity(activityData);
    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }

    // Prepare activity document
    const activity = {
      ...activityData,
      userId: user.uid,
      status: ActivityStatus.PUBLISHED,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    // Save to Firestore
    const docRef = await db.collection(ACTIVITIES_COLLECTION).add(activity);
    return { id: docRef.id, ...activity };
  } catch (error) {
    console.error('Error saving activity:', error);
    throw error;
  }
}

// Upload media files to Firebase Storage
async function uploadActivityMedia(files, userId) {
  try {
    const mediaUrls = [];
    
    for (const file of files) {
      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        throw new Error(`File ${file.name} exceeds 10MB limit`);
      }

      // Create storage reference
      const storageRef = storage.ref();
      const fileRef = storageRef.child(`activities/${userId}/${Date.now()}_${file.name}`);
      
      // Upload file with metadata
      const metadata = {
        contentType: file.type,
        customMetadata: {
          uploadedBy: userId,
          uploadedAt: new Date().toISOString()
        }
      };

      // Upload file
      await fileRef.put(file, metadata);
      const url = await fileRef.getDownloadURL();
      mediaUrls.push({
        url,
        type: file.type,
        name: file.name,
        size: file.size
      });
    }
    
    return mediaUrls;
  } catch (error) {
    console.error('Error uploading media:', error);
    throw error;
  }
}

// Get user's activities
async function getUserActivities(userId, status = ActivityStatus.PUBLISHED) {
  try {
    const snapshot = await db.collection(ACTIVITIES_COLLECTION)
      .where('userId', '==', userId)
      .where('status', '==', status)
      .orderBy('createdAt', 'desc')
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting user activities:', error);
    throw error;
  }
}

// Update activity
async function updateActivity(activityId, updateData, user) {
  try {
    const activityRef = db.collection(ACTIVITIES_COLLECTION).doc(activityId);
    const activity = await activityRef.get();

    if (!activity.exists) {
      throw new Error('Activity not found');
    }

    if (activity.data().userId !== user.uid) {
      throw new Error('Unauthorized to update this activity');
    }

    await activityRef.update({
      ...updateData,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    return {
      id: activityId,
      ...activity.data(),
      ...updateData
    };
  } catch (error) {
    console.error('Error updating activity:', error);
    throw error;
  }
}

// Delete activity
async function deleteActivity(activityId, user) {
  try {
    const activityRef = db.collection(ACTIVITIES_COLLECTION).doc(activityId);
    const activity = await activityRef.get();

    if (!activity.exists) {
      throw new Error('Activity not found');
    }

    if (activity.data().userId !== user.uid) {
      throw new Error('Unauthorized to delete this activity');
    }

    // Delete associated media files
    const mediaFiles = activity.data().media || [];
    for (const media of mediaFiles) {
      const fileRef = storage.refFromURL(media.url);
      await fileRef.delete();
    }

    // Delete activity document
    await activityRef.delete();
  } catch (error) {
    console.error('Error deleting activity:', error);
    throw error;
  }
}

// Archive activity
async function archiveActivity(activityId, user) {
  return updateActivity(activityId, { status: ActivityStatus.ARCHIVED }, user);
}

// Save activity as draft
async function saveActivityDraft(activityData, user) {
  const draftData = {
    ...activityData,
    status: ActivityStatus.DRAFT
  };
  return saveActivity(draftData, user);
}

// Export functions
window.Activities = {
  save: saveActivity,
  uploadMedia: uploadActivityMedia,
  getUserActivities,
  update: updateActivity,
  delete: deleteActivity,
  archive: archiveActivity,
  saveDraft: saveActivityDraft,
  validate: validateActivity
}; 