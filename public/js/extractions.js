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
}); 