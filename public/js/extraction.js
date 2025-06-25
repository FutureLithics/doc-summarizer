document.addEventListener('DOMContentLoaded', function() {
  // Event delegation for copy button
  document.addEventListener('click', function(e) {
    if (e.target.closest('.copy-text-btn')) {
      e.preventDefault();
      copyToClipboard(e.target.closest('.copy-text-btn'));
    }
  });

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

function initializeEditMode() {
  const editBtn = document.getElementById('edit-btn');
  const cancelBtn = document.getElementById('cancel-btn');
  const saveBtn = document.getElementById('save-btn');
  
  if (!editBtn || !cancelBtn || !saveBtn) return;
  
  const editActions = document.getElementById('edit-actions');
  const displayFilename = document.getElementById('display-filename');
  const editFilename = document.getElementById('edit-filename');
  const displaySummary = document.getElementById('display-summary');
  const editSummary = document.getElementById('edit-summary');
  const saveText = document.getElementById('save-text');
  const saveLoading = document.getElementById('save-loading');
  
  let isEditMode = false;
  let originalValues = {};

  function enterEditMode() {
    isEditMode = true;
    
    // Store original values
    originalValues.fileName = displayFilename.textContent;
    originalValues.summary = displaySummary ? displaySummary.textContent : '';
    
    // Show edit elements, hide display elements
    displayFilename.classList.add('hidden');
    editFilename.classList.remove('hidden');
    editFilename.focus();
    
    if (displaySummary && editSummary) {
      displaySummary.classList.add('hidden');
      editSummary.classList.remove('hidden');
    }
    
    // Update button states
    editBtn.textContent = 'Editing...';
    editBtn.disabled = true;
    editBtn.classList.add('opacity-50', 'cursor-not-allowed');
    editActions.classList.remove('hidden');
  }

  function exitEditMode() {
    isEditMode = false;
    
    // Show display elements, hide edit elements
    displayFilename.classList.remove('hidden');
    editFilename.classList.add('hidden');
    
    if (displaySummary && editSummary) {
      displaySummary.classList.remove('hidden');
      editSummary.classList.add('hidden');
    }
    
    // Update button states
    editBtn.innerHTML = '<span class="mr-2">✏️</span>Edit';
    editBtn.disabled = false;
    editBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    editActions.classList.add('hidden');
  }

  function cancelEdit() {
    // Restore original values
    editFilename.value = originalValues.fileName;
    displayFilename.textContent = originalValues.fileName;
    
    if (editSummary && displaySummary) {
      editSummary.value = originalValues.summary;
      displaySummary.textContent = originalValues.summary;
    }
    
    exitEditMode();
  }

  async function saveChanges() {
    const newFileName = editFilename.value.trim();
    const newSummary = editSummary ? editSummary.value.trim() : '';
    
    if (!newFileName) {
      alert('File name cannot be empty');
      return;
    }
    
    // Show loading state
    saveText.classList.add('hidden');
    saveLoading.classList.remove('hidden');
    saveBtn.disabled = true;
    
    try {
      const extractionId = window.location.pathname.split('/').pop();
      const response = await fetch(`/api/extractions/${extractionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileName: newFileName,
          summary: newSummary
        })
      });
      
      if (response.ok) {
        // Update display values
        displayFilename.textContent = newFileName;
        if (displaySummary) {
          displaySummary.textContent = newSummary;
        }
        
        exitEditMode();
        showSuccessMessage('Changes saved successfully!');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save changes');
      }
    } catch (error) {
      alert('Failed to save changes: ' + error.message);
    } finally {
      // Reset loading state
      saveText.classList.remove('hidden');
      saveLoading.classList.add('hidden');
      saveBtn.disabled = false;
    }
  }

  function showSuccessMessage(message) {
    const successMsg = document.createElement('div');
    successMsg.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
    successMsg.textContent = message;
    document.body.appendChild(successMsg);
    
    setTimeout(() => {
      if (document.body.contains(successMsg)) {
        document.body.removeChild(successMsg);
      }
    }, 3000);
  }

  // Event listeners
  editBtn.addEventListener('click', enterEditMode);
  cancelBtn.addEventListener('click', cancelEdit);
  saveBtn.addEventListener('click', saveChanges);
  
  // Handle Escape key to cancel edit
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && isEditMode) {
      cancelEdit();
    }
  });
  
  // Handle Enter key in filename field
  if (editFilename) {
    editFilename.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (editSummary) {
          editSummary.focus();
        } else {
          saveChanges();
        }
      }
    });
  }
}