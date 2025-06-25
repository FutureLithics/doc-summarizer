document.addEventListener('DOMContentLoaded', function() {
  // Event delegation for copy button
  document.addEventListener('click', function(e) {
    if (e.target.closest('.copy-text-btn')) {
      e.preventDefault();
      copyToClipboard(e.target.closest('.copy-text-btn'));
    }
  });
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