document.addEventListener('DOMContentLoaded', function() {
  // Event delegation for copy button
  document.addEventListener('click', function(e) {
    if (e.target.closest('.copy-text-btn')) {
      e.preventDefault();
      copyToClipboard(e.target.closest('.copy-text-btn'));
    }
  });

    // Modal handling for sharing
    const shareModal = document.getElementById('shareModal');
    const shareBtn = document.getElementById('share-btn');
    const closeShareModal = document.getElementById('closeShareModal');
    const cancelShare = document.getElementById('cancelShare');
    const shareForm = document.getElementById('shareForm');
  
    function showShareModal() {
      loadSharedUsers();
      loadUsersForSharing();
      if (shareModal) {
        shareModal.classList.remove('hidden');
      }
    }
  
    function hideShareModal() {
      if (shareModal) {
        shareModal.classList.add('hidden');
      }
      if (shareForm) {
        shareForm.reset();
      }
    }
  
    if (shareBtn) {
      shareBtn.addEventListener('click', showShareModal);
    }
  
    if (closeShareModal) {
      closeShareModal.addEventListener('click', hideShareModal);
    }
  
    if (cancelShare) {
      cancelShare.addEventListener('click', hideShareModal);
    }
  
    if (shareForm) {
      shareForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const userId = formData.get('userId');
        const extractionId = window.location.pathname.split('/').pop();
        
        if (extractionId && userId) {
          shareExtraction(extractionId, userId);
          shareForm.reset();
        }
      });
    }
  
    // Close modal when clicking outside
    if (shareModal) {
      shareModal.addEventListener('click', function(e) {
        if (e.target === shareModal) {
          hideShareModal();
        }
      });
    }

  // Initialize edit functionality if elements exist
  initializeEditMode();
});

function copyToClipboard(button) {
  const textElement = document.querySelector('pre');
  if (textElement) {
    navigator.clipboard.writeText(textElement.textContent).then(() => {
      // Briefly show success feedback
      const originalText = button.textContent;
      button.textContent = 'Copied!';
      button.classList.add('bg-green-600', 'hover:bg-green-700');
      button.classList.remove('bg-blue-600', 'hover:bg-blue-700');
      
      setTimeout(() => {
        button.textContent = originalText;
        button.classList.remove('bg-green-600', 'hover:bg-green-700');
        button.classList.add('bg-blue-600', 'hover:bg-blue-700');
      }, 2000);
    }).catch(err => {
      console.error('Failed to copy text: ', err);
      // Fallback for older browsers
      try {
        const textArea = document.createElement('textarea');
        textArea.value = textElement.textContent;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        
        // Show success feedback
        const originalText = button.textContent;
        button.textContent = 'Copied!';
        setTimeout(() => {
          button.textContent = originalText;
        }, 2000);
      } catch (fallbackErr) {
        console.error('Fallback copy failed: ', fallbackErr);
        alert('Copy failed. Please manually select and copy the text.');
      }
    });
  }
}

/**
 * Edit Mode Management Class
 */
class ExtractionEditManager {
  constructor() {
    this.isEditMode = false;
    this.originalValues = {};
    this.elements = {};
    this.extractionId = this.getExtractionId();
    
    this.initializeElements();
    this.bindEvents();
  }

  initializeElements() {
    // Get all required DOM elements
    this.elements = {
      editBtn: document.getElementById('edit-btn'),
      editBtnText: document.getElementById('edit-btn-text'),
      cancelBtn: document.getElementById('cancel-btn'),
      saveBtn: document.getElementById('save-btn'),
      editActions: document.getElementById('edit-actions'),
      
      // Display elements
      displayFilename: document.getElementById('display-filename'),
      displayFilenameInfo: document.getElementById('display-filename-info'),
      displaySummary: document.getElementById('display-summary'),
      
      // Edit elements
      editFilename: document.getElementById('edit-filename'),
      editFilenameInfo: document.getElementById('edit-filename-info'),
      editSummary: document.getElementById('edit-summary'),
      
      // Loading states
      saveText: document.getElementById('save-text'),
      saveLoading: document.getElementById('save-loading')
    };

    // Check if required elements exist
    if (!this.elements.editBtn || 
        (!this.elements.displayFilename && !this.elements.displayFilenameInfo) ||
        (!this.elements.editFilename && !this.elements.editFilenameInfo)) {
      console.warn('Edit mode: Required elements not found');
      return false;
    }

    return true;
  }

