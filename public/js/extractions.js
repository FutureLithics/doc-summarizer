// Function for deleting extractions
async function deleteExtraction(extractionId) {
  if (!confirm('Are you sure you want to delete this extraction? This action cannot be undone.')) {
    return;
  }
  
  try {
    const response = await fetch(`/api/extractions/${extractionId}`, {
      method: 'DELETE'
    });
    
    if (response.ok) {
      window.location.reload(); // Refresh the page to update the table
    } else {
      const errorText = await response.text();
      alert('Delete failed: ' + errorText);
    }
  } catch (error) {
    alert('Delete failed: ' + error.message);
  }
}

// Function for loading users into the select dropdown
async function loadUsers() {
  try {
    const response = await fetch('/api/users');
    if (response.ok) {
      const users = await response.json();
      const userSelect = document.getElementById('userSelect');
      
      // Clear existing options except the first one
      userSelect.innerHTML = '<option value="">Select a user...</option>';
      
      // Add user options
      users.forEach(user => {
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

// Function for reassigning extraction
async function reassignExtraction(extractionId, userId) {
  try {
    const response = await fetch(`/api/extractions/${extractionId}/reassign`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ userId })
    });
    
    if (response.ok) {
      window.location.reload(); // Refresh the page to update the table
    } else {
      const errorData = await response.json();
      alert('Reassignment failed: ' + (errorData.message || errorData.error || 'Unknown error'));
    }
  } catch (error) {
    alert('Reassignment failed: ' + error.message);
  }
}

document.addEventListener('DOMContentLoaded', function() {
  const uploadForm = document.getElementById('uploadForm');
  if (uploadForm) {
    uploadForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const formData = new FormData(e.target);
      
      try {
        const response = await fetch('/api/extractions/upload', {
          method: 'POST',
          body: formData
        });
        
        if (response.ok) {
          window.location.reload(); // Rehydrate the page/table
        } else {
          alert('Upload failed: ' + response.statusText);
        }
      } catch (error) {
        alert('Upload failed: ' + error.message);
      }
    });
  }

  // Event delegation for delete buttons - avoids CSP issues with inline handlers
  document.addEventListener('click', function(e) {
    if (e.target.closest('.delete-extraction-btn')) {
      e.preventDefault();
      const button = e.target.closest('.delete-extraction-btn');
      const extractionId = button.getAttribute('data-extraction-id');
      if (extractionId) {
        deleteExtraction(extractionId);
      }
    }
    
    // Handle reassignment button clicks
    if (e.target.closest('.reassign-extraction-btn')) {
      e.preventDefault();
      const button = e.target.closest('.reassign-extraction-btn');
      const extractionId = button.getAttribute('data-extraction-id');
      if (extractionId) {
        showReassignModal(extractionId);
      }
    }
  });

  // Modal handling for reassignment
  const reassignModal = document.getElementById('reassignModal');
  const closeReassignModal = document.getElementById('closeReassignModal');
  const cancelReassign = document.getElementById('cancelReassign');
  const reassignForm = document.getElementById('reassignForm');
  
  let currentExtractionId = null;

  function showReassignModal(extractionId) {
    currentExtractionId = extractionId;
    loadUsers(); // Load users when modal opens
    if (reassignModal) {
      reassignModal.classList.remove('hidden');
    }
  }

  function hideReassignModal() {
    currentExtractionId = null;
    if (reassignModal) {
      reassignModal.classList.add('hidden');
    }
    if (reassignForm) {
      reassignForm.reset();
    }
  }

  if (closeReassignModal) {
    closeReassignModal.addEventListener('click', hideReassignModal);
  }

  if (cancelReassign) {
    cancelReassign.addEventListener('click', hideReassignModal);
  }

  if (reassignForm) {
    reassignForm.addEventListener('submit', function(e) {
      e.preventDefault();
      const formData = new FormData(e.target);
      const userId = formData.get('userId');
      
      if (currentExtractionId && userId) {
        reassignExtraction(currentExtractionId, userId);
        hideReassignModal();
      }
    });
  }

  // Close modal when clicking outside
  if (reassignModal) {
    reassignModal.addEventListener('click', function(e) {
      if (e.target === reassignModal) {
        hideReassignModal();
      }
    });
  }
}); 