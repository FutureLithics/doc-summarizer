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
  });
}); 