  bindEvents() {
    if (!this.elements.editBtn) return;

    // Button events
    this.elements.editBtn.addEventListener('click', () => this.enterEditMode());
    this.elements.cancelBtn?.addEventListener('click', () => this.cancelEdit());
    this.elements.saveBtn?.addEventListener('click', () => this.saveChanges());

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => this.handleKeyboard(e));

    // Handle Enter key in filename fields
    this.elements.editFilename?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (this.elements.editSummary) {
          this.elements.editSummary.focus();
        } else {
          this.saveChanges();
        }
      }
    });

    this.elements.editFilenameInfo?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (this.elements.editSummary) {
          this.elements.editSummary.focus();
        } else {
          this.saveChanges();
        }
      }
    });

    // Sync filename inputs when either changes
    this.elements.editFilename?.addEventListener('input', (e) => {
      if (this.elements.editFilenameInfo) {
        this.elements.editFilenameInfo.value = e.target.value;
      }
    });

    this.elements.editFilenameInfo?.addEventListener('input', (e) => {
      if (this.elements.editFilename) {
        this.elements.editFilename.value = e.target.value;
      }
    });

    // Handle Ctrl+Enter in summary field to save
    this.elements.editSummary?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        this.saveChanges();
      }
    });
  }

  getExtractionId() {
    const pathParts = window.location.pathname.split('/');
    return pathParts[pathParts.length - 1];
  }

  storeOriginalValues() {
    this.originalValues = {
      fileName: this.elements.displayFilename.textContent.trim(),
      summary: this.elements.displaySummary ? this.elements.displaySummary.textContent.trim() : ''
    };
  }

  enterEditMode() {
    if (this.isEditMode) return;

    this.isEditMode = true;
    this.storeOriginalValues();

    // Update display elements
    this.toggleDisplayElements(false);
    this.toggleEditElements(true);

    // Update button states
    this.updateEditButtonState(true);
    this.showEditActions(true);

    // Sync filename values between fields
    if (this.elements.editFilename && this.elements.editFilenameInfo) {
      this.elements.editFilenameInfo.value = this.elements.editFilename.value;
    }

    // Focus on first available filename input
    const firstFilenameInput = this.elements.editFilename || this.elements.editFilenameInfo;
    if (firstFilenameInput) {
      firstFilenameInput.focus();
      firstFilenameInput.select();
    }

    // Show user feedback
    this.showNotification('Edit mode enabled. Press Escape to cancel.', 'info');
  }

  exitEditMode() {
    if (!this.isEditMode) return;

    this.isEditMode = false;

    // Update display elements
    this.toggleDisplayElements(true);
    this.toggleEditElements(false);

    // Update button states
    this.updateEditButtonState(false);
    this.showEditActions(false);
  }

  cancelEdit() {
    // Restore original values
    if (this.elements.editFilename) {
      this.elements.editFilename.value = this.originalValues.fileName;
    }
    if (this.elements.editFilenameInfo) {
      this.elements.editFilenameInfo.value = this.originalValues.fileName;
    }
    if (this.elements.displayFilename) {
      this.elements.displayFilename.textContent = this.originalValues.fileName;
    }
    if (this.elements.displayFilenameInfo) {
      this.elements.displayFilenameInfo.textContent = this.originalValues.fileName;
    }

    if (this.elements.editSummary && this.elements.displaySummary) {
      this.elements.editSummary.value = this.originalValues.summary;
      this.elements.displaySummary.textContent = this.originalValues.summary;
    }

    this.exitEditMode();
    this.showNotification('Changes cancelled', 'info');
  }

  async saveChanges() {
    const newFileName = (this.elements.editFilename?.value || this.elements.editFilenameInfo?.value || '').trim();
    const newSummary = this.elements.editSummary ? this.elements.editSummary.value.trim() : '';

    // Validation
    if (!newFileName) {
      this.showNotification('File name cannot be empty', 'error');
      (this.elements.editFilename || this.elements.editFilenameInfo)?.focus();
      return;
    }

    if (newFileName.length > 255) {
      this.showNotification('File name is too long (max 255 characters)', 'error');
      (this.elements.editFilename || this.elements.editFilenameInfo)?.focus();
      return;
    }

    // Check if anything actually changed
    if (newFileName === this.originalValues.fileName && 
        newSummary === this.originalValues.summary) {
      this.exitEditMode();
      this.showNotification('No changes to save', 'info');
      return;
    }

    // Show loading state
    this.setSaveButtonLoading(true);

    try {
      const response = await fetch(`/api/extractions/${this.extractionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileName: newFileName,
          summary: newSummary
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Server error: ${response.status}`);
      }

      const result = await response.json();

      // Update display values
      if (this.elements.displayFilename) {
        this.elements.displayFilename.textContent = newFileName;
      }
      if (this.elements.displayFilenameInfo) {
        this.elements.displayFilenameInfo.textContent = newFileName;
      }
      if (this.elements.displaySummary) {
        this.elements.displaySummary.textContent = newSummary;
      }

      // Update page title if it includes the filename
      this.updatePageTitle(newFileName);

      this.exitEditMode();
      this.showNotification('Changes saved successfully!', 'success');

    } catch (error) {
      console.error('Failed to save changes:', error);
      this.showNotification(`Failed to save changes: ${error.message}`, 'error');
    } finally {
      this.setSaveButtonLoading(false);
    }
  }

  // Helper methods
  toggleDisplayElements(show) {
    if (this.elements.displayFilename) {
      this.elements.displayFilename.classList.toggle('hidden', !show);
    }
    if (this.elements.displayFilenameInfo) {
      this.elements.displayFilenameInfo.classList.toggle('hidden', !show);
    }
    if (this.elements.displaySummary) {
      this.elements.displaySummary.classList.toggle('hidden', !show);
    }
  }

  toggleEditElements(show) {
    if (this.elements.editFilename) {
      this.elements.editFilename.classList.toggle('hidden', !show);
    }
    if (this.elements.editFilenameInfo) {
      this.elements.editFilenameInfo.classList.toggle('hidden', !show);
    }
    if (this.elements.editSummary) {
      this.elements.editSummary.classList.toggle('hidden', !show);
    }
  }

  updateEditButtonState(isEditing) {
    if (isEditing) {
      this.elements.editBtnText.textContent = 'Editing...';
      this.elements.editBtn.disabled = true;
      this.elements.editBtn.classList.add('opacity-50', 'cursor-not-allowed');
    } else {
      this.elements.editBtnText.textContent = 'Edit';
      this.elements.editBtn.disabled = false;
      this.elements.editBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    }
  }

  showEditActions(show) {
    if (this.elements.editActions) {
      this.elements.editActions.classList.toggle('hidden', !show);
    }
  }

  setSaveButtonLoading(loading) {
    if (!this.elements.saveText || !this.elements.saveLoading || !this.elements.saveBtn) return;

    this.elements.saveText.classList.toggle('hidden', loading);
    this.elements.saveLoading.classList.toggle('hidden', !loading);
    this.elements.saveBtn.disabled = loading;
  }

  updatePageTitle(newFileName) {
    const title = document.title;
    if (title.includes('Extraction Details')) {
      document.title = `${newFileName} | Document Extraction Service`;
    }
  }

  handleKeyboard(e) {
    if (!this.isEditMode) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      this.cancelEdit();
    }

    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      this.saveChanges();
    }
  }

  showNotification(message, type = 'info') {
    // Remove existing notifications
    const existing = document.querySelectorAll('.edit-notification');
    existing.forEach(el => el.remove());

    const notification = document.createElement('div');
    notification.className = `edit-notification fixed top-4 right-4 px-4 py-2 rounded-lg shadow-lg z-50 max-w-sm`;
    
    // Set color based on type
    switch (type) {
      case 'success':
        notification.classList.add('bg-green-500', 'text-white');
        break;
      case 'error':
        notification.classList.add('bg-red-500', 'text-white');
        break;
      case 'info':
      default:
        notification.classList.add('bg-blue-500', 'text-white');
        break;
    }

    notification.textContent = message;
    document.body.appendChild(notification);

    // Auto remove after delay
    const delay = type === 'error' ? 5000 : 3000;
    setTimeout(() => {
      if (document.body.contains(notification)) {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
          document.body.removeChild(notification);
        }, 300);
      }
    }, delay);
  }
}

