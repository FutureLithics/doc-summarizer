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
      userSelect.innerHTML = '<option value="">Select a user...</option>';
      
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
      
      // Add user options
      availableUsers.forEach(user => {
        const option = document.createElement('option');
        option.value = user._id;
        option.textContent = `${user.email} (${user.role})`;
        userSelect.appendChild(option);
      });
    }
  } catch (error) {
    console.error('Failed to load users:', error);
  }
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
      const result = await response.json();
      alert('Extraction shared successfully!');
    } else {
      const errorData = await response.json();
      alert('Sharing failed: ' + (errorData.message || errorData.error || 'Unknown error'));
    }
  } catch (error) {
    alert('Sharing failed: ' + error.message);
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
    } else {
      const errorData = await response.json();
      alert('Unsharing failed: ' + (errorData.message || errorData.error || 'Unknown error'));
    }
  } catch (error) {
    alert('Unsharing failed: ' + error.message);
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
        sharedUsersList.innerHTML = extraction.sharedWith.map(user => `
          <div class="flex items-center justify-between p-2 bg-gray-50 rounded">
            <span class="text-sm text-gray-700">${user.email} (${user.role})</span>
            <button 
              class="text-red-600 hover:text-red-800 text-sm"
              onclick="unshareExtraction('${extractionId}', '${user._id}')"
            >
              Remove
            </button>
          </div>
        `).join('');
      } else {
        sharedUsersList.innerHTML = '<p class="text-sm text-gray-500 italic">Not shared with anyone yet.</p>';
      }
    }
  } catch (error) {
    console.error('Failed to load shared users:', error);
  }
}