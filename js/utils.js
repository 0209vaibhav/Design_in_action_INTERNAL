// Utility functions
function getCategoryIcon(category) {
  const icons = {
    'food': 'fa-utensils',
    'drinks': 'fa-glass-martini',
    'entertainment': 'fa-theater-masks',
    'sports': 'fa-basketball-ball',
    'education': 'fa-graduation-cap',
    'social': 'fa-users',
    'other': 'fa-star'
  };
  return icons[category.toLowerCase()] || 'fa-star';
}

function formatDateTime(dateString) {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

function setupAutoClosePopups() {
  document.addEventListener('click', (e) => {
    const popups = document.querySelectorAll('.mapboxgl-popup');
    popups.forEach(popup => {
      if (!popup.contains(e.target)) {
        popup.remove();
      }
    });
  });
}

function updateContent(activity) {
  const contentDiv = document.querySelector(`[data-activity-id="${activity.id}"]`);
  if (contentDiv) {
    contentDiv.innerHTML = `
      <h3>${activity.name}</h3>
      <p>${activity.description}</p>
      <p><i class="far fa-clock"></i> ${formatDateTime(activity.startTime)}</p>
    `;
  }
}

function openSubTab(tabName) {
  // Hide all sub-tab content
  document.querySelectorAll('.sub-tab-content').forEach(content => {
    content.classList.remove('active');
  });
  
  // Show selected sub-tab content
  const selectedContent = document.querySelector(`[data-sub-tab="${tabName}"]`);
  if (selectedContent) {
    selectedContent.classList.add('active');
  }
  
  // Update sub-tab buttons
  document.querySelectorAll('.sub-tab-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.getAttribute('data-sub-tab') === tabName) {
      btn.classList.add('active');
    }
  });
}

function handleSubTabAction(activity, tabId) {
  switch (tabId) {
    case 'edit':
      editActivity(activity.id);
      break;
    case 'delete':
      deleteActivity(activity.id);
      break;
    case 'share':
      shareActivity(activity);
      break;
    default:
      console.warn('Unknown tab action:', tabId);
  }
}

// Export utility functions
window.Utils = {
  getCategoryIcon,
  formatDateTime,
  setupAutoClosePopups,
  updateContent,
  openSubTab,
  handleSubTabAction
}; 