function initializeEditMode() {
  // Initialize the edit manager
  new ExtractionEditManager();
}

// Function for loading users into the share select dropdown
async function loadUsersForSharing() {
  try {
    const response = await fetch('/api/users');
    if (response.ok) {
      const users = await response.json();
      const userSelect = document.getElementById('shareUserSelect');
      
      // Clear existing options except the first one
      userSelect.innerHTML = '<option value="">Choose a user to share with...</option>';
      
      // Get current extraction data to filter out owner and already shared users
      const extractionId = window.location.pathname.split('/').pop();
      const extractionResponse = await fetch(`/api/extractions/${extractionId}`);
      const extraction = await extractionResponse.json();
      
      // Filter out owner and already shared users
      const availableUsers = users.filter(user => {
        const isOwner = extraction.userId && extraction.userId._id === user._id;
        const isAlreadyShared = extraction.sharedWith && extraction.sharedWith.some(sharedUser => sharedUser._id === user._id);
        return !isOwner && !isAlreadyShared;
      });
      
      // Add user options with better formatting
      availableUsers.forEach(user => {
        const option = document.createElement('option');
        option.value = user._id;
        const roleEmoji = user.role === 'superadmin' ? '🔥' : user.role === 'admin' ? '👑' : '👤';
        option.textContent = `${roleEmoji} ${user.email} (${user.role})`;
        userSelect.appendChild(option);
      });

      // Update placeholder if no users available
      if (availableUsers.length === 0) {
        userSelect.innerHTML = '<option value="">No additional users available to share with</option>';
      }
    }
  } catch (error) {
    console.error('Failed to load users:', error);
    const userSelect = document.getElementById('shareUserSelect');
    if (userSelect) {
      userSelect.innerHTML = '<option value="">Error loading users - please refresh</option>';
    }
  }
}

// Helper function to show toast notifications
function showToast(message, type = 'success') {
  // Remove existing toasts
  const existingToasts = document.querySelectorAll('.toast-notification');
  existingToasts.forEach(toast => toast.remove());

  const toast = document.createElement('div');
  toast.className = `toast-notification fixed top-4 right-4 max-w-sm px-4 py-3 rounded-lg shadow-lg z-50 transform transition-all duration-300 ease-out`;
  
  const bgClasses = {
    'success': 'bg-green-500 text-white',
    'error': 'bg-red-500 text-white',
    'info': 'bg-blue-500 text-white'
  };
  
  const icons = {
    'success': '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>',
    'error': '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>',
    'info': '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>'
  };

  toast.className += ` ${bgClasses[type] || bgClasses['info']}`;
  toast.innerHTML = `
    <div class="flex items-center space-x-3">
      <div class="flex-shrink-0">${icons[type] || icons['info']}</div>
      <div class="flex-1">
        <p class="text-sm font-medium">${message}</p>
      </div>
      <button class="toast-close-btn flex-shrink-0 ml-2 hover:opacity-75">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      </button>
    </div>
  `;

  document.body.appendChild(toast);

  // Add event listener for close button
  const closeBtn = toast.querySelector('.toast-close-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      toast.remove();
    });
  }

  // Animate in
  setTimeout(() => {
    toast.style.transform = 'translateX(0)';
  }, 100);

  // Auto remove after delay
  const delay = type === 'error' ? 5000 : 3000;
  setTimeout(() => {
    if (document.body.contains(toast)) {
      toast.style.transform = 'translateX(100%)';
      toast.style.opacity = '0';
      setTimeout(() => {
        toast.remove();
      }, 300);
    }
  }, delay);
}

// Function for sharing extraction
async function shareExtraction(extractionId, userId) {
  try {
    const response = await fetch(`/api/extractions/${extractionId}/share`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ userId })
    });
    
    if (response.ok) {
      // Refresh the shared users list and available users
      await loadSharedUsers();
      await loadUsersForSharing();
      
      // Show success message
      showToast('Extraction shared successfully! 🎉', 'success');
      
      // Reset the form
      const form = document.getElementById('shareForm');
      if (form) form.reset();
    } else {
      const errorData = await response.json();
      showToast('Sharing failed: ' + (errorData.message || 'Unknown error'), 'error');
    }
  } catch (error) {
    showToast('Sharing failed: ' + error.message, 'error');
  }
}

// Function for unsharing extraction
async function unshareExtraction(extractionId, userId) {
  try {
    const response = await fetch(`/api/extractions/${extractionId}/unshare`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ userId })
    });
    
    if (response.ok) {
      // Refresh the shared users list and available users
      await loadSharedUsers();
      await loadUsersForSharing();
      
      showToast('User access removed successfully', 'success');
    } else {
      const errorData = await response.json();
      showToast('Failed to remove access: ' + (errorData.message || 'Unknown error'), 'error');
    }
  } catch (error) {
    showToast('Failed to remove access: ' + error.message, 'error');
  }
}

// Function to load and display shared users
async function loadSharedUsers() {
  try {
    const extractionId = window.location.pathname.split('/').pop();
    const response = await fetch(`/api/extractions/${extractionId}`);
    
    if (response.ok) {
      const extraction = await response.json();
      const sharedUsersList = document.getElementById('sharedUsersList');
      
      if (extraction.sharedWith && extraction.sharedWith.length > 0) {
        // Helper function to get role badge
        const getRoleBadge = (role) => {
          const badges = {
            'superadmin': '<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">🔥 Super Admin</span>',
            'admin': '<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">👑 Admin</span>',
            'user': '<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">👤 User</span>'
          };
          return badges[role] || badges['user'];
        };

        // Helper function to generate avatar initials
        const getAvatarInitials = (email) => {
          return email.split('@')[0].substring(0, 2).toUpperCase();
        };

        // Helper function to generate avatar color based on email
        const getAvatarColor = (email) => {
          const colors = [
            'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 
            'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500'
          ];
          const hash = email.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
          return colors[hash % colors.length];
        };

        sharedUsersList.innerHTML = extraction.sharedWith.map(user => `
          <div class="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-all duration-200">
            <div class="flex items-center space-x-3">
              <div class="flex-shrink-0 w-8 h-8 ${getAvatarColor(user.email)} rounded-full flex items-center justify-center">
                <span class="text-xs font-medium text-white">${getAvatarInitials(user.email)}</span>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-gray-900 truncate">${user.email}</p>
                <div class="mt-1">${getRoleBadge(user.role)}</div>
              </div>
            </div>
            <button 
              class="remove-share-btn flex-shrink-0 p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 group"
              data-user-id="${user._id}"
              data-extraction-id="${extractionId}"
              title="Remove access"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
        `).join('');

        // Add event listeners for remove buttons
        const removeButtons = sharedUsersList.querySelectorAll('.remove-share-btn');
        removeButtons.forEach(button => {
          button.addEventListener('click', function() {
            console.log('Remove share button clicked'); // Debug log
            const userId = this.getAttribute('data-user-id');
            const extractionId = this.getAttribute('data-extraction-id');
            if (userId && extractionId) {
              unshareExtraction(extractionId, userId);
            } else {
              console.error('Missing userId or extractionId for unshare operation');
            }
          });
        });
        
        console.log(`Added ${removeButtons.length} event listeners for remove buttons`); // Debug log
      } else {
        sharedUsersList.innerHTML = `
          <div class="text-center py-8">
            <svg class="mx-auto h-12 w-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"></path>
            </svg>
            <p class="mt-2 text-sm text-gray-500">Not shared with anyone yet</p>
            <p class="text-xs text-gray-400">Add collaborators below to get started</p>
          </div>
        `;
      }
    }
  } catch (error) {
    console.error('Failed to load shared users:', error);
    const sharedUsersList = document.getElementById('sharedUsersList');
    sharedUsersList.innerHTML = `
      <div class="text-center py-8">
        <svg class="mx-auto h-12 w-12 text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        <p class="mt-2 text-sm text-red-600">Failed to load shared users</p>
        <p class="text-xs text-red-400">Please try refreshing the page</p>
      </div>
    `;
  }
}